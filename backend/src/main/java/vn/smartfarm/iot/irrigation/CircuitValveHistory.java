package vn.smartfarm.iot.irrigation;

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
public class CircuitValveHistory {
 public record Sample(long id,JsonNode circuitSnapshot,JsonNode observation) {}
 public record Page(Instant from,Instant to,String circuitId,String valveId,String condition,long ceilingId,List<Sample> items,String nextCursor) {}
 private record Cursor(long ceiling,Instant receivedAt,long id,String scope) {}
 private final JdbcTemplate jdbc;private final ObjectMapper mapper;
 public CircuitValveHistory(JdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}
 @Transactional(propagation=Propagation.MANDATORY)
 public void record(IrrigationCircuits.Config c,CircuitValveMonitor.Observation s){
  // Serialize ID allocation through commit. A pagination ceiling must never include
  // a newer committed ID while an earlier ID can still appear after page one.
  jdbc.execute("SELECT pg_advisory_xact_lock(29001,1)");
  var f=s.positionFeedback();jdbc.update("INSERT INTO circuit_valve_history(circuit_id,valve_id,boot_id,sequence,observed_at,received_at,position_state,has_fault,circuit_snapshot,observation) VALUES(?,?,?,?,?,?,?,?,?::jsonb,?::jsonb)",c.circuitId(),s.actuatorId(),s.bootId(),s.sequence(),Timestamp.from(s.observedAt()),Timestamp.from(s.receivedAt()),f==null?"UNKNOWN":f.state(),s.reason().equals("DEVICE_FAULT")||f!=null&&f.fault()!=null,mapper.valueToTree(c).toString(),mapper.valueToTree(s).toString());
 }
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Page list(Instant from,Instant to,String circuit,String valve,String condition,int limit,String token){
  if(from==null||to==null||!from.isBefore(to)||Duration.between(from,to).compareTo(Duration.ofDays(31))>0||limit<1||limit>200)throw bad("Range <=31 days and limit 1..200 required");
  if(circuit!=null&&!circuit.matches("[A-Z][A-Z0-9_-]{1,31}")||valve!=null&&!valve.matches("VALVE(0[2-9]|[1-9][0-9])"))throw bad("Invalid circuit/monitor valve ID");
  String selected=condition==null?"ALL":condition;if(!Set.of("ALL","FAULT","UNKNOWN","OPEN","CLOSED","CONFLICT").contains(selected))throw bad("Invalid condition");
  String scope=scope(from+"|"+to+"|"+circuit+"|"+valve+"|"+selected);Cursor cursor=token==null?null:decode(token);
  if(cursor!=null&&(!scope.equals(cursor.scope())||cursor.receivedAt().isBefore(from)||!cursor.receivedAt().isBefore(to)))throw bad("Cursor does not match the requested filters/range");
  long ceiling=cursor==null?jdbc.queryForObject("SELECT COALESCE(MAX(id),0) FROM circuit_valve_history",Long.class):cursor.ceiling();
  StringBuilder sql=new StringBuilder("SELECT id,circuit_snapshot,observation,received_at FROM circuit_valve_history WHERE received_at>=? AND received_at<? AND id<=?");
  var args=new ArrayList<Object>(List.of(Timestamp.from(from),Timestamp.from(to),ceiling));
  if(circuit!=null){sql.append(" AND circuit_id=?");args.add(circuit);}if(valve!=null){sql.append(" AND valve_id=?");args.add(valve);}
  if(selected.equals("FAULT"))sql.append(" AND has_fault");else if(!selected.equals("ALL")){sql.append(" AND position_state=?");args.add(selected);}
  if(cursor!=null){sql.append(" AND (received_at,id)<(?,?)");args.add(Timestamp.from(cursor.receivedAt()));args.add(cursor.id());}
  sql.append(" ORDER BY received_at DESC,id DESC LIMIT ?");args.add(limit+1);
  var rows=jdbc.query(sql.toString(),(r,n)->new Row(new Sample(r.getLong("id"),json(r.getString("circuit_snapshot")),json(r.getString("observation"))),r.getTimestamp("received_at").toInstant()),args.toArray());
  boolean more=rows.size()>limit;var visible=rows.subList(0,Math.min(limit,rows.size()));String next=more?encode(new Cursor(ceiling,visible.getLast().receivedAt(),visible.getLast().sample().id(),scope)):null;
  return new Page(from,to,circuit,valve,selected,ceiling,visible.stream().map(Row::sample).toList(),next);
 }
 private record Row(Sample sample,Instant receivedAt) {}
 private JsonNode json(String text){try{return mapper.readTree(text);}catch(Exception e){throw new IllegalStateException("Invalid stored valve history",e);}}
 private static String scope(String text){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 private static String encode(Cursor c){return Base64.getUrlEncoder().withoutPadding().encodeToString((c.ceiling()+"\n"+c.receivedAt()+"\n"+c.id()+"\n"+c.scope()).getBytes(StandardCharsets.UTF_8));}
 private static Cursor decode(String token){try{if(token.length()>512)throw new IllegalArgumentException();String[] p=new String(Base64.getUrlDecoder().decode(token),StandardCharsets.UTF_8).split("\n",-1);if(p.length!=4||!p[0].matches("[1-9][0-9]{0,15}")||!p[2].matches("[1-9][0-9]{0,15}")||!p[3].matches("[a-f0-9]{64}"))throw new IllegalArgumentException();long ceiling=Long.parseLong(p[0]),id=Long.parseLong(p[2]);if(ceiling>9007199254740991L||id>ceiling)throw new IllegalArgumentException();return new Cursor(ceiling,Instant.parse(p[1]),id,p[3]);}catch(RuntimeException e){throw bad("Invalid cursor");}}
 private static ResponseStatusException bad(String text){return new ResponseStatusException(HttpStatus.BAD_REQUEST,text);}
}
