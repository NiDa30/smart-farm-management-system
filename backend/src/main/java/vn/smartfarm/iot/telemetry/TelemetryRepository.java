package vn.smartfarm.iot.telemetry;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class TelemetryRepository {
    public record Reading(long id, String farmId, Telemetry telemetry, Instant receivedAt) {}
    private final JdbcTemplate jdbc;
    public TelemetryRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final RowMapper<Reading> MAPPER = (rs, row) -> mapReading(rs);
    public static Reading mapReading(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Reading(
        rs.getLong("id"), rs.getString("farm_id"),
        new Telemetry(rs.getInt("schema_version"), rs.getString("device_id"),
            rs.getObject("boot_id", UUID.class), rs.getLong("sequence"),
            rs.getTimestamp("observed_at").toInstant(), rs.getDouble("temperature"),
            rs.getDouble("humidity"), rs.getDouble("soil_moisture"), rs.getLong("uptime_ms")),
        rs.getTimestamp("received_at").toInstant());
    }

    public boolean insert(Telemetry value) {
        return jdbc.update("""
            INSERT INTO telemetry (farm_id, device_id, schema_version, boot_id, sequence,
                observed_at, temperature, humidity, soil_moisture, uptime_ms)
            VALUES ('FARM001', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (device_id, boot_id, sequence) DO NOTHING
            """, value.deviceId(), value.schemaVersion(), value.bootId(), value.sequence(),
            Timestamp.from(value.timestamp()), value.temperature(), value.humidity(),
            value.soilMoisture(), value.uptimeMs()) == 1;
    }
    public Optional<Reading> latest(String device) {
        return jdbc.query("SELECT * FROM telemetry WHERE device_id = ? ORDER BY observed_at DESC, id DESC LIMIT 1",
            MAPPER, device).stream().findFirst();
    }
    public List<Reading> history(String device, Instant from, Instant to, int limit) {
        return jdbc.query("""
            SELECT * FROM telemetry WHERE device_id = ? AND observed_at >= ? AND observed_at < ?
            ORDER BY observed_at DESC, id DESC LIMIT ?
            """, MAPPER, device, Timestamp.from(from), Timestamp.from(to), limit);
    }
}
