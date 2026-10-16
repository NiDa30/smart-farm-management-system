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

/** MQTT and HTTP fencing, with durable manual/automation ownership. No expiring lease. */
@Service
public class PumpCommandFencing {
 public record HttpIntent(UUID requestId,String action,Integer durationSeconds,UUID expectedBootId,Long intentRevision,Instant reviewedAt,@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) PumpCircuitRoute route) {public HttpIntent(UUID id,String action,Integer seconds,UUID boot,Long revision,Instant at){this(id,action,seconds,boot,revision,at,null);}}
 public record Receipt(HttpIntent request,PumpService.Command command) {}
 public record Context(long revision,Instant asOf,UUID bootId,boolean ready) {}
 public record View(boolean required,boolean deviceEnabled,boolean compatible,boolean restartRequired,Long lastOrdinal,Context intent,PumpOwnership.View ownership,boolean circuitRouteRequired,@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) PumpCircuitRoute circuitRoute) {}
 private record Device(UUID boot,String state,boolean locked,boolean fresh,Integer version,Long ordinal,boolean restart,PumpCircuitRoute route) {}
 private record Dispatch(UUID id,byte[] payload,boolean replay,boolean unavailable) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final ObjectProvider<CommandTransport> transports;
 private volatile boolean httpReady;
 private final PumpOwnership ownership;
 private final TransactionTemplate tx;private final boolean required,controlEnabled,routeRequired,circuitEnabled;
 @org.springframework.beans.factory.annotation.Autowired
 public PumpCommandFencing(JdbcTemplate jdbc,ObjectMapper mapper,ObjectProvider<CommandTransport> transports,PlatformTransactionManager manager,
  @Value("${smartfarm.control.pump-fencing-enabled:false}") boolean required,@Value("${smartfarm.control.enabled:false}") boolean controlEnabled,@Value("${smartfarm.control.circuit-route-required:false}") boolean routeRequired,@Value("${smartfarm.irrigation.circuit-demo-enabled:false}") boolean circuitEnabled){this.jdbc=jdbc;this.ownership=new PumpOwnership(jdbc);this.mapper=mapper;this.transports=transports;this.tx=new TransactionTemplate(manager);this.required=required;this.controlEnabled=controlEnabled;this.routeRequired=routeRequired;this.circuitEnabled=circuitEnabled;}
 public PumpCommandFencing(JdbcTemplate jdbc,ObjectMapper mapper,ObjectProvider<CommandTransport> transports,PlatformTransactionManager manager,boolean required,boolean enabled){this(jdbc,mapper,transports,manager,required,enabled,false,false);}
 public boolean required(){return required;}
 public <T> T ruleTransaction(java.util.function.Supplier<T> work){return tx.execute(t->{lock();return work.get();});}
 @org.springframework.transaction.annotation.Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public View view(){var d=device();boolean enabled=d!=null&&Integer.valueOf(1).equals(d.version());return new View(required,enabled,enabled==required,d!=null&&d.restart(),d==null?null:d.ordinal(),required?new Context(revision(),Instant.now(),d==null?null:d.boot(),httpReady):null,required?ownership.view():null,routeRequired,d==null?null:d.route());}
 @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
 public void invalidateHttpOnStartup(){if(required){tx.executeWithoutResult(t->{lock();bump();});httpReady=true;}}
 private void lock(){jdbc.queryForObject("SELECT singleton FROM pump_dispatch_gate WHERE singleton=1 FOR UPDATE",Integer.class);}
 private long revision(){return jdbc.queryForObject("SELECT intent_revision FROM pump_dispatch_gate WHERE singleton=1",Long.class);}
 private void bump(){jdbc.update("UPDATE pump_dispatch_gate SET intent_revision=intent_revision+1 WHERE singleton=1");}
 public Receipt lookupHttp(UUID id){return jdbc.query("SELECT * FROM pump_command WHERE command_id=? AND http_intent_revision IS NOT NULL",(r,n)->new Receipt(new HttpIntent(id,r.getString("action"),r.getObject("duration_seconds",Integer.class),r.getObject("http_expected_boot",UUID.class),r.getLong("http_intent_revision"),r.getTimestamp("http_reviewed_at").toInstant(),PumpCircuitRoute.stored(mapper,r.getString("circuit_route"))),command(id)),id).stream().findFirst().orElseThrow(()->bad(HttpStatus.NOT_FOUND,"HTTP pump request not found"));}
 private static HttpIntent validated(HttpIntent r){
  if(r==null||r.requestId()==null||r.action()==null||!Set.of("ON","OFF","RESET_LOCKOUT").contains(r.action())||r.intentRevision()==null||r.intentRevision()<1||r.intentRevision()>9007199254740991L||r.reviewedAt()==null
    ||(r.action().equals("ON")?r.durationSeconds()==null||r.durationSeconds()<1||r.durationSeconds()>3600:r.durationSeconds()!=null)||(!r.action().equals("OFF")&&r.expectedBootId()==null))throw bad(HttpStatus.BAD_REQUEST,"Invalid HTTP pump intent");
  if(r.route()!=null){try{PumpCircuitRoute.parse(new ObjectMapper().valueToTree(r.route()));}catch(IllegalArgumentException e){throw bad(HttpStatus.BAD_REQUEST,"Invalid circuit route");}if(r.action().equals("OFF"))throw bad(HttpStatus.BAD_REQUEST,"Emergency OFF must not be route restricted");}
  return new HttpIntent(r.requestId(),r.action(),r.durationSeconds(),r.expectedBootId(),r.intentRevision(),r.reviewedAt().truncatedTo(ChronoUnit.MICROS),r.route());
 }
 public PumpService.Command createAutomatic(PumpService.Request request,UUID owner,Consumer<UUID> reserve){
  if(!Set.of("ON","OFF").contains(request.action())||(request.action().equals("ON")?(owner!=null||request.durationSeconds()==null||request.durationSeconds()<1||request.durationSeconds()>30):request.durationSeconds()!=null))throw bad(HttpStatus.BAD_REQUEST,"Invalid automatic request");
  return dispatch(request,id->{},null,()->{},true,owner,reserve);
 }
 public Receipt createHttp(HttpIntent input,Runnable manualHold){
  HttpIntent r=validated(input);
  try{dispatch(new PumpService.Request(r.action(),r.durationSeconds()),id->{},r,manualHold,false,null,id->{});}catch(PumpService.UncertainPublish e){/* Saved identity permits GET reconciliation; never replay. */}
  return lookupHttp(r.requestId());
 }
 private Device device(){Instant now=Instant.now();return jdbc.query("SELECT * FROM pump_status WHERE singleton=1",(r,n)->new Device(r.getObject("boot_id",UUID.class),r.getString("reported_state"),r.getBoolean("safety_lockout"),
  r.getTimestamp("observed_at").toInstant().isAfter(now.minusSeconds(15))&&r.getTimestamp("received_at").toInstant().isAfter(now.minusSeconds(15))&&!r.getTimestamp("observed_at").toInstant().isAfter(now.plusSeconds(2))&&!r.getTimestamp("received_at").toInstant().isAfter(now.plusSeconds(2)),
  r.getObject("fence_version",Integer.class),r.getObject("last_fence_ordinal",Long.class),r.getBoolean("fence_restart_required"),reportedRoute(r.getString("valve_interlock")))).stream().findFirst().orElse(null);}
 private PumpCircuitRoute reportedRoute(String value){if(value==null)return null;try{var p=mapper.readTree(value);return p.has("route")?PumpCircuitRoute.parse(p.get("route")):null;}catch(Exception e){throw new IllegalArgumentException("Invalid stored pump route",e);}}
 public PumpService.Command create(PumpService.Request request,Consumer<UUID> beforePublish){return dispatch(request,beforePublish,null,()->{},false,null,id->{});}
 private PumpService.Command dispatch(PumpService.Request request,Consumer<UUID> beforePublish,HttpIntent http,Runnable manualHold,boolean automatic,UUID owner,Consumer<UUID> reserve){
  if(http==null&&(!required||!controlEnabled))throw bad(HttpStatus.FORBIDDEN,"Fenced pump control is disabled");
  var transport=transports.getIfAvailable();
  Dispatch dispatch=tx.execute(t->{
   lock();
   if(http!=null){
    var found=jdbc.query("SELECT http_intent_revision FROM pump_command WHERE command_id=?",(r,n)->r.getObject(1,Long.class),http.requestId());
    if(!found.isEmpty()){
     if(found.getFirst()==null||!lookupHttp(http.requestId()).request().equals(http))throw bad(HttpStatus.CONFLICT,"Request ID already used with different input");
     return new Dispatch(http.requestId(),null,true,false);
    }
    if(!required||!controlEnabled)throw bad(HttpStatus.FORBIDDEN,"Fenced HTTP control disabled");
    if(!httpReady)throw bad(HttpStatus.SERVICE_UNAVAILABLE,"HTTP intent recovery not complete");
    Instant now=Instant.now();if(http.reviewedAt().isBefore(now.minusSeconds(10))||http.reviewedAt().isAfter(now.plusSeconds(2)))throw bad(HttpStatus.CONFLICT,"HTTP review expired; read current intent");
    if(!http.action().equals("OFF")&&http.intentRevision()!=revision())throw bad(HttpStatus.CONFLICT,"Pump intent changed; review again");
   }
   vn.smartfarm.iot.irrigation.IrrigationSessionGuard.pump(jdbc,http==null?null:http.requestId(),request.action());
   boolean unavailable=transport==null||!transport.controlConnected();
   if(unavailable&&!request.action().equals("OFF"))throw bad(HttpStatus.SERVICE_UNAVAILABLE,"MQTT control unavailable");
   jdbc.update("UPDATE pump_command SET state='TIMED_OUT' WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND expires_at<CURRENT_TIMESTAMP-INTERVAL '5 seconds'");
   var d=device();boolean off=request.action().equals("OFF"),capable=d!=null&&Integer.valueOf(1).equals(d.version());
   if(http!=null&&!off&&(d==null||!d.boot().equals(http.expectedBootId())))throw bad(HttpStatus.CONFLICT,"Device boot changed; review again");
   if(automatic&&off)ownership.requireRuleOwner(owner);
   if(automatic&&!off&&jdbc.queryForObject("SELECT COUNT(*) FROM watering_rule WHERE singleton=1 AND enabled AND active_command IS NULL",Long.class)!=1)throw bad(HttpStatus.CONFLICT,"Automatic rule is paused or already running");
   if(!off){
    if(!capable||!d.fresh()||!d.state().equals("OFF"))throw bad(HttpStatus.CONFLICT,"Fresh fenced OFF device required");
    if(d.restart())throw bad(HttpStatus.CONFLICT,"Reboot device after unfenced emergency OFF");
    if(request.action().equals("ON")&&d.locked())throw bad(HttpStatus.CONFLICT,"Pump is locked");
    if(jdbc.queryForObject("SELECT COUNT(*) FROM pump_command WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') OR (target_boot_id=? AND fence_ordinal>?)",Long.class,d.boot(),d.ordinal())>0)
     throw bad(HttpStatus.CONFLICT,"Wait for device status covering all dispatched commands");
    if(jdbc.queryForObject("SELECT COUNT(*) FROM pump_command c JOIN pump_status s ON s.singleton=1 WHERE c.reported_state='ON' AND c.ack_boot_id=s.boot_id AND c.ack_sequence>=s.sequence",Long.class)>0)
     throw bad(HttpStatus.CONFLICT,"Wait for OFF status newer than ON acknowledgment");
    ownership.requireAvailable();
   }
   PumpCircuitRoute route=null;Instant deadline=null;
   if(!off&&(routeRequired||d.route()!=null||http!=null&&http.route()!=null)){
    if(!circuitEnabled||d.route()==null||http==null||http.route()==null||!d.route().equals(http.route()))throw bad(HttpStatus.CONFLICT,"Explicit matching circuit route and control profile required");
    jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Long.class);
    var check=PumpCircuitRoute.inspect(jdbc,mapper,http.route(),request.action().equals("RESET_LOCKOUT"));if(!check.ready())throw bad(HttpStatus.CONFLICT,check.reason());
    if(request.action().equals("ON")&&request.durationSeconds()>30)throw bad(HttpStatus.BAD_REQUEST,"Circuit pump demo maximum30seconds");
    route=http.route();deadline=check.valveDeadline();
   }
   var weather=request.action().equals("ON")?vn.smartfarm.iot.nodes.ZoneRainGate.requireOn(jdbc,route):null;
   UUID id=http==null?UUID.randomUUID():http.requestId();Instant issued=Instant.now().truncatedTo(ChronoUnit.SECONDS),expires=issued.plusSeconds(10);
   if(route!=null&&request.action().equals("ON")){Instant cutoff=deadline.minusSeconds(request.durationSeconds()+2).truncatedTo(ChronoUnit.SECONDS);if(cutoff.isBefore(expires))expires=cutoff;if(!expires.isAfter(issued))throw bad(HttpStatus.CONFLICT,"VALVE_WINDOW_TOO_SHORT");}
   Long ordinal=capable?jdbc.queryForObject("SELECT nextval('pump_fence_ordinal_seq')",Long.class):null;
   UUID target=capable?d.boot():null;
   jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,fence_ordinal,target_boot_id) VALUES(?,?,?,?,?,'PENDING',?,?)",id,request.action(),request.durationSeconds(),Timestamp.from(issued),Timestamp.from(expires),ordinal,target);
   if(weather!=null)try{jdbc.update("UPDATE pump_command SET weather_gate=?::jsonb WHERE command_id=?",mapper.writeValueAsString(weather),id);}catch(java.io.IOException e){throw new IllegalStateException(e);}
   if(route!=null)try{jdbc.update("UPDATE pump_command SET circuit_route=?::jsonb WHERE command_id=?",mapper.writeValueAsString(route),id);}catch(java.io.IOException e){throw new IllegalStateException(e);}
   jdbc.update("UPDATE pump_command SET control_source=?,owner_command_id=? WHERE command_id=?",automatic?"AUTOMATION":"MANUAL",automatic&&off?owner:null,id);
   if(automatic)reserve.accept(id); // tracking and generation check are atomic with claim
   else jdbc.update("UPDATE watering_rule SET enabled=false,low_count=0,last_result='MANUAL_HOLD',execution_epoch=execution_epoch+1 WHERE singleton=1");
   if(http!=null){
    jdbc.update("UPDATE pump_command SET http_intent_revision=?,http_expected_boot=?,http_reviewed_at=? WHERE command_id=?",http.intentRevision(),http.expectedBootId(),Timestamp.from(http.reviewedAt()),id);
    manualHold.run(); // same DB transaction; duplicate reconciliation never pauses a newer rule
   }
   bump();
   var p=mapper.createObjectNode().put("schemaVersion",1).put("deviceId","PUMP01").put("commandId",id.toString()).put("action",request.action()).put("issuedAt",issued.toString()).put("expiresAt",expires.toString());
   if(request.durationSeconds()!=null)p.put("durationSeconds",request.durationSeconds());
   if(ordinal!=null){var f=p.putObject("commandFence").put("version",1).put("ordinal",ordinal).put("targetBootId",target.toString());if(route!=null)f.set("route",mapper.valueToTree(route));}
   try{return new Dispatch(id,mapper.writeValueAsBytes(p),false,unavailable);}catch(Exception e){throw new IllegalStateException(e);}
  });
  if(dispatch.replay())return command(dispatch.id());
  // Commit reservation before callbacks/transport: a synchronous ACK cannot deadlock on the dispatch gate.
  try{beforePublish.accept(dispatch.id());if(!dispatch.unavailable())transport.publishCommand(dispatch.payload());}
  catch(Exception e){jdbc.update("UPDATE pump_command SET state='PUBLISH_UNCERTAIN' WHERE command_id=? AND state='PENDING'",dispatch.id());throw new PumpService.UncertainPublish(dispatch.id());}
  if(dispatch.unavailable()){
   jdbc.update("UPDATE pump_command SET state='FAILED',error_code='MQTT_UNAVAILABLE' WHERE command_id=? AND state='PENDING'",dispatch.id());
   if(http!=null)return command(dispatch.id());
   throw bad(HttpStatus.SERVICE_UNAVAILABLE,"OFF intent saved but MQTT unavailable; inspect history");
  }
  jdbc.update("UPDATE pump_command SET state='SENT' WHERE command_id=? AND state='PENDING'",dispatch.id());
  return command(dispatch.id());
 }
 private PumpService.Command command(UUID id){return jdbc.query("SELECT * FROM pump_command WHERE command_id=?",(r,n)->new PumpService.Command(r.getObject("command_id",UUID.class),r.getString("action"),r.getObject("duration_seconds",Integer.class),r.getTimestamp("issued_at").toInstant(),r.getTimestamp("expires_at").toInstant(),r.getString("state"),r.getString("reported_state"),r.getString("error_code")),id).getFirst();
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
