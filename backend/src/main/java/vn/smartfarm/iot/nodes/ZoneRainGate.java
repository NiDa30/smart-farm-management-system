package vn.smartfarm.iot.nodes;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.PumpCircuitRoute;
import vn.smartfarm.iot.irrigation.IrrigationSessionGuard;

/** Point-in-time rain admission gate. Does not schedule, stop, retry or resume a pump. */
@Service
public class ZoneRainGate {
 public record Policy(String zoneId,int zoneRevision,String nodeId,String channelId,String expectedSource,String calibrationVersion,boolean enabled,int revision) {}
 public record Request(int expectedRevision,int zoneRevision,String nodeId,String channelId,String expectedSource,String calibrationVersion,boolean enabled) {}
 public record Sample(Boolean value,String quality,Instant observedAt,Instant receivedAt,UUID bootId,long sequence,String dataSource,String calibrationVersion) {}
 public record View(String zoneId,int zoneRevision,String areaId,String zoneSource,Instant asOf,Policy policy,String state,boolean allowed,Instant validUntil,Sample sample) {}
 private final JdbcTemplate jdbc;
 private final boolean profile;
 public ZoneRainGate(JdbcTemplate jdbc,@Value("${smartfarm.control.enabled:false}")boolean control,@Value("${smartfarm.control.pump-fencing-enabled:false}")boolean fence,@Value("${smartfarm.control.circuit-route-required:false}")boolean route,@Value("${smartfarm.irrigation.circuit-demo-enabled:false}")boolean circuit){this.jdbc=jdbc;profile=control&&fence&&route&&circuit;}
 private static Policy policy(ResultSet r,int n)throws SQLException{return new Policy(r.getString("zone_id"),r.getInt("zone_revision"),r.getString("node_id"),r.getString("channel_id"),r.getString("expected_source"),r.getString("calibration_version"),r.getBoolean("enabled"),r.getInt("revision"));}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View snapshot(String zone){return inspect(jdbc,zone,Instant.now());}
 public static View inspect(JdbcTemplate jdbc,String zone,Instant now){
  if(zone==null||!zone.matches("[A-Z][A-Z0-9_-]{1,31}"))throw bad(HttpStatus.BAD_REQUEST,"Invalid zone");
  var zones=jdbc.queryForList("SELECT revision,area_id,expected_source FROM irrigation_zone WHERE zone_id=?",zone);
  if(zones.isEmpty())throw bad(HttpStatus.NOT_FOUND,"Zone not found");var z=zones.getFirst();int revision=((Number)z.get("revision")).intValue();String area=(String)z.get("area_id"),source=(String)z.get("expected_source");
  var policies=jdbc.query("SELECT * FROM zone_rain_gate WHERE zone_id=?",ZoneRainGate::policy,zone);Policy p=policies.isEmpty()?null:policies.getFirst();
  if(p==null||!p.enabled())return view(zone,revision,area,source,now,p,p==null?"NOT_CONFIGURED":"DISABLED",null,null);
  if(p.zoneRevision()!=revision||!p.expectedSource().equals(source))return view(zone,revision,area,source,now,p,"CONFIG_CHANGED",null,null);
  var channels=jdbc.queryForList("SELECT c.calibration_version FROM iot_channel c JOIN iot_node n USING(node_id) WHERE c.node_id=? AND c.channel_id=? AND c.metric='RAIN_DETECTED' AND c.unit='boolean' AND n.node_type='WEATHER' AND n.telemetry_version=2 AND n.area_id=?",p.nodeId(),p.channelId(),area);
  if(channels.isEmpty())return view(zone,revision,area,source,now,p,"CHANNEL_UNAVAILABLE",null,null);
  if(!Objects.equals(channels.getFirst().get("calibration_version"),p.calibrationVersion()))return view(zone,revision,area,source,now,p,"CONFIG_CHANGED",null,null);
  var samples=jdbc.query("""
   SELECT m.*,s.observed_at,s.received_at,s.boot_id,s.sequence,s.data_source
   FROM channel_sample m JOIN node_sample s ON s.id=m.sample_id AND s.node_id=m.node_id
   WHERE m.node_id=? AND m.channel_id=? ORDER BY s.observed_at DESC,s.sequence DESC,s.id DESC LIMIT 1
   """,(r,n)->new Sample(r.getObject("boolean_value",Boolean.class),r.getString("quality"),r.getTimestamp("observed_at").toInstant(),r.getTimestamp("received_at").toInstant(),r.getObject("boot_id",UUID.class),r.getLong("sequence"),r.getString("data_source"),r.getString("calibration_version")),p.nodeId(),p.channelId());
  if(samples.isEmpty())return view(zone,revision,area,source,now,p,"MISSING",null,null);var s=samples.getFirst();
  String state=s.observedAt().isAfter(now.plusSeconds(2))||s.receivedAt().isAfter(now.plusSeconds(2))?"CLOCK_SKEW":
   !s.observedAt().plusSeconds(30).isAfter(now)||!s.receivedAt().plusSeconds(30).isAfter(now)?"STALE":
   !s.quality().equals("VALID")||s.value()==null?"SENSOR_FAULT":!p.expectedSource().equals(s.dataSource())?"SOURCE_MISMATCH":
   !Objects.equals(p.calibrationVersion(),s.calibrationVersion())?"CALIBRATION_MISMATCH":s.value()?"RAIN":"DRY";
  Instant until=Set.of("RAIN","DRY").contains(state)?(s.observedAt().isBefore(s.receivedAt())?s.observedAt():s.receivedAt()).plusSeconds(30):null;
  return view(zone,revision,area,source,now,p,state,until,s);
 }
 private static View view(String zone,int revision,String area,String source,Instant at,Policy policy,String state,Instant until,Sample s){return new View(zone,revision,area,source,at,policy,state,Set.of("NOT_CONFIGURED","DISABLED","DRY").contains(state),until,s);}
 /** Called under pump_dispatch_gate for fenced ON; route-free callers cannot bypass an enabled gate. */
 public static View requireOn(JdbcTemplate jdbc,PumpCircuitRoute route){
  if(route==null){if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM zone_rain_gate WHERE enabled)",Boolean.class)))throw bad(HttpStatus.CONFLICT,"WEATHER_ROUTE_REQUIRED");return null;}
  var v=inspect(jdbc,route.zoneId(),Instant.now());if(!v.allowed())throw bad(HttpStatus.CONFLICT,"WEATHER_"+v.state());return v.policy()!=null&&v.policy().enabled()?v:null;
 }
 @Transactional
 public Policy save(String zone,Request r){
  if(r==null||r.expectedRevision()<0||r.expectedRevision()==Integer.MAX_VALUE||r.zoneRevision()<1||!code(r.nodeId())||!code(r.channelId())||!Set.of("SIMULATOR","PHYSICAL").contains(r.expectedSource()==null?"":r.expectedSource())||r.calibrationVersion()!=null&&(r.calibrationVersion().isBlank()||r.calibrationVersion().length()>40))throw bad(HttpStatus.BAD_REQUEST,"Invalid rain gate policy");
  jdbc.queryForObject("SELECT singleton FROM pump_dispatch_gate WHERE singleton=1 FOR UPDATE",Integer.class);
  jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Long.class);
  var old=inspect(jdbc,zone,Instant.now());
  if((old.policy()==null?0:old.policy().revision())!=r.expectedRevision()||old.zoneRevision()!=r.zoneRevision())throw bad(HttpStatus.CONFLICT,"Review current zone and rain policy");
  IrrigationSessionGuard.editable(jdbc);PumpCircuitRoute.requireIdle(jdbc);
  if(r.enabled()){
   if(!profile)throw bad(HttpStatus.CONFLICT,"Enable fenced route-bound circuit control profile before rain gate");
   if(!old.zoneSource().equals(r.expectedSource()))throw bad(HttpStatus.BAD_REQUEST,"Weather source must match zone source");
   var found=jdbc.queryForObject("SELECT count(*) FROM iot_channel c JOIN iot_node n USING(node_id) WHERE c.node_id=? AND c.channel_id=? AND c.metric='RAIN_DETECTED' AND c.unit='boolean' AND c.calibration_version IS NOT DISTINCT FROM ? AND n.node_type='WEATHER' AND n.telemetry_version=2 AND n.area_id=?",Integer.class,r.nodeId(),r.channelId(),r.calibrationVersion(),old.areaId());
   if(found!=1)throw bad(HttpStatus.BAD_REQUEST,"Select declared rain channel in the zone area");
  }
  jdbc.update("INSERT INTO zone_rain_gate(zone_id,zone_revision,node_id,channel_id,expected_source,calibration_version,enabled,revision) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(zone_id) DO UPDATE SET zone_revision=EXCLUDED.zone_revision,node_id=EXCLUDED.node_id,channel_id=EXCLUDED.channel_id,expected_source=EXCLUDED.expected_source,calibration_version=EXCLUDED.calibration_version,enabled=EXCLUDED.enabled,revision=EXCLUDED.revision",zone,r.zoneRevision(),r.nodeId(),r.channelId(),r.expectedSource(),r.calibrationVersion(),r.enabled(),r.expectedRevision()+1);
  return jdbc.query("SELECT * FROM zone_rain_gate WHERE zone_id=?",ZoneRainGate::policy,zone).getFirst();
 }
 private static boolean code(String s){return s!=null&&s.matches("[A-Z][A-Z0-9_-]{1,31}");}
 private static ResponseStatusException bad(HttpStatus status,String text){return new ResponseStatusException(status,text);}
}
