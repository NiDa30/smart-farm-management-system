package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Fault history and operator acknowledgement. No control transport or safety permission. */
@Service
public class CircuitValveAlerts {
 public record Alert(long id,String type,JsonNode circuitSnapshot,Instant openedAt,Instant openedSourceAt,JsonNode openedEvidence,
  Instant clearedAt,Instant clearedSourceAt,JsonNode clearedEvidence,Instant acknowledgedAt,String acknowledgementNote,String context) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final boolean monitorEnabled;
 public CircuitValveAlerts(JdbcTemplate jdbc,ObjectMapper mapper,@Value("${smartfarm.irrigation.monitor-enabled:false}")boolean monitorEnabled){this.jdbc=jdbc;this.mapper=mapper;this.monitorEnabled=monitorEnabled;}
 @EventListener(ApplicationReadyEvent.class)
 @Transactional
 public void restart(){jdbc.update("UPDATE circuit_valve_alert_cursor SET position_healthy=0,device_healthy=0 WHERE position_healthy<>0 OR device_healthy<>0");}

 /** Only accepted newly committed observations reach here, inside the receiver transaction. */
 @Transactional
 public void observe(IrrigationCircuits.Config c,CircuitValveMonitor.Observation s){
  if(!monitorEnabled||!s.monitorOnly()||!s.dataSource().equals("SIMULATOR")||!c.expectedSource().equals(s.dataSource())||!c.circuitId().equals(s.circuitId())||c.revision()!=s.circuitRevision()||!c.zoneId().equals(s.zoneId())||c.zoneRevision()!=s.zoneRevision()||!c.valveId().equals(s.actuatorId())||!c.controllerId().equals(s.controllerId()))throw new IllegalArgumentException("Matching monitor observation required");
  jdbc.update("INSERT INTO circuit_valve_alert_cursor(circuit_id,circuit_revision) VALUES(?,?) ON CONFLICT DO NOTHING",c.circuitId(),c.revision());
  var cursor=jdbc.queryForMap("SELECT * FROM circuit_valve_alert_cursor WHERE circuit_id=? AND circuit_revision=? FOR UPDATE",c.circuitId(),c.revision());
  Timestamp prior=(Timestamp)cursor.get("observed_at"),received=(Timestamp)cursor.get("received_at");
  if(prior!=null&&(s.observedAt().isBefore(prior.toInstant())||s.bootId().equals(cursor.get("boot_id"))&&s.sequence()<=((Number)cursor.get("sequence")).longValue()))return;
  boolean adjacent=prior!=null&&s.bootId().equals(cursor.get("boot_id"))&&s.sequence()==((Number)cursor.get("sequence")).longValue()+1&&s.observedAt().isAfter(prior.toInstant())
   &&Duration.between(prior.toInstant(),s.observedAt()).compareTo(Duration.ofSeconds(15))<=0&&Duration.between(received.toInstant(),s.receivedAt()).compareTo(Duration.ofSeconds(15))<=0;
  var feedback=s.positionFeedback();boolean positionFault=feedback!=null&&feedback.fault()!=null,deviceFault=s.reason().equals("DEVICE_FAULT");
  boolean deviceHealthy=!deviceFault&&!positionFault&&!s.reason().equals("POSITION_FAULT"),positionHealthy=deviceHealthy&&feedback!=null&&feedback.closed();
  int position=condition(c,s,"POSITION_FAULT",positionFault,positionHealthy,adjacent,((Number)cursor.get("position_healthy")).intValue());
  int device=condition(c,s,"DEVICE_FAULT",deviceFault,deviceHealthy,adjacent,((Number)cursor.get("device_healthy")).intValue());
  jdbc.update("UPDATE circuit_valve_alert_cursor SET boot_id=?,sequence=?,observed_at=?,received_at=?,position_healthy=?,device_healthy=? WHERE circuit_id=? AND circuit_revision=?",s.bootId(),s.sequence(),Timestamp.from(s.observedAt()),Timestamp.from(s.receivedAt()),position,device,c.circuitId(),c.revision());
 }
 private int condition(IrrigationCircuits.Config c,CircuitValveMonitor.Observation s,String type,boolean fault,boolean healthy,boolean adjacent,int previous){
  var active=jdbc.query("SELECT id FROM circuit_valve_alert WHERE circuit_id=? AND circuit_revision=? AND type=? AND cleared_at IS NULL",(r,n)->r.getLong(1),c.circuitId(),c.revision(),type);
  if(fault){if(active.isEmpty())jdbc.update("INSERT INTO circuit_valve_alert(circuit_id,circuit_revision,valve_id,controller_id,type,circuit_snapshot,opened_at,opened_source_at,opened_evidence) VALUES(?,?,?,?,?,?::jsonb,?,?,?::jsonb)",c.circuitId(),c.revision(),c.valveId(),c.controllerId(),type,tree(c).toString(),Timestamp.from(s.receivedAt()),Timestamp.from(s.observedAt()),tree(s).toString());return 0;}
  if(!healthy||active.isEmpty())return 0;int count=adjacent?previous+1:1;
  if(count>=2){jdbc.update("UPDATE circuit_valve_alert SET cleared_at=?,cleared_source_at=?,cleared_evidence=?::jsonb WHERE id=?",Timestamp.from(s.receivedAt()),Timestamp.from(s.observedAt()),tree(s).toString(),active.getFirst());return 0;}return count;
 }
 private JsonNode tree(Object value){return mapper.valueToTree(value);}
 private JsonNode json(String value){if(value==null)return null;try{return mapper.readTree(value);}catch(Exception e){throw new IllegalStateException("Invalid stored valve episode",e);}}
 private static Instant instant(Timestamp t){return t==null?null:t.toInstant();}
 private Alert map(java.sql.ResultSet r,int n)throws java.sql.SQLException{
  JsonNode config=json(r.getString("circuit_snapshot"));String context="MONITOR_DISABLED";
  if(monitorEnabled){try{var c=mapper.treeToValue(config,IrrigationCircuits.Config.class);var current=jdbc.query("SELECT * FROM irrigation_circuit WHERE circuit_id=?",IrrigationCircuits::map,c.circuitId());context=!current.isEmpty()&&tree(current.getFirst()).equals(config)&&IrrigationCircuits.configurationState(jdbc,current.getFirst()).equals("CURRENT")?"CURRENT":"CONFIG_CHANGED";}catch(Exception e){throw new IllegalStateException("Invalid circuit snapshot",e);}}
  return new Alert(r.getLong("id"),r.getString("type"),config,instant(r.getTimestamp("opened_at")),instant(r.getTimestamp("opened_source_at")),json(r.getString("opened_evidence")),instant(r.getTimestamp("cleared_at")),instant(r.getTimestamp("cleared_source_at")),json(r.getString("cleared_evidence")),instant(r.getTimestamp("acknowledged_at")),r.getString("acknowledgement_note"),context);
 }
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public List<Alert> list(){return jdbc.query("SELECT * FROM circuit_valve_alert ORDER BY (cleared_at IS NULL) DESC,(acknowledged_at IS NULL) DESC,id DESC LIMIT 100",this::map);}
 @Transactional(readOnly=true)
 public Alert find(long id){if(id<1)throw bad(HttpStatus.BAD_REQUEST,"Positive ID required");return jdbc.query("SELECT * FROM circuit_valve_alert WHERE id=?",this::map,id).stream().findFirst().orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Valve alert not found"));}
 @Transactional
 public Alert acknowledge(long id,String note){
  if(id<1||note!=null&&note.length()>500)throw bad(HttpStatus.BAD_REQUEST,"Positive ID and note <=500 required");String normalized=note==null||note.isBlank()?null:note.strip();
  if(jdbc.query("SELECT id FROM circuit_valve_alert WHERE id=? FOR UPDATE",(r,n)->r.getLong(1),id).isEmpty())throw bad(HttpStatus.NOT_FOUND,"Valve alert not found");
  var a=find(id);if(a.acknowledgedAt()!=null){if(!Objects.equals(normalized,a.acknowledgementNote()))throw bad(HttpStatus.CONFLICT,"First note is immutable");return a;}
  if(a.clearedAt()!=null)throw bad(HttpStatus.CONFLICT,"Condition has recovered");jdbc.update("UPDATE circuit_valve_alert SET acknowledged_at=CURRENT_TIMESTAMP,acknowledgement_note=? WHERE id=?",normalized,id);return find(id);
 }
 private static ResponseStatusException bad(HttpStatus s,String m){return new ResponseStatusException(s,m);}
}
