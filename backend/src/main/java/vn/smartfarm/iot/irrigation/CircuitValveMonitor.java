package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.JsonNode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.smartfarm.iot.nodes.WaterTelemetry;

/** Opt-in observations from separate simulator boards. This service has no command transport. */
@Service
public class CircuitValveMonitor {
 public record Observation(String controllerId,String actuatorId,String circuitId,int circuitRevision,String zoneId,int zoneRevision,
  UUID bootId,long sequence,Instant observedAt,Instant receivedAt,String dataSource,boolean monitorOnly,String gpioState,String reason,ValvePositionFeedback positionFeedback) {}
 private final JdbcTemplate jdbc;private final WaterTelemetry json;private final boolean enabled;
 public CircuitValveMonitor(JdbcTemplate jdbc,WaterTelemetry json,@Value("${smartfarm.irrigation.monitor-enabled:false}")boolean enabled){this.jdbc=jdbc;this.json=json;this.enabled=enabled;}
 public boolean enabled(){return enabled;}
 private static boolean eligible(IrrigationCircuits.Config c){return c.expectedSource().equals("SIMULATOR")&&c.controllerId().matches("IRRIGATION(0[2-9]|[1-9][0-9])")&&c.valveId().matches("VALVE(0[2-9]|[1-9][0-9])");}
 /** Exact topic subscriptions, captured at startup/reconnect; additions require backend restart. */
 @Transactional(readOnly=true)
 public List<String> topics(){if(!enabled)return List.of();return jdbc.query("SELECT * FROM irrigation_circuit ORDER BY valve_id",IrrigationCircuits::map).stream().filter(CircuitValveMonitor::eligible).filter(c->IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT")).map(c->"smartfarm/FARM001/"+c.valveId()+"/status").toList();}
 public static boolean acceptsTopic(String topic){return topic!=null&&topic.matches("smartfarm/FARM001/VALVE(0[2-9]|[1-9][0-9])/status");}
 private Observation map(java.sql.ResultSet r,int n)throws java.sql.SQLException{return new Observation(r.getString("controller_id"),r.getString("valve_id"),r.getString("circuit_id"),r.getInt("circuit_revision"),r.getString("zone_id"),r.getInt("zone_revision"),r.getObject("boot_id",UUID.class),r.getLong("sequence"),r.getTimestamp("observed_at").toInstant(),r.getTimestamp("received_at").toInstant(),"SIMULATOR",true,"CLOSED",r.getString("reason"),r.getBoolean("feedback_enabled")?new ValvePositionFeedback(1,true,r.getString("feedback_state"),r.getString("feedback_fault")):null);}
 @Transactional(readOnly=true)
 public Observation latest(String valve){return jdbc.query("SELECT * FROM circuit_valve_status WHERE valve_id=?",this::map,valve).stream().findFirst().orElse(null);}
 public String state(IrrigationCircuits.Config c,Observation s,Instant now){
  if(s==null)return "NOT_CONNECTED";
  if(!s.controllerId().equals(c.controllerId())||!s.circuitId().equals(c.circuitId())||s.circuitRevision()!=c.revision()||!s.zoneId().equals(c.zoneId())||s.zoneRevision()!=c.zoneRevision()||!c.expectedSource().equals(s.dataSource()))return "CONFIG_CHANGED";
  if(!enabled)return "MONITOR_DISABLED";
  if(!s.observedAt().isAfter(now.minusSeconds(15))||!s.receivedAt().isAfter(now.minusSeconds(15))||s.observedAt().isAfter(now.plusSeconds(2))||s.receivedAt().isAfter(now.plusSeconds(2)))return "STALE";
  if(s.reason().equals("DEVICE_FAULT"))return "FAULT";
  if(s.positionFeedback()==null)return "UNVERIFIED";
  return s.positionFeedback().fault()!=null?"FAULT":s.positionFeedback().state();
 }
 @Transactional
 public void receive(String topic,byte[] bytes,boolean retained){
  if(!enabled||retained||!acceptsTopic(topic)||bytes==null||bytes.length>4096)throw new IllegalArgumentException("Monitor profile/topic/size");
  JsonNode p=json.object(bytes);var fields=new HashSet<>(Set.of("schemaVersion","controllerId","actuatorId","zoneId","bootId","sequence","timestamp","dataSource","feedbackState","gpioState","reason","demoEnabled","lastOrdinal","monitorOnly","circuitId","circuitRevision","zoneRevision"));if(p.has("positionFeedback"))fields.add("positionFeedback");WaterTelemetry.fields(p,fields);
  String controller=WaterTelemetry.text(p,"controllerId"),actuator=WaterTelemetry.text(p,"actuatorId"),zone=WaterTelemetry.code(WaterTelemetry.text(p,"zoneId")),circuit=WaterTelemetry.code(WaterTelemetry.text(p,"circuitId")),reason=WaterTelemetry.text(p,"reason");
  int revision=(int)integer(p,"circuitRevision",1,Integer.MAX_VALUE),zoneRevision=(int)integer(p,"zoneRevision",1,Integer.MAX_VALUE);long sequence=integer(p,"sequence",0,9007199254740991L);String b=WaterTelemetry.text(p,"bootId");if(!b.matches("[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}"))throw new IllegalArgumentException("UUID");UUID boot=UUID.fromString(b);
  Instant at=Instant.parse(WaterTelemetry.text(p,"timestamp")),now=Instant.now();
  if(integer(p,"schemaVersion",1,1)!=1||!controller.matches("IRRIGATION(0[2-9]|[1-9][0-9])")||!topic.equals("smartfarm/FARM001/"+actuator+"/status")||!WaterTelemetry.text(p,"dataSource").equals("SIMULATOR")
   ||!p.path("monitorOnly").isBoolean()||!p.get("monitorOnly").booleanValue()||!p.path("demoEnabled").isBoolean()||p.get("demoEnabled").booleanValue()||!WaterTelemetry.text(p,"gpioState").equals("CLOSED")||integer(p,"lastOrdinal",0,0)!=0
   ||!Set.of("BOOT","CONNECTION_LOST","DEVICE_FAULT","POSITION_FAULT").contains(reason)||!at.isAfter(now.minusSeconds(15))||at.isAfter(now.plusSeconds(2)))throw new IllegalArgumentException("Monitor identity/state/time");
  ValvePositionFeedback feedback=ValvePositionFeedback.parse(p);
  // Same order as circuit edits: configuration gate, then the circuit row. Serializes this valve's boot/sequence.
  jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR SHARE",Long.class);
  var configured=jdbc.query("SELECT * FROM irrigation_circuit WHERE valve_id=? FOR UPDATE",IrrigationCircuits::map,actuator);
  if(configured.isEmpty())throw new IllegalArgumentException("Unknown valve");var c=configured.getFirst();
  if(!eligible(c)||!c.circuitId().equals(circuit)||c.revision()!=revision||!c.controllerId().equals(controller)||!c.zoneId().equals(zone)||c.zoneRevision()!=zoneRevision||!IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT"))throw new IllegalArgumentException("Configuration mismatch");
  Observation old=latest(actuator);
  if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM circuit_valve_boot WHERE valve_id=? AND boot_id=? AND retired)",Boolean.class,actuator,boot)))return;
  if(old!=null){
   if(boot.equals(old.bootId())){
    if(old.circuitRevision()!=revision||old.zoneRevision()!=zoneRevision||!old.circuitId().equals(circuit)||!old.controllerId().equals(controller)||!old.zoneId().equals(zone)||sequence<=old.sequence()||at.isBefore(old.observedAt()))return;
    if(old.positionFeedback()!=null&&(feedback==null||old.positionFeedback().fault()!=null&&feedback.fault()==null))return;
   }else if(!at.isAfter(old.observedAt()))return;
   if(!boot.equals(old.bootId()))jdbc.update("UPDATE circuit_valve_boot SET retired=true WHERE valve_id=? AND boot_id=?",actuator,old.bootId());
  }
  jdbc.update("""
   INSERT INTO circuit_valve_status(valve_id,controller_id,circuit_id,circuit_revision,zone_id,zone_revision,boot_id,sequence,observed_at,received_at,reason,feedback_state,feedback_enabled,feedback_fault)
   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(valve_id) DO UPDATE SET controller_id=EXCLUDED.controller_id,circuit_id=EXCLUDED.circuit_id,circuit_revision=EXCLUDED.circuit_revision,zone_id=EXCLUDED.zone_id,zone_revision=EXCLUDED.zone_revision,boot_id=EXCLUDED.boot_id,sequence=EXCLUDED.sequence,observed_at=EXCLUDED.observed_at,received_at=EXCLUDED.received_at,reason=EXCLUDED.reason,feedback_state=EXCLUDED.feedback_state,feedback_enabled=EXCLUDED.feedback_enabled,feedback_fault=EXCLUDED.feedback_fault
   """,actuator,controller,circuit,revision,zone,zoneRevision,boot,sequence,Timestamp.from(at),Timestamp.from(now),reason,feedback==null?"UNKNOWN":feedback.state(),feedback!=null,feedback==null?null:feedback.fault());
  jdbc.update("INSERT INTO circuit_valve_boot(valve_id,boot_id) VALUES(?,?) ON CONFLICT DO NOTHING",actuator,boot);
 }
 private static long integer(JsonNode p,String field,long min,long max){var v=p.path(field);if(!v.isIntegralNumber()||!v.canConvertToLong()||v.longValue()<min||v.longValue()>max)throw new IllegalArgumentException("Integer");return v.longValue();}
}
