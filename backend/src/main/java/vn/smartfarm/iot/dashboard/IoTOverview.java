package vn.smartfarm.iot.dashboard;

import java.util.List;
import java.time.Instant;
import vn.smartfarm.iot.nodes.NodeInventory;
import vn.smartfarm.iot.zones.IrrigationZones;
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
    public record ChannelAlert(long id,String family,String nodeId,String type,String channelId,String dataSource,Instant openedAt,Instant acknowledgedAt) {}
    public record Agriculture(NodeInventory.Snapshot inventory,IrrigationZones.Snapshot zones,
        int waterActiveCount,int soilActiveCount,List<ChannelAlert> recentChannelAlerts) {}
    public record Snapshot(DeviceMonitoring.Overview monitoring,List<SensorRegistry.Area> areas,
        int activeAlertCount,List<SensorAlerts.Alert> recentActiveAlerts,
        WateringRule.State rule,List<EventLog.Event> recentEvents,Agriculture agriculture) {}
    private final DeviceMonitoring monitoring;
    private final SensorRegistry registry;
    private final WateringRule rule;
    private final EventLog events;
    private final JdbcTemplate jdbc;
    private final NodeInventory nodes;private final IrrigationZones zones;
    public IoTOverview(DeviceMonitoring monitoring,SensorRegistry registry,WateringRule rule,EventLog events,JdbcTemplate jdbc,NodeInventory nodes,IrrigationZones zones) {
        this.monitoring=monitoring;this.registry=registry;this.rule=rule;this.events=events;this.jdbc=jdbc;this.nodes=nodes;this.zones=zones;
    }
    @org.springframework.transaction.annotation.Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Snapshot snapshot() {
        var devices=monitoring.overview();
        int active=jdbc.queryForObject("SELECT COUNT(*) FROM sensor_alert WHERE cleared_at IS NULL",Integer.class);
        var alerts=jdbc.query("SELECT * FROM sensor_alert WHERE cleared_at IS NULL ORDER BY opened_at DESC,id DESC LIMIT 5",(rs,n)->
            SensorAlerts.mapAlert(rs));
        var inventory=nodes.snapshot();
        // Count all open episodes, including acknowledged ones, independently of the preview limit.
        int water=jdbc.queryForObject("SELECT COUNT(*) FROM water_alert WHERE cleared_sample_id IS NULL",Integer.class);
        int soil=jdbc.queryForObject("SELECT COUNT(*) FROM soil_alert WHERE cleared_sample_id IS NULL",Integer.class);
        var channelAlerts=jdbc.query("""
            SELECT a.*,s.observed_at FROM (
              SELECT id,'WATER' AS family,node_id,type,channel_key,data_source,opened_sample_id,acknowledged_at
              FROM water_alert WHERE cleared_sample_id IS NULL
              UNION ALL
              SELECT id,'SOIL' AS family,node_id,type,channel_key,data_source,opened_sample_id,acknowledged_at
              FROM soil_alert WHERE cleared_sample_id IS NULL
            ) a JOIN node_sample s ON s.id=a.opened_sample_id
            ORDER BY s.observed_at DESC,a.family,a.id DESC LIMIT 5
            """,(rs,n)->new ChannelAlert(rs.getLong("id"),rs.getString("family"),rs.getString("node_id"),rs.getString("type"),
                rs.getString("channel_key").isEmpty()?null:rs.getString("channel_key"),rs.getString("data_source"),rs.getTimestamp("observed_at").toInstant(),
                rs.getTimestamp("acknowledged_at")==null?null:rs.getTimestamp("acknowledged_at").toInstant()));
        return new Snapshot(devices,registry.areas(),active,alerts,rule.state(),
            events.list(devices.asOf().minusSeconds(86400),devices.asOf(),null,null,8,null).items(),new Agriculture(inventory,zones.survey(inventory,inventory.asOf()),water,soil,channelAlerts));
    }
}
