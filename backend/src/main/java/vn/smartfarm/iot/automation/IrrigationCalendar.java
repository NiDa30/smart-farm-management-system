package vn.smartfarm.iot.automation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Weekly permission windows for the existing moisture rule, not a second ON dispatcher. */
@Service
public class IrrigationCalendar {
    public static final String ZONE = "Asia/Ho_Chi_Minh";
    public record Window(List<Integer> days, String startTime, String endTime) {}
    public record Settings(String mode, String zone, long revision, List<Window> windows) {}
    public record Evaluation(boolean allowed, Instant windowStart, Instant windowEnd) {}
    public record View(Settings settings, Instant asOf, boolean withinWindow, Instant windowStart, Instant windowEnd) {}
    private record Range(int start, int end) {}
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public IrrigationCalendar(JdbcTemplate jdbc, ObjectMapper mapper) { this.jdbc=jdbc;this.mapper=mapper; }

    public Settings settings() {
        return jdbc.query("SELECT * FROM watering_calendar WHERE singleton=1",(rs,n)->{
            try {
                return normalize(new Settings(rs.getString("mode"),rs.getString("zone"),rs.getLong("revision"),
                    mapper.readValue(rs.getString("windows"),new TypeReference<List<Window>>() {})));
            } catch(com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException("Invalid stored calendar",error); }
        }).getFirst();
    }
    public View view() {
        return view(settings());
    }
    public static View view(Settings settings) {
        Instant now=Instant.now();var evaluated=evaluate(settings,now);
        return new View(settings,now,evaluated.allowed(),evaluated.windowStart(),evaluated.windowEnd());
    }
    // Called only under WateringRule's shared monitor; SQL guards also reject stale revisions/state.
    public Settings save(Settings input) {
        Settings normalized=normalize(input);
        try {
            int changed=jdbc.update("""
                UPDATE watering_calendar SET mode=?,zone=?,windows=CAST(? AS jsonb),revision=revision+1
                WHERE singleton=1 AND revision=? AND EXISTS (
                  SELECT 1 FROM watering_rule WHERE singleton=1 AND enabled=false AND active_command IS NULL)
                """,normalized.mode(),normalized.zone(),mapper.writeValueAsString(normalized.windows()),normalized.revision());
            if(changed!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"Disable rule and resolve active run; reload current calendar");
            return settings();
        } catch(com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException("Calendar serialization failed",error); }
    }
    public static Settings normalize(Settings input) {
        if(input==null || !Set.of("ANY_TIME","TIME_WINDOWS").contains(input.mode()==null?"":input.mode()) || !ZONE.equals(input.zone())
            || input.revision()<1 || input.windows()==null || input.windows().size()>8
            || input.mode().equals("TIME_WINDOWS") && input.windows().isEmpty())throw bad();
        List<Window> windows=new ArrayList<>();List<Range> ranges=new ArrayList<>();
        for(var window:input.windows()) {
            if(window==null || window.days()==null || window.days().isEmpty() || window.days().size()>7
                || window.days().stream().anyMatch(d->d==null || d<1 || d>7) || new HashSet<>(window.days()).size()!=window.days().size()
                || !validTime(window.startTime()) || !validTime(window.endTime()) || window.startTime().equals(window.endTime()))throw bad();
            var days=window.days().stream().sorted().toList();
            int start=minute(window.startTime()),end=minute(window.endTime());
            windows.add(new Window(days,window.startTime(),window.endTime()));
            for(int day:days) {
                int a=(day-1)*1440+start,b=(day-1)*1440+end+(end<start?1440:0);
                ranges.add(new Range(a,Math.min(b,10080)));
                if(b>10080)ranges.add(new Range(0,b-10080));
            }
        }
        ranges.sort(Comparator.comparingInt(Range::start));
        for(int i=1;i<ranges.size();i++)if(ranges.get(i).start()<ranges.get(i-1).end())throw bad();
        return new Settings(input.mode(),ZONE,input.revision(),List.copyOf(windows));
    }
    private static boolean validTime(String value) { return value!=null && value.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]"); }
    private static int minute(String value) { LocalTime time=LocalTime.parse(value);return time.getHour()*60+time.getMinute(); }
    private static ResponseStatusException bad() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use up to8 non-overlapping weekly windows, days1..7, distinct HH:mm times and Vietnam timezone"); }

    public static Evaluation evaluate(Settings settings,Instant now) {
        if(settings.mode().equals("ANY_TIME"))return new Evaluation(true,null,null);
        if(!settings.mode().equals("TIME_WINDOWS"))throw new IllegalStateException("Unknown calendar mode");
        ZoneId zone=ZoneId.of(ZONE);LocalDate today=now.atZone(zone).toLocalDate();
        Instant nextStart=null,nextEnd=null;
        // Yesterday is needed for overnight windows; +7 finds the next weekly occurrence.
        for(int offset=-1;offset<=7;offset++) {
            LocalDate date=today.plusDays(offset);
            for(var window:settings.windows()) {
                if(!window.days().contains(date.getDayOfWeek().getValue()))continue;
                LocalTime from=LocalTime.parse(window.startTime()),to=LocalTime.parse(window.endTime());
                Instant start=ZonedDateTime.of(date,from,zone).toInstant();
                Instant end=ZonedDateTime.of(to.isAfter(from)?date:date.plusDays(1),to,zone).toInstant();
                if(!now.isBefore(start) && now.isBefore(end))return new Evaluation(true,start,end);
                if(start.isAfter(now) && (nextStart==null || start.isBefore(nextStart))) { nextStart=start;nextEnd=end; }
            }
        }
        return new Evaluation(false,nextStart,nextEnd);
    }
}
