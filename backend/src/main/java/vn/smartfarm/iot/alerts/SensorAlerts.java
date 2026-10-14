package vn.smartfarm.iot.alerts;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.Objects;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.smartfarm.iot.telemetry.Telemetry;

@Service
public class SensorAlerts {
    public record Alert(long id,String deviceId,String type,Instant openedAt,double openedValue,
                        Instant clearedAt,Double clearedValue,Instant acknowledgedAt,String acknowledgementNote) {}
    private final JdbcTemplate jdbc;
    public SensorAlerts(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public static Alert mapAlert(ResultSet rs) throws SQLException {
        Timestamp cleared=rs.getTimestamp("cleared_at"),acknowledged=rs.getTimestamp("acknowledged_at");
        return new Alert(rs.getLong("id"),rs.getString("device_id"),rs.getString("type"),rs.getTimestamp("opened_at").toInstant(),
            rs.getDouble("opened_value"),cleared==null?null:cleared.toInstant(),rs.getObject("cleared_value",Double.class),
            acknowledged==null?null:acknowledged.toInstant(),rs.getString("acknowledgement_note"));
    }
    public List<Alert> list() {
        return jdbc.query("SELECT * FROM sensor_alert ORDER BY (cleared_at IS NULL) DESC,(acknowledged_at IS NULL) DESC,opened_at DESC,id DESC LIMIT 100",(rs,n)->mapAlert(rs));
    }
    public Alert find(long id) {
        if(id<1)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Positive alert ID required");
        return jdbc.query("SELECT * FROM sensor_alert WHERE id=?",(rs,n)->mapAlert(rs),id).stream().findFirst()
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Alert not found"));
    }
    @Transactional
    public Alert acknowledge(long id,String note) {
        if(id<1)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Positive alert ID required");
        if(note!=null && note.length()>500)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Note must be <=500 characters");
        String trimmed=note==null?null:note.strip();
        String normalized=trimmed==null || trimmed.isEmpty()?null:trimmed;
        Alert alert=jdbc.query("SELECT * FROM sensor_alert WHERE id=? FOR UPDATE",(rs,n)->mapAlert(rs),id).stream().findFirst()
            .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Alert not found"));
        if(alert.acknowledgedAt()!=null) {
            if(!Objects.equals(normalized,alert.acknowledgementNote()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Acknowledged already; reload stored note");
            return alert; // Exact retries preserve the first note/time, even after telemetry clears the alert.
        }
        if(alert.clearedAt()!=null)throw new ResponseStatusException(HttpStatus.CONFLICT,"Alert has returned to normal");
        jdbc.update("UPDATE sensor_alert SET acknowledged_at=CURRENT_TIMESTAMP,acknowledgement_note=? WHERE id=?",normalized,id);
        return find(id);
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
