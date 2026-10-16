package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.CircuitFlowGuard;

/** Atomically consumes the reviewed FIFO head into PREPARED. No transport or step dispatch. */
@Service
public class IrrigationQueueHandoff {
 public record Request(long queueRevision,IrrigationSession.Start session) {}
 public record Review(int circuitRevision,int zoneRevision,UUID pumpBootId,UUID valveBootId,Instant reviewedAt) {}
 public record Receipt(UUID requestId,Instant preparedAt,Request definition,IrrigationSession.Run session) {}
 public record View(String mode,UUID requestId,Instant asOf,boolean enabled,long queueRevision,IrrigationQueue.Item request,boolean canPrepare,String reason,Review review,Receipt receipt) {}
 private record Assessment(String reason,Review review) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;private final IrrigationQueue queue;private final IrrigationSession sessions;private final boolean enabled;
 public IrrigationQueueHandoff(JdbcTemplate jdbc,ObjectMapper mapper,IrrigationQueue queue,IrrigationSession sessions,@Value("${smartfarm.irrigation.queue-handoff-enabled:false}")boolean enabled){this.jdbc=jdbc;this.mapper=mapper;this.queue=queue;this.sessions=sessions;this.enabled=enabled;}
 private String encode(Object v){try{return mapper.writeValueAsString(v);}catch(Exception e){throw new IllegalStateException(e);}}
 private Request decode(String v){try{return mapper.readValue(v,Request.class);}catch(Exception e){throw new IllegalStateException("Invalid queue handoff definition",e);}}
 private Receipt receipt(UUID id){return jdbc.query("SELECT h.*,s.circuit_id FROM irrigation_queue_handoff h JOIN irrigation_session s USING(session_id) WHERE request_id=?",(r,n)->new Receipt(id,r.getTimestamp("prepared_at").toInstant(),decode(r.getString("definition")),sessions.find(r.getString("circuit_id"),r.getObject("session_id",UUID.class))),id).stream().findFirst().orElse(null);}
 private Assessment assess(IrrigationQueue.Item item,IrrigationQueue.Snapshot q,boolean locking){
  if(!enabled)return new Assessment("PROFILE_DISABLED",null);
  if(!item.state().equals("QUEUED"))return new Assessment("NOT_WAITING",null);
  if(q.active()!=null)return new Assessment("REHEARSAL_ACTIVE",null);
  if(q.waiting().isEmpty()||!q.waiting().getFirst().requestId().equals(item.requestId()))return new Assessment("NOT_FIFO_HEAD",null);
  if(!item.expiresAt().isAfter(Instant.now()))return new Assessment("EXPIRED",null);
  if(item.circuitSnapshot()==null)return new Assessment("CIRCUIT_REQUIRED",null);
  if(item.durationSeconds()>10)return new Assessment("DURATION_TOO_LONG",null);
  if(!queue.currentForHandoff(item,locking))return new Assessment("CONFIG_CHANGED",null);
  String circuit=item.circuitSnapshot().path("circuitId").asText();
  var v=sessions.snapshot(circuit);
  if(!v.canStart())return new Assessment("SESSION_"+v.startReason(),null);
  try{CircuitFlowGuard.requireDuration(jdbc,circuit,item.durationSeconds());}catch(ResponseStatusException e){return new Assessment("FLOW_GRACE_TOO_LONG",null);}
  var c=v.valve().config();return new Assessment("READY",new Review(c.revision(),c.zoneRevision(),v.pump().commandFence().intent().bootId(),v.valve().latest().bootId(),v.asOf()));
 }
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public View snapshot(UUID id){var item=queue.lookup(id);var q=queue.snapshot();var done=receipt(id);var a=done==null?assess(item,q,false):new Assessment("HANDED_OFF",null);return new View("OPERATOR_PREPARATION",id,Instant.now(),enabled,q.revision(),item,a.reason().equals("READY"),a.reason(),a.review(),done);}
 @Transactional
 public Receipt prepare(UUID id,Request input){
  if(input==null||input.queueRevision()<1||input.queueRevision()>9007199254740991L||input.session()==null||input.session().reviewedAt()==null||input.session().sessionId()==null)throw bad(HttpStatus.BAD_REQUEST,"Invalid queue handoff");
  var s=input.session();var body=new Request(input.queueRevision(),new IrrigationSession.Start(s.sessionId(),s.circuitRevision(),s.zoneRevision(),s.pumpBootId(),s.valveBootId(),s.durationSeconds(),s.reviewedAt().truncatedTo(ChronoUnit.MICROS)));
  // Lock order: pump -> queue -> circuit -> zone, compatible with session and preview paths.
  jdbc.queryForObject("SELECT singleton FROM pump_dispatch_gate WHERE singleton=1 FOR UPDATE",Integer.class);
  jdbc.queryForObject("SELECT revision FROM irrigation_queue_state WHERE singleton=1 FOR UPDATE",Long.class);
  jdbc.queryForObject("SELECT revision FROM irrigation_circuit_state WHERE singleton=1 FOR UPDATE",Long.class);
  var old=receipt(id);if(old!=null){if(!old.definition().equals(body))throw bad(HttpStatus.CONFLICT,"Queue request already prepared with another definition");return old;}
  var item=queue.lookup(id);var q=queue.snapshot();if(q.revision()!=body.queueRevision())throw bad(HttpStatus.CONFLICT,"Queue changed; review before handoff");
  var a=assess(item,q,true);if(!a.reason().equals("READY"))throw bad(HttpStatus.CONFLICT,"HANDOFF_"+a.reason());
  var review=a.review();if(s.durationSeconds()!=item.durationSeconds()||s.circuitRevision()!=review.circuitRevision()||s.zoneRevision()!=review.zoneRevision()||!Objects.equals(s.pumpBootId(),review.pumpBootId())||!Objects.equals(s.valveBootId(),review.valveBootId()))throw bad(HttpStatus.CONFLICT,"Queue duration, mapping or boot changed");
  if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_session WHERE session_id=?)",Boolean.class,s.sessionId())))throw bad(HttpStatus.CONFLICT,"Session identity already used; do not attach an existing session");
  var run=sessions.start(item.circuitSnapshot().path("circuitId").asText(),body.session());
  jdbc.update("INSERT INTO irrigation_queue_handoff(request_id,session_id,definition) VALUES(?,?,?::jsonb)",id,run.sessionId(),encode(body));
  jdbc.update("UPDATE irrigation_queue_request SET state='HANDED_OFF',reason='OPERATOR_SESSION_PREPARED',finished_at=CURRENT_TIMESTAMP WHERE request_id=?",id);
  jdbc.update("UPDATE irrigation_queue_state SET revision=revision+1 WHERE singleton=1");
  return receipt(id);
 }
 private static ResponseStatusException bad(HttpStatus s,String m){return new ResponseStatusException(s,m);}
}
