package vn.smartfarm.iot.irrigation;

import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterVolume;

/** Station estimate in the server intent window, never allocation to a bed or actuator proof. */
@Service
@Transactional(readOnly=true, isolation=Isolation.REPEATABLE_READ)
public class SessionWaterUsage {
    public record Report(String mode, Instant asOf, UUID sessionId, String circuitId, int circuitRevision,
        String zoneId, String waterNodeId, String flowChannelId, String dataSource, String state,
        String reason, Instant from, Instant to, UUID onId, UUID offId, WaterVolume.Report volume) {}
    private record Intent(UUID id, Instant at) {}
    private final JdbcTemplate jdbc;
    private final IrrigationSession sessions;
    private final IrrigationSessionHistory history;
    private final WaterVolume volume;
    public SessionWaterUsage(JdbcTemplate jdbc, IrrigationSession sessions, IrrigationSessionHistory history, WaterVolume volume) {
        this.jdbc=jdbc; this.sessions=sessions; this.history=history; this.volume=volume;
    }
    public Report read(String circuit, UUID session) {
        var run=sessions.find(circuit,session);
        if(run.onId()==null) return report(run,"NO_ON_INTENT",null,null,null);
        var on=intent(run,run.onId());
        if(on==null) return report(run,"ON_EVIDENCE_UNAVAILABLE",null,null,null);
        // First OFF attempt is the boundary. A later successful retry must not enlarge the estimate.
        var stops=jdbc.query("SELECT request_id,created_at FROM irrigation_session_action WHERE session_id=? AND action='OFF' AND created_at>=? ORDER BY created_at,history_id LIMIT 1",
            (r,n)->new Intent(r.getObject("request_id",UUID.class),r.getTimestamp("created_at").toInstant()),session,Timestamp.from(on.at()));
        if(stops.isEmpty()) return report(run,"NO_OFF_INTENT",on,null,null);
        var off=stops.getFirst();
        if(!on.at().isBefore(off.at()) || Duration.between(on.at(),off.at()).compareTo(Duration.ofDays(1))>0
            || off.at().isAfter(Instant.now().plusSeconds(2))) return report(run,"INVALID_INTENT_WINDOW",on,off,null);
        if(!confirmed(run,on.id(),"ON") || !confirmed(run,off.id(),"OFF")) return report(run,"COMMAND_EVIDENCE_UNCONFIRMED",on,off,null);
        try {
            var v=volume.estimate(run.config().waterNodeId(),run.config().flowChannelId(),on.at(),off.at(),run.config().expectedSource());
            return report(run,v.estimatedLitres()!=null?"OBSERVED_INTERVALS":v.groups().size()>1?"MULTIPLE_CALIBRATIONS":"NO_VALID_INTERVALS",on,off,v);
        } catch(ResponseStatusException e) {
            if(e.getStatusCode()==HttpStatus.NOT_FOUND) return report(run,"WATER_CHANNEL_UNAVAILABLE",on,off,null);
            if(e.getStatusCode()==HttpStatus.UNPROCESSABLE_ENTITY) return report(run,"ESTIMATE_LIMIT_EXCEEDED",on,off,null);
            throw e;
        }
    }
    private Intent intent(IrrigationSession.Run run,UUID id) {
        return jdbc.query("SELECT request_id,created_at FROM irrigation_session_action WHERE request_id=? AND session_id=? AND action='ON'",
            (r,n)->new Intent(r.getObject("request_id",UUID.class),r.getTimestamp("created_at").toInstant()),id,run.sessionId()).stream().findFirst().orElse(null);
    }
    private boolean confirmed(IrrigationSession.Run run,UUID id,String action) {
        var op=sessions.operation(run.config().circuitId(),id);
        var c=history.command(op,run); // Same payload/identity checks as historical command evidence.
        return op.sessionId().equals(run.sessionId()) && op.action().equals(action) && op.state().equals("RETURNED")
            && c!=null && c.state().equals("EXECUTED") && action.equals(c.reportedState())
            && run.pumpBootId().equals(c.ackBootId()) && c.ackSequence()!=null && c.acknowledgedAt()!=null
            && (action.equals("OFF") || run.pumpBootId().equals(c.targetBootId()));
    }
    private Report report(IrrigationSession.Run r,String reason,Intent on,Intent off,WaterVolume.Report v) {
        var c=r.config(); return new Report("SESSION_STATION_FLOW",Instant.now(),r.sessionId(),c.circuitId(),c.revision(),c.zoneId(),
            c.waterNodeId(),c.flowChannelId(),c.expectedSource(),v!=null&&v.estimatedLitres()!=null?"ESTIMATED":"UNAVAILABLE",reason,
            on==null?null:on.at(),off==null?null:off.at(),r.onId(),off==null?null:off.id(),v);
    }
}
