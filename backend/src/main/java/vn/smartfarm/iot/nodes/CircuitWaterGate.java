package vn.smartfarm.iot.nodes;
import java.sql.*;import java.time.Instant;import java.util.*;
import org.springframework.beans.factory.annotation.Value;import org.springframework.http.HttpStatus;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.*;import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.PumpCircuitRoute;import vn.smartfarm.iot.irrigation.*;
/** Per-circuit LOW float admission only; does not prove flow or continuously supervise a pump. */
@Service
public class CircuitWaterGate {
 public record Policy(String circuitId,int circuitRevision,String calibrationVersion,boolean enabled,int revision,boolean stopOnUnavailable) {}
 public record Request(int expectedRevision,int circuitRevision,String calibrationVersion,boolean enabled,boolean stopOnUnavailable) {public Request(int expectedRevision,int circuitRevision,String calibrationVersion,boolean enabled){this(expectedRevision,circuitRevision,calibrationVersion,enabled,false);}}
 public record Sample(Boolean value,String quality,Instant observedAt,Instant receivedAt,UUID bootId,long sequence,String dataSource,String calibrationVersion) {}
 public record View(IrrigationCircuits.Config config,Instant asOf,String calibrationVersion,Policy policy,String state,boolean allowed,Instant validUntil,Sample sample) {}
 private final JdbcTemplate jdbc;private final boolean profile,stopProfile;
 @org.springframework.beans.factory.annotation.Autowired
 public CircuitWaterGate(JdbcTemplate jdbc,@Value("${smartfarm.control.enabled:false}")boolean control,@Value("${smartfarm.control.pump-fencing-enabled:false}")boolean fence,@Value("${smartfarm.control.circuit-route-required:false}")boolean route,@Value("${smartfarm.irrigation.circuit-demo-enabled:false}")boolean circuit,@Value("${smartfarm.irrigation.water-stop-enabled:false}")boolean waterStop,@Value("${smartfarm.irrigation.session-enabled:false}")boolean session){this.jdbc=jdbc;profile=control&&fence&&route&&circuit;stopProfile=waterStop&&session;}
 public CircuitWaterGate(JdbcTemplate jdbc,boolean control,boolean fence,boolean route,boolean circuit){this(jdbc,control,fence,route,circuit,false,false);}
 private static Policy policy(ResultSet r,int n)throws SQLException{return new Policy(r.getString("circuit_id"),r.getInt("circuit_revision"),r.getString("calibration_version"),r.getBoolean("enabled"),r.getInt("revision"),r.getBoolean("stop_on_unavailable"));}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View snapshot(String id){return inspect(jdbc,id,Instant.now());}
 private static List<Map<String,Object>> channel(JdbcTemplate jdbc,IrrigationCircuits.Config c){return jdbc.queryForList("SELECT m.calibration_version FROM iot_channel m JOIN iot_node n USING(node_id) WHERE m.node_id=? AND m.channel_id=? AND m.metric='WATER_PRESENT' AND m.unit='boolean' AND n.node_type='WATER' AND n.telemetry_version=2",c.waterNodeId(),c.lowChannelId());}
 public static View inspect(JdbcTemplate jdbc,String id,Instant now){
  if(id==null||!id.matches("[A-Z][A-Z0-9_-]{1,31}"))throw bad(HttpStatus.BAD_REQUEST,"Invalid circuit");
  var configs=jdbc.query("SELECT * FROM irrigation_circuit WHERE circuit_id=?",IrrigationCircuits::map,id);if(configs.isEmpty())throw bad(HttpStatus.NOT_FOUND,"Circuit not found");var c=configs.getFirst();
  var list=jdbc.query("SELECT * FROM circuit_water_gate WHERE circuit_id=?",CircuitWaterGate::policy,id);var p=list.isEmpty()?null:list.getFirst();var channels=channel(jdbc,c);String calibration=channels.isEmpty()?null:(String)channels.getFirst().get("calibration_version");
  if(p==null||!p.enabled())return view(c,now,calibration,p,p==null?"NOT_CONFIGURED":"DISABLED",null,null);
  if(p.circuitRevision()!=c.revision()||jdbc.queryForObject("SELECT count(*) FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source=?",Integer.class,c.zoneId(),c.zoneRevision(),c.expectedSource())!=1)return view(c,now,calibration,p,"CONFIG_CHANGED",null,null);
  if(channels.isEmpty())return view(c,now,calibration,p,"CHANNEL_UNAVAILABLE",null,null);
  if(!Objects.equals(calibration,p.calibrationVersion()))return view(c,now,calibration,p,"CONFIG_CHANGED",null,null);
  var samples=jdbc.query("SELECT m.*,s.observed_at,s.received_at,s.boot_id,s.sequence,s.data_source FROM channel_sample m JOIN node_sample s ON s.id=m.sample_id AND s.node_id=m.node_id WHERE m.node_id=? AND m.channel_id=? ORDER BY s.observed_at DESC,s.sequence DESC,s.id DESC LIMIT 1",(r,n)->new Sample(r.getObject("boolean_value",Boolean.class),r.getString("quality"),r.getTimestamp("observed_at").toInstant(),r.getTimestamp("received_at").toInstant(),r.getObject("boot_id",UUID.class),r.getLong("sequence"),r.getString("data_source"),r.getString("calibration_version")),c.waterNodeId(),c.lowChannelId());
  if(samples.isEmpty())return view(c,now,calibration,p,"MISSING",null,null);var s=samples.getFirst();
  String state=s.observedAt().isAfter(now.plusSeconds(2))||s.receivedAt().isAfter(now.plusSeconds(2))?"CLOCK_SKEW":!s.observedAt().plusSeconds(30).isAfter(now)||!s.receivedAt().plusSeconds(30).isAfter(now)?"STALE":!s.quality().equals("VALID")||s.value()==null?"SENSOR_FAULT":!c.expectedSource().equals(s.dataSource())?"SOURCE_MISMATCH":!Objects.equals(p.calibrationVersion(),s.calibrationVersion())?"CALIBRATION_MISMATCH":s.value()?"AVAILABLE":"EMPTY";
  Instant until=Set.of("AVAILABLE","EMPTY").contains(state)?(s.observedAt().isBefore(s.receivedAt())?s.observedAt():s.receivedAt()).plusSeconds(30):null;
  return view(c,now,calibration,p,state,until,s);
 }
 private static View view(IrrigationCircuits.Config c,Instant now,String calibration,Policy p,String state,Instant until,Sample s){return new View(c,now,calibration,p,state,Set.of("NOT_CONFIGURED","DISABLED","AVAILABLE").contains(state),until,s);}
 public static View requireOn(JdbcTemplate jdbc,PumpCircuitRoute route){
  if(route==null){if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM circuit_water_gate WHERE enabled)",Boolean.class)))throw bad(HttpStatus.CONFLICT,"WATER_ROUTE_REQUIRED");return null;}
  var v=inspect(jdbc,route.circuitId(),Instant.now());if(!v.allowed())throw bad(HttpStatus.CONFLICT,"WATER_"+v.state());return v.policy()!=null&&v.policy().enabled()?v:null;
 }
 @Transactional
 public Policy save(String id,Request r){
  if(r==null||r.expectedRevision()<0||r.expectedRevision()==Integer.MAX_VALUE||r.circuitRevision()<1||r.calibrationVersion()!=null&&(r.calibrationVersion().isBlank()||r.calibrationVersion().length()>40))throw bad(HttpStatus.BAD_REQUEST,"Invalid water gate policy");
  if(r.stopOnUnavailable()&&!r.enabled())throw bad(HttpStatus.BAD_REQUEST,"Water stop requires enabled admission gate");
  if(r.stopOnUnavailable()&&!stopProfile)throw bad(HttpStatus.CONFLICT,"Enable operator session and water stop profile first");
  jdbc.queryForObject("SELECT singleton FROM pump_dispatch_gate WHERE singleton=1 FOR UPDATE",Integer.class);jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Long.class);
  var old=inspect(jdbc,id,Instant.now());if((old.policy()==null?0:old.policy().revision())!=r.expectedRevision()||old.config().revision()!=r.circuitRevision())throw bad(HttpStatus.CONFLICT,"Review current circuit and water policy");IrrigationSessionGuard.editable(jdbc);PumpCircuitRoute.requireIdle(jdbc);
  if(r.enabled()){
   if(!profile)throw bad(HttpStatus.CONFLICT,"Enable fenced route-bound circuit profile first");var c=old.config();var ch=channel(jdbc,c);if(ch.isEmpty()||!Objects.equals(ch.getFirst().get("calibration_version"),r.calibrationVersion()))throw bad(HttpStatus.BAD_REQUEST,"Review declared WATER LOW channel calibration");
   if(jdbc.queryForObject("SELECT count(*) FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source=?",Integer.class,c.zoneId(),c.zoneRevision(),c.expectedSource())!=1)throw bad(HttpStatus.CONFLICT,"Review zone revision first");
  }
  jdbc.update("INSERT INTO circuit_water_gate(circuit_id,circuit_revision,calibration_version,enabled,revision,stop_on_unavailable) VALUES(?,?,?,?,?,?) ON CONFLICT(circuit_id) DO UPDATE SET circuit_revision=EXCLUDED.circuit_revision,calibration_version=EXCLUDED.calibration_version,enabled=EXCLUDED.enabled,revision=EXCLUDED.revision,stop_on_unavailable=EXCLUDED.stop_on_unavailable",id,r.circuitRevision(),r.calibrationVersion(),r.enabled(),r.expectedRevision()+1,r.stopOnUnavailable());
  return jdbc.query("SELECT * FROM circuit_water_gate WHERE circuit_id=?",CircuitWaterGate::policy,id).getFirst();
 }
 private static ResponseStatusException bad(HttpStatus status,String text){return new ResponseStatusException(status,text);}
}
