package vn.smartfarm.iot.safety;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import vn.smartfarm.iot.automation.WateringRule;
import vn.smartfarm.iot.control.CommandTransport;
import vn.smartfarm.iot.control.PumpService;
import vn.smartfarm.iot.monitoring.MqttHealth;
import vn.smartfarm.iot.telemetry.TelemetryRepository;

/** Observations only. Reading this page must never expire, retry or dispatch a command. */
@Service
public class SafetyOverview {
    public record Sensor(Instant observedAt, Instant receivedAt, double soilMoisture) {}
    public record Relay(Instant observedAt, Instant receivedAt, String reportedState,
                        boolean safetyLockout, String stateReason) {}
    public record Queue(long unresolved, long overdue) {}
    public record Problem(UUID commandId, String action, Instant issuedAt, Instant expiresAt,
                          String state, String errorCode) {}
    public record Snapshot(String farmId, Instant asOf, MqttHealth.Snapshot mqtt,
                           boolean controlEnabled, boolean controlTransportConnected,
                           Sensor sensor, Relay relay, WateringRule.State rule,
                           WateringRule.Settings settings, Queue queue,
                           List<Problem> recentProblems, List<PumpService.StateChange> stateHistory) {}

    private final JdbcTemplate jdbc;
    private final TelemetryRepository telemetry;
    private final WateringRule rule;
    private final PumpService pump;
    private final MqttHealth mqtt;
    private final ObjectProvider<CommandTransport> transports;
    private final boolean controlEnabled;

    public SafetyOverview(JdbcTemplate jdbc, TelemetryRepository telemetry, WateringRule rule,
                          PumpService pump, MqttHealth mqtt, ObjectProvider<CommandTransport> transports,
                          @Value("${smartfarm.control.enabled:false}") boolean controlEnabled) {
        this.jdbc = jdbc; this.telemetry = telemetry; this.rule = rule; this.pump = pump;
        this.mqtt = mqtt; this.transports = transports; this.controlEnabled = controlEnabled;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Snapshot snapshot() {
        Instant now = Instant.now();
        var reading = telemetry.latest("ENV01");
        Sensor sensor = reading.map(r -> new Sensor(r.telemetry().timestamp(), r.receivedAt(),
                r.telemetry().soilMoisture())).orElse(null);
        var relays = jdbc.query("SELECT * FROM pump_status WHERE singleton=1", (rs, n) ->
                new Relay(rs.getTimestamp("observed_at").toInstant(), rs.getTimestamp("received_at").toInstant(),
                        rs.getString("reported_state"), rs.getBoolean("safety_lockout"), rs.getString("state_reason")));
        Timestamp lateBefore = Timestamp.from(now.minusSeconds(5));
        Queue queue = jdbc.query("""
                SELECT COUNT(*) AS unresolved, COUNT(*) FILTER (WHERE expires_at < ?) AS overdue
                FROM pump_command WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')
                """, (rs, n) -> new Queue(rs.getLong("unresolved"), rs.getLong("overdue")), lateBefore).getFirst();
        var problems = jdbc.query("""
                SELECT * FROM pump_command
                WHERE state IN ('FAILED','TIMED_OUT','PUBLISH_UNCERTAIN')
                   OR (state IN ('PENDING','SENT') AND expires_at < ?)
                ORDER BY issued_at DESC, command_id DESC LIMIT 10
                """, (rs, n) -> new Problem(rs.getObject("command_id", UUID.class), rs.getString("action"),
                        rs.getTimestamp("issued_at").toInstant(), rs.getTimestamp("expires_at").toInstant(),
                        rs.getString("state"), rs.getString("error_code")), lateBefore);
        var transport = transports.getIfAvailable();
        return new Snapshot("FARM001", now, mqtt.snapshot(), controlEnabled,
                transport != null && transport.controlConnected(), sensor, relays.isEmpty() ? null : relays.getFirst(),
                rule.state(), rule.settings(), queue, problems, pump.stateHistory());
    }
}
