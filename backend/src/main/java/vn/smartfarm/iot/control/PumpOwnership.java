package vn.smartfarm.iot.control;

import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Durable command claims, not an expiring lease or proof that a physical pump runs. */
public final class PumpOwnership {
    public record Holder(UUID commandId,String source,Instant reservedAt,boolean releasable) {}
    public record View(long unresolvedCount,boolean blocked,Holder holder) {}
    private final JdbcTemplate jdbc;
    PumpOwnership(JdbcTemplate jdbc){this.jdbc=jdbc;}
    private static final String OPEN="c.action='ON' AND c.fence_ordinal IS NOT NULL AND c.owner_released_at IS NULL";
    // An elapsed timer, ACK alone or lost process is never evidence of OFF. All dispatched
    // ordinals must be covered, including offline OFF reservations, before another owner starts.
    private static final String PROOF="""
        EXISTS (SELECT 1 FROM pump_status s WHERE s.singleton=1 AND s.fence_version=1
          AND s.reported_state='OFF' AND NOT s.fence_restart_required
          AND s.observed_at>CURRENT_TIMESTAMP-INTERVAL '15 seconds'
          AND s.received_at>CURRENT_TIMESTAMP-INTERVAL '15 seconds'
          AND s.observed_at<=CURRENT_TIMESTAMP+INTERVAL '2 seconds'
          AND s.received_at<=CURRENT_TIMESTAMP+INTERVAL '2 seconds'
          AND s.observed_at>c.issued_at
          AND (s.boot_id<>c.target_boot_id OR s.last_fence_ordinal>=c.fence_ordinal)
          AND NOT EXISTS (SELECT 1 FROM pump_command p WHERE
            p.state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')
            OR (p.target_boot_id=s.boot_id AND p.fence_ordinal>s.last_fence_ordinal))
          AND NOT COALESCE(c.reported_state='ON' AND c.ack_boot_id=s.boot_id AND c.ack_sequence>=s.sequence,false))
        """;
    View view(){
        var rows=jdbc.query("SELECT c.command_id,c.control_source,c.issued_at,"+PROOF+" AS proof FROM pump_command c WHERE "+OPEN+" ORDER BY c.fence_ordinal DESC",
            (r,n)->new Holder(r.getObject("command_id",UUID.class),r.getString("control_source"),r.getTimestamp("issued_at").toInstant(),r.getBoolean("proof")));
        return new View(rows.size(),rows.stream().anyMatch(r->!r.releasable()),rows.isEmpty()?null:rows.getFirst());
    }
    /** Caller must hold pump_dispatch_gate until the new reservation has committed. */
    void requireAvailable(){
        jdbc.update("UPDATE pump_command c SET owner_released_at=CURRENT_TIMESTAMP WHERE "+OPEN+" AND "+PROOF);
        if(jdbc.queryForObject("SELECT COUNT(*) FROM pump_command c WHERE "+OPEN,Long.class)>0)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Pump owner unresolved; wait for fresh OFF covering all commands");
    }
    void requireRuleOwner(UUID owner){
        if(owner==null||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command c JOIN watering_rule r ON r.singleton=1 WHERE "+OPEN+" AND c.command_id=? AND (c.control_source='AUTOMATION' OR (c.control_source='LEGACY' AND EXISTS (SELECT 1 FROM watering_run w WHERE w.command_id=c.command_id))) AND r.active_command=c.command_id",Long.class,owner)!=1)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Automatic stop no longer owns this pump run");
    }
}
