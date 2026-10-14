package vn.smartfarm.iot.monitoring;

import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.smartfarm.iot.registry.SensorRegistry;

@Service
public class DeviceMonitoring {
    public record Device(String deviceId,String name,String kind,String areaId,String areaName,
        Instant observedAt,Instant receivedAt,Instant lastMessageAt,String dataState,String activity,
        Double temperature,Double humidity,Double soilMoisture,String reportedState,
        Boolean safetyLockout,int activeAlerts) {}
    public record Overview(Instant asOf,MqttHealth.Snapshot mqtt,List<Device> devices) {}
    private final SensorRegistry registry;
    private final JdbcTemplate jdbc;
    private final MqttHealth mqtt;
    public DeviceMonitoring(SensorRegistry registry,JdbcTemplate jdbc,MqttHealth mqtt) {this.registry=registry;this.jdbc=jdbc;this.mqtt=mqtt;}
    public Overview overview() {
        Instant now=Instant.now();
        Map<String,String> areas=new HashMap<>();for(var area:registry.areas())areas.put(area.id(),area.name());
        Map<String,Integer> counts=new HashMap<>();
        jdbc.query("SELECT device_id,COUNT(*) AS total FROM sensor_alert WHERE cleared_at IS NULL GROUP BY device_id",rs->{counts.put(rs.getString("device_id"),rs.getInt("total"));});
        Map<String,Instant> lastMessages=new HashMap<>();
        jdbc.query("SELECT device_id,MAX(received_at) AS last_message_at FROM telemetry GROUP BY device_id",rs->{lastMessages.put(rs.getString("device_id"),rs.getTimestamp("last_message_at").toInstant());});
        List<Device> devices=new ArrayList<>();
        for(var sensor:registry.summaries()) {
            var reading=sensor.latest();var value=reading==null?null:reading.telemetry();
            Instant observed=value==null?null:value.timestamp(),received=reading==null?null:reading.receivedAt();
            devices.add(new Device(sensor.deviceId(),sensor.name(),"SENSOR",sensor.areaId(),areas.get(sensor.areaId()),observed,received,lastMessages.get(sensor.deviceId()),
                dataState(observed,received,now,30),activity(lastMessages.get(sensor.deviceId()),now),value==null?null:value.temperature(),value==null?null:value.humidity(),value==null?null:value.soilMoisture(),null,null,counts.getOrDefault(sensor.deviceId(),0)));
        }
        var actuators=jdbc.query("SELECT * FROM pump_status WHERE singleton=1",(rs,n)->{
            Instant observed=rs.getTimestamp("observed_at").toInstant(),received=rs.getTimestamp("received_at").toInstant();
            return new Device("PUMP01","Relay Wokwi GPIO26","ACTUATOR",null,null,observed,received,received,
                dataState(observed,received,now,15),activity(received,now),null,null,null,rs.getString("reported_state"),rs.getBoolean("safety_lockout"),0);
        });
        devices.add(actuators.isEmpty()?new Device("PUMP01","Relay Wokwi GPIO26","ACTUATOR",null,null,null,null,null,"EMPTY","NEVER_SEEN",null,null,null,null,null,0):actuators.getFirst());
        return new Overview(now,mqtt.snapshot(),List.copyOf(devices));
    }
    static String dataState(Instant observed,Instant received,Instant now,int seconds) {
        if(observed==null || received==null)return "EMPTY";
        if(observed.isAfter(now.plusSeconds(2)) || received.isAfter(now.plusSeconds(2)))return "CLOCK_SKEW";
        return observed.isAfter(now.minusSeconds(seconds)) && received.isAfter(now.minusSeconds(seconds))?"FRESH":"STALE";
    }
    static String activity(Instant received,Instant now) {
        if(received==null)return "NEVER_SEEN";
        if(received.isAfter(now.plusSeconds(2)))return "CLOCK_SKEW";
        return received.isAfter(now.minusSeconds(30))?"RECENT":"SILENT";
    }
}
