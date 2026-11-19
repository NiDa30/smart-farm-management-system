package vn.smartfarm.iot.health;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only data-quality statistics per node from stored samples: completeness against the
 * 5 s cadence, gaps, reboots and implausible jumps. Battery and RSSI are not in the v1/v2
 * contracts, so they are not reported rather than invented.
 */
@Service
public class DeviceStatistics {
    public record Device(String deviceId, String nodeType, long samples, long expectedSamples, double completeness,
        long gaps, double maxGapSeconds, long reboots, Long spikes, Long latestUptimeMs) {}
    public record Report(Instant from, Instant to, int hours, int cadenceSeconds, int gapSeconds,
        double spikeTemperature, double spikeSoilMoisture, List<Device> devices) {}
    static final int CADENCE_SECONDS = 5, GAP_SECONDS = 15;
    static final double SPIKE_TEMPERATURE = 5, SPIKE_SOIL = 20;
    private record Row(long samples, long boots, long gaps, double maxGap, Long spikes, Long uptime) {}
    private final JdbcTemplate jdbc;
    public DeviceStatistics(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Report report(Instant now, int hours) {
        Instant from = now.minus(Duration.ofHours(hours));
        Timestamp start = Timestamp.from(from), end = Timestamp.from(now);
        Map<String, Row> rows = new HashMap<>();
        jdbc.query("""
            WITH s AS (
              SELECT device_id,id,boot_id,observed_at,uptime_ms,temperature,soil_moisture,
                LAG(observed_at) OVER w AS prev_at,LAG(temperature) OVER w AS prev_t,
                LAG(soil_moisture) OVER w AS prev_soil,LAG(boot_id) OVER w AS prev_boot
              FROM telemetry WHERE observed_at>=? AND observed_at<=?
              WINDOW w AS (PARTITION BY device_id ORDER BY observed_at,id)
            )
            SELECT device_id,COUNT(*) AS samples,COUNT(DISTINCT boot_id) AS boots,
              COUNT(*) FILTER (WHERE observed_at-prev_at>make_interval(secs=>?)) AS gaps,
              COALESCE(MAX(EXTRACT(EPOCH FROM observed_at-prev_at)),0) AS max_gap,
              COUNT(*) FILTER (WHERE prev_boot=boot_id AND observed_at-prev_at<=make_interval(secs=>?)
                AND (ABS(temperature-prev_t)>? OR ABS(soil_moisture-prev_soil)>?)) AS spikes,
              (ARRAY_AGG(uptime_ms ORDER BY observed_at DESC,id DESC))[1] AS uptime
            FROM s GROUP BY device_id
            """, rs -> {
                rows.put(rs.getString("device_id"), new Row(rs.getLong("samples"), rs.getLong("boots"), rs.getLong("gaps"),
                    rs.getDouble("max_gap"), rs.getLong("spikes"), rs.getLong("uptime")));
            }, start, end, GAP_SECONDS, GAP_SECONDS, SPIKE_TEMPERATURE, SPIKE_SOIL);
        jdbc.query("""
            WITH s AS (
              SELECT node_id,boot_id,observed_at,uptime_ms,id,
                LAG(observed_at) OVER (PARTITION BY node_id ORDER BY observed_at,id) AS prev_at
              FROM node_sample WHERE observed_at>=? AND observed_at<=?
            )
            SELECT node_id,COUNT(*) AS samples,COUNT(DISTINCT boot_id) AS boots,
              COUNT(*) FILTER (WHERE observed_at-prev_at>make_interval(secs=>?)) AS gaps,
              COALESCE(MAX(EXTRACT(EPOCH FROM observed_at-prev_at)),0) AS max_gap,
              (ARRAY_AGG(uptime_ms ORDER BY observed_at DESC,id DESC))[1] AS uptime
            FROM s GROUP BY node_id
            """, rs -> {
                rows.put(rs.getString("node_id"), new Row(rs.getLong("samples"), rs.getLong("boots"), rs.getLong("gaps"),
                    rs.getDouble("max_gap"), null, rs.getLong("uptime")));
            }, start, end, GAP_SECONDS);
        long expected = hours * 3600L / CADENCE_SECONDS;
        List<Device> devices = new ArrayList<>();
        jdbc.query("SELECT node_id,node_type FROM iot_node ORDER BY node_id", rs -> {
            String id = rs.getString("node_id"), type = rs.getString("node_type");
            Row row = rows.get(id);
            if (row == null) {
                devices.add(new Device(id, type, 0, expected, 0, 0, 0, 0, type.equals("ENVIRONMENT") ? 0L : null, null));
                return;
            }
            double completeness = Math.min(1.0, (double) row.samples() / expected);
            devices.add(new Device(id, type, row.samples(), expected, completeness, row.gaps(), row.maxGap(),
                Math.max(0, row.boots() - 1), row.spikes(), row.uptime()));
        });
        return new Report(from, now, hours, CADENCE_SECONDS, GAP_SECONDS, SPIKE_TEMPERATURE, SPIKE_SOIL, List.copyOf(devices));
    }
}
