package vn.smartfarm.iot.nodes;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Read-only, bounded channel history. No integration of flow or actuator dispatch. */
@Service
public class WaterHistory {
    public record Channel(String channelId,String metric,String unit,String calibrationVersion) {}
    public record Item(long sampleId,Object value,String quality,Instant observedAt,Instant receivedAt,
        UUID bootId,long sequence,String calibrationVersion,String dataSource) {}
    public record Page(String nodeId,Channel channel,Instant from,Instant to,String dataSource,String quality,
        long snapshotId,List<Item> items,String nextCursor) {}
    private record Cursor(long snapshotId,Instant at,long id) {}
    private final JdbcTemplate jdbc;
    public WaterHistory(JdbcTemplate jdbc){this.jdbc=jdbc;}

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Page list(String node,String channel,Instant from,Instant to,String source,String quality,int limit,String cursor) {
        if(node==null||!node.matches("[A-Z][A-Z0-9_-]{1,31}")||channel==null||!channel.matches("[A-Z][A-Z0-9_-]{1,31}"))throw bad("Invalid node/channel");
        Instant end=to==null?Instant.now():to,start=from==null?end.minus(Duration.ofHours(24)):from;
        if(!start.isBefore(end)||Duration.between(start,end).compareTo(Duration.ofDays(31))>0||limit<1||limit>1000)
            throw bad("Use increasing range <=31 days and limit 1..1000");
        if(source!=null&&!Set.of("SIMULATOR","PHYSICAL","UNSPECIFIED").contains(source))throw bad("Invalid source");
        if(quality!=null&&!Set.of("VALID","SENSOR_FAULT").contains(quality))throw bad("Invalid quality");
        var declaration=jdbc.query("""
            SELECT c.* FROM iot_channel c JOIN iot_node n ON n.node_id=c.node_id
            WHERE c.node_id=? AND c.channel_id=? AND n.node_type IN ('WATER','SOIL') AND n.telemetry_version=2
            """,(rs,n)->new Channel(rs.getString("channel_id"),rs.getString("metric"),rs.getString("unit"),rs.getString("calibration_version")),node,channel)
            .stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Channel not found"));
        String scope=String.join("\n",node,channel,start.toString(),end.toString(),source==null?"":source,quality==null?"":quality);
        Cursor point=null;
        if(cursor!=null){if(from==null||to==null)throw bad("Cursor requires explicit from/to");point=decode(cursor,scope,start,end);}
        long snapshot=point==null?jdbc.queryForObject("SELECT COALESCE(MAX(id),0) FROM node_sample WHERE node_id=?",Long.class,node):point.snapshotId();
        String sql="""
            SELECT s.*,m.quality,m.number_value,m.boolean_value,m.calibration_version
            FROM node_sample s JOIN channel_sample m ON m.sample_id=s.id AND m.node_id=s.node_id
            WHERE s.node_id=? AND m.channel_id=? AND s.observed_at>=? AND s.observed_at<? AND s.id<=?
            """;
        var args=new ArrayList<Object>(List.of(node,channel,Timestamp.from(start),Timestamp.from(end),snapshot));
        if(source!=null){sql+=" AND s.data_source=?";args.add(source);}
        if(quality!=null){sql+=" AND m.quality=?";args.add(quality);}
        if(point!=null){sql+=" AND (s.observed_at,s.id)<(?,?)";args.add(Timestamp.from(point.at()));args.add(point.id());}
        sql+=" ORDER BY s.observed_at DESC,s.id DESC LIMIT ?";args.add(limit+1);
        var rows=jdbc.query(sql,(rs,n)->{
            Object value=rs.getObject("boolean_value");if(value==null)value=rs.getObject("number_value");
            return new Item(rs.getLong("id"),value,rs.getString("quality"),rs.getTimestamp("observed_at").toInstant(),rs.getTimestamp("received_at").toInstant(),
                rs.getObject("boot_id",UUID.class),rs.getLong("sequence"),rs.getString("calibration_version"),rs.getString("data_source"));
        },args.toArray());
        boolean more=rows.size()>limit;var items=List.copyOf(rows.subList(0,Math.min(limit,rows.size())));
        return new Page(node,declaration,start,end,source,quality,snapshot,items,more?encode(scope,snapshot,items.getLast()):null);
    }
    private static String encode(String scope,long snapshot,Item item){
        return Base64.getUrlEncoder().withoutPadding().encodeToString((scope+"\n"+snapshot+"\n"+item.observedAt()+"\n"+item.sampleId()).getBytes(StandardCharsets.UTF_8));
    }
    private static Cursor decode(String value,String scope,Instant start,Instant end){
        try{
            if(value.isEmpty()||value.length()>2048||!value.matches("[A-Za-z0-9_-]+"))throw new IllegalArgumentException();
            String[] fields=new String(Base64.getUrlDecoder().decode(value),StandardCharsets.UTF_8).split("\n",-1);
            if(fields.length!=9||!String.join("\n",Arrays.copyOfRange(fields,0,6)).equals(scope))throw new IllegalArgumentException();
            long snapshot=Long.parseLong(fields[6]),id=Long.parseLong(fields[8]);Instant at=Instant.parse(fields[7]);
            if(snapshot<1||id<1||id>snapshot||at.isBefore(start)||!at.isBefore(end))throw new IllegalArgumentException();
            return new Cursor(snapshot,at,id);
        }catch(IllegalArgumentException|DateTimeException e){throw bad("Cursor does not match history scope");}
    }
    private static ResponseStatusException bad(String reason){return new ResponseStatusException(HttpStatus.BAD_REQUEST,reason);}
}
