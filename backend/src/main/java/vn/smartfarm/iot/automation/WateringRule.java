package vn.smartfarm.iot.automation;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.smartfarm.iot.control.PumpService;
import vn.smartfarm.iot.telemetry.TelemetryRepository;

@Service
public class WateringRule {
    public record State(boolean enabled, int lowCount, UUID activeCommand, Instant cooldownUntil, String lastResult) {}
    private record TrackedCommand(String state,Instant issuedAt) {}
    public record Settings(int dryThreshold,int wetThreshold,int durationSeconds,int cooldownSeconds,long revision) {}
    public record Run(long id,Instant startedAt,UUID commandId,String result,Integer dryThreshold,Integer wetThreshold,
        Integer durationSeconds,Integer cooldownSeconds,Long settingsRevision) {}
    private final JdbcTemplate jdbc;
    private final PumpService pump;
    private final TelemetryRepository telemetry;
    private final TransactionTemplate transaction;
    public WateringRule(JdbcTemplate jdbc,PumpService pump,TelemetryRepository telemetry,PlatformTransactionManager manager) {
        this.jdbc=jdbc;this.pump=pump;this.telemetry=telemetry;this.transaction=new TransactionTemplate(manager);
    }
    public State state() {
        return jdbc.query("SELECT * FROM watering_rule WHERE singleton=1",(rs,n)->new State(rs.getBoolean("enabled"),rs.getInt("low_count"),rs.getObject("active_command",UUID.class),
            rs.getTimestamp("cooldown_until")==null ? null : rs.getTimestamp("cooldown_until").toInstant(),rs.getString("last_result"))).getFirst();
    }
    public Settings settings() {
        return jdbc.query("SELECT * FROM watering_rule WHERE singleton=1",(rs,n)->new Settings(rs.getInt("dry_threshold"),rs.getInt("wet_threshold"),rs.getInt("duration_seconds"),rs.getInt("cooldown_seconds"),rs.getLong("settings_revision"))).getFirst();
    }
    public synchronized Settings saveSettings(Settings input) {
        if(input==null || input.dryThreshold()<1 || input.dryThreshold()>90 || input.wetThreshold()<input.dryThreshold()+5 || input.wetThreshold()>100
            || input.durationSeconds()<1 || input.durationSeconds()>30 || input.cooldownSeconds()<60 || input.cooldownSeconds()>3600 || input.revision()<1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid thresholds, duration, cooldown or revision");
        int changed=jdbc.update("""
            UPDATE watering_rule SET dry_threshold=?,wet_threshold=?,duration_seconds=?,cooldown_seconds=?,
              settings_revision=settings_revision+1,low_count=0,last_sample_at=NULL,last_sample_boot=NULL,last_sample_sequence=NULL
            WHERE singleton=1 AND settings_revision=? AND enabled=false AND active_command IS NULL
            """,input.dryThreshold(),input.wetThreshold(),input.durationSeconds(),input.cooldownSeconds(),input.revision());
        if(changed!=1) throw new ResponseStatusException(HttpStatus.CONFLICT,"Disable rule and resolve active run; reload settings if revision changed");
        return settings();
    }
    public List<Run> runs() {
        return jdbc.query("SELECT * FROM watering_run ORDER BY id DESC LIMIT 20",(rs,n)->new Run(rs.getLong("id"),rs.getTimestamp("started_at").toInstant(),rs.getObject("command_id",UUID.class),rs.getString("result"),rs.getObject("dry_threshold",Integer.class),rs.getObject("wet_threshold",Integer.class),rs.getObject("duration_seconds",Integer.class),rs.getObject("cooldown_seconds",Integer.class),rs.getObject("settings_revision",Long.class)));
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
            jdbc.update("UPDATE watering_rule SET enabled=true,low_count=0,last_sample_at=?,last_sample_boot=?,last_sample_sequence=?,last_result='WAITING_SAMPLES' WHERE singleton=1",Timestamp.from(latest.get().telemetry().timestamp().truncatedTo(java.time.temporal.ChronoUnit.MILLIS)),latest.get().telemetry().bootId(),latest.get().telemetry().sequence());
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
    public synchronized PumpService.Command manualCommand(PumpService.Request request) {
        manualHold();
        return pump.create(request);
    }
    private boolean fresh(TelemetryRepository.Reading sample) {
        Instant now=Instant.now();
        return sample.telemetry().timestamp().isAfter(now.minusSeconds(15)) && !sample.telemetry().timestamp().isAfter(now.plusSeconds(2)) && sample.receivedAt().isAfter(now.minusSeconds(15));
    }
    public synchronized void tick() {
        var state=state();
        var settings=settings();
        if (state.activeCommand()!=null) {
            pump.commands(); // expire outstanding ACKs
            var command=jdbc.query("SELECT state,issued_at FROM pump_command WHERE command_id=?",(rs,n)->new TrackedCommand(rs.getString("state"),rs.getTimestamp("issued_at").toInstant()),state.activeCommand()).stream().findFirst();
            var status=pump.status();
            if (status.safetyLockout()) {
                manualHold();
                jdbc.update("UPDATE watering_rule SET stop_requested=true WHERE singleton=1");
            }
            if (command.isPresent() && Set.of("FAILED","TIMED_OUT","PUBLISH_UNCERTAIN").contains(command.get().state())) {
                jdbc.update("UPDATE watering_rule SET enabled=false,last_result='COMMAND_UNCONFIRMED',stop_requested=true WHERE singleton=1");
            }
            boolean stop=Boolean.TRUE.equals(jdbc.queryForObject("SELECT stop_requested FROM watering_rule WHERE singleton=1",Boolean.class));
            if (stop) { sendStop(); return; }
            if (confirmedOff(state.activeCommand())) { finish("REPORTED_OFF"); return; }
            if (state.enabled() && command.isPresent() && command.get().state().equals("EXECUTED")) {
                jdbc.update("UPDATE watering_rule SET last_result='EXECUTION_CONFIRMED' WHERE singleton=1");
                jdbc.update("UPDATE watering_run SET result='EXECUTION_CONFIRMED' WHERE command_id=?",state.activeCommand());
            }
            var latest=telemetry.latest("ENV01");
            if (!status.fresh() || latest.isEmpty() || !fresh(latest.get()) || latest.get().telemetry().soilMoisture()>=settings.wetThreshold()) {
                jdbc.update("UPDATE watering_rule SET stop_requested=true,last_result='STOP_REQUESTED' WHERE singleton=1"); sendStop();
            }
            return;
        }
        if (!state.enabled()) return;
        if (state.cooldownUntil()!=null && state.cooldownUntil().isAfter(Instant.now())) { waiting("COOLDOWN"); return; }
        var readiness=pump.status();
        if (!readiness.controlEnabled() || !readiness.fresh() || !readiness.reportedState().equals("OFF") || readiness.safetyLockout()) {
            waiting(readiness.safetyLockout() ? "SAFETY_LOCKOUT" : "DEVICE_NOT_READY"); return;
        }
        pump.commands(); // expire ACK deadlines; query all pending commands, not only the last 20
        if (jdbc.queryForObject("SELECT COUNT(*) FROM pump_command WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')",Integer.class)>0) { waiting("COMMAND_PENDING"); return; }
        var latest=telemetry.latest("ENV01");
        if (latest.isEmpty() || !fresh(latest.get())) { jdbc.update("UPDATE watering_rule SET low_count=0,last_result='STALE_SENSOR' WHERE singleton=1"); return; }
        Timestamp previous=jdbc.queryForObject("SELECT last_sample_at FROM watering_rule WHERE singleton=1",Timestamp.class);
        UUID boot=jdbc.queryForObject("SELECT last_sample_boot FROM watering_rule WHERE singleton=1",UUID.class);
        Long sequence=jdbc.queryForObject("SELECT last_sample_sequence FROM watering_rule WHERE singleton=1",Long.class);
        var samples=telemetry.history("ENV01",previous==null ? Instant.now().minusSeconds(15) : previous.toInstant(),Instant.now().plusSeconds(2),1000);
        var ordered=new ArrayList<>(samples); Collections.reverse(ordered);
        int count=previous!=null && previous.toInstant().isAfter(Instant.now().minusSeconds(15)) ? state.lowCount() : 0;
        boolean consumed=false;
        for (var reading:ordered) {
            var sample=reading.telemetry();
            Instant stamp=sample.timestamp().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
            if (previous!=null && !stamp.isAfter(previous.toInstant())) continue;
            if (sample.bootId().equals(boot) && sequence!=null && sample.sequence()<=sequence) continue;
            boolean consecutive=previous!=null && !stamp.isAfter(previous.toInstant().plusSeconds(15)) && sample.bootId().equals(boot);
            count=fresh(reading) && sample.soilMoisture()<settings.dryThreshold() ? (consecutive ? count+1 : 1) : 0;
            previous=Timestamp.from(stamp); boot=sample.bootId(); sequence=sample.sequence();
            consumed=true;
            jdbc.update("UPDATE watering_rule SET last_sample_at=?,last_sample_boot=?,last_sample_sequence=?,low_count=?,last_result='WAITING_SAMPLES' WHERE singleton=1",previous,boot,sequence,Math.min(count,2));
        }
        if (!consumed) jdbc.update("UPDATE watering_rule SET last_result='WAITING_NEW_SAMPLE' WHERE singleton=1");
        else if (count==0) jdbc.update("UPDATE watering_rule SET last_result='SOIL_NOT_LOW' WHERE singleton=1");
        if (count<2) return;
        try {
            var command=pump.create(new PumpService.Request("ON",settings.durationSeconds()),id -> transaction.executeWithoutResult(tx -> {
                jdbc.update("UPDATE watering_rule SET active_command=?,low_count=0,last_result='COMMAND_PENDING' WHERE singleton=1",id);
                jdbc.update("INSERT INTO watering_run(command_id,result,dry_threshold,wet_threshold,duration_seconds,cooldown_seconds,settings_revision) VALUES(?,'COMMAND_PENDING',?,?,?,?,?)",id,settings.dryThreshold(),settings.wetThreshold(),settings.durationSeconds(),settings.cooldownSeconds(),settings.revision());
            }));
            runResult(command.state().equals("EXECUTED") ? "EXECUTION_CONFIRMED" : "COMMAND_SENT");
        } catch (Exception error) {
            // Publish may have reached the device: no automatic ON retry.
            jdbc.update("UPDATE watering_rule SET enabled=false,low_count=0,last_result='DISPATCH_FAILED' WHERE singleton=1");
            UUID uncertain=error instanceof PumpService.UncertainPublish failure ? failure.commandId : null;
            if (uncertain!=null) jdbc.update("UPDATE watering_rule SET active_command=?,stop_requested=true WHERE singleton=1",uncertain);
            if (uncertain==null) jdbc.update("INSERT INTO watering_run(result,dry_threshold,wet_threshold,duration_seconds,cooldown_seconds,settings_revision) VALUES('DISPATCH_FAILED',?,?,?,?,?)",settings.dryThreshold(),settings.wetThreshold(),settings.durationSeconds(),settings.cooldownSeconds(),settings.revision());
            else {
                jdbc.update("INSERT INTO watering_run(command_id,result,dry_threshold,wet_threshold,duration_seconds,cooldown_seconds,settings_revision) SELECT ?,'DISPATCH_FAILED',?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM watering_run WHERE command_id=?)",uncertain,settings.dryThreshold(),settings.wetThreshold(),settings.durationSeconds(),settings.cooldownSeconds(),settings.revision(),uncertain);
                runResult("DISPATCH_FAILED");
            }
        }
    }
    private void sendStop() {
        try {
            UUID stopId=jdbc.queryForObject("SELECT stop_command FROM watering_rule WHERE singleton=1",UUID.class);
            if (stopId!=null) {
                if (confirmedOff(stopId) || confirmedOff(state().activeCommand())) { finish("REPORTED_OFF"); return; }
                String stopState=jdbc.queryForObject("SELECT state FROM pump_command WHERE command_id=?",String.class,stopId);
                runResult(Set.of("FAILED","TIMED_OUT","PUBLISH_UNCERTAIN").contains(stopState) ? "STOP_UNCONFIRMED" : "STOP_SENT");
                return;
            }
            boolean attempted=Boolean.TRUE.equals(jdbc.queryForObject("SELECT stop_attempted FROM watering_rule WHERE singleton=1",Boolean.class));
            if (attempted) {
                if (confirmedOff(state().activeCommand())) finish("REPORTED_OFF");
                else runResult("STOP_UNCONFIRMED");
                return;
            }
            jdbc.update("UPDATE watering_rule SET stop_attempted=true WHERE singleton=1");
            var command=pump.create(new PumpService.Request("OFF",null),id -> jdbc.update("UPDATE watering_rule SET stop_command=? WHERE singleton=1",id));
            // Keep the run until a newer OFF status is observed; never claim publish means execution.
            runResult("STOP_SENT");
            if (confirmedOff(command.commandId())) finish("REPORTED_OFF");
        } catch (Exception error) {
            if (error instanceof PumpService.UncertainPublish failure) jdbc.update("UPDATE watering_rule SET stop_command=? WHERE singleton=1",failure.commandId);
            runResult("STOP_UNCONFIRMED");
        }
    }
    private void runResult(String result) {
        jdbc.update("UPDATE watering_rule SET last_result=? WHERE singleton=1",result);
        jdbc.update("UPDATE watering_run SET result=? WHERE command_id=(SELECT active_command FROM watering_rule WHERE singleton=1)",result);
    }
    private void waiting(String reason) {
        jdbc.update("UPDATE watering_rule SET low_count=0,last_result=? WHERE singleton=1",reason);
    }
    private boolean confirmedOff(UUID id) {
        if (id==null || !pump.status().fresh()) return false;
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM pump_command c JOIN pump_status s ON s.singleton=1
            WHERE c.command_id=? AND s.reported_state='OFF' AND (
              (c.state='EXECUTED' AND c.ack_boot_id=s.boot_id AND s.sequence>c.ack_sequence)
              OR (c.action='ON' AND s.observed_at>c.expires_at + c.duration_seconds * INTERVAL '1 second'))
            """,Integer.class,id)>0;
    }
    private void finish(String result) {
        var state=state();
        jdbc.update("UPDATE watering_run SET result=? WHERE command_id=?",result,state.activeCommand());
        jdbc.update("UPDATE watering_rule SET active_command=NULL,stop_command=NULL,stop_requested=false,stop_attempted=false,low_count=0,cooldown_until=?,last_result=? WHERE singleton=1",Timestamp.from(Instant.now().plusSeconds(settings().cooldownSeconds())),result);
    }
}
