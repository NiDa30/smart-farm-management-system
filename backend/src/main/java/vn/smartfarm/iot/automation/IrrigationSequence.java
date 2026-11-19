package vn.smartfarm.iot.automation;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.ActuatorService;
import vn.smartfarm.iot.control.PumpService;
import vn.smartfarm.iot.realtime.RealtimeNotifier;

/**
 * Waters zones one after another with the single shared PUMP01:
 * open zone valve → (valve ON confirmed) pump ON → (pump stops on its own timer) close valve →
 * next zone. Every transition waits for device evidence (EXECUTED ACK and a fresh status);
 * any failure, timeout, lockout or water-low reason aborts the whole run, which asks for pump
 * OFF and valve OFF. The firmware's own interlocks (no pump without an open valve, pump stops
 * when the last valve closes, hard caps, lockouts) stay in force regardless of this class.
 */
@Service
public class IrrigationSequence {
    private static final Logger LOG = LoggerFactory.getLogger(IrrigationSequence.class);
    public record Zone(String valveId, Integer pumpSeconds) {}
    public record StartRequest(List<Zone> zones) {}
    public record Step(int stepNo, String valveId, String zoneName, int pumpSeconds, String phase, Instant phaseStartedAt, String result) {}
    public record Run(long id, String state, Instant createdAt, Instant finishedAt, String result, int currentStep, List<Step> steps) {}
    public record View(boolean enabled, Run current, List<Run> recent) {}

    /** Valve stays open this much longer than the pump runs: the device cap ends the pump first. */
    static final int VALVE_MARGIN_SECONDS = 60;
    static final int CONFIRM_SECONDS = 15;
    static final int STOP_GRACE_SECONDS = 20;

    private final JdbcTemplate jdbc;
    private final ActuatorService actuators;
    private final PumpService pump;
    private final WateringRule rule;
    private final RealtimeNotifier realtime;

    public IrrigationSequence(JdbcTemplate jdbc, ActuatorService actuators, PumpService pump, WateringRule rule, RealtimeNotifier realtime) {
        this.jdbc = jdbc; this.actuators = actuators; this.pump = pump; this.rule = rule; this.realtime = realtime;
    }

    public View view() {
        List<Run> recent = runs("SELECT * FROM irrigation_sequence ORDER BY id DESC LIMIT 10");
        Run current = recent.stream().filter(r -> r.state().equals("RUNNING")).findFirst().orElse(null);
        return new View(actuators.enabled(), current, recent);
    }

    private List<Run> runs(String sql) {
        return jdbc.query(sql, (rs, n) -> {
            long id = rs.getLong("id");
            Timestamp finished = rs.getTimestamp("finished_at");
            return new Run(id, rs.getString("state"), rs.getTimestamp("created_at").toInstant(),
                finished == null ? null : finished.toInstant(), rs.getString("result"), rs.getInt("current_step"), steps(id));
        });
    }

    private List<Step> steps(long sequenceId) {
        return jdbc.query("""
            SELECT s.*,b.zone_name FROM irrigation_sequence_step s JOIN iot_actuator_binding b ON b.actuator_id=s.valve_id
            WHERE s.sequence_id=? ORDER BY s.step_no
            """, (rs, n) -> {
                Timestamp started = rs.getTimestamp("phase_started_at");
                return new Step(rs.getInt("step_no"), rs.getString("valve_id"), rs.getString("zone_name"), rs.getInt("pump_seconds"),
                    rs.getString("phase"), started == null ? null : started.toInstant(), rs.getString("result"));
            }, sequenceId);
    }

