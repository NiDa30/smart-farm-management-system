package vn.smartfarm.iot.automation;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import vn.smartfarm.iot.control.PumpService;
import vn.smartfarm.iot.telemetry.TelemetryRepository;

@Service
public class WateringRule {
    public record State(boolean enabled, int lowCount, UUID activeCommand, Instant cooldownUntil, String lastResult) {}
    private record TrackedCommand(String state,Instant issuedAt) {}
    public record Run(long id,Instant startedAt,UUID commandId,String result) {}
    private final JdbcTemplate jdbc;
    private final PumpService pump;
    private final TelemetryRepository telemetry;
    public WateringRule(JdbcTemplate jdbc,PumpService pump,TelemetryRepository telemetry) { this.jdbc=jdbc;this.pump=pump;this.telemetry=telemetry; }
    public State state() {
        return jdbc.query("SELECT * FROM watering_rule WHERE singleton=1",(rs,n)->new State(rs.getBoolean("enabled"),rs.getInt("low_count"),rs.getObject("active_command",UUID.class),
            rs.getTimestamp("cooldown_until")==null ? null : rs.getTimestamp("cooldown_until").toInstant(),rs.getString("last_result"))).getFirst();
    }
    public List<Run> runs() {
        return jdbc.query("SELECT * FROM watering_run ORDER BY id DESC LIMIT 20",(rs,n)->new Run(rs.getLong("id"),rs.getTimestamp("started_at").toInstant(),rs.getObject("command_id",UUID.class),rs.getString("result")));
    }
    // Restart never resumes automatic dispatch. Existing timed command still has its device cutoff.
    public synchronized void safeStartup() {
        jdbc.update("UPDATE watering_rule SET enabled=false,low_count=0,last_sample_at=NULL,last_result='RESTART_PAUSED' WHERE singleton=1");
    }
    public synchronized State configure(boolean enabled) {
        if (enabled) {
            var status=pump.status(); var latest=telemetry.latest("ENV01");
            if (!status.controlEnabled() || !status.fresh() || !status.reportedState().equals("OFF") || status.safetyLockout() || latest.isEmpty() || !fresh(latest.get()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Fresh sensor and unlocked OFF device required");
            if (state().activeCommand()!=null) throw new ResponseStatusException(HttpStatus.CONFLICT,"Previous run unresolved; wait for fresh OFF");
            jdbc.update("UPDATE watering_rule SET enabled=true,low_count=0,last_sample_at=?,last_result='WAITING_SAMPLES' WHERE singleton=1",Timestamp.from(latest.get().telemetry().timestamp()));
        } else {
            jdbc.update("UPDATE watering_rule SET enabled=false,low_count=0,last_result='DISABLED' WHERE singleton=1");
            if (state().activeCommand()!=null) {
                jdbc.update("UPDATE watering_rule SET stop_requested=true WHERE singleton=1");
                sendStop();
            }
        }
        return state();
    }
    public synchronized void manualHold() {
        jdbc.update("UPDATE watering_rule SET enabled=false,low_count=0,last_result='MANUAL_HOLD' WHERE singleton=1 AND enabled=true");
    }
    private boolean fresh(TelemetryRepository.Reading sample) {
        Instant now=Instant.now();
        return sample.telemetry().timestamp().isAfter(now.minusSeconds(15)) && !sample.telemetry().timestamp().isAfter(now.plusSeconds(2)) && sample.receivedAt().isAfter(now.minusSeconds(15));
    }
    public synchronized void tick() {
        var state=state();
        if (state.activeCommand()!=null) {
            pump.commands(); // expire outstanding ACKs
            var command=jdbc.query("SELECT state,issued_at FROM pump_command WHERE command_id=?",(rs,n)->new TrackedCommand(rs.getString("state"),rs.getTimestamp("issued_at").toInstant()),state.activeCommand()).stream().findFirst();
            var status=pump.status();
            if (status.safetyLockout()) manualHold();
            if (command.isPresent() && Set.of("FAILED","TIMED_OUT","PUBLISH_UNCERTAIN").contains(command.get().state())) {
                jdbc.update("UPDATE watering_rule SET enabled=false,last_result='COMMAND_UNCONFIRMED',stop_requested=true WHERE singleton=1");
            }
            boolean stop=Boolean.TRUE.equals(jdbc.queryForObject("SELECT stop_requested FROM watering_rule WHERE singleton=1",Boolean.class));
            if (stop) { sendStop(); return; }
            if (command.isPresent() && command.get().state().equals("EXECUTED") && status.fresh() && status.reportedState().equals("OFF")
                && status.observedAt()!=null && status.observedAt().isAfter(command.get().issuedAt().plusSeconds(2))) { finish("REPORTED_OFF"); return; }
            var latest=telemetry.latest("ENV01");
            if (!status.fresh() || latest.isEmpty() || !fresh(latest.get()) || latest.get().telemetry().soilMoisture()>=35) {
                jdbc.update("UPDATE watering_rule SET stop_requested=true,last_result='STOP_REQUESTED' WHERE singleton=1"); sendStop();
            }
            return;
        }
        if (!state.enabled()) return;
        if (state.cooldownUntil()!=null && state.cooldownUntil().isAfter(Instant.now())) return;
        var latest=telemetry.latest("ENV01");
        if (latest.isEmpty() || !fresh(latest.get())) { jdbc.update("UPDATE watering_rule SET low_count=0,last_result='STALE_SENSOR' WHERE singleton=1"); return; }
        var sample=latest.get().telemetry();
        Timestamp previous=jdbc.queryForObject("SELECT last_sample_at FROM watering_rule WHERE singleton=1",Timestamp.class);
        Instant stamp=sample.timestamp().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
        if (previous!=null && !stamp.isAfter(previous.toInstant())) return;
        int count=sample.soilMoisture()<30 ? (previous!=null && stamp.isAfter(previous.toInstant().plusSeconds(15)) ? 1 : state.lowCount()+1) : 0;
        jdbc.update("UPDATE watering_rule SET last_sample_at=?,low_count=?,last_result='WAITING_SAMPLES' WHERE singleton=1",Timestamp.from(stamp),Math.min(count,2));
        if (count<2) return;
        try {
            var command=pump.create(new PumpService.Request("ON",20));
            jdbc.update("UPDATE watering_rule SET active_command=?,low_count=0,last_result='COMMAND_SENT' WHERE singleton=1",command.commandId());
            jdbc.update("INSERT INTO watering_run(command_id,result) VALUES(?,'COMMAND_SENT')",command.commandId());
        } catch (Exception error) {
            // Publish may have reached the device: no automatic ON retry.
            jdbc.update("UPDATE watering_rule SET enabled=false,low_count=0,last_result='DISPATCH_FAILED' WHERE singleton=1");
            jdbc.update("INSERT INTO watering_run(result) VALUES('DISPATCH_FAILED')");
        }
    }
    private void sendStop() {
        try {
            UUID stopId=jdbc.queryForObject("SELECT stop_command FROM watering_rule WHERE singleton=1",UUID.class);
            if (stopId!=null) {
                Timestamp issued=jdbc.queryForObject("SELECT issued_at FROM pump_command WHERE command_id=?",Timestamp.class,stopId);
                var status=pump.status();
                if (status.fresh() && status.reportedState().equals("OFF") && status.observedAt()!=null && status.observedAt().isAfter(issued.toInstant())) finish("REPORTED_OFF");
                return;
            }
            boolean attempted=Boolean.TRUE.equals(jdbc.queryForObject("SELECT stop_attempted FROM watering_rule WHERE singleton=1",Boolean.class));
            if (attempted) {
                var state=state(); var status=pump.status();
                Timestamp issued=jdbc.queryForObject("SELECT issued_at FROM pump_command WHERE command_id=?",Timestamp.class,state.activeCommand());
                if (status.fresh() && status.reportedState().equals("OFF") && status.observedAt()!=null && status.observedAt().isAfter(issued.toInstant().plusSeconds(22))) finish("REPORTED_OFF");
                return;
            }
            jdbc.update("UPDATE watering_rule SET stop_attempted=true WHERE singleton=1");
            var command=pump.create(new PumpService.Request("OFF",null));
            jdbc.update("UPDATE watering_rule SET stop_command=? WHERE singleton=1",command.commandId());
            // Keep the run until a newer OFF status is observed; never claim publish means execution.
            jdbc.update("UPDATE watering_rule SET last_result='STOP_SENT' WHERE singleton=1");
            var status=pump.status();
            if (status.fresh() && status.reportedState().equals("OFF") && status.observedAt()!=null && status.observedAt().isAfter(command.issuedAt())) finish("REPORTED_OFF");
        } catch (Exception error) { jdbc.update("UPDATE watering_rule SET last_result='STOP_UNCONFIRMED' WHERE singleton=1"); }
    }
    private void finish(String result) {
        var state=state();
        jdbc.update("UPDATE watering_run SET result=? WHERE command_id=?",result,state.activeCommand());
        jdbc.update("UPDATE watering_rule SET active_command=NULL,stop_command=NULL,stop_requested=false,stop_attempted=false,low_count=0,cooldown_until=?,last_result=? WHERE singleton=1",Timestamp.from(Instant.now().plusSeconds(60)),result);
    }
}
