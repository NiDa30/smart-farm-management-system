package vn.smartfarm.iot.automation;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Read-only: replays stored ENV01 telemetry through draft or current rule settings. */
@Service
public class RuleSimulation {
    public record Request(Integer hours, WateringRule.Settings settings, RuleGuards.Guards guards) {}
    public static final int MAX_HOURS = 168;
    private final JdbcTemplate jdbc;
    private final WateringRule rule;
    private final IrrigationCalendar calendar;
    public RuleSimulation(JdbcTemplate jdbc, WateringRule rule, IrrigationCalendar calendar) {
        this.jdbc = jdbc; this.rule = rule; this.calendar = calendar;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public RuleSimulator.Result simulate(Request request) {
        int hours = request == null || request.hours() == null ? 24 : request.hours();
        if (hours < 1 || hours > MAX_HOURS) throw bad("hours must be 1.." + MAX_HOURS);
        var settings = request == null || request.settings() == null ? rule.settings() : request.settings();
        // Same bounds as WateringRule.saveSettings, so a draft that could not be saved is not simulated.
        if (settings.dryThreshold() < 1 || settings.dryThreshold() > 90 || settings.wetThreshold() < settings.dryThreshold() + 5
            || settings.wetThreshold() > 100 || settings.durationSeconds() < 1 || settings.durationSeconds() > 30
            || settings.cooldownSeconds() < 60 || settings.cooldownSeconds() > 3600)
            throw bad("Invalid thresholds, duration or cooldown");
        var guards = request == null || request.guards() == null ? rule.guards() : request.guards();
        if (guards.revision() < 1) guards = guards.withRevision(1); // drafts need not carry a revision
        try { RuleGuards.validate(guards); } catch (IllegalArgumentException error) { throw bad("Invalid guards: " + error.getMessage()); }
        Instant to = Instant.now(), from = to.minus(Duration.ofHours(hours));
        var samples = jdbc.query("""
            SELECT observed_at,boot_id,temperature,humidity,soil_moisture FROM telemetry
            WHERE device_id='ENV01' AND observed_at>=? AND observed_at<? ORDER BY observed_at,id
            """, (rs, n) -> new RuleSimulator.Sample(rs.getTimestamp("observed_at").toInstant(), rs.getObject("boot_id", UUID.class),
                rs.getDouble("temperature"), rs.getDouble("humidity"), rs.getDouble("soil_moisture")),
            Timestamp.from(from), Timestamp.from(to));
        var schedule = calendar.settings();
        return RuleSimulator.simulate(samples,
            new RuleSimulator.Parameters(settings.dryThreshold(), settings.wetThreshold(), settings.durationSeconds(), settings.cooldownSeconds(), guards),
            at -> IrrigationCalendar.evaluate(schedule, at).allowed(), ZoneId.of(IrrigationCalendar.ZONE), from, to);
    }

    private static ResponseStatusException bad(String reason) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, reason); }
}
