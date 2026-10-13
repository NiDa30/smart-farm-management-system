package vn.smartfarm.iot.registry;

import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import vn.smartfarm.iot.telemetry.TelemetryRepository;

@Repository
public class SensorRegistry {
    public record Area(String id, String name) {}
    public record Sensor(String deviceId, String name, String areaId, String sensorType) {}
    public record Summary(String deviceId, String name, String areaId, String sensorType,
                          TelemetryRepository.Reading latest) {}
    private final JdbcTemplate jdbc;
    public SensorRegistry(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Area> areas() {
        return jdbc.query("SELECT id,name FROM sensor_area ORDER BY name,id",
            (rs, row) -> new Area(rs.getString("id"), rs.getString("name")));
    }
    public Optional<Sensor> find(String id) {
        return jdbc.query("SELECT * FROM sensor_device WHERE device_id=?", (rs, row) ->
            new Sensor(rs.getString("device_id"), rs.getString("name"), rs.getString("area_id"),
                rs.getString("sensor_type")), id).stream().findFirst();
    }
    public boolean areaExists(String id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM sensor_area WHERE id=?)", Boolean.class, id));
    }
    public void addArea(String id, String name) {
        jdbc.update("INSERT INTO sensor_area(id,name) VALUES (?,?)", id, name);
    }
    public void addSensor(String id, String name, String areaId) {
        jdbc.update("INSERT INTO sensor_device(device_id,name,area_id) VALUES (?,?,?)", id, name, areaId);
    }
    public List<Summary> summaries() {
        // One query for every sensor's latest sample, including sensors without telemetry.
        return jdbc.query("""
            SELECT s.device_id AS registry_id, s.name, s.area_id, s.sensor_type, t.*
            FROM sensor_device s LEFT JOIN LATERAL (
                SELECT * FROM telemetry WHERE device_id=s.device_id
                ORDER BY observed_at DESC,id DESC LIMIT 1
            ) t ON true ORDER BY s.area_id,s.device_id
            """, (rs, row) -> new Summary(rs.getString("registry_id"), rs.getString("name"),
                rs.getString("area_id"), rs.getString("sensor_type"),
                rs.getObject("id") == null ? null : TelemetryRepository.mapReading(rs)));
    }
}
