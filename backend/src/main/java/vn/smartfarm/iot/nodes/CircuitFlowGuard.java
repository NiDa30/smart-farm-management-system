package vn.smartfarm.iot.nodes;

import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.PumpCircuitRoute;
import vn.smartfarm.iot.irrigation.*;

/** Supervision of the declared station FLOW after ON intent, never physical branch proof. */
@Service
public class CircuitFlowGuard {
 public record Policy(String circuitId,int circuitRevision,String calibrationVersion,boolean enabled,double minimumLpm,int graceSeconds,int revision) {}
 public record Request(int expectedRevision,int circuitRevision,String calibrationVersion,boolean enabled,double minimumLpm,int graceSeconds) {}
 public record Sample(Double value,String quality,Instant observedAt,Instant receivedAt,UUID bootId,long sequence,String dataSource,String calibrationVersion) {}
 public record View(IrrigationCircuits.Config config,Instant asOf,boolean workerEnabled,String calibrationVersion,Policy policy,UUID sessionId,UUID onId,Instant onReservedAt,Instant graceUntil,String state,boolean stopRequired,Instant validUntil,Sample sample) {}
 private static final com.fasterxml.jackson.databind.ObjectMapper CONFIG_JSON=new com.fasterxml.jackson.databind.ObjectMapper();
 private final JdbcTemplate jdbc;
 private final boolean profile,worker;
 public CircuitFlowGuard(JdbcTemplate jdbc,@Value("${smartfarm.control.enabled:false}")boolean control,@Value("${smartfarm.control.pump-fencing-enabled:false}")boolean fence,@Value("${smartfarm.control.circuit-route-required:false}")boolean route,@Value("${smartfarm.irrigation.circuit-demo-enabled:false}")boolean circuit,@Value("${smartfarm.irrigation.session-enabled:false}")boolean session,@Value("${smartfarm.irrigation.flow-stop-enabled:false}")boolean worker){this.jdbc=jdbc;profile=control&&fence&&route&&circuit&&session&&worker;this.worker=worker;}
 private static Policy policy(ResultSet r,int n)throws SQLException{return new Policy(r.getString("circuit_id"),r.getInt("circuit_revision"),r.getString("calibration_version"),r.getBoolean("enabled"),r.getDouble("minimum_lpm"),r.getInt("grace_seconds"),r.getInt("revision"));}
 private static List<Map<String,Object>> channel(JdbcTemplate jdbc,IrrigationCircuits.Config c){return jdbc.queryForList("SELECT m.calibration_version FROM iot_channel m JOIN iot_node n USING(node_id) WHERE m.node_id=? AND m.channel_id=? AND m.metric='FLOW_RATE' AND m.unit='L/min' AND n.node_type='WATER' AND n.telemetry_version=2",c.waterNodeId(),c.flowChannelId());}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View snapshot(String id){return inspect(jdbc,id,Instant.now(),worker);}
 public static View inspect(JdbcTemplate jdbc,String id,Instant now,boolean worker){
  if(id==null||!id.matches("[A-Z][A-Z0-9_-]{1,31}"))throw bad(HttpStatus.BAD_REQUEST,"Invalid circuit");
  var configs=jdbc.query("SELECT * FROM irrigation_circuit WHERE circuit_id=?",IrrigationCircuits::map,id);if(configs.isEmpty())throw bad(HttpStatus.NOT_FOUND,"Circuit not found");var c=configs.getFirst();
  var policies=jdbc.query("SELECT * FROM circuit_flow_guard WHERE circuit_id=?",CircuitFlowGuard::policy,id);var p=policies.isEmpty()?null:policies.getFirst();var ch=channel(jdbc,c);String cal=ch.isEmpty()?null:(String)ch.getFirst().get("calibration_version");
  if(p==null||!p.enabled())return view(c,now,worker,cal,p,null,null,null,null,p==null?"NOT_CONFIGURED":"DISABLED",null,null);
  if(!worker)return view(c,now,false,cal,p,null,null,null,null,"MONITOR_DISABLED",null,null);
  var sessions=jdbc.queryForList("SELECT session_id,on_id,config_snapshot FROM irrigation_session WHERE circuit_id=? AND on_id IS NOT NULL AND NOT stop_requested AND phase IN ('DISPATCHING_ON','WAIT_ON')",id);
  if(sessions.isEmpty())return view(c,now,true,cal,p,null,null,null,null,"IDLE",null,null);
  var r=sessions.getFirst();UUID session=(UUID)r.get("session_id"),on=(UUID)r.get("on_id");
  var anchors=jdbc.query("SELECT created_at FROM irrigation_session_action WHERE session_id=? AND request_id=? AND action='ON'",(s,n)->s.getTimestamp(1).toInstant(),session,on);
  Instant anchor=anchors.isEmpty()?null:anchors.getFirst(),deadline=anchor==null?null:anchor.plusSeconds(p.graceSeconds());
  String state=null;
  if(p.circuitRevision()!=c.revision()||jdbc.queryForObject("SELECT count(*) FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source=?",Integer.class,c.zoneId(),c.zoneRevision(),c.expectedSource())!=1||!Boolean.TRUE.equals(jdbc.queryForObject("SELECT config_snapshot=?::jsonb FROM irrigation_session WHERE session_id=?",Boolean.class,jsonConfig(c),session)))state="CONFIG_CHANGED";
  else if(ch.isEmpty())state="CHANNEL_UNAVAILABLE";
  else if(!Objects.equals(cal,p.calibrationVersion()))state="CONFIG_CHANGED";
  else if(anchor==null)state="ANCHOR_MISSING";
  else if(anchor.isAfter(now))state="CLOCK_SKEW";
  else if(now.isBefore(deadline))state="GRACE";
  if(state!=null)return view(c,now,true,cal,p,session,on,anchor,deadline,state,null,null);
  var samples=jdbc.query("SELECT m.*,s.observed_at,s.received_at,s.boot_id,s.sequence,s.data_source FROM channel_sample m JOIN node_sample s ON s.id=m.sample_id AND s.node_id=m.node_id WHERE m.node_id=? AND m.channel_id=? ORDER BY s.observed_at DESC,s.sequence DESC,s.id DESC LIMIT 1",(s,n)->new Sample(s.getObject("number_value",Double.class),s.getString("quality"),s.getTimestamp("observed_at").toInstant(),s.getTimestamp("received_at").toInstant(),s.getObject("boot_id",UUID.class),s.getLong("sequence"),s.getString("data_source"),s.getString("calibration_version")),c.waterNodeId(),c.flowChannelId());
  if(samples.isEmpty())return view(c,now,true,cal,p,session,on,anchor,deadline,"MISSING",null,null);
  var s=samples.getFirst();
  state=s.observedAt().isAfter(now.plusSeconds(2))||s.receivedAt().isAfter(now.plusSeconds(2))?"CLOCK_SKEW":!s.observedAt().isAfter(anchor)||!s.receivedAt().isAfter(anchor)?"BEFORE_ON":!s.observedAt().plusSeconds(10).isAfter(now)||!s.receivedAt().plusSeconds(10).isAfter(now)?"STALE":!s.quality().equals("VALID")||s.value()==null||!Double.isFinite(s.value())||s.value()<0?"SENSOR_FAULT":!c.expectedSource().equals(s.dataSource())?"SOURCE_MISMATCH":!Objects.equals(p.calibrationVersion(),s.calibrationVersion())?"CALIBRATION_MISMATCH":s.value()<p.minimumLpm()?"LOW_FLOW":"FLOW_OK";
  var until=Set.of("FLOW_OK","LOW_FLOW").contains(state)?(s.observedAt().isBefore(s.receivedAt())?s.observedAt():s.receivedAt()).plusSeconds(10):null;
  return view(c,now,true,cal,p,session,on,anchor,deadline,state,until,s);
 }
 private static String jsonConfig(IrrigationCircuits.Config c){try{return CONFIG_JSON.writeValueAsString(c);}catch(Exception e){throw new IllegalStateException(e);}}
 private static View view(IrrigationCircuits.Config c,Instant now,boolean worker,String cal,Policy p,UUID session,UUID on,Instant anchor,Instant deadline,String state,Instant until,Sample s){boolean stop=!Set.of("NOT_CONFIGURED","DISABLED","MONITOR_DISABLED","IDLE","GRACE","FLOW_OK").contains(state);return new View(c,now,worker,cal,p,session,on,anchor,deadline,state,stop,until,s);}
 public static void requireDuration(JdbcTemplate jdbc,String id,int seconds){var grace=jdbc.queryForList("SELECT grace_seconds FROM circuit_flow_guard WHERE circuit_id=? AND enabled",Integer.class,id);if(!grace.isEmpty()&&seconds<=grace.getFirst())throw bad(HttpStatus.CONFLICT,"Session duration must exceed FLOW grace");}
 @Transactional
 public Policy save(String id,Request r){
  if(r==null||r.expectedRevision()<0||r.expectedRevision()==Integer.MAX_VALUE||r.circuitRevision()<1||!Double.isFinite(r.minimumLpm())||r.minimumLpm()<=0||r.minimumLpm()>1000||r.graceSeconds()<1||r.graceSeconds()>8||r.calibrationVersion()!=null&&(r.calibrationVersion().isBlank()||r.calibrationVersion().length()>40))throw bad(HttpStatus.BAD_REQUEST,"Invalid flow supervision policy");
  if(r.enabled()&&!profile)throw bad(HttpStatus.CONFLICT,"Enable fenced route, circuit, operator session and flow stop profiles first");
  jdbc.queryForObject("SELECT singleton FROM pump_dispatch_gate WHERE singleton=1 FOR UPDATE",Integer.class);jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Long.class);
  var old=inspect(jdbc,id,Instant.now(),worker);if((old.policy()==null?0:old.policy().revision())!=r.expectedRevision()||old.config().revision()!=r.circuitRevision())throw bad(HttpStatus.CONFLICT,"Review current circuit and flow policy");
  IrrigationSessionGuard.editable(jdbc);PumpCircuitRoute.requireIdle(jdbc);
  if(r.enabled()){
   var ch=channel(jdbc,old.config());if(ch.isEmpty()||!Objects.equals(ch.getFirst().get("calibration_version"),r.calibrationVersion()))throw bad(HttpStatus.BAD_REQUEST,"Review declared WATER FLOW calibration");
   var c=old.config();if(jdbc.queryForObject("SELECT count(*) FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source=?",Integer.class,c.zoneId(),c.zoneRevision(),c.expectedSource())!=1)throw bad(HttpStatus.CONFLICT,"Review zone revision first");
  }
  jdbc.update("INSERT INTO circuit_flow_guard(circuit_id,circuit_revision,calibration_version,enabled,minimum_lpm,grace_seconds,revision) VALUES(?,?,?,?,?,?,?) ON CONFLICT(circuit_id) DO UPDATE SET circuit_revision=EXCLUDED.circuit_revision,calibration_version=EXCLUDED.calibration_version,enabled=EXCLUDED.enabled,minimum_lpm=EXCLUDED.minimum_lpm,grace_seconds=EXCLUDED.grace_seconds,revision=EXCLUDED.revision",id,r.circuitRevision(),r.calibrationVersion(),r.enabled(),r.minimumLpm(),r.graceSeconds(),r.expectedRevision()+1);
  return jdbc.query("SELECT * FROM circuit_flow_guard WHERE circuit_id=?",CircuitFlowGuard::policy,id).getFirst();
 }
 private static ResponseStatusException bad(HttpStatus s,String m){return new ResponseStatusException(s,m);}
}
