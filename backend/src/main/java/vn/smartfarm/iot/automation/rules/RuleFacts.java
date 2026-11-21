package vn.smartfarm.iot.automation.rules;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Stored device evidence for rule evaluation. Live mode requires a fresh actuator status
 * (≤ 15 s); simulation mode replays the state-change history (the state in force at the instant).
 */
final class RuleFacts implements RuleEvaluator.Facts {
    private static final Map<String, String> TELEMETRY = Map.of("AIR_TEMPERATURE", "temperature", "AIR_HUMIDITY", "humidity", "SOIL_MOISTURE", "soil_moisture");
    private final JdbcTemplate jdbc;
    private final boolean live;

    RuleFacts(JdbcTemplate jdbc, boolean live) { this.jdbc = jdbc; this.live = live; }

    @Override public List<RuleEvaluator.Sample> samples(String nodeId, String channelId, Instant from, Instant at) {
        var meta = jdbc.queryForList("SELECT c.metric,n.node_type FROM iot_channel c JOIN iot_node n ON n.node_id=c.node_id WHERE c.node_id=? AND c.channel_id=?", nodeId, channelId);
        if (meta.isEmpty()) return List.of();
        String metric = (String) meta.getFirst().get("metric"), type = (String) meta.getFirst().get("node_type");
        Timestamp f = Timestamp.from(from), a = Timestamp.from(at);
        List<RuleEvaluator.Sample> result = new ArrayList<>();
        if (type.equals("ENVIRONMENT")) {
            String column = TELEMETRY.get(metric);
            if (column == null) return List.of();
            String select = "SELECT observed_at,received_at," + column + " AS v FROM telemetry WHERE device_id=? ";
            jdbc.query("(" + select + "AND received_at<? ORDER BY received_at DESC LIMIT 1) UNION ALL (" + select + "AND received_at>=? AND received_at<=?) ORDER BY received_at",
                rs -> { result.add(new RuleEvaluator.Sample(rs.getTimestamp(1).toInstant(), rs.getTimestamp(2).toInstant(), rs.getObject(3) == null ? null : rs.getDouble(3))); },
                nodeId, f, nodeId, f, a);
        } else {
            String select = """
                SELECT s.observed_at,s.received_at,c.quality,c.number_value,c.boolean_value FROM channel_sample c JOIN node_sample s ON s.id=c.sample_id
                WHERE c.node_id=? AND c.channel_id=?\s""";
            jdbc.query("(" + select + "AND s.received_at<? ORDER BY s.received_at DESC LIMIT 1) UNION ALL (" + select + "AND s.received_at>=? AND s.received_at<=?) ORDER BY 2",
                rs -> {
                    Double value = !"VALID".equals(rs.getString(3)) ? null
                        : rs.getObject(5) != null ? (rs.getBoolean(5) ? 1.0 : 0.0) : rs.getObject(4) == null ? null : rs.getDouble(4);
                    result.add(new RuleEvaluator.Sample(rs.getTimestamp(1).toInstant(), rs.getTimestamp(2).toInstant(), value));
                }, nodeId, channelId, f, nodeId, channelId, f, a);
        }
        return result;
    }

    @Override public String actuatorState(String actuatorId, Instant at) {
        boolean pump = actuatorId.equals("PUMP01");
        if (live) {
            String sql = pump ? "SELECT reported_state FROM pump_status WHERE singleton=1 AND observed_at>?::timestamptz-INTERVAL '15 seconds' AND received_at>?::timestamptz-INTERVAL '15 seconds'"
                : "SELECT reported_state FROM actuator_status WHERE actuator_id=? AND observed_at>?::timestamptz-INTERVAL '15 seconds' AND received_at>?::timestamptz-INTERVAL '15 seconds'";
            Object[] args = pump ? new Object[]{Timestamp.from(at), Timestamp.from(at)} : new Object[]{actuatorId, Timestamp.from(at), Timestamp.from(at)};
            return jdbc.query(sql, (rs, n) -> rs.getString(1), args).stream().findFirst().orElse(null);
        }
        String sql = pump ? "SELECT reported_state FROM pump_state_history WHERE observed_at<=? ORDER BY observed_at DESC,id DESC LIMIT 1"
            : "SELECT reported_state FROM actuator_state_history WHERE actuator_id=? AND observed_at<=? ORDER BY observed_at DESC,id DESC LIMIT 1";
        Object[] args = pump ? new Object[]{Timestamp.from(at)} : new Object[]{actuatorId, Timestamp.from(at)};
        return jdbc.query(sql, (rs, n) -> rs.getString(1), args).stream().findFirst().orElse(null);
    }
}
