package vn.smartfarm.iot.automation;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** Pure logic: runs without a database. */
class RuleSimulatorTest {
    static final UUID BOOT = UUID.randomUUID();
    static final Instant T0 = Instant.parse("2026-11-19T00:00:00Z");
    static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    static List<RuleSimulator.Sample> series(double... soil) {
        List<RuleSimulator.Sample> list = new ArrayList<>();
        for (int i = 0; i < soil.length; i++) list.add(new RuleSimulator.Sample(T0.plusSeconds(5L * i), BOOT, 25, 60, soil[i]));
        return list;
    }
    static RuleSimulator.Result run(List<RuleSimulator.Sample> samples, RuleGuards.Guards guards) {
        return RuleSimulator.simulate(samples, new RuleSimulator.Parameters(30, 35, 20, 60, guards), t -> true, VN, T0, T0.plusSeconds(86400));
    }
    static double[] dry(int n) { double[] values = new double[n]; Arrays.fill(values, 20); return values; }

    @Test void twoConsecutiveDrySamplesStartAndWetSoilStopsEarly() {
        var result = run(series(40, 29, 28, 30, 36, 40), RuleGuards.NONE);
        assertEquals(1, result.runs()); assertEquals(1, result.earlyStops()); assertEquals(10, result.pumpSeconds());
        assertEquals(0, run(series(40, 29, 31, 29, 31), RuleGuards.NONE).runs());
    }

    @Test void timerAndCooldownPaceRepeatedRuns() {
        var result = run(series(dry(40)), RuleGuards.NONE);
        assertEquals(3, result.runs()); assertEquals(0, result.earlyStops()); assertTrue(result.timerStops() >= 2);
    }

    @Test void gapsRebootsAndDuplicatesBreakOrDoNotExtendTheStreak() {
        var gap = new ArrayList<>(series(29)); gap.add(new RuleSimulator.Sample(T0.plusSeconds(20), BOOT, 25, 60, 29));
        assertEquals(0, run(gap, RuleGuards.NONE).runs());
        var reboot = new ArrayList<>(series(29)); reboot.add(new RuleSimulator.Sample(T0.plusSeconds(5), UUID.randomUUID(), 25, 60, 29));
        assertEquals(0, run(reboot, RuleGuards.NONE).runs());
        var duplicate = new ArrayList<>(series(29)); duplicate.add(duplicate.getFirst()); duplicate.add(new RuleSimulator.Sample(T0.plusSeconds(5), BOOT, 25, 60, 29));
        assertEquals(1, run(duplicate, RuleGuards.NONE).runs());
    }

    @Test void guardsBlockAndAreCountedByReason() {
        var limited = run(series(dry(40)), new RuleGuards.Guards(null, null, null, null, null, 1, 1));
        assertEquals(1, limited.runs()); assertTrue(limited.blocked().get(RuleGuards.DAILY_LIMIT) >= 1);
        var hot = run(series(dry(40)), new RuleGuards.Guards(null, 24.0, null, null, null, null, 1));
        assertEquals(0, hot.runs()); assertTrue(hot.blocked().containsKey(RuleGuards.TEMPERATURE));
        assertEquals(0, run(series(dry(40)), new RuleGuards.Guards(null, null, 60.0, null, null, null, 1)).runs());
        var water = run(series(dry(40)), new RuleGuards.Guards(null, null, null, "WATER01", "LOW", null, 1));
        assertTrue(water.waterGuardAssumed()); assertEquals(3, water.runs());
    }

    @Test void scheduleBlocksStartsAndStopsRunningPump() {
        var result = RuleSimulator.simulate(series(29, 28, 27, 26, 25, 24), new RuleSimulator.Parameters(30, 35, 20, 60, RuleGuards.NONE),
            t -> t.isBefore(T0.plusSeconds(12)), ZoneId.of("UTC"), T0, T0.plusSeconds(100));
        assertEquals(1, result.runs()); assertEquals(1, result.earlyStops()); assertEquals("OUTSIDE_SCHEDULE", result.events().get(1).reason());
    }

    @Test void openRunCountsOnlyToRangeEndAndEventsAreCapped() {
        var open = RuleSimulator.simulate(series(29, 28), new RuleSimulator.Parameters(30, 35, 20, 60, RuleGuards.NONE), t -> true, ZoneId.of("UTC"), T0, T0.plusSeconds(12));
        assertEquals(7, open.pumpSeconds()); assertEquals(0, open.timerStops());
        double[] cycling = new double[20000];
        for (int i = 0; i < cycling.length; i++) cycling[i] = i % 40 < 20 ? 20 : 50;
        var many = RuleSimulator.simulate(series(cycling), new RuleSimulator.Parameters(30, 35, 20, 60, RuleGuards.NONE), t -> true, ZoneId.of("UTC"), T0, T0.plusSeconds(200000));
        assertEquals(RuleSimulator.MAX_EVENTS, many.events().size()); assertTrue(many.eventsTruncated());
    }

    @Test void guardValidationAndUnknownWater() {
        assertThrows(IllegalArgumentException.class, () -> RuleGuards.validate(new RuleGuards.Guards(30.0, 20.0, null, null, null, null, 1)));
        assertThrows(IllegalArgumentException.class, () -> RuleGuards.validate(new RuleGuards.Guards(null, null, null, "WATER01", null, null, 1)));
        assertThrows(IllegalArgumentException.class, () -> RuleGuards.validate(new RuleGuards.Guards(null, null, null, null, null, 0, 1)));
        assertThrows(IllegalArgumentException.class, () -> RuleGuards.validate(new RuleGuards.Guards(null, null, null, null, null, null, 0)));
        var water = new RuleGuards.Guards(null, null, null, "WATER01", "LOW", null, 1);
        assertNull(RuleGuards.block(RuleGuards.NONE, 99, 100, null, 999));
        assertEquals(RuleGuards.WATER, RuleGuards.block(water, 25, 50, null, 0), "unknown never counts as water");
        assertEquals(RuleGuards.WATER, RuleGuards.block(water, 25, 50, false, 0));
        assertNull(RuleGuards.block(water, 25, 50, true, 0));
    }
}
