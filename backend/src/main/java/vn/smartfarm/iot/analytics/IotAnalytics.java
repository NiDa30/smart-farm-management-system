package vn.smartfarm.iot.analytics;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.automation.IrrigationCalendar;
import vn.smartfarm.iot.realtime.RealtimeNotifier;

/**
 * Energy (estimated) and IoT/automation analytics from stored device evidence.
 * Energy = device-confirmed ON time x operator-declared rated power; there is no meter.
 */
@Service
public class IotAnalytics {
    public record DayValue(LocalDate day, long seconds, Double kilowattHours) {}
    public record ActuatorEnergy(String actuatorId, String actuatorType, Integer ratedWatts, long seconds, Double kilowattHours, List<DayValue> days) {}
    public record Energy(int days, Instant from, Instant to, String method, List<ActuatorEnergy> actuators, Double totalKilowattHours, List<String> unrated) {}
    public record Commands(int total, int executed, int failed, int timedOut, int uncertain, Map<String, Integer> errors) {}
    public record Analytics(int days, Instant from, Instant to, Commands pump, Commands actuators, int wateringRuns, int sequencesCompleted,
        int sequencesAborted, Map<String, Integer> alertsOpened, List<ActuatorEnergy> runtime) {}
    public record PowerRequest(Integer ratedWatts) {}

    private final JdbcTemplate jdbc;
    private final RealtimeNotifier realtime;
    private final ZoneId zone = ZoneId.of(IrrigationCalendar.ZONE);

    public IotAnalytics(JdbcTemplate jdbc, RealtimeNotifier realtime) { this.jdbc = jdbc; this.realtime = realtime; }

