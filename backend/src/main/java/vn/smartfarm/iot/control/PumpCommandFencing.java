package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.*;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Consumer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/** Boot/ordinal protection on MQTT only. It is not a pump lease or an HTTP ordering protocol. */
@Service
public class PumpCommandFencing {
 public record View(boolean required,boolean deviceEnabled,boolean compatible,boolean restartRequired,Long lastOrdinal) {}
 private record Device(UUID boot,String state,boolean locked,boolean fresh,Integer version,Long ordinal,boolean restart) {}
 private record Dispatch(UUID id,byte[] payload) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final ObjectProvider<CommandTransport> transports;
 private final TransactionTemplate tx;private final boolean required,controlEnabled;
 public PumpCommandFencing(JdbcTemplate jdbc,ObjectMapper mapper,ObjectProvider<CommandTransport> transports,PlatformTransactionManager manager,
  @Value("${smartfarm.control.pump-fencing-enabled:false}") boolean required,@Value("${smartfarm.control.enabled:false}") boolean controlEnabled){this.jdbc=jdbc;this.mapper=mapper;this.transports=transports;this.tx=new TransactionTemplate(manager);this.required=required;this.controlEnabled=controlEnabled;}
 public boolean required(){return required;}
 public View view(){var d=device();boolean enabled=d!=null&&Integer.valueOf(1).equals(d.version());return new View(required,enabled,enabled==required,d!=null&&d.restart(),d==null?null:d.ordinal());}
 private Device device(){Instant now=Instant.now();return jdbc.query("SELECT * FROM pump_status WHERE singleton=1",(r,n)->new Device(r.getObject("boot_id",UUID.class),r.getString("reported_state"),r.getBoolean("safety_lockout"),
  r.getTimestamp("observed_at").toInstant().isAfter(now.minusSeconds(15))&&r.getTimestamp("received_at").toInstant().isAfter(now.minusSeconds(15))&&!r.getTimestamp("observed_at").toInstant().isAfter(now.plusSeconds(2))&&!r.getTimestamp("received_at").toInstant().isAfter(now.plusSeconds(2)),
  r.getObject("fence_version",Integer.class),r.getObject("last_fence_ordinal",Long.class),r.getBoolean("fence_restart_required"))).stream().findFirst().orElse(null);}
 public PumpService.Command create(PumpService.Request request,Consumer<UUID> beforePublish){
  if(!required||!controlEnabled)throw bad(HttpStatus.FORBIDDEN,"Fenced pump control is disabled");
  var transport=transports.getIfAvailable();if(transport==null||!transport.controlConnected())throw bad(HttpStatus.SERVICE_UNAVAILABLE,"MQTT control unavailable");
  Dispatch dispatch=tx.execute(t->{
   jdbc.queryForObject("SELECT singleton FROM pump_dispatch_gate WHERE singleton=1 FOR UPDATE",Integer.class);
   jdbc.update("UPDATE pump_command SET state='TIMED_OUT' WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND expires_at<CURRENT_TIMESTAMP-INTERVAL '5 seconds'");
   var d=device();boolean off=request.action().equals("OFF"),capable=d!=null&&Integer.valueOf(1).equals(d.version());
   if(!off){
    if(!capable||!d.fresh()||!d.state().equals("OFF"))throw bad(HttpStatus.CONFLICT,"Fresh fenced OFF device required");
    if(d.restart())throw bad(HttpStatus.CONFLICT,"Reboot device after unfenced emergency OFF");
    if(request.action().equals("ON")&&d.locked())throw bad(HttpStatus.CONFLICT,"Pump is locked");
    if(jdbc.queryForObject("SELECT COUNT(*) FROM pump_command WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') OR (target_boot_id=? AND fence_ordinal>?)",Long.class,d.boot(),d.ordinal())>0)
     throw bad(HttpStatus.CONFLICT,"Wait for device status covering all dispatched commands");
    if(jdbc.queryForObject("SELECT COUNT(*) FROM pump_command c JOIN pump_status s ON s.singleton=1 WHERE c.reported_state='ON' AND c.ack_boot_id=s.boot_id AND c.ack_sequence>=s.sequence",Long.class)>0)
     throw bad(HttpStatus.CONFLICT,"Wait for OFF status newer than ON acknowledgment");
   }
   UUID id=UUID.randomUUID();Instant issued=Instant.now().truncatedTo(ChronoUnit.SECONDS),expires=issued.plusSeconds(10);
   Long ordinal=capable?jdbc.queryForObject("SELECT nextval('pump_fence_ordinal_seq')",Long.class):null;
   UUID target=capable?d.boot():null;
   jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,fence_ordinal,target_boot_id) VALUES(?,?,?,?,?,'PENDING',?,?)",id,request.action(),request.durationSeconds(),Timestamp.from(issued),Timestamp.from(expires),ordinal,target);
   var p=mapper.createObjectNode().put("schemaVersion",1).put("deviceId","PUMP01").put("commandId",id.toString()).put("action",request.action()).put("issuedAt",issued.toString()).put("expiresAt",expires.toString());
   if(request.durationSeconds()!=null)p.put("durationSeconds",request.durationSeconds());
   if(ordinal!=null)p.putObject("commandFence").put("version",1).put("ordinal",ordinal).put("targetBootId",target.toString());
   try{return new Dispatch(id,mapper.writeValueAsBytes(p));}catch(Exception e){throw new IllegalStateException(e);}
  });
  // Commit reservation before callbacks/transport: a synchronous ACK cannot deadlock on the dispatch gate.
  try{beforePublish.accept(dispatch.id());transport.publishCommand(dispatch.payload());jdbc.update("UPDATE pump_command SET state='SENT' WHERE command_id=? AND state='PENDING'",dispatch.id());}
  catch(Exception e){jdbc.update("UPDATE pump_command SET state='PUBLISH_UNCERTAIN' WHERE command_id=? AND state='PENDING'",dispatch.id());throw new PumpService.UncertainPublish(dispatch.id());}
  return jdbc.query("SELECT * FROM pump_command WHERE command_id=?",(r,n)->new PumpService.Command(r.getObject("command_id",UUID.class),r.getString("action"),r.getObject("duration_seconds",Integer.class),r.getTimestamp("issued_at").toInstant(),r.getTimestamp("expires_at").toInstant(),r.getString("state"),r.getString("reported_state"),r.getString("error_code")),dispatch.id()).getFirst();
 }
 /** Validate additive metadata before the legacy receive path can update an execution ledger. */
 public Long validate(JsonNode node,boolean status,UUID boot){
  if(!node.has("commandFence"))return null;
  var f=node.path("commandFence");vn.smartfarm.iot.nodes.WaterTelemetry.fields(f,status?Set.of("version","lastOrdinal","restartRequired"):Set.of("version","ordinal"));
  var rank=f.path(status?"lastOrdinal":"ordinal");if(!f.path("version").isIntegralNumber()||!f.path("version").canConvertToInt()||f.path("version").intValue()!=1||!rank.isIntegralNumber()||!rank.canConvertToLong()||rank.asLong()<(status?0:1)||rank.asLong()>9007199254740991L)throw new IllegalArgumentException("Invalid pump fence");
  if(status&&!f.path("restartRequired").isBoolean())throw new IllegalArgumentException("Invalid restart latch");
  long ordinal=rank.asLong();
  if(status&&((ordinal==0&&!node.path("reportedState").asText().equals("OFF"))||(f.path("restartRequired").asBoolean()&&(!node.path("reportedState").asText().equals("OFF")||!node.path("safetyLockout").asBoolean()))))throw new IllegalArgumentException("Invalid fenced output/latch state");
  if(status&&ordinal>0&&jdbc.queryForObject("SELECT COUNT(*) FROM pump_command WHERE fence_ordinal=? AND (target_boot_id=? OR action='OFF')",Long.class,ordinal,boot)==0)throw new IllegalArgumentException("Unknown pump fence ordinal");
  return ordinal;
 }
 public boolean ackMatches(JsonNode node,UUID id,UUID boot,Long ordinal){
  return jdbc.query("SELECT action,fence_ordinal,target_boot_id FROM pump_command WHERE command_id=?",(r,n)->{
   Long expected=r.getObject("fence_ordinal",Long.class);
   return expected==null?ordinal==null:expected.equals(ordinal)&&(r.getString("action").equals("OFF")||boot.equals(r.getObject("target_boot_id",UUID.class)));
  },id).stream().findFirst().orElse(false);
 }
 private static ResponseStatusException bad(HttpStatus status,String reason){return new ResponseStatusException(status,reason);}
}
