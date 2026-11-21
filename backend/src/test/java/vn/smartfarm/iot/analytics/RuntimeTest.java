package vn.smartfarm.iot.analytics;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RuntimeTest {
    static final UUID A = UUID.randomUUID(), B = UUID.randomUUID();
    static final Instant T = Instant.parse("2026-11-20T00:00:00Z");
    static Instant t(long s) { return T.plusSeconds(s); }
    static Runtime.Change on(long s) { return new Runtime.Change(t(s), A, true); }
    static Runtime.Change off(long s) { return new Runtime.Change(t(s), A, false); }

    @Test void onUntilNextReportClippedToTheWindow() {
        var history = List.of(on(-100), off(50), on(200), off(260), on(1000));
        var intervals = Runtime.intervals(history, t(1030), t(0), t(2000));
        assertEquals(List.of(50L, 60L, 30L), intervals.stream().map(Runtime.Interval::seconds).toList(),
            "before-window ON counted from the window start; open ON ends when the device was last heard");
        assertEquals(140, Runtime.total(intervals));
    }

    @Test void silentDeviceGetsNoAssumedRuntimeAndNewBootEndsAnInterval() {
        assertEquals(0, Runtime.total(Runtime.intervals(List.of(on(10)), null, t(0), t(5000))));
        var reboot = List.of(on(0), new Runtime.Change(t(90), B, false));
        assertEquals(90, Runtime.total(Runtime.intervals(reboot, t(4000), t(0), t(5000))));
        assertEquals(0, Runtime.total(Runtime.intervals(List.of(off(0), off(10)), t(4000), t(0), t(5000))));
    }

    @Test void splitsAcrossLocalMidnightAndEstimatesEnergy() {
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");                // midnight local = 17:00Z
        var start = Instant.parse("2026-11-20T16:30:00Z");
        var intervals = List.of(new Runtime.Interval(start, start.plusSeconds(3600)));
        var days = Runtime.perDay(intervals, zone);
        assertEquals(1800L, days.get(LocalDate.parse("2026-11-20")));
        assertEquals(1800L, days.get(LocalDate.parse("2026-11-21")));
        assertEquals(0.37, Runtime.kilowattHours(3600, 370));
        assertNull(Runtime.kilowattHours(3600, null), "unknown power is not guessed");
    }
}
