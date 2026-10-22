package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.*;
import java.sql.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/** Weekly Vietnamese-time planning. Creates queue requests only, never a session or device command. */
@Service
public class ZoneQueueSchedule {
 public static final String TIMEZONE="Asia/Ho_Chi_Minh";
 public record Slot(List<Integer> days,String time) {}
 public record Save(long revision,Boolean enabled,int zoneRevision,String circuitId,int circuitRevision,int durationSeconds,String timezone,List<Slot> slots,Instant reviewedAt) {}
 public record Plan(long revision,Save definition,JsonNode zoneSnapshot,JsonNode circuitSnapshot,Instant updatedAt) {}
 public record Occurrence(Instant dueAt,long scheduleRevision,Save definition,String state,String reason,UUID requestId,Instant evaluatedAt) {}
 public record View(String mode,String zoneId,Instant asOf,boolean workerEnabled,Instant lastTickAt,String lastTickResult,int zoneRevision,IrrigationCircuits.Config circuit,String configurationState,Plan plan,Instant nextDueAt,List<Occurrence> occurrences) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final IrrigationQueue queue;private final TransactionTemplate tx;private final boolean enabled;
 private volatile boolean ready;
 public ZoneQueueSchedule(JdbcTemplate jdbc,ObjectMapper mapper,IrrigationQueue queue,PlatformTransactionManager manager,@Value("${smartfarm.irrigation.queue-schedule-enabled:false}")boolean enabled){this.jdbc=jdbc;this.mapper=mapper;this.queue=queue;this.tx=new TransactionTemplate(manager);this.enabled=enabled;}
 private String encode(Object x){try{return mapper.writeValueAsString(x);}catch(Exception e){throw new IllegalStateException(e);}}
 private Save decode(String s){try{return mapper.readValue(s,Save.class);}catch(Exception e){throw new IllegalStateException("Invalid stored schedule",e);}}
 private JsonNode json(String s){try{return s==null?null:mapper.readTree(s);}catch(Exception e){throw new IllegalStateException(e);}}
 private Plan map(ResultSet r,int n)throws SQLException{return new Plan(r.getLong("revision"),decode(r.getString("definition")),json(r.getString("zone_snapshot")),json(r.getString("circuit_snapshot")),r.getTimestamp("updated_at").toInstant());}
 private Plan plan(String zone){return jdbc.query("SELECT * FROM irrigation_queue_schedule WHERE zone_id=?",this::map,zone).stream().findFirst().orElse(null);}
 private void gates(){jdbc.queryForObject("SELECT revision FROM irrigation_queue_state WHERE singleton=1 FOR UPDATE",Long.class);jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR SHARE",Long.class);jdbc.queryForObject("SELECT singleton FROM irrigation_queue_schedule_state WHERE singleton=1 FOR UPDATE",Integer.class);}
 private IrrigationCircuits.Config circuit(String zone,boolean locking){return jdbc.query("SELECT * FROM irrigation_circuit WHERE zone_id=?"+(locking?" FOR SHARE":""),IrrigationCircuits::map,zone).stream().findFirst().orElse(null);}
 private boolean binding(String zone,Plan p,boolean locking){var z=queue.zoneConfig(zone,locking);var c=circuit(zone,locking);var d=p.definition();return z!=null&&c!=null&&d.zoneRevision()==z.path("revision").asInt()&&d.circuitId().equals(c.circuitId())&&d.circuitRevision()==c.revision()&&Objects.equals(z,p.zoneSnapshot())&&Objects.equals(mapper.valueToTree(c),p.circuitSnapshot())&&IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT");}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View snapshot(String zone){var z=queue.zoneConfig(zone,false);if(z==null)throw bad(HttpStatus.NOT_FOUND,"Zone not found");var p=plan(zone);Instant now=Instant.now();var tick=jdbc.queryForMap("SELECT * FROM irrigation_queue_schedule_state WHERE singleton=1");String state=p==null?"NO_PLAN":binding(zone,p,false)?"CURRENT":"CONFIG_CHANGED";
  var events=jdbc.query("SELECT * FROM irrigation_queue_schedule_occurrence WHERE zone_id=? ORDER BY due_at DESC LIMIT 20",(r,n)->new Occurrence(r.getTimestamp("due_at").toInstant(),r.getLong("schedule_revision"),decode(r.getString("schedule_definition")),r.getString("state"),r.getString("reason"),r.getObject("request_id",UUID.class),r.getTimestamp("evaluated_at").toInstant()),zone);
  return new View("SCHEDULE_TO_QUEUE",zone,now,enabled,(Instant)(tick.get("last_tick_at")==null?null:((Timestamp)tick.get("last_tick_at")).toInstant()),(String)tick.get("last_result"),z.path("revision").asInt(),circuit(zone,false),state,p,enabled&&p!=null&&p.definition().enabled()&&state.equals("CURRENT")?next(p.definition().slots(),now):null,events);
 }
 public View save(String zone,Save raw){var input=normalize(raw);return tx.execute(t->{gates();var z=queue.zoneConfig(zone,true);if(z==null)throw bad(HttpStatus.NOT_FOUND,"Zone not found");var old=plan(zone);if((old==null?0:old.revision())!=input.revision())throw bad(HttpStatus.CONFLICT,"Schedule changed; review current plan");
  Instant now=Instant.now().truncatedTo(ChronoUnit.MICROS);if(input.reviewedAt().isBefore(now.minusSeconds(10))||input.reviewedAt().isAfter(now.plusSeconds(2)))throw bad(HttpStatus.CONFLICT,"Review fresh schedule before saving");var c=circuit(zone,true);
  if(input.enabled()&&(!enabled||!z.path("expectedSource").asText().equals("SIMULATOR")||z.path("revision").asInt()!=input.zoneRevision()||c==null||!c.circuitId().equals(input.circuitId())||c.revision()!=input.circuitRevision()||!IrrigationCircuits.configurationState(jdbc,c).equals("CURRENT")))throw bad(HttpStatus.CONFLICT,"Enabled profile and current simulator mapping required");
  jdbc.update("INSERT INTO irrigation_queue_schedule(zone_id,revision,definition,zone_snapshot,circuit_snapshot,updated_at) VALUES(?,?,?::jsonb,?::jsonb,?::jsonb,?) ON CONFLICT(zone_id) DO UPDATE SET revision=excluded.revision,definition=excluded.definition,zone_snapshot=excluded.zone_snapshot,circuit_snapshot=excluded.circuit_snapshot,updated_at=excluded.updated_at",zone,input.revision()+1,encode(input),z.toString(),c==null?null:encode(c),Timestamp.from(now));return snapshot(zone);
 });}
 static Save normalize(Save s){
  if(s==null||s.enabled()==null||s.revision()<0||s.revision()>=9007199254740991L||s.zoneRevision()<1||s.circuitRevision()<1||s.circuitId()==null||!s.circuitId().matches("[A-Z][A-Z0-9_-]{1,31}")||s.durationSeconds()<1||s.durationSeconds()>10||!TIMEZONE.equals(s.timezone())||s.reviewedAt()==null||s.slots()==null||s.slots().size()>8||s.enabled()&&s.slots().isEmpty())throw bad(HttpStatus.BAD_REQUEST,"Invalid weekly queue schedule");
  var keys=new HashSet<String>();var slots=new ArrayList<Slot>();for(var slot:s.slots()){
   if(slot==null||slot.days()==null||slot.days().isEmpty()||slot.days().size()>7||slot.days().stream().anyMatch(d->d==null||d<1||d>7)||new HashSet<>(slot.days()).size()!=slot.days().size()||slot.time()==null||!slot.time().matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]"))throw bad(HttpStatus.BAD_REQUEST,"Use distinct weekdays1..7 and HH:mm");
   for(int day:slot.days())if(!keys.add(day+"/"+slot.time()))throw bad(HttpStatus.BAD_REQUEST,"Duplicate weekly occurrence");slots.add(new Slot(slot.days().stream().sorted().toList(),slot.time()));
  }slots.sort(Comparator.comparing(Slot::time).thenComparing(sx->sx.days().toString()));return new Save(s.revision(),s.enabled(),s.zoneRevision(),s.circuitId(),s.circuitRevision(),s.durationSeconds(),TIMEZONE,List.copyOf(slots),s.reviewedAt().truncatedTo(ChronoUnit.MICROS));
 }
 static Instant next(List<Slot> slots,Instant after){return candidates(slots,after,after.plus(Duration.ofDays(8))).stream().findFirst().orElse(null);}
 private static List<Instant> candidates(List<Slot> slots,Instant from,Instant to){var zone=ZoneId.of(TIMEZONE);var dates=new TreeSet<Instant>();for(var date=from.atZone(zone).toLocalDate();!date.isAfter(to.atZone(zone).toLocalDate());date=date.plusDays(1))for(var slot:slots)if(slot.days().contains(date.getDayOfWeek().getValue())){var due=date.atTime(LocalTime.parse(slot.time())).atZone(zone).toInstant();if(due.isAfter(from)&&!due.isAfter(to))dates.add(due);}return List.copyOf(dates);}
 @EventListener(ApplicationReadyEvent.class)
 public void startup(){if(!enabled)return;tx.executeWithoutResult(t->{gates();jdbc.update("UPDATE irrigation_queue_schedule_state SET last_tick_at=?,last_result='STARTUP_SKIPPED' WHERE singleton=1",Timestamp.from(Instant.now()));});ready=true;}
 public void poll(){pollAt(null);}
 // Deterministic evaluation clock for local tests only. Queue TTL/request time always uses server now.
 void pollAt(Instant supplied){if(!enabled||!ready)return;tx.executeWithoutResult(t->{gates();Instant now=supplied==null?Instant.now():supplied;var previous=jdbc.queryForObject("SELECT last_tick_at FROM irrigation_queue_schedule_state WHERE singleton=1",Timestamp.class);if(previous==null)return;Instant from=previous.toInstant();if(!now.isAfter(from))return;
  if(Duration.between(from,now).compareTo(Duration.ofSeconds(30))>0){cursor(now,"GAP_SKIPPED");return;}
  for(var zone:jdbc.queryForList("SELECT zone_id FROM irrigation_queue_schedule WHERE (definition->>'enabled')::boolean=true ORDER BY zone_id",String.class)){var p=plan(zone);for(var due:candidates(p.definition().slots(),from,now)){
   if(!due.isAfter(p.updatedAt())||jdbc.queryForObject("SELECT count(*) FROM irrigation_queue_schedule_occurrence WHERE zone_id=? AND due_at=?",Integer.class,zone,Timestamp.from(due))!=0)continue;
   String reason=!binding(zone,p,true)?"CONFIG_CHANGED":jdbc.queryForObject("SELECT count(*) FROM irrigation_queue_request WHERE zone_id=? AND state IN ('QUEUED','REHEARSING')",Integer.class,zone)>0?"ZONE_ALREADY_WAITING":jdbc.queryForObject("SELECT count(*) FROM irrigation_queue_request WHERE state IN ('QUEUED','REHEARSING')",Integer.class)>=50?"QUEUE_FULL":"REQUEST_CREATED";UUID request=null;
   if(reason.equals("REQUEST_CREATED")){request=UUID.randomUUID();var d=p.definition();var body=mapper.createObjectNode().put("requestId",request.toString()).put("zoneId",zone).put("zoneRevision",d.zoneRevision()).put("circuitId",d.circuitId()).put("circuitRevision",d.circuitRevision()).put("durationSeconds",d.durationSeconds()).put("requestedAt",Instant.now().toString());queue.enqueue(body);}
   jdbc.update("INSERT INTO irrigation_queue_schedule_occurrence(zone_id,due_at,schedule_revision,schedule_definition,state,reason,request_id,evaluated_at) VALUES(?,?,?,?::jsonb,?,?,?,?)",zone,Timestamp.from(due),p.revision(),encode(p.definition()),request==null?"SKIPPED":"QUEUED",reason,request,Timestamp.from(now));
  }}cursor(now,"EVALUATED");
 });}
 private void cursor(Instant now,String result){jdbc.update("UPDATE irrigation_queue_schedule_state SET last_tick_at=?,last_result=? WHERE singleton=1",Timestamp.from(now),result);}
 private static ResponseStatusException bad(HttpStatus status,String reason){return new ResponseStatusException(status,reason);}
}
