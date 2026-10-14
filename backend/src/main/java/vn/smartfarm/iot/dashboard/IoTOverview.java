package vn.smartfarm.iot.dashboard;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.smartfarm.iot.alerts.SensorAlerts;
import vn.smartfarm.iot.automation.WateringRule;
import vn.smartfarm.iot.events.EventLog;
import vn.smartfarm.iot.monitoring.DeviceMonitoring;
import vn.smartfarm.iot.registry.SensorRegistry;

/** Read-only composition; do not dispatch commands or expire their states here. */
@Service
public class IoTOverview {
    public record Snapshot(DeviceMonitoring.Overview monitoring,List<SensorRegistry.Area> areas,
        int activeAlertCount,List<SensorAlerts.Alert> recentActiveAlerts,
        WateringRule.State rule,List<EventLog.Event> recentEvents) {}
    private final DeviceMonitoring monitoring;
    private final SensorRegistry registry;
    private final WateringRule rule;
    private final EventLog events;
    private final JdbcTemplate jdbc;
    public IoTOverview(DeviceMonitoring monitoring,SensorRegistry registry,WateringRule rule,EventLog events,JdbcTemplate jdbc) {
        this.monitoring=monitoring;this.registry=registry;this.rule=rule;this.events=events;this.jdbc=jdbc;
    }
    @org.springframework.transaction.annotation.Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Snapshot snapshot() {
        var devices=monitoring.overview();
        int active=jdbc.queryForObject("SELECT COUNT(*) FROM sensor_alert WHERE cleared_at IS NULL",Integer.class);
        var alerts=jdbc.query("SELECT * FROM sensor_alert WHERE cleared_at IS NULL ORDER BY opened_at DESC,id DESC LIMIT 5",(rs,n)->
            new SensorAlerts.Alert(rs.getLong("id"),rs.getString("device_id"),rs.getString("type"),rs.getTimestamp("opened_at").toInstant(),rs.getDouble("opened_value"),null,null));
        return new Snapshot(devices,registry.areas(),active,alerts,rule.state(),
            events.list(devices.asOf().minusSeconds(86400),devices.asOf(),null,null,8,null).items());
    }
}
