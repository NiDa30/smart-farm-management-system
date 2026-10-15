package vn.smartfarm.iot.irrigation;
import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.sql.Timestamp;
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

/** One LED/valve simulator only. Never owns or publishes PUMP01 commands. */
@Service
public class IrrigationDemo {
 public record Binding(String zoneId,Integer zoneRevision,int revision,Instant closeFenceAt) {}
 public record Status(String zoneId,UUID bootId,long sequence,Instant observedAt,Instant receivedAt,String gpioState,String reason,boolean demoEnabled,long lastOrdinal,ValvePositionFeedback positionFeedback) {}
 public record Command(UUID commandId,long ordinal,String zoneId,int bindingRevision,UUID bootId,String action,Integer durationSeconds,Instant requestedAt,Instant issuedAt,Instant expiresAt,String state,String errorCode) {}
 public record Snapshot(String controllerId,String actuatorId,Instant asOf,boolean demoEnabled,boolean connected,boolean readyToOpen,boolean feedbackRequired,Binding binding,Status latest,List<Command> commands) {}
 public record Request(UUID requestId,String action,Integer durationSeconds,UUID expectedBootId,Integer bindingRevision,Instant requestedAt) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final WaterTelemetry json;private final ObjectProvider<IrrigationTransport> transports;private final boolean enabled,feedbackRequired;private final TransactionTemplate tx;
 public IrrigationDemo(JdbcTemplate jdbc,ObjectMapper mapper,WaterTelemetry json,ObjectProvider<IrrigationTransport> transports,PlatformTransactionManager manager,@Value("${smartfarm.irrigation.demo-enabled:false}")boolean enabled,@Value("${smartfarm.irrigation.position-feedback-required:false}")boolean feedbackRequired){this.jdbc=jdbc;this.mapper=mapper;this.json=json;this.transports=transports;this.enabled=enabled;this.feedbackRequired=feedbackRequired;tx=new TransactionTemplate(manager);}
 private Binding binding(){return jdbc.query("SELECT * FROM irrigation_demo_binding WHERE singleton=1",(r,n)->new Binding(r.getString("zone_id"),r.getObject("zone_revision",Integer.class),r.getInt("revision"),r.getTimestamp("close_fence_at")==null?null:r.getTimestamp("close_fence_at").toInstant())).getFirst();}
 private Status latest(){return jdbc.query("SELECT * FROM irrigation_demo_status WHERE singleton=1",(r,n)->new Status(r.getString("zone_id"),r.getObject("boot_id",UUID.class),r.getLong("sequence"),r.getTimestamp("observed_at").toInstant(),r.getTimestamp("received_at").toInstant(),r.getString("gpio_state"),r.getString("reason"),r.getBoolean("demo_enabled"),r.getLong("last_ordinal"),r.getBoolean("feedback_enabled")?new ValvePositionFeedback(1,true,r.getString("feedback_state"),r.getString("feedback_fault")):null)).stream().findFirst().orElse(null);}
 private Command map(java.sql.ResultSet r,int n)throws java.sql.SQLException{return new Command(r.getObject("command_id",UUID.class),r.getLong("ordinal"),r.getString("zone_id"),r.getInt("binding_revision"),r.getObject("boot_id",UUID.class),r.getString("action"),r.getObject("duration_seconds",Integer.class),r.getTimestamp("requested_at").toInstant(),r.getTimestamp("issued_at").toInstant(),r.getTimestamp("expires_at").toInstant(),r.getString("state"),r.getString("error_code"));}
 private Command find(UUID id){return jdbc.query("SELECT * FROM irrigation_demo_command WHERE command_id=?",this::map,id).stream().findFirst().orElse(null);}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Snapshot snapshot(){var t=transports.getIfAvailable();Binding b=binding();Status s=latest();Instant now=Instant.now();boolean connected=t!=null&&t.irrigationConnected();return new Snapshot("IRRIGATION01","VALVE01",now,enabled,connected,enabled&&connected&&ready(b,s,now),feedbackRequired,b,s,jdbc.query("SELECT * FROM irrigation_demo_command ORDER BY ordinal DESC LIMIT 20",this::map));}
 private void lock(){jdbc.queryForObject("SELECT revision FROM irrigation_demo_binding WHERE singleton=1 FOR UPDATE",Integer.class);}
 private static boolean fresh(Status s,Instant now){return s!=null&&s.observedAt().isAfter(now.minusSeconds(15))&&s.receivedAt().isAfter(now.minusSeconds(15))&&!s.observedAt().isAfter(now.plusSeconds(2))&&!s.receivedAt().isAfter(now.plusSeconds(2));}
 private boolean caughtUp(Status s){return jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_demo_command WHERE boot_id=? AND ordinal>?",Integer.class,s.bootId(),s.lastOrdinal())==0;}
 private boolean positionClosed(Status s){return s!=null&&(!(feedbackRequired||s.positionFeedback()!=null)||s.positionFeedback()!=null&&s.positionFeedback().closed());}
 private boolean ready(Binding b,Status s,Instant now){return b.zoneId()!=null&&fresh(s,now)&&s.demoEnabled()&&s.gpioState().equals("CLOSED")&&positionClosed(s)&&s.zoneId().equals(b.zoneId())&&caughtUp(s)&&(b.closeFenceAt()==null||now.isAfter(b.closeFenceAt()))&&Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source='SIMULATOR')",Boolean.class,b.zoneId(),b.zoneRevision()));}
 public Binding bind(JsonNode input){WaterTelemetry.fields(input,Set.of("zoneId","zoneRevision","revision"));String zone=WaterTelemetry.code(WaterTelemetry.text(input,"zoneId"));int zoneRev=integer(input,"zoneRevision",1,Integer.MAX_VALUE),rev=integer(input,"revision",1,Integer.MAX_VALUE-1);
  return tx.execute(status->{lock();Binding b=binding();if(b.revision()!=rev)throw bad(HttpStatus.CONFLICT,"Binding changed; reload");
   if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source='SIMULATOR')",Boolean.class,zone,zoneRev)))throw bad(HttpStatus.CONFLICT,"Use current simulator zone revision");
   if(b.zoneId()!=null){Status s=latest();if(!fresh(s,Instant.now())||!s.gpioState().equals("CLOSED")||!positionClosed(s)||!caughtUp(s))throw bad(HttpStatus.CONFLICT,"Fresh CLOSED confirmation of prior commands required");}
   jdbc.update("UPDATE irrigation_demo_binding SET zone_id=?,zone_revision=?,revision=revision+1 WHERE singleton=1",zone,zoneRev);return binding();});
 }
 public Command create(Request r){
  if(r==null||r.bindingRevision()==null||r.requestedAt()==null||r.requestId()==null||r.action()==null||!Set.of("OPEN","CLOSE").contains(r.action())||(r.action().equals("OPEN")?r.durationSeconds()==null||r.durationSeconds()<1||r.durationSeconds()>30:r.durationSeconds()!=null))throw bad(HttpStatus.BAD_REQUEST,"Invalid request/duration");
  if(!enabled)throw bad(HttpStatus.FORBIDDEN,"Irrigation simulator disabled");
  // Commit tracking before publish; duplicate request IDs are reads, never another publish.
  boolean[] send={false};Command command=tx.execute(status->{lock();Command old=find(r.requestId());if(old!=null){if(!old.action().equals(r.action())||!Objects.equals(old.durationSeconds(),r.durationSeconds())||old.bindingRevision()!=r.bindingRevision()||r.action().equals("OPEN")&&!old.bootId().equals(r.expectedBootId()))throw bad(HttpStatus.CONFLICT,"Request ID reused");return old;}
   var t=transports.getIfAvailable();if(t==null||!t.irrigationConnected())throw bad(HttpStatus.SERVICE_UNAVAILABLE,"Irrigation MQTT unavailable");Binding b=binding();Status s=latest();if(b.zoneId()==null)throw bad(HttpStatus.CONFLICT,"Bind a simulator zone first");
   Instant received=Instant.now();if(r.bindingRevision()!=b.revision()||r.requestedAt().isBefore(received.minusSeconds(10))||r.requestedAt().isAfter(received.plusSeconds(2)))throw bad(HttpStatus.CONFLICT,"Stale request or binding; reload");
   if(r.action().equals("OPEN")){
    if(!ready(b,s,received)||!s.bootId().equals(r.expectedBootId())||b.closeFenceAt()!=null&&!r.requestedAt().isAfter(b.closeFenceAt()))throw bad(HttpStatus.CONFLICT,"Fresh matching CLOSED status newer than all commands required");
    if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source='SIMULATOR')",Boolean.class,b.zoneId(),b.zoneRevision())))throw bad(HttpStatus.CONFLICT,"Zone changed; confirm binding again");
   }
   if(r.action().equals("CLOSE"))jdbc.update("UPDATE irrigation_demo_binding SET close_fence_at=? WHERE singleton=1",Timestamp.from(received.plusSeconds(2)));
   Instant issued=Instant.now().truncatedTo(ChronoUnit.SECONDS);UUID boot=s==null?new UUID(0,0):s.bootId();
   jdbc.update("INSERT INTO irrigation_demo_command(command_id,zone_id,binding_revision,boot_id,action,duration_seconds,requested_at,issued_at,expires_at,state) VALUES(?,?,?,?,?,?,?,?,?,'PENDING')",r.requestId(),b.zoneId(),b.revision(),boot,r.action(),r.durationSeconds(),Timestamp.from(r.requestedAt()),Timestamp.from(issued),Timestamp.from(issued.plusSeconds(10)));send[0]=true;return find(r.requestId());});
  if(send[0])try{
   var p=mapper.createObjectNode().put("schemaVersion",1).put("controllerId","IRRIGATION01").put("actuatorId","VALVE01").put("zoneId",command.zoneId()).put("commandId",command.commandId().toString()).put("bootId",command.bootId().toString()).put("ordinal",command.ordinal()).put("action",command.action()).put("issuedAt",command.issuedAt().toString()).put("expiresAt",command.expiresAt().toString());if(command.durationSeconds()!=null)p.put("durationSeconds",command.durationSeconds());
   transports.getIfAvailable().publishIrrigation(mapper.writeValueAsBytes(p));jdbc.update("UPDATE irrigation_demo_command SET state='SENT' WHERE command_id=? AND state='PENDING'",command.commandId());
  }catch(Exception error){jdbc.update("UPDATE irrigation_demo_command SET state='PUBLISH_UNCERTAIN' WHERE command_id=? AND state='PENDING'",command.commandId());}
  return find(command.commandId());
 }
 @Transactional(readOnly=true)
 public Command lookup(UUID id){Command c=find(id);if(c==null)throw bad(HttpStatus.NOT_FOUND,"Command not found");return c;}
 public void receive(String topic,byte[] bytes){
  JsonNode n=json.object(bytes);boolean ack=topic.equals("smartfarm/FARM001/VALVE01/ack");if(!ack&&!topic.equals("smartfarm/FARM001/VALVE01/status"))throw new IllegalArgumentException("Topic");
  Set<String> fields=new HashSet<>(Set.of("schemaVersion","controllerId","actuatorId","zoneId","bootId","sequence","timestamp","dataSource","feedbackState","gpioState","reason","demoEnabled","lastOrdinal"));if(n.has("positionFeedback"))fields.add("positionFeedback");if(ack)fields.addAll(Set.of("commandId","ordinal","action","result","errorCode"));WaterTelemetry.fields(n,fields);
  if(integer(n,"schemaVersion",1,1)!=1||!WaterTelemetry.text(n,"controllerId").equals("IRRIGATION01")||!WaterTelemetry.text(n,"actuatorId").equals("VALVE01")||!WaterTelemetry.text(n,"dataSource").equals("SIMULATOR")||!n.path("demoEnabled").isBoolean())throw new IllegalArgumentException("Identity/source/feedback");
  ValvePositionFeedback feedback=ValvePositionFeedback.parse(n);
  String zone=WaterTelemetry.code(WaterTelemetry.text(n,"zoneId")),gpio=WaterTelemetry.text(n,"gpioState"),reason=WaterTelemetry.text(n,"reason");UUID boot=uuid(n,"bootId");long seq=number(n,"sequence"),last=number(n,"lastOrdinal");Instant at=Instant.parse(WaterTelemetry.text(n,"timestamp")),now=Instant.now();
  if(at.isBefore(now.minusSeconds(15))||at.isAfter(now.plusSeconds(2))||!Set.of("OPEN","CLOSED").contains(gpio)||!Set.of("BOOT","COMMAND_OPEN","COMMAND_CLOSE","TIMER_EXPIRED","CONNECTION_LOST","DEVICE_FAULT","POSITION_FAULT").contains(reason)||(!n.get("demoEnabled").booleanValue()&&gpio.equals("OPEN"))||reason.equals("COMMAND_OPEN")&&!gpio.equals("OPEN")||Set.of("BOOT","TIMER_EXPIRED","CONNECTION_LOST","DEVICE_FAULT","POSITION_FAULT","COMMAND_CLOSE").contains(reason)&&!gpio.equals("CLOSED"))throw new IllegalArgumentException("State/time");
  tx.execute(status->{lock();
   if(!ack){if(last>0&&!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_demo_command WHERE ordinal=? AND zone_id=?)",Boolean.class,last,zone)))throw new IllegalArgumentException("Unknown ordinal");
    Status old=latest();if(old!=null&&(!at.isAfter(old.observedAt())&&( !boot.equals(old.bootId())||!at.equals(old.observedAt()))||boot.equals(old.bootId())&&seq<=old.sequence()||boot.equals(old.bootId())&&(last<old.lastOrdinal()||!zone.equals(old.zoneId()))))return null;
    if(old!=null&&boot.equals(old.bootId())&&old.positionFeedback()!=null){
     if(feedback==null)return null; // capability cannot disappear within the same boot
     if(old.positionFeedback().fault()!=null&&feedback.fault()==null&&(last<=old.lastOrdinal()||!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_demo_command WHERE ordinal=? AND action='CLOSE' AND zone_id=?)",Boolean.class,last,zone))))return null;
    }
    jdbc.update("INSERT INTO irrigation_demo_status(singleton,zone_id,boot_id,sequence,observed_at,received_at,gpio_state,reason,demo_enabled,last_ordinal,feedback_enabled,feedback_state,feedback_fault) VALUES(1,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(singleton) DO UPDATE SET zone_id=EXCLUDED.zone_id,boot_id=EXCLUDED.boot_id,sequence=EXCLUDED.sequence,observed_at=EXCLUDED.observed_at,received_at=EXCLUDED.received_at,gpio_state=EXCLUDED.gpio_state,reason=EXCLUDED.reason,demo_enabled=EXCLUDED.demo_enabled,last_ordinal=EXCLUDED.last_ordinal,feedback_enabled=EXCLUDED.feedback_enabled,feedback_state=EXCLUDED.feedback_state,feedback_fault=EXCLUDED.feedback_fault",zone,boot,seq,Timestamp.from(at),Timestamp.from(now),gpio,reason,n.get("demoEnabled").booleanValue(),last,feedback!=null,feedback==null?"UNKNOWN":feedback.state(),feedback==null?null:feedback.fault());
   }else{UUID id=uuid(n,"commandId");long ordinal=number(n,"ordinal");Command c=find(id);String action=WaterTelemetry.text(n,"action"),result=WaterTelemetry.text(n,"result");String error=n.get("errorCode").isNull()?null:WaterTelemetry.text(n,"errorCode");
    if(!Set.of("OPEN","CLOSE").contains(action)||!Set.of("EXECUTED","REJECTED").contains(result)||result.equals("EXECUTED")&&(error!=null||!gpio.equals(action.equals("OPEN")?"OPEN":"CLOSED"))||result.equals("REJECTED")&&(error==null||!error.matches("[A-Z_]{2,40}")))throw new IllegalArgumentException("ACK");
    if(c==null||ordinal!=c.ordinal()||!zone.equals(c.zoneId())||!action.equals(c.action())||c.action().equals("OPEN")&&!boot.equals(c.bootId())||at.isBefore(c.issuedAt().minusSeconds(2))||at.isAfter(c.expiresAt())||last<ordinal)return null;
    jdbc.update("UPDATE irrigation_demo_command SET state=?,error_code=?,ack_sequence=?,ack_boot_id=? WHERE command_id=? AND state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')",result,error,seq,boot,id);
   }return null;});
 }
 private static UUID uuid(JsonNode n,String field){String v=WaterTelemetry.text(n,field);if(!v.matches("[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}"))throw new IllegalArgumentException("UUID");return UUID.fromString(v);}
 private static long number(JsonNode n,String field){var v=n.path(field);if(!v.isIntegralNumber()||!v.canConvertToLong()||v.longValue()<0||v.longValue()>9007199254740991L)throw new IllegalArgumentException("Integer");return v.longValue();}
 private static int integer(JsonNode n,String field,int min,int max){long v=number(n,field);if(v<min||v>max)throw new IllegalArgumentException();return(int)v;}
 private static ResponseStatusException bad(HttpStatus s,String m){return new ResponseStatusException(s,m);}
}
