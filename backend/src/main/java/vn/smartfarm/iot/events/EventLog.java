package vn.smartfarm.iot.events;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Read model only: source tables retain ownership of their state and timestamps. */
@Service
public class EventLog {
    public record Event(String id, Instant eventAt, Instant sourceAt, Instant recordedAt,
        String category, String type, String deviceId, String action, String state,
        String reason, Double value, UUID commandId, Long runId) {}
    public record Page(List<Event> items, String nextCursor, Instant from, Instant to) {}
    private record Cursor(Instant at, String id) {}
    private final JdbcTemplate jdbc;
    public EventLog(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    // No timestamp is invented: alerts only store source time; ACK only stores receipt time.
    private static final String EVENTS = """
        WITH run_links AS (
          SELECT command_id,MIN(id) AS run_id FROM watering_run
          WHERE command_id IS NOT NULL GROUP BY command_id
        ), events AS (
          SELECT 'alert-open:'||id AS event_id,opened_at AS event_at,opened_at AS source_at,
            NULL::timestamptz AS recorded_at,'ALERT' AS category,'ALERT_OPENED' AS type,
            device_id,NULL::text AS action,'OPEN' AS state,type AS reason,opened_value AS value,
            NULL::uuid AS command_id,NULL::bigint AS run_id FROM sensor_alert
          UNION ALL
          SELECT 'alert-clear:'||id,cleared_at,cleared_at,NULL::timestamptz,'ALERT','ALERT_CLEARED',
            device_id,NULL,'CLEARED',type,cleared_value,NULL::uuid,NULL::bigint
            FROM sensor_alert WHERE cleared_at IS NOT NULL
          UNION ALL
          SELECT 'alert-seen:'||id,acknowledged_at,NULL::timestamptz,acknowledged_at,'ALERT','ALERT_ACKNOWLEDGED',
            device_id,NULL,'ACKNOWLEDGED',type,NULL::double precision,NULL::uuid,NULL::bigint
            FROM sensor_alert WHERE acknowledged_at IS NOT NULL
          UNION ALL
          SELECT 'command:'||c.command_id,c.issued_at,NULL::timestamptz,c.issued_at,'COMMAND','COMMAND_CREATED',
            'PUMP01',c.action,c.state,c.error_code,NULL::double precision,c.command_id,
            links.run_id FROM pump_command c LEFT JOIN run_links links ON links.command_id=c.command_id
          UNION ALL
          SELECT 'ack:'||c.command_id,c.acknowledged_at,NULL::timestamptz,c.acknowledged_at,'COMMAND','COMMAND_ACK',
            'PUMP01',c.action,c.state,c.error_code,NULL::double precision,c.command_id,
            links.run_id
            FROM pump_command c LEFT JOIN run_links links ON links.command_id=c.command_id WHERE c.acknowledged_at IS NOT NULL
          UNION ALL
          SELECT 'device:'||id,observed_at,observed_at,received_at,'DEVICE','DEVICE_STATE',
            'PUMP01',NULL,reported_state,COALESCE(state_reason,change_type),NULL::double precision,
            NULL::uuid,NULL::bigint FROM pump_state_history
          UNION ALL
          SELECT 'run:'||id,started_at,NULL::timestamptz,started_at,'RULE','RULE_STARTED',
            'PUMP01',NULL,result,NULL,NULL::double precision,command_id,id FROM watering_run
        ) SELECT * FROM events WHERE event_at >= ? AND event_at < ?
        """;
    public Page list(Instant from, Instant to, String category, String device, int limit, String cursor) {
        Instant end=to==null ? Instant.now() : to;
        Instant start=from==null ? end.minus(Duration.ofHours(24)) : from;
        if (!start.isBefore(end) || Duration.between(start,end).compareTo(Duration.ofDays(31))>0 || limit<1 || limit>100)
            throw bad("Use an increasing range <=31 days and limit 1..100");
        if (category!=null && !Set.of("ALERT","COMMAND","DEVICE","RULE").contains(category)) throw bad("Invalid category");
        if (device!=null && !device.matches("[A-Z][A-Z0-9_-]{1,31}")) throw bad("Invalid device ID");
        var args=new ArrayList<Object>(List.of(Timestamp.from(start),Timestamp.from(end)));
        String sql=EVENTS;
        if (category!=null) { sql+=" AND category=?"; args.add(category); }
        if (device!=null) { sql+=" AND device_id=?"; args.add(device); }
        if (cursor!=null) {
            // Keep the range fixed between pages; filters are supplied by the caller.
            if (from==null || to==null) throw bad("Cursor requires explicit from and to");
            var decoded=decode(cursor);
            if (decoded.at().isBefore(start) || !decoded.at().isBefore(end)) throw bad("Cursor outside range");
            sql+=" AND (event_at,event_id) < (?,?)";
            args.add(Timestamp.from(decoded.at())); args.add(decoded.id());
        }
        sql+=" ORDER BY event_at DESC,event_id DESC LIMIT ?";args.add(limit+1);
        var rows=jdbc.query(sql,(rs,n)->new Event(rs.getString("event_id"),rs.getTimestamp("event_at").toInstant(),
            instant(rs.getTimestamp("source_at")),instant(rs.getTimestamp("recorded_at")),rs.getString("category"),
            rs.getString("type"),rs.getString("device_id"),rs.getString("action"),rs.getString("state"),
            rs.getString("reason"),rs.getObject("value",Double.class),rs.getObject("command_id",UUID.class),
            rs.getObject("run_id",Long.class)),args.toArray());
        boolean more=rows.size()>limit;
        var items=List.copyOf(rows.subList(0,Math.min(rows.size(),limit)));
        Event last=items.isEmpty()?null:items.getLast();
        return new Page(items,more && last!=null ? encode(last):null,start,end);
    }
    private static Instant instant(Timestamp timestamp) { return timestamp==null?null:timestamp.toInstant(); }
    private static String encode(Event event) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString((event.eventAt()+"\n"+event.id()).getBytes(StandardCharsets.UTF_8));
    }
    private static Cursor decode(String value) {
        try {
            if (value.length()>512) throw new IllegalArgumentException();
            String[] parts=new String(Base64.getUrlDecoder().decode(value),StandardCharsets.UTF_8).split("\n",-1);
            if (parts.length!=2 || !parts[1].matches("(?:alert-open|alert-clear|alert-seen|command|ack|device|run):[a-zA-Z0-9-]{1,40}")) throw new IllegalArgumentException();
            return new Cursor(Instant.parse(parts[0]),parts[1]);
        } catch (IllegalArgumentException | java.time.DateTimeException error) { throw bad("Invalid cursor"); }
    }
    private static ResponseStatusException bad(String reason) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,reason); }
}
