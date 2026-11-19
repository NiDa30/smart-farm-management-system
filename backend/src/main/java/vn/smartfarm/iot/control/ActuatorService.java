package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.realtime.RealtimeNotifier;

/**
 * Contract v3 actuators bound to ENV01: zone valves, fan, grow light, misting. Same command
 * discipline as PUMP01 (PENDING → SENT → EXECUTED/FAILED/TIMED_OUT, 10 s lifetime, fresh OFF
 * before ON/RESET, no ON while locked or while another command is unresolved). The firmware
 * remains the authority for hard caps, interlocks and lockout; the backend never infers state
 * from a command, only from a device ACK/status.
 */
@Service
public class ActuatorService {
    public record Request(String action, Integer durationSeconds) {}
    public record Actuator(String actuatorId, String actuatorType, String zoneName, int maxSeconds,
        String reportedState, boolean safetyLockout, String stateReason, boolean fresh, Instant observedAt) {}
    public record Command(UUID commandId, String actuatorId, String action, Integer durationSeconds, Instant issuedAt,
        Instant expiresAt, String state, String reportedState, String errorCode, String source) {}
    public record Overview(boolean enabled, List<Actuator> actuators) {}

    static final Set<String> REASONS = Set.of("BOOT", "COMMAND_ON", "COMMAND_OFF", "LOCKOUT_RESET", "TIMER_EXPIRED",
        "CONNECTION_LOST", "DEVICE_FAULT", "WATER_LOW");
    private static final String UUID_PATTERN = "[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}";
    private static final String TOPIC = "smartfarm/FARM001/([A-Z0-9]{2,16})/(status|ack)";

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final ObjectProvider<CommandTransport> transports;
    private final boolean enabled;
    private final RealtimeNotifier realtime;

    public ActuatorService(JdbcTemplate jdbc, ObjectMapper mapper, ObjectProvider<CommandTransport> transports,
        @Value("${smartfarm.control.enabled:false}") boolean control,
        @Value("${smartfarm.actuators.enabled:false}") boolean actuators, RealtimeNotifier realtime) {
        this.jdbc = jdbc;
        this.mapper = mapper.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        this.transports = transports;
        this.enabled = control && actuators;
        this.realtime = realtime;
    }

    public boolean enabled() { return enabled; }

    public Overview overview() {
        return new Overview(enabled, jdbc.query("""
            SELECT b.actuator_id,b.actuator_type,b.zone_name,b.max_seconds,s.reported_state,s.safety_lockout,s.state_reason,s.observed_at,s.received_at
            FROM iot_actuator_binding b LEFT JOIN actuator_status s ON s.actuator_id=b.actuator_id
            WHERE b.command_contract='ACTUATOR_V3' ORDER BY b.actuator_type<>'VALVE',b.actuator_id
            """, (rs, n) -> {
                Timestamp observed = rs.getTimestamp("observed_at"), received = rs.getTimestamp("received_at");
                boolean fresh = observed != null && fresh(observed.toInstant(), received.toInstant());
                return new Actuator(rs.getString("actuator_id"), rs.getString("actuator_type"), rs.getString("zone_name"),
                    rs.getInt("max_seconds"), fresh ? rs.getString("reported_state") : "UNKNOWN",
                    observed != null && rs.getBoolean("safety_lockout"), rs.getString("state_reason"), fresh,
                    observed == null ? null : observed.toInstant());
            }));
    }

    public Actuator actuator(String id) {
        return overview().actuators().stream().filter(a -> a.actuatorId().equals(id)).findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown v3 actuator"));
    }

    private static boolean fresh(Instant observed, Instant received) {
        Instant now = Instant.now();
        return observed.isAfter(now.minusSeconds(15)) && received.isAfter(now.minusSeconds(15)) && !observed.isAfter(now.plusSeconds(2));
    }

    public List<Command> commands(String actuatorId) {
        expire();
        return jdbc.query("SELECT * FROM actuator_command WHERE (?::text IS NULL OR actuator_id=?) ORDER BY issued_at DESC,command_id DESC LIMIT 30",
            this::map, actuatorId, actuatorId);
    }

