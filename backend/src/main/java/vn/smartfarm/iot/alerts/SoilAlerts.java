package vn.smartfarm.iot.alerts;

import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterTelemetry;

/** Soil channel episodes, isolated from command dispatch and legacy sensor alerts. */
@Service
public class SoilAlerts {
    public record Alert(long id,String nodeId,String type,String channelId,String dataSource,
        long openedSampleId,Instant openedAt,Instant openedReceivedAt,Double openedValue,Long clearedSampleId,
        Instant clearedAt,Instant clearedReceivedAt,Double clearedValue,Instant acknowledgedAt,String acknowledgementNote) {}
    private record Key(String source,String type,String channel) {}
    private record State(Key key,boolean active,Boolean candidate,int count) {}
    private final JdbcTemplate jdbc;
    public SoilAlerts(JdbcTemplate jdbc){this.jdbc=jdbc;}

    /** Called inside the same transaction that stores a newly inserted packet. */
    @Transactional
    public void observe(WaterTelemetry.Packet packet,long sampleId) {
        Instant at=packet.timestamp().truncatedTo(ChronoUnit.MICROS);
        jdbc.update("INSERT INTO soil_alert_cursor(node_id) VALUES(?) ON CONFLICT DO NOTHING",packet.deviceId());
        var previous=jdbc.queryForMap("SELECT * FROM soil_alert_cursor WHERE node_id=? FOR UPDATE",packet.deviceId());
        Instant now=Instant.now();
        if(packet.timestamp().isBefore(now.minusSeconds(30))||packet.timestamp().isAfter(now.plusSeconds(2)))return;
        Timestamp prior=(Timestamp)previous.get("observed_at");
        // Nonincreasing source time or same-boot sequence cannot change episodes.
        if(prior!=null&&(!at.isAfter(prior.toInstant())||packet.bootId().equals(previous.get("boot_id"))
            &&packet.sequence()<=((Number)previous.get("sequence")).longValue()))return;
        boolean adjacent=prior!=null&&packet.bootId().equals(previous.get("boot_id"))
            &&packet.sequence()==((Number)previous.get("sequence")).longValue()+1
            &&Duration.between(prior.toInstant(),at).compareTo(Duration.ofSeconds(15))<=0;
        Map<Key,Boolean> evaluations=new HashMap<>();
        for(var reading:packet.readings()) {
            if(!reading.metric().equals("SOIL_MOISTURE"))continue;
            boolean fault=reading.quality().equals("SENSOR_FAULT");
            evaluations.put(new Key(packet.dataSource(),"SENSOR_FAULT",reading.channelId()),fault);
            // The hysteresis band and faults hold an episode, but break a pending streak.
            if(!fault && reading.value() instanceof Number number) {
                double value=number.doubleValue();
                if(value<30)evaluations.put(new Key(packet.dataSource(),"DRY_SOIL",reading.channelId()),true);
                else if(value>=35)evaluations.put(new Key(packet.dataSource(),"DRY_SOIL",reading.channelId()),false);
            }
        }
        for(var key:evaluations.keySet())jdbc.update("""
            INSERT INTO soil_alert_state(node_id,data_source,type,channel_key) VALUES(?,?,?,?) ON CONFLICT DO NOTHING
            """,packet.deviceId(),key.source(),key.type(),key.channel());
        var states=jdbc.query("SELECT * FROM soil_alert_state WHERE node_id=?",(rs,n)->new State(
            new Key(rs.getString("data_source"),rs.getString("type"),rs.getString("channel_key")),
            rs.getBoolean("active"),rs.getObject("candidate",Boolean.class),rs.getInt("consecutive")),packet.deviceId());
        for(var state:states) {
            var key=state.key();Boolean next=evaluations.get(key);
            boolean active=state.active();int count=0;Boolean candidate=null;
            if(next!=null&&next!=active) {
                count=adjacent&&next.equals(state.candidate())?state.count()+1:1;candidate=next;
                if(count>=2) {
                    if(next)jdbc.update("""
                        INSERT INTO soil_alert(node_id,data_source,type,channel_key,opened_sample_id) VALUES(?,?,?,?,?)
                        """,packet.deviceId(),key.source(),key.type(),key.channel(),sampleId);
                    else jdbc.update("""
                        UPDATE soil_alert SET cleared_sample_id=? WHERE node_id=? AND data_source=? AND type=? AND channel_key=? AND cleared_sample_id IS NULL
                        """,sampleId,packet.deviceId(),key.source(),key.type(),key.channel());
                    active=next;candidate=null;count=0;
                }
            }
            // Missing channels / source changes break a streak, and never clear an active episode.
            jdbc.update("""
                UPDATE soil_alert_state SET active=?,candidate=?,consecutive=? WHERE node_id=? AND data_source=? AND type=? AND channel_key=?
                """,active,candidate,count,packet.deviceId(),key.source(),key.type(),key.channel());
        }
        jdbc.update("UPDATE soil_alert_cursor SET observed_at=?,boot_id=?,sequence=? WHERE node_id=?",
            Timestamp.from(at),packet.bootId(),packet.sequence(),packet.deviceId());
    }
    private static final String SELECT="""
        SELECT a.*,s.observed_at AS opened_at,s.received_at AS opened_received_at,
          c.observed_at AS cleared_at,c.received_at AS cleared_received_at,
          o.number_value AS opened_value,v.number_value AS cleared_value
        FROM soil_alert a JOIN node_sample s ON s.id=a.opened_sample_id
        JOIN channel_sample o ON o.sample_id=a.opened_sample_id AND o.channel_id=a.channel_key
        LEFT JOIN node_sample c ON c.id=a.cleared_sample_id
        LEFT JOIN channel_sample v ON v.sample_id=a.cleared_sample_id AND v.channel_id=a.channel_key
        """;
    private static Instant instant(Timestamp value){return value==null?null:value.toInstant();}
    private Alert map(java.sql.ResultSet rs,int n)throws java.sql.SQLException {
        String channel=rs.getString("channel_key");
        return new Alert(rs.getLong("id"),rs.getString("node_id"),rs.getString("type"),channel.isEmpty()?null:channel,
            rs.getString("data_source"),rs.getLong("opened_sample_id"),instant(rs.getTimestamp("opened_at")),instant(rs.getTimestamp("opened_received_at")),rs.getObject("opened_value",Double.class),
            rs.getObject("cleared_sample_id",Long.class),instant(rs.getTimestamp("cleared_at")),instant(rs.getTimestamp("cleared_received_at")),rs.getObject("cleared_value",Double.class),
            instant(rs.getTimestamp("acknowledged_at")),rs.getString("acknowledgement_note"));
    }
    public List<Alert> list(){return jdbc.query(SELECT+" ORDER BY (a.cleared_sample_id IS NULL) DESC,(a.acknowledged_at IS NULL) DESC,a.id DESC LIMIT 100",this::map);}
    public Alert find(long id){
        if(id<1)throw bad(HttpStatus.BAD_REQUEST,"Positive ID required");
        return jdbc.query(SELECT+" WHERE a.id=?",this::map,id).stream().findFirst().orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Soil alert not found"));
    }
    @Transactional
    public Alert acknowledge(long id,String note){
        if(id<1||note!=null&&note.length()>500)throw bad(HttpStatus.BAD_REQUEST,"Positive ID and note <=500 characters required");
        String normalized=note==null||note.isBlank()?null:note.strip();
        var locked=jdbc.query("SELECT id FROM soil_alert WHERE id=? FOR UPDATE",(rs,n)->rs.getLong(1),id);
        if(locked.isEmpty())throw bad(HttpStatus.NOT_FOUND,"Soil alert not found");
        var alert=find(id);
        if(alert.acknowledgedAt()!=null){
            if(!Objects.equals(normalized,alert.acknowledgementNote()))throw bad(HttpStatus.CONFLICT,"Already acknowledged; reload stored note");
            return alert;
        }
        if(alert.clearedAt()!=null)throw bad(HttpStatus.CONFLICT,"Alert has returned to normal");
        jdbc.update("UPDATE soil_alert SET acknowledged_at=CURRENT_TIMESTAMP,acknowledgement_note=? WHERE id=?",normalized,id);
        return find(id);
    }
    private static ResponseStatusException bad(HttpStatus status,String message){return new ResponseStatusException(status,message);}
}
