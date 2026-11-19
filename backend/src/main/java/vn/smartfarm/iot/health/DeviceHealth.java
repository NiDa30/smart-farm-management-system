package vn.smartfarm.iot.health;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.monitoring.MqttHealth;
import vn.smartfarm.iot.realtime.RealtimeNotifier;

/**
 * Health episodes the backend can observe from stored receipts: a device gone silent, an
 * environment channel whose value has not moved, and a pump reported ON while the configured
 * flow channel reads below the minimum. Monitoring only; it never sends a command.
 */
@Service
public class DeviceHealth {
    public record Alert(long id, String deviceId, String type, String channelId, Instant openedAt, String detail,
        Instant clearedAt, Instant acknowledgedAt, String acknowledgementNote) {}
    public record Settings(int offlineSeconds, int stuckMinutes, String flowNode, String flowChannel,
        double minimumFlow, int flowGraceSeconds, boolean pumpObserved) {}
    public record Evaluation(boolean evaluated, String skippedReason, int opened, int cleared) {}
    record Observation(String deviceId, String type, String channel, boolean active, String detail) {}

    /** Legacy ENVIRONMENT columns keyed by the channel IDs that V14 registered for them. */
    private static final Map<String, String> ENVIRONMENT_CHANNELS = Map.of(
        "AIR_TEMP", "temperature", "AIR_HUMIDITY", "humidity", "SOIL", "soil_moisture");
    private static final int CADENCE_SECONDS = 5;
    private static final int FRESH_SECONDS = 15;

    private final JdbcTemplate jdbc;
    private final MqttHealth mqtt;
    private final RealtimeNotifier realtime;
    private final Settings settings;

    public DeviceHealth(JdbcTemplate jdbc, MqttHealth mqtt, RealtimeNotifier realtime,
        @Value("${smartfarm.health.offline-seconds:60}") int offlineSeconds,
        @Value("${smartfarm.health.stuck-minutes:30}") int stuckMinutes,
        @Value("${smartfarm.health.pump-flow-channel:}") String pumpFlowChannel,
        @Value("${smartfarm.health.minimum-flow-lpm:0.5}") double minimumFlow,
        @Value("${smartfarm.health.flow-grace-seconds:20}") int flowGraceSeconds,
        @Value("${smartfarm.control.enabled:false}") boolean pumpObserved) {
        if (offlineSeconds < 30 || offlineSeconds > 3600) throw new IllegalArgumentException("smartfarm.health.offline-seconds must be 30..3600");
        if (stuckMinutes != 0 && (stuckMinutes < 5 || stuckMinutes > 1440)) throw new IllegalArgumentException("smartfarm.health.stuck-minutes must be 0 or 5..1440");
        if (!Double.isFinite(minimumFlow) || minimumFlow <= 0 || minimumFlow > 1000) throw new IllegalArgumentException("smartfarm.health.minimum-flow-lpm must be in (0,1000]");
        if (flowGraceSeconds < 5 || flowGraceSeconds > 300) throw new IllegalArgumentException("smartfarm.health.flow-grace-seconds must be 5..300");
        String flowNode = null, flowChannel = null;
        if (pumpFlowChannel != null && !pumpFlowChannel.isBlank()) {
            String[] parts = pumpFlowChannel.strip().split("/", -1);
            if (parts.length != 2 || !code(parts[0]) || !code(parts[1]))
                throw new IllegalArgumentException("smartfarm.health.pump-flow-channel must be NODE/CHANNEL, e.g. WATER01/FLOW");
            flowNode = parts[0];
            flowChannel = parts[1];
        }
        this.jdbc = jdbc;
        this.mqtt = mqtt;
        this.realtime = realtime;
        this.settings = new Settings(offlineSeconds, stuckMinutes, flowNode, flowChannel, minimumFlow, flowGraceSeconds, pumpObserved);
    }

    public Settings settings() { return settings; }

    private static boolean code(String value) { return value.matches("[A-Z][A-Z0-9_-]{1,31}"); }

    @Transactional
    public Evaluation evaluate(Instant now) {
        var connection = mqtt.snapshot();
        // Without our own live subscription every device would look silent; decide nothing.
        if (!connection.state().equals("CONNECTED")) return new Evaluation(false, "MQTT_" + connection.state(), 0, 0);
        if (connection.changedAt().isAfter(now.minusSeconds(settings.offlineSeconds())))
            return new Evaluation(false, "MQTT_RECENTLY_CONNECTED", 0, 0);
        jdbc.execute("SELECT pg_advisory_xact_lock(hashtext('device_health_alert'))");
        List<Observation> observations = new ArrayList<>();
        observeSilence(now, observations);
        observeStuckValues(now, observations);
        observePumpFlow(now, observations);
        int opened = 0, cleared = 0;
        for (var observation : observations) {
            if (observation.active()) opened += open(observation, now);
            else cleared += clear(observation, now);
        }
        if (opened + cleared > 0) realtime.alertsChanged();
        return new Evaluation(true, null, opened, cleared);
    }

