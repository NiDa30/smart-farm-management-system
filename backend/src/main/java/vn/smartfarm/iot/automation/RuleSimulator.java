package vn.smartfarm.iot.automation;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * Replays stored ENV01 samples through the watering rule's decision steps, without any
 * command, so a setting can be judged before it is enabled. Pure logic: no Spring, no I/O.
 *
 * Model (mirrors WateringRule.tick): two consecutive dry samples (same boot, at most 15 s
 * apart) inside the schedule start a run; the run ends at the first sample with soil at or
 * above the wet threshold or outside the schedule, or at the device timer; then cooldown.
 * Not modelled: device/ACK latency, stale-sensor stops, manual commands, safety lockout, and
 * the water guard (no aligned water history), which is reported as assumed satisfied.
 */
public final class RuleSimulator {
    private RuleSimulator() {}

    public record Sample(Instant at, UUID bootId, double temperature, double humidity, double soilMoisture) {}
    public record Parameters(int dryThreshold, int wetThreshold, int durationSeconds, int cooldownSeconds, RuleGuards.Guards guards) {}
    public record Event(Instant at, String type, String reason, Double soilMoisture) {}
    public record Result(Instant from, Instant to, int samples, int runs, long pumpSeconds, int earlyStops, int timerStops,
        Map<String, Integer> blocked, Map<String, Integer> runsPerDay, boolean waterGuardAssumed, boolean eventsTruncated, List<Event> events) {}

    public static final int MAX_EVENTS = 200;
    private static final Duration CONSECUTIVE = Duration.ofSeconds(15);

    public static Result simulate(List<Sample> ordered, Parameters p, Predicate<Instant> scheduleAllows, ZoneId zone, Instant from, Instant to) {
        if (p.wetThreshold() < p.dryThreshold() + 5 || p.durationSeconds() < 1 || p.cooldownSeconds() < 0)
            throw new IllegalArgumentException("Invalid simulation parameters");
        RuleGuards.validate(p.guards());
        Map<String, Integer> blocked = new TreeMap<>();
        Map<String, Integer> perDay = new TreeMap<>();
        List<Event> events = new ArrayList<>();
        boolean[] truncated = {false};
        int runs = 0, early = 0, timer = 0, count = 0;
        long seconds = 0;
        Sample previous = null;
        Instant runStart = null, runEnd = null, cooldownUntil = null;
        for (Sample s : ordered) {
            if (previous != null && !s.at().isAfter(previous.at())) continue; // duplicates or reordering never count
            boolean consecutive = previous != null && s.bootId().equals(previous.bootId())
                && !s.at().isAfter(previous.at().plus(CONSECUTIVE));
            previous = s;
            if (runStart != null) {
                // The device cuts power at its timer even if no sample arrives.
                if (!s.at().isBefore(runEnd)) {
                    seconds += p.durationSeconds(); timer++;
                    add(events, truncated, new Event(runEnd, "STOP", "TIMER", null));
                    cooldownUntil = runEnd.plusSeconds(p.cooldownSeconds()); runStart = null; count = 0;
                } else if (s.soilMoisture() >= p.wetThreshold() || !scheduleAllows.test(s.at())) {
                    seconds += Duration.between(runStart, s.at()).toSeconds(); early++;
                    add(events, truncated, new Event(s.at(), "STOP", s.soilMoisture() >= p.wetThreshold() ? "SOIL_WET" : "OUTSIDE_SCHEDULE", s.soilMoisture()));
                    cooldownUntil = s.at().plusSeconds(p.cooldownSeconds()); runStart = null; count = 0;
                    continue;
                } else continue;
            }
            if (cooldownUntil != null && s.at().isBefore(cooldownUntil)) { count = 0; continue; }
            boolean dry = scheduleAllows.test(s.at()) && s.soilMoisture() < p.dryThreshold();
            count = dry ? (consecutive ? count + 1 : 1) : 0;
            if (count < 2) continue;
            LocalDate day = s.at().atZone(zone).toLocalDate();
            int today = perDay.getOrDefault(day.toString(), 0);
            String reason = RuleGuards.block(p.guards(), s.temperature(), s.humidity(), Boolean.TRUE, today);
            count = 0; // WateringRule resets the dry streak whenever it waits
            if (reason != null) {
                blocked.merge(reason, 1, Integer::sum);
                add(events, truncated, new Event(s.at(), "BLOCKED", reason, s.soilMoisture()));
                continue;
            }
            runs++; perDay.merge(day.toString(), 1, Integer::sum);
            runStart = s.at(); runEnd = s.at().plusSeconds(p.durationSeconds());
            add(events, truncated, new Event(s.at(), "START", null, s.soilMoisture()));
        }
        if (runStart != null) {
            // A run still open at the end of the data is counted up to its timer or the range end.
            Instant end = runEnd.isAfter(to) ? to : runEnd;
            seconds += Math.max(0, Duration.between(runStart, end).toSeconds());
            if (!runEnd.isAfter(to)) { timer++; add(events, truncated, new Event(runEnd, "STOP", "TIMER", null)); }
        }
        return new Result(from, to, ordered.size(), runs, seconds, early, timer, java.util.Collections.unmodifiableMap(blocked), java.util.Collections.unmodifiableMap(perDay),
            p.guards().waterRequired(), truncated[0], List.copyOf(events));
    }

    private static void add(List<Event> events, boolean[] truncated, Event event) {
        if (events.size() < MAX_EVENTS) events.add(event); else truncated[0] = true;
    }
}
