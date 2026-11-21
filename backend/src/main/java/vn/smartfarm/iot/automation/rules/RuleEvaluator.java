package vn.smartfarm.iot.automation.rules;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import vn.smartfarm.iot.automation.rules.RuleDefinition.*;

/**
 * Three-valued evaluation (TRUE / FALSE / UNKNOWN) of a condition tree at an instant.
 * Pure: all data comes through {@link Facts}, so the same code runs live and in simulation.
 *
 * Missing, stale (older than 30 s at the instant), faulty or future data is UNKNOWN, and a rule
 * only fires on TRUE. ALL is FALSE if any item is FALSE, TRUE if all are TRUE, else UNKNOWN;
 * ANY is TRUE if any item is TRUE, FALSE if all are FALSE, else UNKNOWN.
 */
public final class RuleEvaluator {
    private RuleEvaluator() {}
    public enum Outcome { TRUE, FALSE, UNKNOWN }
    public static final long FRESH_SECONDS = 30;

    public record Sample(Instant observedAt, Instant receivedAt, Double value) {}   // value null = sensor fault
    public interface Facts {
        /** samples of a channel received in [from, at], ascending, plus the last one before from. */
        List<Sample> samples(String nodeId, String channelId, Instant from, Instant at);
        /** "ON"/"OFF" if a fresh device report exists at that instant, else null. */
        String actuatorState(String actuatorId, Instant at);
    }

    public static Outcome evaluate(Node node, Facts facts, Instant at, ZoneId zone) {
        if (node instanceof Group g) {
            boolean unknown = false;
            for (Node item : g.items()) {
                Outcome o = evaluate(item, facts, at, zone);
                if (g.op().equals("ALL") && o == Outcome.FALSE) return Outcome.FALSE;
                if (g.op().equals("ANY") && o == Outcome.TRUE) return Outcome.TRUE;
                if (o == Outcome.UNKNOWN) unknown = true;
            }
            if (unknown) return Outcome.UNKNOWN;
            return g.op().equals("ALL") ? Outcome.TRUE : Outcome.FALSE;
        }
        if (node instanceof TimeWindow w) {
            ZonedDateTime local = at.atZone(zone);
            var time = local.toLocalTime();
            boolean inside = w.start().isBefore(w.end())
                ? !time.isBefore(w.start()) && time.isBefore(w.end())
                : !time.isBefore(w.start()) || time.isBefore(w.end());          // wraps midnight
            // A window that wraps midnight belongs to the day it started on.
            int day = w.start().isBefore(w.end()) || !time.isBefore(w.start()) ? local.getDayOfWeek().getValue()
                : local.minusDays(1).getDayOfWeek().getValue();
            return inside && w.days().contains(day) ? Outcome.TRUE : Outcome.FALSE;
        }
        if (node instanceof ActuatorState a) {
            String state = facts.actuatorState(a.actuatorId(), at);
            return state == null ? Outcome.UNKNOWN : state.equals(a.state()) ? Outcome.TRUE : Outcome.FALSE;
        }
        return sensor((Sensor) node, facts, at);
    }

    static boolean holds(Sensor s, double v) {
        return switch (s.comparator()) {
            case "GT" -> v > s.value();
            case "GTE" -> v >= s.value();
            case "LT" -> v < s.value();
            case "LTE" -> v <= s.value();
            default -> v == s.value();   // EQ (float switch 1/0)
        };
    }

    private static Outcome sensor(Sensor s, Facts facts, Instant at) {
        Instant from = at.minusSeconds(s.forSeconds());
        List<Sample> samples = facts.samples(s.nodeId(), s.channelId(), from, at).stream()
            .filter(x -> !x.receivedAt().isAfter(at) && !x.observedAt().isAfter(at.plusSeconds(2))).toList();
        if (samples.isEmpty()) return Outcome.UNKNOWN;
        Sample latest = samples.getLast();
        if (Duration.between(latest.receivedAt(), at).toSeconds() > FRESH_SECONDS || latest.value() == null) return Outcome.UNKNOWN;
        if (s.forSeconds() == 0) return holds(s, latest.value()) ? Outcome.TRUE : Outcome.FALSE;
        // Held for forSeconds: every sample since `from` (and the one just before it) satisfies,
        // the window is covered from its start, and no gap between samples exceeds 30 s.
        boolean covered = !samples.getFirst().receivedAt().isAfter(from);
        Instant previous = null;
        for (Sample x : samples) {
            if (x.value() == null) return Outcome.UNKNOWN;
            if (!holds(s, x.value())) return Outcome.FALSE;
            if (previous != null && Duration.between(previous, x.receivedAt()).toSeconds() > FRESH_SECONDS) covered = false;
            previous = x.receivedAt();
        }
        return covered ? Outcome.TRUE : Outcome.UNKNOWN;
    }
}