    private void observeSilence(Instant now, List<Observation> out) {
        jdbc.query("""
            SELECT n.node_id,
              CASE WHEN n.node_type='ENVIRONMENT'
                THEN (SELECT t.received_at FROM telemetry t WHERE t.device_id=n.node_id ORDER BY t.received_at DESC LIMIT 1)
                ELSE (SELECT s.received_at FROM node_sample s WHERE s.node_id=n.node_id ORDER BY s.received_at DESC LIMIT 1)
              END AS last_received
            FROM iot_node n ORDER BY n.node_id
            """, rs -> {
                Timestamp last = rs.getTimestamp("last_received");
                silence(rs.getString("node_id"), last == null ? null : last.toInstant(), now, out);
            });
        // PUMP01 status is only subscribed when control is enabled; otherwise silence is expected.
        if (settings.pumpObserved()) {
            jdbc.query("SELECT received_at FROM pump_status WHERE singleton=1",
                rs -> { silence("PUMP01", rs.getTimestamp("received_at").toInstant(), now, out); });
        }
    }

    void silence(String device, Instant lastReceived, Instant now, List<Observation> out) {
        // Never-seen devices are an onboarding state, not an outage; skewed clocks prove nothing.
        if (lastReceived == null || lastReceived.isAfter(now.plusSeconds(2))) return;
        long silent = Duration.between(lastReceived, now).toSeconds();
        if (silent > settings.offlineSeconds())
            out.add(new Observation(device, "DEVICE_OFFLINE", "", true, "LAST_RECEIVED " + lastReceived));
        else if (silent <= settings.offlineSeconds() / 2)
            out.add(new Observation(device, "DEVICE_OFFLINE", "", false, null));
        // Between the two bounds: hysteresis, leave any episode as it is.
    }

    private void observeStuckValues(Instant now, List<Observation> out) {
        if (settings.stuckMinutes() == 0) return;
        Instant from = now.minus(Duration.ofMinutes(settings.stuckMinutes()));
        // Half the nominal 5 s cadence is required, so gaps or an offline device decide nothing.
        long required = settings.stuckMinutes() * 60L / CADENCE_SECONDS / 2;
        jdbc.query("""
            SELECT device_id,COUNT(*) AS samples,MIN(observed_at) AS first_at,
              MIN(temperature) AS temperature_min,MAX(temperature) AS temperature_max,
              MIN(humidity) AS humidity_min,MAX(humidity) AS humidity_max,
              MIN(soil_moisture) AS soil_moisture_min,MAX(soil_moisture) AS soil_moisture_max
            FROM telemetry WHERE observed_at>=? AND observed_at<=? GROUP BY device_id ORDER BY device_id
            """, rs -> {
                if (rs.getLong("samples") < required) return;
                String device = rs.getString("device_id");
                Instant first = rs.getTimestamp("first_at").toInstant();
                for (var channel : ENVIRONMENT_CHANNELS.entrySet()) {
                    double min = rs.getDouble(channel.getValue() + "_min"), max = rs.getDouble(channel.getValue() + "_max");
                    boolean stuck = Double.compare(min, max) == 0;
                    out.add(new Observation(device, "STUCK_VALUE", channel.getKey(), stuck,
                        stuck ? "VALUE " + min + " UNCHANGED SINCE " + first : null));
                }
            }, Timestamp.from(from), Timestamp.from(now));
    }

