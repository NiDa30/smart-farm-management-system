package vn.smartfarm.iot.automation;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class IrrigationCalendarTest {
    IrrigationCalendar.Settings schedule(IrrigationCalendar.Window... windows) {
        return IrrigationCalendar.normalize(new IrrigationCalendar.Settings("TIME_WINDOWS",IrrigationCalendar.ZONE,1,List.of(windows)));
    }
    IrrigationCalendar.Window window(List<Integer> days,String from,String to) {return new IrrigationCalendar.Window(days,from,to);}
    @Test void vietnamLocalTimeBoundariesUseInclusiveStartAndExclusiveEnd() {
        var settings=schedule(window(List.of(1,3,5),"06:00","06:10"));
        var start=Instant.parse("2026-10-11T23:00:00Z"); // Monday06:00 in Vietnam
        assertFalse(IrrigationCalendar.evaluate(settings,start.minusNanos(1)).allowed());
        var active=IrrigationCalendar.evaluate(settings,start);
        assertTrue(active.allowed());assertEquals(start,active.windowStart());assertEquals(start.plusSeconds(600),active.windowEnd());
        assertFalse(IrrigationCalendar.evaluate(settings,start.plusSeconds(600)).allowed());
    }
    @Test void overnightBelongsToStartingDayAndRollsAcrossSundayToMonday() {
        var settings=schedule(window(List.of(7),"23:00","01:00"));
        var active=IrrigationCalendar.evaluate(settings,Instant.parse("2026-10-11T17:30:00Z")); // Monday00:30
        assertTrue(active.allowed());assertEquals(Instant.parse("2026-10-11T16:00:00Z"),active.windowStart());
        assertFalse(IrrigationCalendar.evaluate(settings,Instant.parse("2026-10-11T18:00:00Z")).allowed());
    }
    @Test void nextWindowSkipsDaysAndWrapsNextWeek() {
        var settings=schedule(window(List.of(1),"06:00","06:10"));
        var next=IrrigationCalendar.evaluate(settings,Instant.parse("2026-10-12T00:00:00Z"));
        assertFalse(next.allowed());assertEquals(Instant.parse("2026-10-18T23:00:00Z"),next.windowStart());
    }
    @Test void overlapIncludesOvernightFollowingDayButAdjacentWindowsAreAllowed() {
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->schedule(window(List.of(7),"23:00","01:00"),window(List.of(1),"00:30","02:00")));
        var settings=schedule(window(List.of(1),"06:00","06:10"),window(List.of(1),"06:10","06:20"));
        assertTrue(IrrigationCalendar.evaluate(settings,Instant.parse("2026-10-11T23:10:00Z")).allowed());
    }
    @Test void rejectsMalformedTimesDaysEmptyWindowsAndUnsupportedZones() {
        for(var value:List.of(window(List.of(1),"24:00","06:00"),window(List.of(1),"6:00","07:00"),window(List.of(1),"06:00","06:00"),window(List.of(0),"06:00","07:00"),window(List.of(1,1),"06:00","07:00")))
            assertThrows(org.springframework.web.server.ResponseStatusException.class,()->schedule(value));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->schedule());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->IrrigationCalendar.normalize(new IrrigationCalendar.Settings("TIME_WINDOWS","UTC",1,List.of(window(List.of(1),"06:00","07:00")))));
    }
    @Test void anyTimeIsExplicitAndHasNoInventedWindowBounds() {
        var settings=IrrigationCalendar.normalize(new IrrigationCalendar.Settings("ANY_TIME",IrrigationCalendar.ZONE,1,List.of()));
        var evaluated=IrrigationCalendar.evaluate(settings,Instant.parse("2026-10-14T00:00:00Z"));
        assertTrue(evaluated.allowed());assertNull(evaluated.windowStart());assertNull(evaluated.windowEnd());
    }
}
