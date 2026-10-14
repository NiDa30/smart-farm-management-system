package vn.smartfarm.iot.nodes;

import java.math.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Historical estimate over observed intervals only; never permission to run a pump. */
@Service
public class WaterVolume {
 public static final int MAX_PACKETS=25000;
 public record Group(String calibrationVersion,int intervals,BigDecimal coveredSeconds,BigDecimal estimatedLitres) {}
 public record Report(String nodeId,String channelId,Instant from,Instant to,String dataSource,String method,
  int maxGapSeconds,int packetCount,int sourcePacketCount,int acceptedIntervals,Map<String,Integer> excluded,
  BigDecimal coveredSeconds,BigDecimal uncoveredSeconds,BigDecimal estimatedLitres,List<Group> groups) {}
 private record Point(UUID boot,long sequence,Instant at,Instant received,String source,String quality,Double flow,String calibration) {}
 private final JdbcTemplate jdbc;
 public WaterVolume(JdbcTemplate jdbc){this.jdbc=jdbc;}
 @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
 public Report estimate(String node,String channel,Instant from,Instant to,String source){
  if(node==null||!node.matches("[A-Z][A-Z0-9_-]{1,31}")||channel==null||!channel.matches("[A-Z][A-Z0-9_-]{1,31}")
   ||from==null||to==null||from.isBefore(Instant.EPOCH)||from.getNano()%1000!=0||to.getNano()%1000!=0||!from.isBefore(to)||Duration.between(from,to).compareTo(Duration.ofDays(1))>0||to.isAfter(Instant.now().plusSeconds(2))
   ||source==null||!Set.of("SIMULATOR","PHYSICAL","UNSPECIFIED").contains(source))throw bad(HttpStatus.BAD_REQUEST,"Use explicit source and increasing past range <=24 hours");
  if(!Boolean.TRUE.equals(jdbc.queryForObject("""
   SELECT EXISTS(SELECT 1 FROM iot_channel c JOIN iot_node n ON n.node_id=c.node_id
    WHERE c.node_id=? AND c.channel_id=? AND c.metric='FLOW_RATE' AND c.unit='L/min' AND n.node_type='WATER' AND n.telemetry_version=2)
   """,Boolean.class,node,channel)))throw bad(HttpStatus.NOT_FOUND,"Water flow channel not found");
  // Keep packets without this channel and other sources: never bridge across them after filtering.
  var points=jdbc.query("""
   SELECT s.*,m.quality,m.number_value,m.calibration_version FROM node_sample s
   LEFT JOIN channel_sample m ON m.sample_id=s.id AND m.node_id=s.node_id AND m.channel_id=?
   WHERE s.node_id=? AND s.observed_at>=? AND s.observed_at<? ORDER BY s.observed_at,s.id LIMIT ?
   """,(rs,n)->new Point(rs.getObject("boot_id",UUID.class),rs.getLong("sequence"),rs.getTimestamp("observed_at").toInstant(),
    rs.getTimestamp("received_at").toInstant(),rs.getString("data_source"),rs.getString("quality"),rs.getObject("number_value",Double.class),rs.getString("calibration_version")),
   channel,node,Timestamp.from(from),Timestamp.from(to),MAX_PACKETS+1);
  if(points.size()>MAX_PACKETS)throw bad(HttpStatus.UNPROCESSABLE_ENTITY,"Too many packets; choose a shorter range");
  Map<String,Integer> excluded=new TreeMap<>();Map<String,Group> groups=new LinkedHashMap<>();BigDecimal covered=BigDecimal.ZERO;int accepted=0;
  for(int i=1;i<points.size();i++){
   Point a=points.get(i-1),b=points.get(i);String reason=reason(a,b,source);
   if(reason!=null){excluded.merge(reason,1,Integer::sum);continue;}
   BigDecimal seconds=seconds(Duration.between(a.at(),b.at()));
   BigDecimal litres=BigDecimal.valueOf(a.flow()).add(BigDecimal.valueOf(b.flow())).divide(BigDecimal.valueOf(2))
    .multiply(seconds).divide(BigDecimal.valueOf(60),MathContext.DECIMAL128);
   Group old=groups.get(b.calibration());Group next=new Group(b.calibration(),old==null?1:old.intervals()+1,
    seconds.add(old==null?BigDecimal.ZERO:old.coveredSeconds()),litres.add(old==null?BigDecimal.ZERO:old.estimatedLitres()));
   if(!Double.isFinite(next.estimatedLitres().doubleValue()))throw bad(HttpStatus.UNPROCESSABLE_ENTITY,"Estimate exceeds numeric range");
   groups.put(b.calibration(),next);covered=covered.add(seconds);accepted++;
  }
  // Never silently sum estimates from distinct/unknown calibration versions.
  BigDecimal total=groups.size()==1?groups.values().iterator().next().estimatedLitres():null;
  return new Report(node,channel,from,to,source,"TRAPEZOID_V1",15,points.size(),(int)points.stream().filter(p->p.source().equals(source)).count(),accepted,
   Map.copyOf(excluded),covered,seconds(Duration.between(from,to)).subtract(covered),total,List.copyOf(groups.values()));
 }
 private static String reason(Point a,Point b,String source){
  if(!a.source().equals(source)||!b.source().equals(source))return "SOURCE_CHANGE";
  if(a.quality()==null||b.quality()==null)return "MISSING_CHANNEL";
  if(!a.quality().equals("VALID")||!b.quality().equals("VALID")||a.flow()==null||b.flow()==null
   ||!Double.isFinite(a.flow())||!Double.isFinite(b.flow())||a.flow()<0||b.flow()<0)return "SENSOR_FAULT";
  if(a.at().isAfter(a.received().plusSeconds(2))||b.at().isAfter(b.received().plusSeconds(2)))return "CLOCK_SKEW";
  if(a.received().isAfter(a.at().plusSeconds(30))||b.received().isAfter(b.at().plusSeconds(30)))return "RECEIPT_DELAY";
  if(!a.boot().equals(b.boot()))return "BOOT_CHANGE";
  if(a.sequence()==Long.MAX_VALUE||b.sequence()!=a.sequence()+1)return "SEQUENCE_GAP";
  if(!Objects.equals(a.calibration(),b.calibration()))return "CALIBRATION_CHANGE";
  Duration duration=Duration.between(a.at(),b.at());
  if(duration.isZero()||duration.isNegative()||duration.compareTo(Duration.ofSeconds(15))>0)return "TIME_GAP";
  return null;
 }
 private static BigDecimal seconds(Duration d){return BigDecimal.valueOf(d.getSeconds()).add(BigDecimal.valueOf(d.getNano(),9));}
 private static ResponseStatusException bad(HttpStatus status,String reason){return new ResponseStatusException(status,reason);}
}
