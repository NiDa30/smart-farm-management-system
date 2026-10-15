package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.*;

/** Several planned branches may share PUMP01 and a water station. This never dispatches. */
@Service
public class IrrigationCircuits {
 public record Config(String circuitId,String name,String zoneId,int zoneRevision,String controllerId,String valveId,String pumpId,String waterNodeId,String lowChannelId,String flowChannelId,String expectedSource,int revision) {}
 public record Signal(String state,NodeInventory.Reading latest) {}
 public record View(Config config,String configurationState,Signal low,Signal flow,String valveState) {}
 public record Snapshot(String mode,boolean dispatchAvailable,Instant asOf,long revision,List<View> circuits) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final NodeInventory nodes;private final IrrigationDemo valve;
 public IrrigationCircuits(JdbcTemplate jdbc,ObjectMapper mapper,NodeInventory nodes,IrrigationDemo valve){this.jdbc=jdbc;this.mapper=mapper;this.nodes=nodes;this.valve=valve;}
 static Config map(java.sql.ResultSet r,int n)throws java.sql.SQLException{return new Config(r.getString("circuit_id"),r.getString("name"),r.getString("zone_id"),r.getInt("zone_revision"),r.getString("controller_id"),r.getString("valve_id"),r.getString("pump_id"),r.getString("water_node_id"),r.getString("low_channel_id"),r.getString("flow_channel_id"),r.getString("expected_source"),r.getInt("revision"));}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Snapshot snapshot(){var inventory=nodes.snapshot();var observed=valve.snapshot();Instant now=Instant.now();return new Snapshot("CONFIGURATION_ONLY",false,now,jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1",Long.class),jdbc.query("SELECT * FROM irrigation_circuit ORDER BY circuit_id",IrrigationCircuits::map).stream().map(c->view(c,inventory,observed,now)).toList());}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Config find(String id){return jdbc.query("SELECT * FROM irrigation_circuit WHERE circuit_id=?",IrrigationCircuits::map,id).stream().findFirst().orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Circuit not found"));}
 @Transactional
 public Config create(JsonNode body){Config c=parse(body,false);lock();validate(c);jdbc.update("INSERT INTO irrigation_circuit(circuit_id,name,zone_id,zone_revision,controller_id,valve_id,pump_id,water_node_id,low_channel_id,flow_channel_id,expected_source) VALUES(?,?,?,?,?,?,?,?,?,?,?)",c.circuitId(),c.name(),c.zoneId(),c.zoneRevision(),c.controllerId(),c.valveId(),c.pumpId(),c.waterNodeId(),c.lowChannelId(),c.flowChannelId(),c.expectedSource());changed();return find(c.circuitId());}
 @Transactional
 public Config update(String id,JsonNode body){Config c=parse(body,true);if(!id.equals(c.circuitId()))throw bad(HttpStatus.BAD_REQUEST,"Circuit ID mismatch");lock();var old=find(id);if(old.revision()!=c.revision())throw bad(HttpStatus.CONFLICT,"Circuit changed; reload");validate(c);jdbc.update("UPDATE irrigation_circuit SET name=?,zone_id=?,zone_revision=?,controller_id=?,valve_id=?,pump_id=?,water_node_id=?,low_channel_id=?,flow_channel_id=?,expected_source=?,revision=revision+1 WHERE circuit_id=?",c.name(),c.zoneId(),c.zoneRevision(),c.controllerId(),c.valveId(),c.pumpId(),c.waterNodeId(),c.lowChannelId(),c.flowChannelId(),c.expectedSource(),id);changed();return find(id);}
 private void validate(Config c){
  var zones=jdbc.query("SELECT expected_source FROM irrigation_zone WHERE zone_id=? AND revision=? FOR SHARE",(r,n)->r.getString(1),c.zoneId(),c.zoneRevision());
  if(zones.isEmpty()||!zones.getFirst().equals(c.expectedSource()))throw bad(HttpStatus.CONFLICT,"Use the current zone revision and source");
  if(!waterShape(jdbc,c))throw bad(HttpStatus.BAD_REQUEST,"Declared WATER/v2 level and flow channels required");
  if(!identityClear(jdbc,c))throw bad(HttpStatus.CONFLICT,"Planned identity collides with existing inventory");
 }
 static boolean waterShape(JdbcTemplate jdbc,Config c){return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM iot_node n JOIN iot_channel l ON l.node_id=n.node_id JOIN iot_channel f ON f.node_id=n.node_id WHERE n.node_id=? AND n.node_type='WATER' AND n.telemetry_version=2 AND l.channel_id=? AND l.metric='WATER_PRESENT' AND l.unit='boolean' AND f.channel_id=? AND f.metric='FLOW_RATE' AND f.unit='L/min')",Boolean.class,c.waterNodeId(),c.lowChannelId(),c.flowChannelId()));}
 static boolean identityClear(JdbcTemplate jdbc,Config c){return !Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM iot_node WHERE node_id IN (?,?) UNION ALL SELECT 1 FROM sensor_device WHERE device_id IN (?,?) UNION ALL SELECT 1 FROM iot_actuator_binding WHERE actuator_id IN (?,?))",Boolean.class,c.controllerId(),c.valveId(),c.controllerId(),c.valveId(),c.controllerId(),c.valveId()));}
 static String configurationState(JdbcTemplate jdbc,Config c){
  if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_zone WHERE zone_id=? AND revision=? AND expected_source=?)",Boolean.class,c.zoneId(),c.zoneRevision(),c.expectedSource())))return "ZONE_CHANGED";
  if(!waterShape(jdbc,c))return "WATER_DECLARATION_CHANGED";
  return identityClear(jdbc,c)?"CURRENT":"IDENTITY_CONFLICT";
 }
 static JsonNode forQueue(JdbcTemplate jdbc,ObjectMapper mapper,String zone){return jdbc.query("SELECT * FROM irrigation_circuit WHERE zone_id=? FOR SHARE",(r,n)->mapper.<JsonNode>valueToTree(map(r,n)),zone).stream().findFirst().orElse(null);}
 static boolean currentSnapshot(JdbcTemplate jdbc,ObjectMapper mapper,String zone,JsonNode stored){JsonNode current=forQueue(jdbc,mapper,zone);if(!Objects.equals(stored,current))return false;if(current==null)return true;try{return configurationState(jdbc,mapper.treeToValue(current,Config.class)).equals("CURRENT");}catch(Exception e){throw new IllegalStateException("Invalid circuit snapshot",e);}}
 private View view(Config c,NodeInventory.Snapshot inventory,IrrigationDemo.Snapshot observed,Instant now){var node=inventory.nodes().stream().filter(n->n.nodeId().equals(c.waterNodeId())).findFirst();var low=node.flatMap(n->n.channels().stream().filter(ch->ch.channelId().equals(c.lowChannelId())).findFirst()).map(NodeInventory.Channel::latest).orElse(null);var flow=node.flatMap(n->n.channels().stream().filter(ch->ch.channelId().equals(c.flowChannelId())).findFirst()).map(NodeInventory.Channel::latest).orElse(null);String lowState=state(low,c,now),flowState=state(flow,c,now);
  if(lowState.equals("FRESH"))lowState=low.value() instanceof Boolean b?(b?"AVAILABLE":"LOW"):"SENSOR_FAULT";
  if(flowState.equals("FRESH")&&(!(flow.value() instanceof Number n)||!Double.isFinite(n.doubleValue())||n.doubleValue()<0))flowState="SENSOR_FAULT";
  String valveState="NOT_CONNECTED";var s=observed.latest();if(c.controllerId().equals("IRRIGATION01")&&c.valveId().equals("VALVE01")&&c.expectedSource().equals("SIMULATOR")){
   if(!c.zoneId().equals(observed.binding().zoneId())||!Objects.equals(c.zoneRevision(),observed.binding().zoneRevision()))valveState="BINDING_MISMATCH";
   else if(s==null||!s.zoneId().equals(c.zoneId()))valveState="NO_STATUS";
   else if(!fresh(s.observedAt(),s.receivedAt(),now))valveState="STALE";
   else if(s.positionFeedback()==null)valveState="UNVERIFIED";
   else valveState=s.positionFeedback().fault()!=null?"FAULT":s.positionFeedback().state();
  }return new View(c,configurationState(jdbc,c),new Signal(lowState,low),new Signal(flowState,flow),valveState);
 }
 private static boolean fresh(Instant a,Instant b,Instant now){return a.isAfter(now.minusSeconds(15))&&b.isAfter(now.minusSeconds(15))&&!a.isAfter(now.plusSeconds(2))&&!b.isAfter(now.plusSeconds(2));}
 private static String state(NodeInventory.Reading r,Config c,Instant now){if(r==null)return "MISSING";if(r.observedAt().isAfter(now.plusSeconds(2))||r.receivedAt().isAfter(now.plusSeconds(2)))return "CLOCK_SKEW";if(!fresh(r.observedAt(),r.receivedAt(),now))return "STALE";if(!r.quality().equals("VALID")||r.value()==null)return "SENSOR_FAULT";if(!c.expectedSource().equals(r.dataSource()))return "SOURCE_MISMATCH";return "FRESH";}
 private Config parse(JsonNode n,boolean edit){var keys=new HashSet<>(Set.of("circuitId","name","zoneId","zoneRevision","controllerId","valveId","pumpId","waterNodeId","lowChannelId","flowChannelId","expectedSource"));if(edit)keys.add("revision");WaterTelemetry.fields(n,keys);String name=WaterTelemetry.text(n,"name").strip(),controller=WaterTelemetry.text(n,"controllerId"),valve=WaterTelemetry.text(n,"valveId"),pump=WaterTelemetry.text(n,"pumpId"),source=WaterTelemetry.text(n,"expectedSource");if(name.isEmpty()||name.length()>80||!controller.matches("IRRIGATION(0[1-9]|[1-9][0-9])")||!valve.matches("VALVE(0[1-9]|[1-9][0-9])")||!pump.equals("PUMP01")||!Set.of("SIMULATOR","PHYSICAL").contains(source))throw new IllegalArgumentException("Invalid circuit identity/source");return new Config(code(n,"circuitId"),name,code(n,"zoneId"),integer(n,"zoneRevision"),controller,valve,pump,code(n,"waterNodeId"),code(n,"lowChannelId"),code(n,"flowChannelId"),source,edit?integer(n,"revision"):1);}
 private static int integer(JsonNode n,String key){var v=n.path(key);if(!v.isIntegralNumber()||!v.canConvertToInt()||v.intValue()<1||v.intValue()==Integer.MAX_VALUE)throw new IllegalArgumentException("Positive revision required");return v.intValue();}
 private static String code(JsonNode n,String key){return WaterTelemetry.code(WaterTelemetry.text(n,key));}
 private void lock(){jdbc.queryForObject("SELECT singleton FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Integer.class);}
 private void changed(){jdbc.update("UPDATE irrigation_circuit_state SET revision=revision+1 WHERE singleton=1");}
 private static ResponseStatusException bad(HttpStatus s,String m){return new ResponseStatusException(s,m);}
}