    public synchronized View start(StartRequest request) {
        if (!actuators.enabled()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Actuator control is disabled");
        if (request == null || request.zones() == null || request.zones().isEmpty() || request.zones().size() > 4)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "1..4 zones required");
        var seen = new HashSet<String>();
        for (Zone zone : request.zones()) {
            if (zone == null || zone.valveId() == null || zone.pumpSeconds() == null || zone.pumpSeconds() < 1 || zone.pumpSeconds() > 1800
                || !seen.add(zone.valveId()))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each zone needs a distinct valve and 1..1800 pump seconds");
            var valve = actuators.actuator(zone.valveId());
            if (!valve.actuatorType().equals("VALVE"))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not a zone valve: " + zone.valveId());
            if (zone.pumpSeconds() + VALVE_MARGIN_SECONDS > valve.maxSeconds())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valve cap too short for " + zone.valveId());
            if (!valve.fresh() || !valve.reportedState().equals("OFF") || valve.safetyLockout())
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Fresh unlocked OFF status required for " + zone.valveId());
        }
        var state = rule.state();
        if (state.enabled() || state.activeCommand() != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Disable the moisture watering rule and wait for its run to finish");
        var pumpStatus = pump.status();
        if (!pumpStatus.fresh() || !pumpStatus.reportedState().equals("OFF") || pumpStatus.safetyLockout())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Fresh unlocked OFF pump status required");
        if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM irrigation_sequence WHERE state='RUNNING')", Boolean.class)))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A zone sequence is already running");
        long id;
        try {
            id = jdbc.queryForObject("INSERT INTO irrigation_sequence(state) VALUES('RUNNING') RETURNING id", Long.class);
        } catch (org.springframework.dao.DuplicateKeyException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A zone sequence is already running");
        }
        int no = 1;
        for (Zone zone : request.zones())
            jdbc.update("INSERT INTO irrigation_sequence_step(sequence_id,step_no,valve_id,pump_seconds) VALUES(?,?,?,?)", id, no++, zone.valveId(), zone.pumpSeconds());
        realtime.automationChanged();
        tick();
        return view();
    }

    public synchronized View cancel() {
        var current = current();
        if (current != null) abort(current, "CANCELLED");
        return view();
    }

    private Run current() {
        return runs("SELECT * FROM irrigation_sequence WHERE state='RUNNING'").stream().findFirst().orElse(null);
    }

    /** Advances at most one phase per call; safe to call often. */
    public synchronized void tick() {
        Run run = current();
        if (run == null) return;
        try {
            if (rule.state().enabled()) { abort(run, "WATERING_RULE_ENABLED"); return; }
            advance(run);
        } catch (ResponseStatusException error) {
            // A refused command (stale status, lockout, MQTT down) ends the run rather than retrying.
            abort(current() == null ? run : current(), "COMMAND_REFUSED " + error.getStatusCode().value() + " " + error.getReason());
        } catch (RuntimeException error) {
            LOG.error("Zone sequence {} failed ({})", run.id(), error.getClass().getSimpleName());
            abort(current() == null ? run : current(), "INTERNAL_ERROR");
        }
    }

    private void advance(Run run) {
        Step step = run.steps().stream().filter(s -> s.stepNo() == run.currentStep()).findFirst().orElse(null);
        if (step == null) { finish(run, "COMPLETED", "COMPLETED"); return; }
        Instant now = Instant.now();
        long age = step.phaseStartedAt() == null ? 0 : Duration.between(step.phaseStartedAt(), now).toSeconds();
        switch (step.phase()) {
            case "WAITING" -> {
                UUID command = actuators.create(step.valveId(),
                    new ActuatorService.Request("ON", step.pumpSeconds() + VALVE_MARGIN_SECONDS), "SEQUENCE").commandId();
                phase(run, step, "OPENING_VALVE", "valve_command", command);
            }
            case "OPENING_VALVE" -> {
                var command = actuators.command(stepCommand(run, step, "valve_command"));
                var valve = actuators.actuator(step.valveId());
                if (command == null || failed(command.state())) { abort(run, "VALVE_OPEN_FAILED " + error(command)); return; }
                if (command.state().equals("EXECUTED") && valve.fresh() && valve.reportedState().equals("ON")) {
                    UUID pumpCommand = pump.create(new PumpService.Request("ON", step.pumpSeconds())).commandId();
                    phase(run, step, "STARTING_PUMP", "pump_command", pumpCommand);
                } else if (age > CONFIRM_SECONDS) abort(run, "VALVE_OPEN_TIMEOUT");
            }
            case "STARTING_PUMP" -> {
                var command = pumpCommand(stepCommand(run, step, "pump_command"));
                var status = pump.status();
                if (command == null || failed(command[0])) { abort(run, "PUMP_START_FAILED " + (command == null ? "" : command[1])); return; }
                if (command[0].equals("EXECUTED") && status.fresh() && status.reportedState().equals("ON")) phase(run, step, "WATERING", null, null);
                else if (age > CONFIRM_SECONDS) abort(run, "PUMP_START_TIMEOUT");
            }
            case "WATERING" -> {
                var status = pump.status();
                var valve = actuators.actuator(step.valveId());
                String reason = pumpReason();
                if (status.safetyLockout() || "WATER_LOW".equals(reason)) { abort(run, "PUMP_STOPPED " + reason); return; }
                if (valve.fresh() && !valve.reportedState().equals("ON")) { abort(run, "VALVE_CLOSED_EARLY " + valve.stateReason()); return; }
                boolean stopped = status.fresh() && status.reportedState().equals("OFF") && status.observedAt() != null
                    && status.observedAt().isAfter(step.phaseStartedAt());
                if (stopped) {
                    UUID close = actuators.create(step.valveId(), new ActuatorService.Request("OFF", null), "SEQUENCE").commandId();
                    phase(run, step, "CLOSING_VALVE", "close_command", close);
                } else if (age > step.pumpSeconds() + STOP_GRACE_SECONDS) abort(run, "PUMP_DID_NOT_STOP");
            }
            case "CLOSING_VALVE" -> {
                var command = actuators.command(stepCommand(run, step, "close_command"));
                var valve = actuators.actuator(step.valveId());
                if (command == null || failed(command.state())) { abort(run, "VALVE_CLOSE_FAILED " + error(command)); return; }
                if (command.state().equals("EXECUTED") && valve.fresh() && valve.reportedState().equals("OFF")) {
                    jdbc.update("UPDATE irrigation_sequence_step SET phase='DONE',result='OK',phase_started_at=CURRENT_TIMESTAMP WHERE sequence_id=? AND step_no=?", run.id(), step.stepNo());
                    jdbc.update("UPDATE irrigation_sequence SET current_step=current_step+1 WHERE id=?", run.id());
                    realtime.automationChanged();
                } else if (age > CONFIRM_SECONDS) abort(run, "VALVE_CLOSE_TIMEOUT");
            }
            default -> abort(run, "UNEXPECTED_PHASE");
        }
    }

    private static final Set<String> FAILED = Set.of("FAILED", "TIMED_OUT", "PUBLISH_UNCERTAIN");
    private static boolean failed(String state) { return FAILED.contains(state); }

    private static String error(ActuatorService.Command command) {
        if (command == null) return "MISSING";
        return command.errorCode() == null ? command.state() : command.errorCode();
    }

    private UUID stepCommand(Run run, Step step, String column) {
        return jdbc.queryForObject("SELECT " + column + " FROM irrigation_sequence_step WHERE sequence_id=? AND step_no=?", UUID.class, run.id(), step.stepNo());
    }

    /** [state, errorCode] of a PUMP01 command. */
    private String[] pumpCommand(UUID id) {
        jdbc.update("UPDATE pump_command SET state='TIMED_OUT' WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN') AND expires_at < CURRENT_TIMESTAMP - INTERVAL '5 seconds'");
        return jdbc.query("SELECT state,error_code FROM pump_command WHERE command_id=?",
            (rs, n) -> new String[]{rs.getString("state"), rs.getString("error_code") == null ? rs.getString("state") : rs.getString("error_code")}, id)
            .stream().findFirst().orElse(null);
    }

    private String pumpReason() {
        return jdbc.query("SELECT state_reason FROM pump_status WHERE singleton=1", (rs, n) -> rs.getString(1)).stream().findFirst().orElse(null);
    }

    private void phase(Run run, Step step, String phase, String column, UUID command) {
        if (column == null)
            jdbc.update("UPDATE irrigation_sequence_step SET phase=?,phase_started_at=CURRENT_TIMESTAMP WHERE sequence_id=? AND step_no=?", phase, run.id(), step.stepNo());
        else
            jdbc.update("UPDATE irrigation_sequence_step SET phase=?,phase_started_at=CURRENT_TIMESTAMP," + column + "=? WHERE sequence_id=? AND step_no=?",
                phase, command, run.id(), step.stepNo());
        realtime.automationChanged();
    }

    private void finish(Run run, String state, String result) {
        jdbc.update("UPDATE irrigation_sequence SET state=?,result=?,finished_at=CURRENT_TIMESTAMP WHERE id=? AND state='RUNNING'", state, result, run.id());
        realtime.automationChanged();
    }

    /** Ends the run, then asks for pump OFF and every opened valve OFF (best effort, logged). */
    private void abort(Run run, String reason) {
        String text = reason.length() > 120 ? reason.substring(0, 120) : reason.strip();
        jdbc.update("UPDATE irrigation_sequence_step SET phase='FAILED',result=? WHERE sequence_id=? AND step_no=? AND phase NOT IN ('DONE','FAILED','SKIPPED')",
            text, run.id(), run.currentStep());
        jdbc.update("UPDATE irrigation_sequence_step SET phase='SKIPPED' WHERE sequence_id=? AND step_no>? AND phase='WAITING'", run.id(), run.currentStep());
        finish(run, "ABORTED", text);
        List<String> problems = new ArrayList<>();
        try { pump.create(new PumpService.Request("OFF", null)); } catch (RuntimeException error) { problems.add("PUMP01"); }
        for (Step step : run.steps()) {
            if (step.phase().equals("WAITING") || step.phase().equals("SKIPPED") || step.phase().equals("DONE")) continue;
            try { actuators.create(step.valveId(), new ActuatorService.Request("OFF", null), "SEQUENCE"); }
            catch (RuntimeException error) { problems.add(step.valveId()); }
        }
        if (!problems.isEmpty()) LOG.warn("Zone sequence {} aborted ({}); OFF not sent to {}; device caps still apply", run.id(), text, problems);
        else LOG.info("Zone sequence {} aborted ({}); OFF sent", run.id(), text);
    }
}