    private void observePumpFlow(Instant now, List<Observation> out) {
        if (settings.flowNode() == null || !settings.pumpObserved()) return;
        var pump = jdbc.queryForList("SELECT reported_state,observed_at,received_at FROM pump_status WHERE singleton=1");
        if (pump.isEmpty()) return;
        Instant observed = ((Timestamp) pump.getFirst().get("observed_at")).toInstant();
        Instant received = ((Timestamp) pump.getFirst().get("received_at")).toInstant();
        if (!fresh(observed, received, now)) return;
        if (!"ON".equals(pump.getFirst().get("reported_state"))) {
            out.add(new Observation("PUMP01", "PUMP_NO_FLOW", "", false, null));
            return;
        }
        var since = jdbc.queryForList("""
            SELECT observed_at FROM pump_state_history
            WHERE reported_state='ON' AND id>COALESCE((SELECT MAX(id) FROM pump_state_history WHERE reported_state<>'ON'),0)
            ORDER BY id LIMIT 1
            """, Timestamp.class);
        if (since.isEmpty()) return;
        Instant onSince = since.getFirst().toInstant();
        var flow = jdbc.queryForList("""
            SELECT m.quality,m.number_value,s.observed_at,s.received_at
            FROM channel_sample m JOIN node_sample s ON s.id=m.sample_id
            JOIN iot_channel c ON c.node_id=m.node_id AND c.channel_id=m.channel_id AND c.metric='FLOW_RATE'
            WHERE m.node_id=? AND m.channel_id=? ORDER BY s.observed_at DESC,s.id DESC LIMIT 1
            """, settings.flowNode(), settings.flowChannel());
        if (flow.isEmpty()) return;
        var sample = flow.getFirst();
        Instant flowAt = ((Timestamp) sample.get("observed_at")).toInstant();
        if (!fresh(flowAt, ((Timestamp) sample.get("received_at")).toInstant(), now)) return;
        if (!"VALID".equals(sample.get("quality"))) return;
        // A sample taken during start-up grace says nothing yet about the pipe.
        if (flowAt.isBefore(onSince.plusSeconds(settings.flowGraceSeconds()))) return;
        double rate = ((Number) sample.get("number_value")).doubleValue();
        boolean dry = rate < settings.minimumFlow();
        out.add(new Observation("PUMP01", "PUMP_NO_FLOW", "", dry,
            dry ? "FLOW " + rate + " L/min AT " + settings.flowNode() + "/" + settings.flowChannel() + "; PUMP ON SINCE " + onSince : null));
    }

    private static boolean fresh(Instant observed, Instant received, Instant now) {
        return observed.isAfter(now.minusSeconds(FRESH_SECONDS)) && received.isAfter(now.minusSeconds(FRESH_SECONDS))
            && !observed.isAfter(now.plusSeconds(2));
    }

    private int open(Observation observation, Instant now) {
        String detail = observation.detail().length() > 200 ? observation.detail().substring(0, 200) : observation.detail();
        return jdbc.update("""
            INSERT INTO device_health_alert(device_id,type,channel_key,opened_at,opened_detail) VALUES(?,?,?,?,?)
            ON CONFLICT(device_id,type,channel_key) WHERE cleared_at IS NULL DO NOTHING
            """, observation.deviceId(), observation.type(), observation.channel(), Timestamp.from(now), detail);
    }

    private int clear(Observation observation, Instant now) {
        return jdbc.update("""
            UPDATE device_health_alert SET cleared_at=?
            WHERE device_id=? AND type=? AND channel_key=? AND cleared_at IS NULL AND opened_at<=?
            """, Timestamp.from(now), observation.deviceId(), observation.type(), observation.channel(), Timestamp.from(now));
    }

    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }

    private Alert map(java.sql.ResultSet rs, int row) throws java.sql.SQLException {
        String channel = rs.getString("channel_key");
        return new Alert(rs.getLong("id"), rs.getString("device_id"), rs.getString("type"), channel.isEmpty() ? null : channel,
            rs.getTimestamp("opened_at").toInstant(), rs.getString("opened_detail"), instant(rs.getTimestamp("cleared_at")),
            instant(rs.getTimestamp("acknowledged_at")), rs.getString("acknowledgement_note"));
    }

    public List<Alert> list() {
        return jdbc.query("SELECT * FROM device_health_alert ORDER BY (cleared_at IS NULL) DESC,(acknowledged_at IS NULL) DESC,id DESC LIMIT 100", this::map);
    }

    public Alert find(long id) {
        if (id < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Positive ID required");
        return jdbc.query("SELECT * FROM device_health_alert WHERE id=?", this::map, id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Health alert not found"));
    }

    @Transactional
    public Alert acknowledge(long id, String note) {
        if (id < 1 || note != null && note.length() > 500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Positive ID and note <=500 characters required");
        String normalized = note == null || note.isBlank() ? null : note.strip();
        if (jdbc.query("SELECT id FROM device_health_alert WHERE id=? FOR UPDATE", (rs, n) -> rs.getLong(1), id).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Health alert not found");
        var alert = find(id);
        if (alert.acknowledgedAt() != null) {
            if (!Objects.equals(normalized, alert.acknowledgementNote()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Already acknowledged; reload stored note");
            return alert; // Exact retries keep the first note and time.
        }
        if (alert.clearedAt() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Alert has returned to normal");
        jdbc.update("UPDATE device_health_alert SET acknowledged_at=CURRENT_TIMESTAMP,acknowledgement_note=? WHERE id=?", normalized, id);
        realtime.alertsChanged();
        return find(id);
    }
}
