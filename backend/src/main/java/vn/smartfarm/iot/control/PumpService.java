package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PumpService {
    public record Request(String action, Integer durationSeconds) {}
    public static class UncertainPublish extends ResponseStatusException {
        public final UUID commandId;
        public UncertainPublish(UUID id) {
            super(HttpStatus.BAD_GATEWAY,"Publish not confirmed; inspect command history, do not automatically retry ON");
            commandId=id;
        }
    }
    public record Command(UUID commandId, String action, Integer durationSeconds, Instant issuedAt,
        Instant expiresAt, String state, String reportedState, String errorCode) {}
    public record Status(String deviceId, String reportedState, boolean safetyLockout, boolean fresh,
        boolean controlEnabled, Instant observedAt, PumpCommandFencing.View commandFence) {}
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final ObjectProvider<CommandTransport> transports;
    private final boolean enabled;
    private final PumpCommandFencing fencing;
    public PumpService(JdbcTemplate jdbc, ObjectMapper mapper, ObjectProvider<CommandTransport> transports,
                       @Value("${smartfarm.control.enabled:false}") boolean enabled, PumpCommandFencing fencing) {
        this.fencing=fencing;
        this.jdbc=jdbc; this.mapper=mapper.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION).enable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS); this.transports=transports; this.enabled=enabled;
    }
    public Status status() {
        var fenceView=fencing.view();
        var rows=jdbc.query("SELECT * FROM pump_status WHERE singleton=1", (rs,n) -> {
            Instant observed=rs.getTimestamp("observed_at").toInstant();
            Instant received=rs.getTimestamp("received_at").toInstant();
            Instant now=Instant.now();
            boolean fresh=observed.isAfter(now.minusSeconds(15)) && received.isAfter(now.minusSeconds(15))
                && !observed.isAfter(now.plusSeconds(2));
            return new Status("PUMP01", fresh ? rs.getString("reported_state") : "UNKNOWN",
                rs.getBoolean("safety_lockout"), fresh, enabled, observed, fenceView);
        });
        return rows.isEmpty() ? new Status("PUMP01","UNKNOWN",false,false,enabled,null,fenceView) : rows.getFirst();
    }
    public record StateChange(long id, Instant observedAt, Instant receivedAt, String reportedState,
        boolean safetyLockout, String changeType, String stateReason) {}
    public List<StateChange> stateHistory() {
        return jdbc.query("SELECT * FROM pump_state_history ORDER BY id DESC LIMIT 50", (rs,n) ->
            new StateChange(rs.getLong("id"),rs.getTimestamp("observed_at").toInstant(),
                rs.getTimestamp("received_at").toInstant(),rs.getString("reported_state"),
                rs.getBoolean("safety_lockout"),rs.getString("change_type"),rs.getString("state_reason")));
    }
    public List<Command> commands() {
        jdbc.update("UPDATE pump_command SET state='TIMED_OUT' WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND expires_at < CURRENT_TIMESTAMP - INTERVAL '5 seconds'");
        return jdbc.query("SELECT * FROM pump_command ORDER BY issued_at DESC,command_id DESC LIMIT 20", (rs,n) ->
            new Command(rs.getObject("command_id",UUID.class),rs.getString("action"),rs.getObject("duration_seconds",Integer.class),
                rs.getTimestamp("issued_at").toInstant(),rs.getTimestamp("expires_at").toInstant(),
                rs.getString("state"),rs.getString("reported_state"),rs.getString("error_code")));
    }
    public synchronized Command create(Request request) {
        return create(request, id -> {});
    }
    // Persist the rule's command reference before any bytes can reach the transport.
    public synchronized Command create(Request request, java.util.function.Consumer<UUID> beforePublish) {
        if (!enabled) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Local Wokwi control is disabled");
        if (request.action()==null || !Set.of("ON","OFF","RESET_LOCKOUT").contains(request.action())
            || (request.action().equals("ON") ? request.durationSeconds()==null || request.durationSeconds()<1 || request.durationSeconds()>3600 : request.durationSeconds()!=null))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid command/duration");
        if(fencing.required())return fencing.create(request,beforePublish);
        if(fencing.view().deviceEnabled()&&!request.action().equals("OFF"))throw new ResponseStatusException(HttpStatus.CONFLICT,"Enable backend pump fencing to match device");
        var transport=transports.getIfAvailable();
        if (transport==null || !transport.controlConnected()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"MQTT control unavailable");
        Status status=status();
        commands(); // expire unresolved requests before evaluating a new ON
        if (!request.action().equals("OFF") && (!status.fresh() || !status.reportedState().equals("OFF")))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Fresh OFF status required");
        if (request.action().equals("ON") && (status.safetyLockout() || jdbc.queryForObject(
            "SELECT COUNT(*) FROM pump_command WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')",Integer.class)>0))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Pump locked or command pending");
        if (request.action().equals("ON") && jdbc.queryForObject("""
            SELECT COUNT(*) FROM pump_command c JOIN pump_status s ON s.singleton=1
            WHERE c.reported_state='ON' AND c.ack_boot_id=s.boot_id AND c.ack_sequence>=s.sequence
            """,Integer.class)>0)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Wait for OFF status newer than the ON acknowledgment");
        UUID id=UUID.randomUUID(); Instant issued=Instant.now().truncatedTo(ChronoUnit.SECONDS); Instant expires=issued.plusSeconds(10);
        jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state) VALUES(?,?,?,?,?,'PENDING')",
            id,request.action(),request.durationSeconds(),Timestamp.from(issued),Timestamp.from(expires));
        try {
            beforePublish.accept(id);
            var payload=mapper.createObjectNode();
            payload.put("schemaVersion",1).put("commandId",id.toString()).put("deviceId","PUMP01")
                .put("action",request.action()).put("issuedAt",issued.toString()).put("expiresAt",expires.toString());
            if (request.durationSeconds()!=null) payload.put("durationSeconds",request.durationSeconds());
            transport.publishCommand(mapper.writeValueAsBytes(payload));
            jdbc.update("UPDATE pump_command SET state='SENT' WHERE command_id=? AND state='PENDING'",id);
        } catch (Exception error) {
            jdbc.update("UPDATE pump_command SET state='PUBLISH_UNCERTAIN' WHERE command_id=? AND state='PENDING'",id);
            throw new UncertainPublish(id);
        }
        return jdbc.query("SELECT * FROM pump_command WHERE command_id=?", (rs,n) ->
            new Command(rs.getObject("command_id",UUID.class),rs.getString("action"),rs.getObject("duration_seconds",Integer.class),
                rs.getTimestamp("issued_at").toInstant(),rs.getTimestamp("expires_at").toInstant(),
                rs.getString("state"),rs.getString("reported_state"),rs.getString("error_code")),id).getFirst();
    }
    public void receive(String topic, byte[] payload) {
        try {
            if (payload.length>4096) throw new IllegalArgumentException();
            JsonNode node=mapper.readTree(payload);
            if (!node.isObject() || !node.path("schemaVersion").isIntegralNumber() || node.path("schemaVersion").asInt()!=1
                || !node.path("deviceId").asText().equals("PUMP01") || !node.path("sequence").isIntegralNumber() || !node.path("sequence").canConvertToLong() || node.path("sequence").asLong()<0)
                throw new IllegalArgumentException();
            if (!node.path("bootId").asText().matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) throw new IllegalArgumentException();
            UUID boot=UUID.fromString(node.path("bootId").asText());
            Instant timestamp=Instant.parse(node.path("timestamp").asText());
            if (timestamp.isAfter(Instant.now().plusSeconds(2))) throw new IllegalArgumentException();
            String state=node.path("reportedState").asText();
            if (!Set.of("ON","OFF").contains(state) || !node.path("safetyLockout").isBoolean()) throw new IllegalArgumentException();
            String reason=null;
            if (node.has("stateReason")) {
                if (!node.path("stateReason").isTextual() || !Set.of("BOOT","COMMAND_ON","COMMAND_OFF","LOCKOUT_RESET","TIMER_EXPIRED","CONNECTION_LOST","DEVICE_FAULT","WATER_LOW","FLOW_LOW","FLOW_SENSOR_FAULT").contains(node.path("stateReason").asText())) throw new IllegalArgumentException();
                reason=node.path("stateReason").asText();
                if(Set.of("FLOW_LOW","FLOW_SENSOR_FAULT").contains(reason)
                    &&(!state.equals("OFF")||!node.path("safetyLockout").booleanValue()))throw new IllegalArgumentException();
            }
            boolean statusTopic=topic.equals("smartfarm/FARM001/PUMP01/status");
            Long fenceOrdinal=fencing.validate(node,statusTopic,boot);
            if (statusTopic) {
                if (!node.path("connection").asText().equals("ONLINE") || timestamp.isBefore(Instant.now().minusSeconds(15))) throw new IllegalArgumentException();
                jdbc.update("""
                    INSERT INTO pump_status(singleton,boot_id,sequence,observed_at,reported_state,safety_lockout,state_reason,fence_version,last_fence_ordinal,fence_restart_required) VALUES(1,?,?,?,?,?,?,?,?,?)
                    ON CONFLICT(singleton) DO UPDATE SET boot_id=EXCLUDED.boot_id,sequence=EXCLUDED.sequence,
                    observed_at=EXCLUDED.observed_at,received_at=CURRENT_TIMESTAMP,reported_state=EXCLUDED.reported_state,safety_lockout=EXCLUDED.safety_lockout,state_reason=EXCLUDED.state_reason,
                    fence_version=EXCLUDED.fence_version,last_fence_ordinal=EXCLUDED.last_fence_ordinal,fence_restart_required=EXCLUDED.fence_restart_required
                    WHERE (EXCLUDED.boot_id = pump_status.boot_id AND EXCLUDED.observed_at >= pump_status.observed_at AND EXCLUDED.sequence > pump_status.sequence
                        AND (pump_status.fence_version IS NULL OR (EXCLUDED.fence_version=1 AND EXCLUDED.last_fence_ordinal>=pump_status.last_fence_ordinal
                          AND (NOT pump_status.fence_restart_required OR EXCLUDED.fence_restart_required))))
                       OR (EXCLUDED.boot_id <> pump_status.boot_id AND EXCLUDED.observed_at > pump_status.observed_at)
                    """,boot,node.path("sequence").asLong(),Timestamp.from(timestamp),state,node.path("safetyLockout").asBoolean(),reason,fenceOrdinal==null?null:1,fenceOrdinal,node.path("commandFence").path("restartRequired").asBoolean(false));
            } else if (topic.equals("smartfarm/FARM001/PUMP01/ack")) {
                if (!node.path("commandId").asText().matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}")) throw new IllegalArgumentException();
                UUID command=UUID.fromString(node.path("commandId").asText());
                if(!fencing.ackMatches(node,command,boot,fenceOrdinal))return;
                if (!node.path("stage").asText().equals("EXECUTED")) throw new IllegalArgumentException();
                boolean success=node.path("status").asText().equals("SUCCESS");
                if (!success && !node.path("status").asText().equals("FAILED")) throw new IllegalArgumentException();
                String error=success ? null : node.path("errorCode").asText();
                if (!success && (error.isBlank() || error.length()>80)) throw new IllegalArgumentException();
                if (success && jdbc.queryForObject("SELECT COUNT(*) FROM pump_command WHERE command_id=? AND ((action='ON' AND ?<>'ON') OR (action IN ('OFF','RESET_LOCKOUT') AND ?<>'OFF'))",Integer.class,command,state,state)>0)
                    throw new IllegalArgumentException();
                jdbc.update("""
                    UPDATE pump_command SET state=?,reported_state=?,error_code=?,acknowledged_at=CURRENT_TIMESTAMP,ack_boot_id=?,ack_sequence=?
                    WHERE command_id=? AND state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND ? >= issued_at AND ? <= expires_at + INTERVAL '5 seconds'
                    """,success ? "EXECUTED":"FAILED",state,error,boot,node.path("sequence").asLong(),command,Timestamp.from(timestamp),Timestamp.from(timestamp));
            } else throw new IllegalArgumentException();
        } catch (Exception error) { throw new IllegalArgumentException("Invalid or unavailable control message",error); }
    }
}
