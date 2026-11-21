package vn.smartfarm.iot.automation.rules;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;

/** Simulation facts: each channel/actuator history is loaded once for the whole range. */
final class MemoryFacts implements RuleEvaluator.Facts {
    private final RuleFacts source;
    private final JdbcTemplate jdbc;
    private final Instant from, to;
    private final Map<String, List<RuleEvaluator.Sample>> samples = new HashMap<>();
    private final Map<String, List<Object[]>> states = new HashMap<>();

    MemoryFacts(JdbcTemplate jdbc, Instant from, Instant to) {
        this.jdbc = jdbc; this.source = new RuleFacts(jdbc, false); this.from = from.minusSeconds(3700); this.to = to;
    }

    @Override public List<RuleEvaluator.Sample> samples(String nodeId, String channelId, Instant windowFrom, Instant at) {
        List<RuleEvaluator.Sample> all = samples.computeIfAbsent(nodeId + "/" + channelId, k -> source.samples(nodeId, channelId, from, to));
        List<RuleEvaluator.Sample> result = new ArrayList<>();
        RuleEvaluator.Sample before = null;
        for (RuleEvaluator.Sample s : all) {
            if (s.receivedAt().isBefore(windowFrom)) before = s;
            else if (!s.receivedAt().isAfter(at)) result.add(s);
            else break;
        }
        if (before != null) result.addFirst(before);
        return result;
    }

    @Override public String actuatorState(String actuatorId, Instant at) {
        List<Object[]> history = states.computeIfAbsent(actuatorId, id -> id.equals("PUMP01")
            ? jdbc.query("SELECT observed_at,reported_state FROM pump_state_history WHERE observed_at<=? ORDER BY observed_at,id",
                (rs, n) -> new Object[]{rs.getTimestamp(1).toInstant(), rs.getString(2)}, java.sql.Timestamp.from(to))
            : jdbc.query("SELECT observed_at,reported_state FROM actuator_state_history WHERE actuator_id=? AND observed_at<=? ORDER BY observed_at,id",
                (rs, n) -> new Object[]{rs.getTimestamp(1).toInstant(), rs.getString(2)}, id, java.sql.Timestamp.from(to)));
        String state = null;
        for (Object[] row : history) { if (((Instant) row[0]).isAfter(at)) break; state = (String) row[1]; }
        return state;
    }
}
