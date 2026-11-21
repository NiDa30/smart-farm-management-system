package vn.smartfarm.iot.analytics;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Device-confirmed ON time from a state-change history. Pure functions, no database.
 *
 * An ON interval starts at an ON report and ends at the next report (OFF, new boot, any change).
 * If the last report is still ON, the interval ends at the last time the device was heard from
 * (the latest status observation), never at "now" on assumption, so a silent device is not
 * credited with runtime it may not have had.
 */
public final class Runtime {
    private Runtime() {}

    public record Change(Instant observedAt, UUID bootId, boolean on) {}
    public record Interval(Instant start, Instant end) {
        public long seconds() { return Math.max(0, Duration.between(start, end).toSeconds()); }
    }

    /** history: ordered by time, may start before {@code from}; lastHeard: latest status observation. */
    public static List<Interval> intervals(List<Change> history, Instant lastHeard, Instant from, Instant to) {
        List<Interval> result = new ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            Change change = history.get(i);
            if (!change.on()) continue;
            Instant end = i + 1 < history.size() ? history.get(i + 1).observedAt()
                : lastHeard != null && lastHeard.isAfter(change.observedAt()) ? lastHeard : change.observedAt();
            Instant start = change.observedAt().isBefore(from) ? from : change.observedAt();
            if (end.isAfter(to)) end = to;
            if (end.isAfter(start)) result.add(new Interval(start, end));
        }
        return result;
    }

    /** Seconds per local day (farm time zone), splitting intervals that cross midnight. */
    public static Map<LocalDate, Long> perDay(List<Interval> intervals, ZoneId zone) {
        Map<LocalDate, Long> days = new TreeMap<>();
        for (Interval interval : intervals) {
            Instant cursor = interval.start();
            while (cursor.isBefore(interval.end())) {
                LocalDate day = cursor.atZone(zone).toLocalDate();
                Instant midnight = day.plusDays(1).atStartOfDay(zone).toInstant();
                Instant stop = midnight.isBefore(interval.end()) ? midnight : interval.end();
                days.merge(day, Duration.between(cursor, stop).toSeconds(), Long::sum);
                cursor = stop;
            }
        }
        return days;
    }

    public static long total(List<Interval> intervals) {
        return intervals.stream().mapToLong(Interval::seconds).sum();
    }

    /** kWh from seconds at the rated power; null when the power is unknown. */
    public static Double kilowattHours(long seconds, Integer ratedWatts) {
        if (ratedWatts == null) return null;
        return Math.round(seconds * ratedWatts / 3_600_000.0 * 1000.0) / 1000.0;
    }
}