    static int checkDays(Integer days) {
        int value = days == null ? 7 : days;
        if (value < 1 || value > 31) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "days 1..31");
        return value;
    }

    private Instant from(int days, Instant now) {
        return now.atZone(zone).toLocalDate().minusDays(days - 1L).atStartOfDay(zone).toInstant();
    }

    public Energy energy(Integer requestedDays) {
        int days = checkDays(requestedDays);
        Instant now = Instant.now(), from = from(days, now);
        List<ActuatorEnergy> actuators = runtime(from, now);
        Double total = actuators.stream().anyMatch(a -> a.kilowattHours() != null)
            ? Math.round(actuators.stream().filter(a -> a.kilowattHours() != null).mapToDouble(ActuatorEnergy::kilowattHours).sum() * 1000.0) / 1000.0 : null;
        List<String> unrated = actuators.stream().filter(a -> a.ratedWatts() == null).map(ActuatorEnergy::actuatorId).toList();
        return new Energy(days, from, now, "ESTIMATED_FROM_RUNTIME", actuators, total, unrated);
    }

    private List<ActuatorEnergy> runtime(Instant from, Instant to) {
        List<ActuatorEnergy> result = new ArrayList<>();
        for (Map<String, Object> binding : jdbc.queryForList(
            "SELECT actuator_id,actuator_type,rated_watts FROM iot_actuator_binding ORDER BY actuator_type<>'PUMP',actuator_id")) {
            String id = (String) binding.get("actuator_id");
            Integer watts = (Integer) binding.get("rated_watts");
            boolean pump = id.equals("PUMP01");
            String history = pump
                ? "SELECT observed_at,boot_id,reported_state FROM pump_state_history WHERE observed_at>=COALESCE((SELECT MAX(observed_at) FROM pump_state_history WHERE observed_at<?),?) AND observed_at<=? ORDER BY observed_at,id"
                : "SELECT observed_at,boot_id,reported_state FROM actuator_state_history WHERE actuator_id=? AND observed_at>=COALESCE((SELECT MAX(observed_at) FROM actuator_state_history WHERE actuator_id=? AND observed_at<?),?) AND observed_at<=? ORDER BY observed_at,id";
            Object[] args = pump ? new Object[]{Timestamp.from(from), Timestamp.from(from), Timestamp.from(to)}
                : new Object[]{id, id, Timestamp.from(from), Timestamp.from(from), Timestamp.from(to)};
            List<Runtime.Change> changes = jdbc.query(history, (rs, n) -> new Runtime.Change(rs.getTimestamp(1).toInstant(),
                rs.getObject(2, UUID.class), rs.getString(3).equals("ON")), args);
            Timestamp heard = pump ? jdbc.query("SELECT observed_at FROM pump_status WHERE singleton=1", (rs, n) -> rs.getTimestamp(1)).stream().findFirst().orElse(null)
                : jdbc.query("SELECT observed_at FROM actuator_status WHERE actuator_id=?", (rs, n) -> rs.getTimestamp(1), id).stream().findFirst().orElse(null);
            var intervals = Runtime.intervals(changes, heard == null ? null : heard.toInstant(), from, to);
            long seconds = Runtime.total(intervals);
            List<DayValue> daily = new ArrayList<>();
            Runtime.perDay(intervals, zone).forEach((day, s) -> daily.add(new DayValue(day, s, Runtime.kilowattHours(s, watts))));
            result.add(new ActuatorEnergy(id, (String) binding.get("actuator_type"), watts, seconds, Runtime.kilowattHours(seconds, watts), daily));
        }
        return result;
    }

    public ActuatorEnergy setPower(String actuatorId, PowerRequest request) {
        if (request == null || (request.ratedWatts() != null && (request.ratedWatts() < 1 || request.ratedWatts() > 20000)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ratedWatts 1..20000 or null");
        if (jdbc.update("UPDATE iot_actuator_binding SET rated_watts=? WHERE actuator_id=?", request.ratedWatts(), actuatorId) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown actuator");
        realtime.publish("actuators");
        return energy(1).actuators().stream().filter(a -> a.actuatorId().equals(actuatorId)).findFirst().orElseThrow();
    }

    private Commands commands(String table, Instant from) {
        Map<String, Integer> states = new LinkedHashMap<>();
        jdbc.query("SELECT state,COUNT(*) FROM " + table + " WHERE issued_at>=? GROUP BY state", rs -> { states.put(rs.getString(1), rs.getInt(2)); }, Timestamp.from(from));
        Map<String, Integer> errors = new LinkedHashMap<>();
        jdbc.query("SELECT error_code,COUNT(*) FROM " + table + " WHERE issued_at>=? AND error_code IS NOT NULL GROUP BY error_code ORDER BY 2 DESC,1 LIMIT 10",
            rs -> { errors.put(rs.getString(1), rs.getInt(2)); }, Timestamp.from(from));
        int total = states.values().stream().mapToInt(Integer::intValue).sum();
        return new Commands(total, states.getOrDefault("EXECUTED", 0), states.getOrDefault("FAILED", 0), states.getOrDefault("TIMED_OUT", 0),
            states.getOrDefault("PUBLISH_UNCERTAIN", 0), errors);
    }

    public Analytics analytics(Integer requestedDays) {
        int days = checkDays(requestedDays);
        Instant now = Instant.now(), from = from(days, now);
        Timestamp since = Timestamp.from(from);
        Map<String, Integer> alerts = new LinkedHashMap<>();
        alerts.put("SENSOR", jdbc.queryForObject("SELECT COUNT(*) FROM sensor_alert WHERE opened_at>=?", Integer.class, since));
        alerts.put("WATER", jdbc.queryForObject("SELECT COUNT(*) FROM water_alert a JOIN node_sample s ON s.id=a.opened_sample_id WHERE s.received_at>=?", Integer.class, since));
        alerts.put("DEVICE_HEALTH", jdbc.queryForObject("SELECT COUNT(*) FROM device_health_alert WHERE opened_at>=?", Integer.class, since));
        return new Analytics(days, from, now, commands("pump_command", from), commands("actuator_command", from),
            jdbc.queryForObject("SELECT COUNT(*) FROM watering_run WHERE started_at>=?", Integer.class, since),
            jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_sequence WHERE state='COMPLETED' AND created_at>=?", Integer.class, since),
            jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_sequence WHERE state='ABORTED' AND created_at>=?", Integer.class, since),
            alerts, runtime(from, now));
    }

}
