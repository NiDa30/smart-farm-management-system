package vn.smartfarm.iot.zones;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.*;
import vn.smartfarm.iot.registry.SensorRegistry;

/** Registry and current soil survey only. This service has no command transport. */
@Service
public class IrrigationZones {
 public record Config(String zoneId,String name,String areaId,String soilNodeId,List<String> channelIds,String expectedSource,int dryThreshold,int wetThreshold,int revision) {}
 public record Point(String channelId,String state,NodeInventory.Reading latest) {}
 public record Assessment(String state,Integer dryCount,Integer wetCount,Instant validUntil) {}
 public record View(Config config,Instant asOf,List<Point> points,Assessment assessment) {}
 public record Snapshot(String farmId,Instant asOf,List<View> zones) {}
 private final JdbcTemplate jdbc;private final NodeInventory nodes;private final SensorRegistry sensors;
 public IrrigationZones(JdbcTemplate jdbc,NodeInventory nodes,SensorRegistry sensors){this.jdbc=jdbc;this.nodes=nodes;this.sensors=sensors;}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Snapshot snapshot(){
  var inventory=nodes.snapshot();return survey(inventory,inventory.asOf());
 }
 /** Compose against the same inventory and clock as another read-only snapshot. */
 public Snapshot survey(NodeInventory.Snapshot inventory,Instant now){
  var configs=jdbc.query("SELECT * FROM irrigation_zone ORDER BY area_id,zone_id",(rs,n)->new Config(rs.getString("zone_id"),rs.getString("name"),rs.getString("area_id"),rs.getString("soil_node_id"),
   jdbc.query("SELECT channel_id FROM irrigation_zone_channel WHERE zone_id=? ORDER BY position",(r,i)->r.getString(1),rs.getString("zone_id")),rs.getString("expected_source"),rs.getInt("dry_threshold"),rs.getInt("wet_threshold"),rs.getInt("revision")));
  return new Snapshot("FARM001",now,configs.stream().map(c->view(c,inventory,now)).toList());
 }
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View find(String id){return snapshot().zones().stream().filter(v->v.config().zoneId().equals(id)).findFirst().orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Zone not found"));}
 private View view(Config c,NodeInventory.Snapshot inventory,Instant now){
  var node=inventory.nodes().stream().filter(n->n.nodeId().equals(c.soilNodeId())&&n.areaId().equals(c.areaId())&&n.nodeType().equals("SOIL")&&n.telemetryVersion()==2).findFirst();
  List<Point> points=c.channelIds().stream().map(id->{
   var r=node.flatMap(n->n.channels().stream().filter(x->x.channelId().equals(id)&&x.metric().equals("SOIL_MOISTURE")&&x.unit().equals("%")).findFirst()).map(NodeInventory.Channel::latest).orElse(null);
   String state=r==null?"MISSING":r.observedAt().isAfter(now.plusSeconds(2))||r.receivedAt().isAfter(now.plusSeconds(2))?"CLOCK_SKEW":
    !r.observedAt().plusSeconds(30).isAfter(now)||!r.receivedAt().plusSeconds(30).isAfter(now)?"STALE":
    !r.quality().equals("VALID")||!(r.value() instanceof Number n)||!Double.isFinite(n.doubleValue())||n.doubleValue()<0||n.doubleValue()>100?"SENSOR_FAULT":
    !c.expectedSource().equals(r.dataSource())?"SOURCE_MISMATCH":"FRESH";
   return new Point(id,state,r);
  }).toList();
  if(points.size()!=3||points.stream().anyMatch(p->!p.state().equals("FRESH")))return new View(c,now,points,new Assessment("UNAVAILABLE",null,null,null));
  var first=points.getFirst().latest();
  if(points.stream().anyMatch(p->{var r=p.latest();return !r.bootId().equals(first.bootId())||r.sequence()!=first.sequence()||!r.observedAt().equals(first.observedAt())||!r.receivedAt().equals(first.receivedAt());}))
   return new View(c,now,points,new Assessment("INCOHERENT",null,null,null));
  int dry=0,wet=0;Instant until=now.plusSeconds(30);
  for(var p:points){var r=p.latest();double value=((Number)r.value()).doubleValue();if(value<c.dryThreshold())dry++;if(value>=c.wetThreshold())wet++;
   if(r.observedAt().plusSeconds(30).isBefore(until))until=r.observedAt().plusSeconds(30);if(r.receivedAt().plusSeconds(30).isBefore(until))until=r.receivedAt().plusSeconds(30);}
  return new View(c,now,points,new Assessment(dry>=2?"DRY":wet>=2?"WET":"MIXED",dry,wet,until));
 }
 @Transactional
 public View create(JsonNode input){
  Config c=parse(input,false);validateBinding(c);
  jdbc.update("INSERT INTO irrigation_zone(zone_id,name,area_id,soil_node_id,expected_source,dry_threshold,wet_threshold) VALUES(?,?,?,?,?,?,?)",c.zoneId(),c.name(),c.areaId(),c.soilNodeId(),c.expectedSource(),c.dryThreshold(),c.wetThreshold());
  bind(c);return find(c.zoneId());
 }
 @Transactional
 public View update(String id,JsonNode input){
  Config c=parse(input,true);if(!id.equals(c.zoneId()))throw bad(HttpStatus.BAD_REQUEST,"Zone ID mismatch");validateBinding(c);
  var revisions=jdbc.query("SELECT revision FROM irrigation_zone WHERE zone_id=? FOR UPDATE",(rs,n)->rs.getInt(1),id);
  if(revisions.isEmpty()||revisions.getFirst()!=c.revision())throw bad(HttpStatus.CONFLICT,"Zone changed; reload current revision");
  jdbc.update("DELETE FROM irrigation_zone_channel WHERE zone_id=?",id);
  jdbc.update("UPDATE irrigation_zone SET name=?,area_id=?,soil_node_id=?,expected_source=?,dry_threshold=?,wet_threshold=?,revision=revision+1 WHERE zone_id=?",
   c.name(),c.areaId(),c.soilNodeId(),c.expectedSource(),c.dryThreshold(),c.wetThreshold(),id);
  bind(c);return find(id);
 }
 private void bind(Config c){for(int i=0;i<c.channelIds().size();i++)jdbc.update("INSERT INTO irrigation_zone_channel(zone_id,node_id,channel_id,position) VALUES(?,?,?,?)",c.zoneId(),c.soilNodeId(),c.channelIds().get(i),i);}
 private void validateBinding(Config c){
  if(!sensors.areaExists(c.areaId())||!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM iot_node WHERE node_id=? AND area_id=? AND node_type='SOIL' AND telemetry_version=2)",Boolean.class,c.soilNodeId(),c.areaId())))
   throw bad(HttpStatus.BAD_REQUEST,"SOIL/v2 node must belong to selected area");
  for(String channel:c.channelIds())if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM iot_channel WHERE node_id=? AND channel_id=? AND metric='SOIL_MOISTURE' AND unit='%')",Boolean.class,c.soilNodeId(),channel)))
   throw bad(HttpStatus.BAD_REQUEST,"Undeclared soil channel");
 }
 private static int integer(JsonNode input,String key,int min,int max){var n=input.path(key);if(!n.isIntegralNumber()||!n.canConvertToInt()||n.intValue()<min||n.intValue()>max)throw new IllegalArgumentException("Integer field");return n.intValue();}
 private Config parse(JsonNode input,boolean editing){
  var fields=new HashSet<>(Set.of("zoneId","name","areaId","soilNodeId","channelIds","expectedSource","dryThreshold","wetThreshold"));if(editing)fields.add("revision");
  WaterTelemetry.fields(input,fields);String id=WaterTelemetry.code(WaterTelemetry.text(input,"zoneId")),name=WaterTelemetry.text(input,"name").strip(),area=WaterTelemetry.code(WaterTelemetry.text(input,"areaId")),node=WaterTelemetry.code(WaterTelemetry.text(input,"soilNodeId")),source=WaterTelemetry.text(input,"expectedSource");
  if(name.isEmpty()||name.length()>80||!Set.of("SIMULATOR","PHYSICAL").contains(source))throw new IllegalArgumentException("Name/source");
  JsonNode values=input.path("channelIds");if(!values.isArray()||values.size()!=3)throw new IllegalArgumentException("Three distinct channels required");
  List<String> ids=new ArrayList<>();for(var v:values){if(!v.isTextual())throw new IllegalArgumentException();ids.add(WaterTelemetry.code(v.textValue()));}
  if(new HashSet<>(ids).size()!=3)throw new IllegalArgumentException("Duplicate channel");
  int dry=integer(input,"dryThreshold",0,95),wet=integer(input,"wetThreshold",5,100);if(wet<dry+5)throw new IllegalArgumentException("Threshold gap");
  return new Config(id,name,area,node,List.copyOf(ids),source,dry,wet,editing?integer(input,"revision",1,Integer.MAX_VALUE-1):1);
 }
 private static ResponseStatusException bad(HttpStatus status,String reason){return new ResponseStatusException(status,reason);}
}
