package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Immutable accepted samples, not inferred transitions or proof of water delivery. */
@Service
public class PumpCircuitHistory {
 public record Sample(long id,PumpCircuitRoute route,UUID bootId,long sequence,Instant observedAt,Instant receivedAt,String reportedState,boolean safetyLockout,String stateReason,long lastOrdinal,UUID commandId,PumpValveInterlock valveInterlock,PumpDurableSafety durableSafety) {}
 public record Page(Instant from,Instant to,String circuitId,String condition,long ceilingId,List<Sample> items,String nextCursor) {}
 private record Cursor(long ceiling,Instant receivedAt,long id,String scope) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;
 public PumpCircuitHistory(JdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Page list(Instant from,Instant to,String circuit,String condition,int limit,String token){
  if(from==null||to==null||!from.isBefore(to)||Duration.between(from,to).compareTo(Duration.ofDays(31))>0||limit<1||limit>200)throw bad("Range <=31 days and limit 1..200 required");
  if(circuit!=null&&!circuit.matches("[A-Z][A-Z0-9_-]{1,31}"))throw bad("Invalid circuit ID");
  String selected=condition==null?"ALL":condition;if(!Set.of("ALL","LOCKED","ON","OFF").contains(selected))throw bad("Invalid condition");
  String scope=scope(from+"|"+to+"|"+circuit+"|"+selected);Cursor cursor=token==null?null:decode(token);
  if(cursor!=null&&(!scope.equals(cursor.scope())||cursor.receivedAt().isBefore(from)||!cursor.receivedAt().isBefore(to)))throw bad("Cursor does not match the requested filters/range");
  long ceiling=cursor==null?jdbc.queryForObject("SELECT COALESCE(MAX(id),0) FROM pump_circuit_history",Long.class):cursor.ceiling();
  StringBuilder sql=new StringBuilder("SELECT * FROM pump_circuit_history WHERE received_at>=? AND received_at<? AND id<=?");
  var args=new ArrayList<Object>(List.of(Timestamp.from(from),Timestamp.from(to),ceiling));
  if(circuit!=null){sql.append(" AND circuit_id=?");args.add(circuit);}
  if(selected.equals("LOCKED"))sql.append(" AND safety_lockout");else if(!selected.equals("ALL")){sql.append(" AND reported_state=?");args.add(selected);}
  if(cursor!=null){sql.append(" AND (received_at,id)<(?,?)");args.add(Timestamp.from(cursor.receivedAt()));args.add(cursor.id());}
  sql.append(" ORDER BY received_at DESC,id DESC LIMIT ?");args.add(limit+1);
  var rows=jdbc.query(sql.toString(),(r,n)->new Row(sample(r),r.getTimestamp("received_at").toInstant()),args.toArray());
  boolean more=rows.size()>limit;var visible=rows.subList(0,Math.min(limit,rows.size()));String next=more?encode(new Cursor(ceiling,visible.getLast().receivedAt(),visible.getLast().sample().id(),scope)):null;
  return new Page(from,to,circuit,selected,ceiling,visible.stream().map(Row::sample).toList(),next);
 }
 private record Row(Sample sample,Instant receivedAt) {}
 private Sample sample(java.sql.ResultSet r)throws java.sql.SQLException{return new Sample(r.getLong("id"),read(r.getString("circuit_route"),PumpCircuitRoute.class),r.getObject("boot_id",UUID.class),r.getLong("sequence"),r.getTimestamp("observed_at").toInstant(),r.getTimestamp("received_at").toInstant(),r.getString("reported_state"),r.getBoolean("safety_lockout"),r.getString("state_reason"),r.getLong("last_ordinal"),r.getObject("command_id",UUID.class),read(r.getString("valve_interlock"),PumpValveInterlock.class),read(r.getString("durable_safety"),PumpDurableSafety.class));}
 private <T>T read(String text,Class<T> type){if(text==null)return null;try{return mapper.readValue(text,type);}catch(Exception e){throw new IllegalStateException("Invalid stored pump history",e);}}
 public record Command(UUID commandId,PumpCircuitRoute route,String action,Integer durationSeconds,Instant issuedAt,Instant expiresAt,long ordinal,UUID targetBootId,String state,String reportedState,String errorCode,Instant acknowledgedAt,UUID ackBootId,Long ackSequence,String controlSource) {}
 public record Commands(Instant from,Instant to,String circuitId,Instant asOf,List<Command> items,boolean hasMore) {}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Commands commands(Instant from,Instant to,String circuit,int limit){
  // Same range and identity validation as sample pages, but command time is issuedAt.
  validateRange(from,to,circuit,limit);
  var args=new ArrayList<Object>(List.of(Timestamp.from(from),Timestamp.from(to)));String where="circuit_route IS NOT NULL AND issued_at>=? AND issued_at<?";
  if(circuit!=null){where+=" AND circuit_route->>'circuitId'=?";args.add(circuit);}args.add(limit+1);
  var rows=jdbc.query("SELECT * FROM pump_command WHERE "+where+" ORDER BY fence_ordinal DESC LIMIT ?",(r,n)->new Command(r.getObject("command_id",UUID.class),read(r.getString("circuit_route"),PumpCircuitRoute.class),r.getString("action"),r.getObject("duration_seconds",Integer.class),r.getTimestamp("issued_at").toInstant(),r.getTimestamp("expires_at").toInstant(),r.getLong("fence_ordinal"),r.getObject("target_boot_id",UUID.class),r.getString("state"),r.getString("reported_state"),r.getString("error_code"),r.getTimestamp("acknowledged_at")==null?null:r.getTimestamp("acknowledged_at").toInstant(),r.getObject("ack_boot_id",UUID.class),r.getObject("ack_sequence",Long.class),r.getString("control_source")),args.toArray());
  return new Commands(from,to,circuit,Instant.now(),rows.subList(0,Math.min(limit,rows.size())),rows.size()>limit);
 }
 private static void validateRange(Instant from,Instant to,String circuit,int limit){if(from==null||to==null||!from.isBefore(to)||Duration.between(from,to).compareTo(Duration.ofDays(31))>0||limit<1||limit>200||circuit!=null&&!circuit.matches("[A-Z][A-Z0-9_-]{1,31}"))throw bad("Range <=31days, limit1..200 and valid circuit required");}
 private static String scope(String text){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private static String encode(Cursor c){return Base64.getUrlEncoder().withoutPadding().encodeToString((c.ceiling()+"\n"+c.receivedAt()+"\n"+c.id()+"\n"+c.scope()).getBytes(StandardCharsets.UTF_8));}
 private static Cursor decode(String token){try{if(token.length()>512)throw new IllegalArgumentException();String[] p=new String(Base64.getUrlDecoder().decode(token),StandardCharsets.UTF_8).split("\n",-1);if(p.length!=4||!p[0].matches("[1-9][0-9]{0,15}")||!p[2].matches("[1-9][0-9]{0,15}")||!p[3].matches("[a-f0-9]{64}"))throw new IllegalArgumentException();long ceiling=Long.parseLong(p[0]),id=Long.parseLong(p[2]);if(ceiling>9007199254740991L||id>ceiling)throw new IllegalArgumentException();return new Cursor(ceiling,Instant.parse(p[1]),id,p[3]);}catch(RuntimeException e){throw bad("Invalid cursor");}}
 private static ResponseStatusException bad(String text){return new ResponseStatusException(HttpStatus.BAD_REQUEST,text);}
}
