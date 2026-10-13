package vn.smartfarm.iot.alerts;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.smartfarm.iot.telemetry.Telemetry;

@Service
public class SensorAlerts {
    public record Alert(long id,String deviceId,String type,Instant openedAt,double openedValue,
                        Instant clearedAt,Double clearedValue) {}
    private final JdbcTemplate jdbc;
    public SensorAlerts(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public List<Alert> list() {
        return jdbc.query("SELECT * FROM sensor_alert ORDER BY (cleared_at IS NULL) DESC,opened_at DESC,id DESC LIMIT 100",(rs,n) ->
            new Alert(rs.getLong("id"),rs.getString("device_id"),rs.getString("type"),rs.getTimestamp("opened_at").toInstant(),
                rs.getDouble("opened_value"),rs.getTimestamp("cleared_at")==null ? null : rs.getTimestamp("cleared_at").toInstant(),rs.getObject("cleared_value",Double.class)));
    }
    @Transactional
    public void observe(Telemetry sample) {
        Instant now=Instant.now();
        Instant observed=sample.timestamp().truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
        // Historical/future samples never open or clear a current alert.
        if (sample.timestamp().isBefore(now.minusSeconds(30)) || sample.timestamp().isAfter(now.plusSeconds(2))) return;
        jdbc.update("INSERT INTO sensor_alert_state(device_id) VALUES(?) ON CONFLICT DO NOTHING",sample.deviceId());
        jdbc.query("SELECT * FROM sensor_alert_state WHERE device_id=? FOR UPDATE",rs -> {
            Timestamp last=rs.getTimestamp("last_observed_at");
            if (last!=null && !observed.isAfter(last.toInstant())) return;
            boolean low=rs.getBoolean("low_soil"), high=rs.getBoolean("high_temperature");
            boolean nextLow=low ? sample.soilMoisture()<35 : sample.soilMoisture()<30;
            boolean nextHigh=high ? sample.temperature()>33 : sample.temperature()>35;
            transition(sample,"LOW_SOIL",low,nextLow,sample.soilMoisture());
            transition(sample,"HIGH_TEMPERATURE",high,nextHigh,sample.temperature());
            jdbc.update("UPDATE sensor_alert_state SET last_observed_at=?,low_soil=?,high_temperature=? WHERE device_id=?",
                Timestamp.from(observed),nextLow,nextHigh,sample.deviceId());
        },sample.deviceId());
    }
    private void transition(Telemetry sample,String type,boolean previous,boolean next,double value) {
        if (previous==next) return;
        if (next) jdbc.update("INSERT INTO sensor_alert(device_id,type,opened_at,opened_value) VALUES(?,?,?,?)",sample.deviceId(),type,Timestamp.from(sample.timestamp()),value);
        else jdbc.update("UPDATE sensor_alert SET cleared_at=?,cleared_value=? WHERE device_id=? AND type=? AND cleared_at IS NULL",Timestamp.from(sample.timestamp()),value,sample.deviceId(),type);
    }
}
