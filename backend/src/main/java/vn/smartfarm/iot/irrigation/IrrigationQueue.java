package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterTelemetry;

/** Persisted FIFO rehearsal, deliberately without a command transport or pump lease. */
@Service
public class IrrigationQueue {
 public record Item(UUID requestId,long ticket,String zoneId,int zoneRevision,JsonNode zoneSnapshot,JsonNode circuitSnapshot,int durationSeconds,
   Instant requestedAt,Instant enqueuedAt,Instant expiresAt,String state,Instant startedAt,Instant plannedEndAt,Instant finishedAt,String reason) {}
 public record Snapshot(String mode,Instant asOf,long revision,int capacity,int waitTtlSeconds,Item active,List<Item> waiting,List<Item> history) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final TransactionTemplate tx;
 private volatile boolean startupComplete;
 public IrrigationQueue(JdbcTemplate jdbc,ObjectMapper mapper,PlatformTransactionManager manager){this.jdbc=jdbc;this.mapper=mapper;this.tx=new TransactionTemplate(manager);}

 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Snapshot snapshot(){return new Snapshot("PREVIEW_ONLY",Instant.now(),revision(),50,300,
  items("WHERE state='REHEARSING'").stream().findFirst().orElse(null),items("WHERE state='QUEUED' ORDER BY ticket"),
  items("WHERE state NOT IN ('QUEUED','REHEARSING') ORDER BY ticket DESC LIMIT 20"));}
 @Transactional(readOnly=true)
 public Item lookup(UUID id){return items("WHERE request_id=?",id).stream().findFirst().orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Queue request not found"));}

 public Item enqueue(JsonNode input){
  boolean mapped=input.has("circuitId")||input.has("circuitRevision");
  WaterTelemetry.fields(input,mapped?Set.of("requestId","zoneId","zoneRevision","durationSeconds","requestedAt","circuitId","circuitRevision"):Set.of("requestId","zoneId","zoneRevision","durationSeconds","requestedAt"));
  String circuitId=mapped?WaterTelemetry.code(WaterTelemetry.text(input,"circuitId")):null;int circuitRevision=mapped?(int)integer(input,"circuitRevision",Integer.MAX_VALUE):0;
  UUID id=uuid(input,"requestId");String zone=WaterTelemetry.code(WaterTelemetry.text(input,"zoneId"));
  int zoneRevision=(int)integer(input,"zoneRevision",Integer.MAX_VALUE),duration=(int)integer(input,"durationSeconds",30);
  Instant requested=Instant.parse(WaterTelemetry.text(input,"requestedAt"));
  return tx.execute(t->{lock();var old=items("WHERE request_id=?",id);if(!old.isEmpty()){
   var item=old.getFirst();if(!item.zoneId().equals(zone)||item.zoneRevision()!=zoneRevision||item.durationSeconds()!=duration||!Objects.equals(item.circuitSnapshot()==null?null:item.circuitSnapshot().path("circuitId").asText(),circuitId)||(item.circuitSnapshot()==null?0:item.circuitSnapshot().path("revision").asInt())!=circuitRevision)throw bad(HttpStatus.CONFLICT,"Request ID already used with different input");return item;
  }
   Instant now=Instant.now();if(requested.isBefore(now.minusSeconds(10))||requested.isAfter(now.plusSeconds(2)))throw bad(HttpStatus.CONFLICT,"Request clock is stale; reload");
   JsonNode config=zoneConfig(zone);if(config==null||config.path("revision").asInt()!=zoneRevision||!config.path("expectedSource").asText().equals("SIMULATOR"))throw bad(HttpStatus.CONFLICT,"Current simulator zone revision required");
   JsonNode circuit=IrrigationCircuits.forQueue(jdbc,mapper,zone);
   if(circuit==null?mapped:!mapped||!circuit.path("circuitId").asText().equals(circuitId)||circuit.path("revision").asInt()!=circuitRevision||!IrrigationCircuits.currentSnapshot(jdbc,mapper,zone,circuit))throw bad(HttpStatus.CONFLICT,"Review the current circuit mapping before enqueueing");
   if(jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_queue_request WHERE state IN ('QUEUED','REHEARSING')",Integer.class)>=50)throw bad(HttpStatus.CONFLICT,"Queue capacity reached");
   jdbc.update("""
    INSERT INTO irrigation_queue_request(request_id,zone_id,zone_revision,zone_snapshot,circuit_snapshot,duration_seconds,requested_at,enqueued_at,expires_at,state,reason)
    VALUES(?,?,?,?::jsonb,?::jsonb,?,?,?,?, 'QUEUED','WAITING')
    """,id,zone,zoneRevision,config.toString(),circuit==null?null:circuit.toString(),duration,Timestamp.from(requested),Timestamp.from(now),Timestamp.from(now.plusSeconds(300)));
   changed();return lookup(id);
  });
 }
 /** Start precisely the item reviewed by the caller, never whichever item happens to be next later. */
 public Item rehearse(UUID id,long expectedRevision){return tx.execute(t->{lock();var item=lookup(id);
  if(!item.state().equals("QUEUED"))return item; // duplicate/delayed click cannot start a different item
  checkRevision(expectedRevision);Instant now=Instant.now();
  if(!item.expiresAt().isAfter(now)||!currentZone(item)||!currentCircuit(item))throw bad(HttpStatus.CONFLICT,"Request expired or configuration changed; reload");
  if(!items("WHERE state='REHEARSING'").isEmpty())throw bad(HttpStatus.CONFLICT,"Another rehearsal owns the preview slot");
  var first=items("WHERE state='QUEUED' ORDER BY ticket LIMIT 1").getFirst();
  if(!first.requestId().equals(id))throw bad(HttpStatus.CONFLICT,"Only the first waiting request may rehearse");
  jdbc.update("UPDATE irrigation_queue_request SET state='REHEARSING',reason='PREVIEW_STARTED',started_at=?,planned_end_at=? WHERE request_id=?",
   Timestamp.from(now),Timestamp.from(now.plusSeconds(item.durationSeconds())),id);changed();return lookup(id);
 });}
 public Item cancel(UUID id,long expectedRevision){return tx.execute(t->{lock();var item=lookup(id);
  if(!Set.of("QUEUED","REHEARSING").contains(item.state()))return item;
  checkRevision(expectedRevision);finish(item,"CANCELLED","USER_CANCELLED",Instant.now());changed();return lookup(id);
 });}

 /** On every backend start, a previous rehearsal is interrupted, never resumed or reported completed. */
 @EventListener(ApplicationReadyEvent.class)
 public void interruptOnStartup(){tx.executeWithoutResult(t->{lock();int count=jdbc.update("UPDATE irrigation_queue_request SET state='INTERRUPTED',reason='BACKEND_RESTARTED',finished_at=? WHERE state='REHEARSING'",Timestamp.from(Instant.now()));if(count>0)changed();});startupComplete=true;}
 public void maintain(){if(startupComplete)maintainAt(Instant.now());}
 // Package-visible deterministic clock for integration tests, not exposed over HTTP.
 void maintainAt(Instant now){tx.executeWithoutResult(t->{lock();boolean edited=false;
  for(var item:items("WHERE state IN ('QUEUED','REHEARSING') ORDER BY ticket")){
   if(!currentZone(item)){finish(item,item.state().equals("QUEUED")?"INVALIDATED":"INTERRUPTED","ZONE_CHANGED",now);edited=true;}
   else if(!currentCircuit(item)){finish(item,item.state().equals("QUEUED")?"INVALIDATED":"INTERRUPTED","CIRCUIT_CHANGED",now);edited=true;}
   else if(item.state().equals("QUEUED")&&!item.expiresAt().isAfter(now)){finish(item,"EXPIRED","WAIT_EXPIRED",now);edited=true;}
   else if(item.state().equals("REHEARSING")&&!item.plannedEndAt().isAfter(now)){finish(item,"REHEARSED","PREVIEW_FINISHED",now);edited=true;}
  }if(edited)changed();
 });}
 private void finish(Item item,String state,String reason,Instant now){jdbc.update("UPDATE irrigation_queue_request SET state=?,reason=?,finished_at=? WHERE request_id=?",state,reason,Timestamp.from(now),item.requestId());}
 private boolean currentZone(Item item){var config=zoneConfig(item.zoneId());return config!=null&&config.path("revision").asInt()==item.zoneRevision()&&config.path("expectedSource").asText().equals("SIMULATOR");}
 private boolean currentCircuit(Item item){return IrrigationCircuits.currentSnapshot(jdbc,mapper,item.zoneId(),item.circuitSnapshot());}
 boolean currentForHandoff(Item item,boolean locking){
  if(!Objects.equals(zoneConfig(item.zoneId(),locking),item.zoneSnapshot()))return false;
  if(locking)return currentCircuit(item);
  var configs=jdbc.query("SELECT * FROM irrigation_circuit WHERE zone_id=?",IrrigationCircuits::map,item.zoneId());
  if(configs.isEmpty())return item.circuitSnapshot()==null;
  var c=configs.getFirst();return Objects.equals(mapper.valueToTree(c),item.circuitSnapshot())&&IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT");
 }
 private JsonNode zoneConfig(String id){return zoneConfig(id,true);}
 JsonNode zoneConfig(String id,boolean locking){return jdbc.query("SELECT * FROM irrigation_zone WHERE zone_id=?"+(locking?" FOR SHARE":""),(rs,n)->{
  var c=mapper.createObjectNode().put("zoneId",id).put("name",rs.getString("name")).put("areaId",rs.getString("area_id")).put("soilNodeId",rs.getString("soil_node_id")).put("expectedSource",rs.getString("expected_source")).put("dryThreshold",rs.getInt("dry_threshold")).put("wetThreshold",rs.getInt("wet_threshold")).put("revision",rs.getInt("revision"));
  c.set("channelIds",mapper.valueToTree(jdbc.query("SELECT channel_id FROM irrigation_zone_channel WHERE zone_id=? ORDER BY position",(r,i)->r.getString(1),id)));return (JsonNode)c;
 },id).stream().findFirst().orElse(null);}
 private List<Item> items(String suffix,Object...args){return jdbc.query("SELECT * FROM irrigation_queue_request "+suffix,(rs,n)->new Item(rs.getObject("request_id",UUID.class),rs.getLong("ticket"),rs.getString("zone_id"),rs.getInt("zone_revision"),json(rs.getString("zone_snapshot")),json(rs.getString("circuit_snapshot")),rs.getInt("duration_seconds"),stamp(rs,"requested_at"),stamp(rs,"enqueued_at"),stamp(rs,"expires_at"),rs.getString("state"),stamp(rs,"started_at"),stamp(rs,"planned_end_at"),stamp(rs,"finished_at"),rs.getString("reason")),args);}
 private JsonNode json(String value){if(value==null)return null;try{return mapper.readTree(value);}catch(Exception e){throw new IllegalStateException("Invalid stored configuration snapshot",e);}}
 private static Instant stamp(ResultSet rs,String name)throws SQLException{Timestamp t=rs.getTimestamp(name);return t==null?null:t.toInstant();}
 private void lock(){jdbc.queryForObject("SELECT revision FROM irrigation_queue_state WHERE singleton=1 FOR UPDATE",Long.class);jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR SHARE",Long.class);}
 private long revision(){return jdbc.queryForObject("SELECT revision FROM irrigation_queue_state WHERE singleton=1",Long.class);}
 private void checkRevision(long expected){if(revision()!=expected)throw bad(HttpStatus.CONFLICT,"Queue changed; reload before continuing");}
 private void changed(){jdbc.update("UPDATE irrigation_queue_state SET revision=revision+1 WHERE singleton=1");}
 static long integer(JsonNode input,String key,long max){var n=input.path(key);if(!n.isIntegralNumber()||!n.canConvertToLong()||n.longValue()<1||n.longValue()>max)throw new IllegalArgumentException("Positive integer required");return n.longValue();}
 static UUID uuid(JsonNode input,String key){String s=WaterTelemetry.text(input,key);UUID id=UUID.fromString(s);if(!id.toString().equalsIgnoreCase(s))throw new IllegalArgumentException("UUID required");return id;}
 private static ResponseStatusException bad(HttpStatus status,String message){return new ResponseStatusException(status,message);}
}