    public Command command(UUID id) {
        expire();
        return jdbc.query("SELECT * FROM actuator_command WHERE command_id=?", this::map, id).stream().findFirst().orElse(null);
    }

    private void expire() {
        jdbc.update("UPDATE actuator_command SET state='TIMED_OUT' WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND expires_at < CURRENT_TIMESTAMP - INTERVAL '5 seconds'");
    }

    private Command map(java.sql.ResultSet rs, int n) throws java.sql.SQLException {
        return new Command(rs.getObject("command_id", UUID.class), rs.getString("actuator_id"), rs.getString("action"),
            rs.getObject("duration_seconds", Integer.class), rs.getTimestamp("issued_at").toInstant(),
            rs.getTimestamp("expires_at").toInstant(), rs.getString("state"), rs.getString("reported_state"),
            rs.getString("error_code"), rs.getString("source"));
    }

    public Command create(String actuatorId, Request request) { return create(actuatorId, request, "MANUAL"); }

    public synchronized Command create(String actuatorId, Request request, String source) {
        if (!enabled) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Actuator control is disabled");
        Actuator actuator = actuator(actuatorId);
        if (request == null || request.action() == null || !Set.of("ON", "OFF", "RESET_LOCKOUT").contains(request.action())
            || (request.action().equals("ON")
                ? request.durationSeconds() == null || request.durationSeconds() < 1 || request.durationSeconds() > actuator.maxSeconds()
                : request.durationSeconds() != null))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid command/duration");
        var transport = transports.getIfAvailable();
        if (transport == null || !transport.controlConnected())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "MQTT control unavailable");
        expire();
        if (!request.action().equals("OFF") && (!actuator.fresh() || !actuator.reportedState().equals("OFF")))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fresh OFF status required");
        if (request.action().equals("ON") && (actuator.safetyLockout() || jdbc.queryForObject(
            "SELECT COUNT(*) FROM actuator_command WHERE actuator_id=? AND state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')", Integer.class, actuatorId) > 0))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Actuator locked or command pending");
        if (request.action().equals("ON") && jdbc.queryForObject("""
            SELECT COUNT(*) FROM actuator_command c JOIN actuator_status s ON s.actuator_id=c.actuator_id
            WHERE c.actuator_id=? AND c.reported_state='ON' AND c.ack_boot_id=s.boot_id AND c.ack_sequence>=s.sequence
            """, Integer.class, actuatorId) > 0)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Wait for OFF status newer than the ON acknowledgment");
        UUID id = UUID.randomUUID();
        Instant issued = Instant.now().truncatedTo(ChronoUnit.SECONDS), expires = issued.plusSeconds(10);
        jdbc.update("INSERT INTO actuator_command(command_id,actuator_id,action,duration_seconds,issued_at,expires_at,state,source) VALUES(?,?,?,?,?,?,'PENDING',?)",
            id, actuatorId, request.action(), request.durationSeconds(), Timestamp.from(issued), Timestamp.from(expires), source);
        try {
            var payload = mapper.createObjectNode();
            payload.put("schemaVersion", 3).put("commandId", id.toString()).put("deviceId", actuatorId)
                .put("action", request.action()).put("issuedAt", issued.toString()).put("expiresAt", expires.toString());
            if (request.durationSeconds() != null) payload.put("durationSeconds", request.durationSeconds());
            transport.publishActuatorCommand(actuatorId, mapper.writeValueAsBytes(payload));
            jdbc.update("UPDATE actuator_command SET state='SENT' WHERE command_id=? AND state='PENDING'", id);
        } catch (Exception error) {
            jdbc.update("UPDATE actuator_command SET state='PUBLISH_UNCERTAIN' WHERE command_id=? AND state='PENDING'", id);
            realtime.commandChanged();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Publish not confirmed; inspect command history, do not automatically retry ON");
        }
        realtime.commandChanged();
        return command(id);
    }

    public static boolean handles(String topic) {
        return topic != null && topic.matches(TOPIC) && !topic.startsWith("smartfarm/FARM001/PUMP01/");
    }

    public void receive(String topic, byte[] payload) {
        try {
            var match = java.util.regex.Pattern.compile(TOPIC).matcher(topic);
            if (!match.matches() || payload.length > 4096) throw new IllegalArgumentException();
            String actuatorId = match.group(1);
            if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM iot_actuator_binding WHERE actuator_id=? AND command_contract='ACTUATOR_V3')", Boolean.class, actuatorId)))
                throw new IllegalArgumentException();
            JsonNode node = mapper.readTree(payload);
            if (!node.isObject() || !node.path("schemaVersion").isIntegralNumber() || node.path("schemaVersion").asInt() != 3
                || !node.path("deviceId").asText().equals(actuatorId) || !node.path("sequence").isIntegralNumber()
                || !node.path("sequence").canConvertToLong() || node.path("sequence").asLong() < 0
                || !node.path("bootId").asText().matches(UUID_PATTERN) || !node.path("safetyLockout").isBoolean())
                throw new IllegalArgumentException();
            UUID boot = UUID.fromString(node.path("bootId").asText());
            long sequence = node.path("sequence").asLong();
            Instant timestamp = Instant.parse(node.path("timestamp").asText());
            if (timestamp.isAfter(Instant.now().plusSeconds(2))) throw new IllegalArgumentException();
            String state = node.path("reportedState").asText();
            if (!Set.of("ON", "OFF").contains(state)) throw new IllegalArgumentException();
            if (match.group(2).equals("status")) {
                String reason = node.path("stateReason").asText();
                if (!node.path("connection").asText().equals("ONLINE") || !REASONS.contains(reason)
                    || timestamp.isBefore(Instant.now().minusSeconds(15))) throw new IllegalArgumentException();
                jdbc.update("""
                    INSERT INTO actuator_status(actuator_id,boot_id,sequence,observed_at,reported_state,safety_lockout,state_reason) VALUES(?,?,?,?,?,?,?)
                    ON CONFLICT(actuator_id) DO UPDATE SET boot_id=EXCLUDED.boot_id,sequence=EXCLUDED.sequence,observed_at=EXCLUDED.observed_at,
                      received_at=CURRENT_TIMESTAMP,reported_state=EXCLUDED.reported_state,safety_lockout=EXCLUDED.safety_lockout,state_reason=EXCLUDED.state_reason
                    WHERE (EXCLUDED.boot_id=actuator_status.boot_id AND EXCLUDED.observed_at>=actuator_status.observed_at AND EXCLUDED.sequence>actuator_status.sequence)
                       OR (EXCLUDED.boot_id<>actuator_status.boot_id AND EXCLUDED.observed_at>actuator_status.observed_at)
                    """, actuatorId, boot, sequence, Timestamp.from(timestamp), state, node.path("safetyLockout").asBoolean(), reason);
            } else {
                if (!node.path("commandId").asText().matches(UUID_PATTERN) || !node.path("stage").asText().equals("EXECUTED"))
                    throw new IllegalArgumentException();
                UUID command = UUID.fromString(node.path("commandId").asText());
                boolean success = node.path("status").asText().equals("SUCCESS");
                if (!success && !node.path("status").asText().equals("FAILED")) throw new IllegalArgumentException();
                String error = success ? null : node.path("errorCode").asText();
                if (!success && (error.isBlank() || error.length() > 80)) throw new IllegalArgumentException();
                if (success && jdbc.queryForObject("SELECT COUNT(*) FROM actuator_command WHERE command_id=? AND ((action='ON' AND ?<>'ON') OR (action IN ('OFF','RESET_LOCKOUT') AND ?<>'OFF'))",
                    Integer.class, command, state, state) > 0) throw new IllegalArgumentException();
                jdbc.update("""
                    UPDATE actuator_command SET state=?,reported_state=?,error_code=?,acknowledged_at=CURRENT_TIMESTAMP,ack_boot_id=?,ack_sequence=?
                    WHERE command_id=? AND actuator_id=? AND state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND ?>=issued_at AND ?<=expires_at+INTERVAL '5 seconds'
                    """, success ? "EXECUTED" : "FAILED", state, error, boot, sequence, command, actuatorId, Timestamp.from(timestamp), Timestamp.from(timestamp));
            }
            realtime.actuatorsChanged();
        } catch (Exception error) {
            throw new IllegalArgumentException("Invalid or unavailable actuator message", error);
        }
    }
}
