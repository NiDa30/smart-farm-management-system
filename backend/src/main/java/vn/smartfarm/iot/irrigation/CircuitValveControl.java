package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.*;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterTelemetry;

/** Opt-in independent LED boards. Never acquires or publishes the shared pump. */
@Service
public class CircuitValveControl {
 public static final String PROFILE="CIRCUIT_LED_DEMO";
 public record Request(UUID requestId,String action,Integer durationSeconds,UUID expectedBootId,int expectedRevision,int expectedZoneRevision,Instant requestedAt) {}
 public record Status(IrrigationCircuits.Config config,UUID bootId,long sequence,Instant observedAt,Instant receivedAt,String gpioState,String reason,boolean demoEnabled,long lastOrdinal,ValvePositionFeedback positionFeedback) {}
 public record Command(UUID commandId,long ordinal,IrrigationCircuits.Config config,UUID bootId,String action,Integer durationSeconds,Instant requestedAt,Instant issuedAt,Instant expiresAt,String state,String errorCode) {}
 public record Snapshot(String profile,IrrigationCircuits.Config config,String configurationState,Instant asOf,boolean enabled,boolean connected,boolean readyToOpen,Status latest,List<Command> commands) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final WaterTelemetry json;private final IrrigationCircuits circuits;private final ObjectProvider<CircuitValveTransport> transports;private final TransactionTemplate tx;private final boolean enabled;
 public CircuitValveControl(JdbcTemplate jdbc,ObjectMapper mapper,WaterTelemetry json,IrrigationCircuits circuits,ObjectProvider<CircuitValveTransport> transports,PlatformTransactionManager manager,@Value("${smartfarm.irrigation.circuit-demo-enabled:false}")boolean enabled){this.jdbc=jdbc;this.mapper=mapper;this.json=json;this.circuits=circuits;this.transports=transports;this.enabled=enabled;tx=new TransactionTemplate(manager);}
 public boolean enabled(){return enabled;}
 static boolean eligible(IrrigationCircuits.Config c){return c.expectedSource().equals("SIMULATOR")&&c.controllerId().matches("IRRIGATION(0[2-9]|[1-9][0-9])")&&c.valveId().matches("VALVE(0[2-9]|[1-9][0-9])");}
 private boolean dedicated(IrrigationCircuits.Config c){return jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_circuit WHERE controller_id=?",Integer.class,c.controllerId())==1;}
 @Transactional(readOnly=true)
 public List<String> topics(){if(!enabled)return List.of();return jdbc.query("SELECT * FROM irrigation_circuit ORDER BY valve_id",IrrigationCircuits::map).stream().filter(CircuitValveControl::eligible).filter(this::dedicated).flatMap(c->java.util.stream.Stream.of(topic(c.valveId(),"status"),topic(c.valveId(),"ack"))).toList();}
 public static String topic(String valve,String leaf){if(valve==null||!valve.matches("VALVE(0[2-9]|[1-9][0-9])")||!Set.of("command","status","ack").contains(leaf))throw new IllegalArgumentException("Circuit demo topic");return "smartfarm/FARM001/"+valve+"/demo/"+leaf;}
 private void lock(){jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Long.class);}
 private IrrigationCircuits.Config config(String value){try{return mapper.readValue(value,IrrigationCircuits.Config.class);}catch(Exception e){throw new IllegalStateException("Stored circuit snapshot invalid",e);}}
 private String encode(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Circuit serialization failed",e);}}
 private Status latest(String valve){return jdbc.query("SELECT * FROM circuit_demo_status WHERE valve_id=?",(r,n)->new Status(config(r.getString("config_snapshot")),r.getObject("boot_id",UUID.class),r.getLong("sequence"),r.getTimestamp("observed_at").toInstant(),r.getTimestamp("received_at").toInstant(),r.getString("gpio_state"),r.getString("reason"),r.getBoolean("demo_enabled"),r.getLong("last_ordinal"),feedback(r.getString("position_feedback"))),valve).stream().findFirst().orElse(null);}
 private ValvePositionFeedback feedback(String value){try{return mapper.readValue(value,ValvePositionFeedback.class);}catch(Exception e){throw new IllegalStateException("Stored feedback invalid",e);}}
 private Command map(java.sql.ResultSet r,int n)throws java.sql.SQLException{return new Command(r.getObject("command_id",UUID.class),r.getLong("ordinal"),config(r.getString("config_snapshot")),r.getObject("boot_id",UUID.class),r.getString("action"),r.getObject("duration_seconds",Integer.class),r.getTimestamp("requested_at").toInstant(),r.getTimestamp("issued_at").toInstant(),r.getTimestamp("expires_at").toInstant(),r.getString("state"),r.getString("error_code"));}
 private Command find(UUID id){return jdbc.query("SELECT * FROM circuit_demo_command WHERE command_id=?",this::map,id).stream().findFirst().orElse(null);}
 private boolean connected(String valve){var t=transports.getIfAvailable();return t!=null&&t.circuitValveConnected(valve);}
 public static boolean fresh(Status s,Instant now){return s!=null&&s.observedAt().isAfter(now.minusSeconds(15))&&s.receivedAt().isAfter(now.minusSeconds(15))&&!s.observedAt().isAfter(now.plusSeconds(2))&&!s.receivedAt().isAfter(now.plusSeconds(2));}
 private boolean caughtUp(Status s){return jdbc.queryForObject("SELECT COUNT(*) FROM circuit_demo_command WHERE valve_id=? AND boot_id=? AND ordinal>?",Integer.class,s.config().valveId(),s.bootId(),s.lastOrdinal())==0;}
 private Instant fence(String valve){return jdbc.query("SELECT close_fence_at FROM circuit_demo_gate WHERE valve_id=?",(r,n)->r.getTimestamp(1)==null?null:r.getTimestamp(1).toInstant(),valve).stream().filter(Objects::nonNull).findFirst().orElse(null);}
 private boolean ready(IrrigationCircuits.Config c,Status s,Instant now){Instant f=fence(c.valveId());return eligible(c)&&dedicated(c)&&IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT")&&fresh(s,now)&&s.config().equals(c)&&s.demoEnabled()&&s.gpioState().equals("CLOSED")&&s.positionFeedback().closed()&&caughtUp(s)&&(f==null||now.isAfter(f));}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Snapshot snapshot(String id){var c=circuits.find(id);var s=latest(c.valveId());boolean link=connected(c.valveId());Instant now=Instant.now();return new Snapshot(PROFILE,c,IrrigationCircuits.configurationState(jdbc,c),now,enabled,link,enabled&&link&&ready(c,s,now),s,jdbc.query("SELECT * FROM circuit_demo_command WHERE circuit_id=? ORDER BY ordinal DESC LIMIT 20",this::map,id));}
 @Transactional(readOnly=true)
 public Command lookup(String id,UUID key){var c=find(key);if(c==null||!c.config().circuitId().equals(id))throw bad(HttpStatus.NOT_FOUND,"Circuit command not found");return c;}
 public Command create(String id,Request r){
  if(r==null||r.requestId()==null||r.expectedBootId()==null||r.requestedAt()==null||r.expectedRevision()<1||r.expectedZoneRevision()<1||r.action()==null||!Set.of("OPEN","CLOSE").contains(r.action())||(r.action().equals("OPEN")?r.durationSeconds()==null||r.durationSeconds()<1||r.durationSeconds()>30:r.durationSeconds()!=null))throw bad(HttpStatus.BAD_REQUEST,"Invalid circuit request");
  if(!enabled)throw bad(HttpStatus.FORBIDDEN,"Circuit LED control disabled");
  boolean[] send={false};Command command=tx.execute(status->{lock();Command old=find(r.requestId());
   if(old!=null){if(!old.config().circuitId().equals(id)||old.config().revision()!=r.expectedRevision()||old.config().zoneRevision()!=r.expectedZoneRevision()||!old.bootId().equals(r.expectedBootId())||!old.action().equals(r.action())||!Objects.equals(old.durationSeconds(),r.durationSeconds())||!old.requestedAt().equals(r.requestedAt().truncatedTo(ChronoUnit.MICROS)))throw bad(HttpStatus.CONFLICT,"Request ID reused");return old;}
   var c=circuits.find(id);if(!eligible(c)||!dedicated(c))throw bad(HttpStatus.CONFLICT,"Separate simulator controller required");if(!connected(c.valveId()))throw bad(HttpStatus.SERVICE_UNAVAILABLE,"Circuit MQTT unavailable");
   Instant now=Instant.now();Status s=latest(c.valveId());
   if(c.revision()!=r.expectedRevision()||c.zoneRevision()!=r.expectedZoneRevision()||r.requestedAt().isBefore(now.minusSeconds(10))||r.requestedAt().isAfter(now.plusSeconds(2))||s==null||!s.config().equals(c)||!s.bootId().equals(r.expectedBootId()))throw bad(HttpStatus.CONFLICT,"Stale request, boot or mapping");
   Instant f=fence(c.valveId());if(r.action().equals("OPEN")&&(!ready(c,s,now)||f!=null&&!r.requestedAt().isAfter(f)))throw bad(HttpStatus.CONFLICT,"Fresh CLOSED position and command fence required");
   if(r.action().equals("CLOSE"))jdbc.update("INSERT INTO circuit_demo_gate(valve_id,close_fence_at) VALUES(?,?) ON CONFLICT(valve_id) DO UPDATE SET close_fence_at=EXCLUDED.close_fence_at",c.valveId(),Timestamp.from(now.plusSeconds(2)));
   Instant issued=now.truncatedTo(ChronoUnit.SECONDS);
   jdbc.update("INSERT INTO circuit_demo_command(command_id,circuit_id,valve_id,config_snapshot,boot_id,action,duration_seconds,requested_at,issued_at,expires_at,state) VALUES(?,?,?,?::jsonb,?,?,?,?,?,?,'PENDING')",r.requestId(),id,c.valveId(),encode(c),s.bootId(),r.action(),r.durationSeconds(),Timestamp.from(r.requestedAt().truncatedTo(ChronoUnit.MICROS)),Timestamp.from(issued),Timestamp.from(issued.plusSeconds(10)));send[0]=true;return find(r.requestId());
  });
  if(send[0])try{transports.getIfAvailable().publishCircuitValve(command.config().valveId(),payload(command));jdbc.update("UPDATE circuit_demo_command SET state='SENT' WHERE command_id=? AND state='PENDING'",command.commandId());}
  catch(Exception error){jdbc.update("UPDATE circuit_demo_command SET state='PUBLISH_UNCERTAIN' WHERE command_id=? AND state='PENDING'",command.commandId());}
  return find(command.commandId());
 }
 private byte[] payload(Command c){var p=mapper.createObjectNode().put("schemaVersion",1).put("controlProfile",PROFILE).put("controllerId",c.config().controllerId()).put("actuatorId",c.config().valveId()).put("circuitId",c.config().circuitId()).put("circuitRevision",c.config().revision()).put("zoneId",c.config().zoneId()).put("zoneRevision",c.config().zoneRevision()).put("commandId",c.commandId().toString()).put("bootId",c.bootId().toString()).put("ordinal",c.ordinal()).put("action",c.action()).put("issuedAt",c.issuedAt().toString()).put("expiresAt",c.expiresAt().toString());if(c.durationSeconds()!=null)p.put("durationSeconds",c.durationSeconds());return encode(p).getBytes(java.nio.charset.StandardCharsets.UTF_8);}
 @Transactional
 public void receive(String topic,byte[] bytes,boolean retained){
  if(!enabled||retained||topic==null||!topic.matches("smartfarm/FARM001/VALVE(0[2-9]|[1-9][0-9])/demo/(status|ack)")||bytes==null||bytes.length>4096)throw new IllegalArgumentException("Circuit profile/topic/size");
  var p=json.object(bytes);boolean ack=topic.endsWith("/ack");var fields=new HashSet<>(Set.of("schemaVersion","controlProfile","controllerId","actuatorId","circuitId","circuitRevision","zoneId","zoneRevision","bootId","sequence","timestamp","dataSource","feedbackState","gpioState","reason","demoEnabled","lastOrdinal","positionFeedback"));if(ack)fields.addAll(Set.of("commandId","ordinal","action","result","errorCode"));WaterTelemetry.fields(p,fields);
  String valve=WaterTelemetry.text(p,"actuatorId"),gpio=WaterTelemetry.text(p,"gpioState"),reason=WaterTelemetry.text(p,"reason");UUID boot=uuid(p,"bootId");long sequence=integer(p,"sequence",0,9007199254740991L),last=integer(p,"lastOrdinal",0,9007199254740991L);Instant at=Instant.parse(WaterTelemetry.text(p,"timestamp")),now=Instant.now();
  if(integer(p,"schemaVersion",1,1)!=1||!PROFILE.equals(WaterTelemetry.text(p,"controlProfile"))||!topic.equals(topic(valve,ack?"ack":"status"))||!WaterTelemetry.text(p,"dataSource").equals("SIMULATOR")||!p.path("demoEnabled").isBoolean()||!Set.of("OPEN","CLOSED").contains(gpio)||!Set.of("BOOT","COMMAND_OPEN","COMMAND_CLOSE","TIMER_EXPIRED","CONNECTION_LOST","DEVICE_FAULT","POSITION_FAULT").contains(reason)||!at.isAfter(now.minusSeconds(15))||at.isAfter(now.plusSeconds(2))||gpio.equals("OPEN")&&(!p.get("demoEnabled").booleanValue()||!reason.equals("COMMAND_OPEN"))||gpio.equals("CLOSED")&&reason.equals("COMMAND_OPEN"))throw new IllegalArgumentException("Circuit state/time");
  var feedback=ValvePositionFeedback.parse(p);if(feedback==null)throw new IllegalArgumentException("Circuit feedback required");
  lock();var c=jdbc.query("SELECT * FROM irrigation_circuit WHERE valve_id=?",IrrigationCircuits::map,valve).stream().findFirst().orElseThrow(()->new IllegalArgumentException("Unknown circuit valve"));
  if(!eligible(c)||!dedicated(c)||!c.controllerId().equals(WaterTelemetry.text(p,"controllerId"))||!c.circuitId().equals(WaterTelemetry.text(p,"circuitId"))||c.revision()!=integer(p,"circuitRevision",1,Integer.MAX_VALUE)||!c.zoneId().equals(WaterTelemetry.text(p,"zoneId"))||c.zoneRevision()!=integer(p,"zoneRevision",1,Integer.MAX_VALUE))throw new IllegalArgumentException("Circuit mapping differs");
  if(ack){Command cmd=find(uuid(p,"commandId"));String action=WaterTelemetry.text(p,"action"),result=WaterTelemetry.text(p,"result"),error=p.get("errorCode").isNull()?null:WaterTelemetry.text(p,"errorCode");long rank=integer(p,"ordinal",1,9007199254740991L);
   if(!Set.of("OPEN","CLOSE").contains(action)||!Set.of("EXECUTED","REJECTED").contains(result)||result.equals("EXECUTED")&&(error!=null||!gpio.equals(action.equals("OPEN")?"OPEN":"CLOSED"))||result.equals("REJECTED")&&(error==null||!error.matches("[A-Z_]{2,40}")))throw new IllegalArgumentException("Circuit ACK");
   if(cmd==null||!cmd.config().equals(c)||!cmd.bootId().equals(boot)||cmd.ordinal()!=rank||!cmd.action().equals(action)||last<rank||at.isBefore(cmd.issuedAt().minusSeconds(2))||at.isAfter(cmd.expiresAt()))return;
   jdbc.update("UPDATE circuit_demo_command SET state=?,error_code=?,ack_sequence=? WHERE command_id=? AND state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')",result,error,sequence,cmd.commandId());return;
  }
  if(last>0&&!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM circuit_demo_command WHERE valve_id=? AND boot_id=? AND ordinal=? AND config_snapshot=?::jsonb)",Boolean.class,valve,boot,last,encode(c))))throw new IllegalArgumentException("Unknown circuit ordinal");
  if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM circuit_demo_boot WHERE valve_id=? AND boot_id=? AND retired)",Boolean.class,valve,boot)))return;
  Status old=latest(valve);if(old!=null){
   if(boot.equals(old.bootId())){if(!old.config().equals(c)||sequence<=old.sequence()||at.isBefore(old.observedAt())||last<old.lastOrdinal())return;
    if(old.positionFeedback().fault()!=null&&feedback.fault()==null&&(last<=old.lastOrdinal()||!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM circuit_demo_command WHERE valve_id=? AND boot_id=? AND ordinal=? AND action='CLOSE')",Boolean.class,valve,boot,last))))return;
   }else{if(!at.isAfter(old.observedAt()))return;jdbc.update("UPDATE circuit_demo_boot SET retired=true WHERE valve_id=? AND boot_id=?",valve,old.bootId());}
  }
  jdbc.update("INSERT INTO circuit_demo_status(valve_id,circuit_id,config_snapshot,boot_id,sequence,observed_at,received_at,gpio_state,reason,demo_enabled,last_ordinal,position_feedback) VALUES(?,?,?::jsonb,?,?,?,?,?,?,?,?,?::jsonb) ON CONFLICT(valve_id) DO UPDATE SET circuit_id=EXCLUDED.circuit_id,config_snapshot=EXCLUDED.config_snapshot,boot_id=EXCLUDED.boot_id,sequence=EXCLUDED.sequence,observed_at=EXCLUDED.observed_at,received_at=EXCLUDED.received_at,gpio_state=EXCLUDED.gpio_state,reason=EXCLUDED.reason,demo_enabled=EXCLUDED.demo_enabled,last_ordinal=EXCLUDED.last_ordinal,position_feedback=EXCLUDED.position_feedback",valve,c.circuitId(),encode(c),boot,sequence,Timestamp.from(at),Timestamp.from(now),gpio,reason,p.get("demoEnabled").booleanValue(),last,encode(feedback));
  jdbc.update("INSERT INTO circuit_demo_boot(valve_id,boot_id) VALUES(?,?) ON CONFLICT DO NOTHING",valve,boot);
 }
 /** Called under the same configuration lock as command tracking. No transport. */
 public static void requireZoneEditable(JdbcTemplate jdbc,String zone){
  jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Long.class);
  for(var c:jdbc.query("SELECT * FROM irrigation_circuit WHERE zone_id=?",IrrigationCircuits::map,zone))requireEditable(jdbc,c);
 }
 static void requireEditable(JdbcTemplate jdbc,IrrigationCircuits.Config old){
  var rows=jdbc.queryForList("SELECT *,position_feedback::text AS feedback_text FROM circuit_demo_status WHERE valve_id=?",old.valveId());long count=jdbc.queryForObject("SELECT COUNT(*) FROM circuit_demo_command WHERE valve_id=?",Long.class,old.valveId());if(rows.isEmpty()){if(count>0)throw bad(HttpStatus.CONFLICT,"Prior circuit commands need CLOSED confirmation");return;}
  var s=rows.getFirst();Instant now=Instant.now();String f=(String)s.get("feedback_text");
  // PostgreSQL JSON is parsed strictly; no stale GPIO or ACK can authorize remapping.
  try{var feedback=new ObjectMapper().readTree(f);
   if(!s.get("gpio_state").equals("CLOSED")||!((Timestamp)s.get("observed_at")).toInstant().isAfter(now.minusSeconds(15))||!((Timestamp)s.get("received_at")).toInstant().isAfter(now.minusSeconds(15))||((Timestamp)s.get("observed_at")).toInstant().isAfter(now.plusSeconds(2))||((Timestamp)s.get("received_at")).toInstant().isAfter(now.plusSeconds(2))||!feedback.path("state").asText().equals("CLOSED")||!feedback.path("fault").isNull()||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_demo_command WHERE valve_id=? AND boot_id=? AND ordinal>?",Integer.class,old.valveId(),s.get("boot_id"),s.get("last_ordinal"))>0)throw bad(HttpStatus.CONFLICT,"Fresh CLOSED position after every command required before editing");
  }catch(java.io.IOException e){throw new IllegalStateException("Stored circuit feedback invalid",e);}
 }
 private static long integer(JsonNode p,String key,long min,long max){var v=p.path(key);if(!v.isIntegralNumber()||!v.canConvertToLong()||v.longValue()<min||v.longValue()>max)throw new IllegalArgumentException("Circuit integer");return v.longValue();}
 private static UUID uuid(JsonNode p,String key){String s=WaterTelemetry.text(p,key);if(!s.matches("[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}"))throw new IllegalArgumentException("Circuit UUID");return UUID.fromString(s);}
 private static ResponseStatusException bad(HttpStatus status,String reason){return new ResponseStatusException(status,reason);}
}
