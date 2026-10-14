package vn.smartfarm.iot.nodes;

import com.fasterxml.jackson.databind.JsonNode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import vn.smartfarm.iot.registry.SensorRegistry;

@Service
public class NodeInventory {
    public record Reading(Object value,String quality,Instant observedAt,Instant receivedAt,UUID bootId,long sequence,String calibrationVersion,String dataSource) {}
    public record Channel(String channelId,String metric,String unit,String calibrationVersion,Reading latest) {}
    public record Actuator(String actuatorId,String actuatorType,String commandContract) {}
    public record Node(String nodeId,String name,String areaId,String nodeType,int telemetryVersion,List<Channel> channels,List<Actuator> actuators) {}
    public record Snapshot(String farmId,Instant asOf,List<Node> nodes) {}
    private final JdbcTemplate jdbc;
    private final SensorRegistry sensors;
    private final vn.smartfarm.iot.alerts.WaterAlerts waterAlerts;
    public NodeInventory(JdbcTemplate jdbc,SensorRegistry sensors,vn.smartfarm.iot.alerts.WaterAlerts waterAlerts) {this.jdbc=jdbc;this.sensors=sensors;this.waterAlerts=waterAlerts;}

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Snapshot snapshot() {
        Map<String,vn.smartfarm.iot.telemetry.TelemetryRepository.Reading> legacy=new HashMap<>();
        for(var item:sensors.summaries())if(item.latest()!=null)legacy.put(item.deviceId(),item.latest());
        Map<String,List<Channel>> channels=new HashMap<>();
        jdbc.query("""
            SELECT c.*,m.quality,m.number_value,m.boolean_value,m.calibration_version AS sample_calibration,
             s.observed_at,s.received_at,s.boot_id,s.sequence,s.data_source
            FROM iot_channel c LEFT JOIN LATERAL (
             SELECT m.*,s.id,s.observed_at,s.received_at,s.boot_id,s.sequence,s.data_source
             FROM channel_sample m JOIN node_sample s ON s.id=m.sample_id
             WHERE m.node_id=c.node_id AND m.channel_id=c.channel_id
             ORDER BY s.observed_at DESC,s.sequence DESC,s.id DESC LIMIT 1
            ) m ON true LEFT JOIN node_sample s ON s.id=m.sample_id
            ORDER BY c.node_id,c.channel_id
            """,rs->{
                String node=rs.getString("node_id"),metric=rs.getString("metric");Reading reading=null;
                if(rs.getTimestamp("observed_at")!=null) {
                    Object value=rs.getObject("boolean_value");if(value==null)value=rs.getObject("number_value");
                    reading=new Reading(value,rs.getString("quality"),rs.getTimestamp("observed_at").toInstant(),rs.getTimestamp("received_at").toInstant(),
                        rs.getObject("boot_id",UUID.class),rs.getLong("sequence"),rs.getString("sample_calibration"),rs.getString("data_source"));
                } else if(legacy.containsKey(node)) {
                    var item=legacy.get(node);var t=item.telemetry();
                    Object value=switch(metric){case "AIR_TEMPERATURE"->t.temperature();case "AIR_HUMIDITY"->t.humidity();case "SOIL_MOISTURE"->t.soilMoisture();default->null;};
                    if(value!=null)reading=new Reading(value,"VALID",t.timestamp(),item.receivedAt(),t.bootId(),t.sequence(),null,"UNSPECIFIED");
                }
                channels.computeIfAbsent(node,key->new ArrayList<>()).add(new Channel(rs.getString("channel_id"),metric,rs.getString("unit"),rs.getString("calibration_version"),reading));
            });
        Map<String,List<Actuator>> actuators=new HashMap<>();
        jdbc.query("SELECT * FROM iot_actuator_binding ORDER BY actuator_id",rs->{actuators.computeIfAbsent(rs.getString("node_id"),key->new ArrayList<>())
            .add(new Actuator(rs.getString("actuator_id"),rs.getString("actuator_type"),rs.getString("command_contract")));});
        var nodes=jdbc.query("SELECT * FROM iot_node ORDER BY area_id,node_id",(rs,n)->new Node(rs.getString("node_id"),rs.getString("name"),rs.getString("area_id"),
            rs.getString("node_type"),rs.getInt("telemetry_version"),channels.getOrDefault(rs.getString("node_id"),List.of()),actuators.getOrDefault(rs.getString("node_id"),List.of())));
        return new Snapshot("FARM001",Instant.now(),nodes);
    }

    @Transactional
    public String registerWater(JsonNode input) {return register(input,"WATER",WaterTelemetry.METRICS);}

    @Transactional
    public String registerSoil(JsonNode input) {return register(input,"SOIL",WaterTelemetry.SOIL_METRICS);}

    private String register(JsonNode input,String type,Map<String,WaterTelemetry.Metric> metrics) {
        WaterTelemetry.fields(input,Set.of("nodeId","name","areaId","channels"));
        String id=WaterTelemetry.code(WaterTelemetry.text(input,"nodeId")),area=WaterTelemetry.code(WaterTelemetry.text(input,"areaId"));
        String name=WaterTelemetry.text(input,"name").strip();
        if(name.isEmpty()||name.length()>80||!sensors.areaExists(area))throw new IllegalArgumentException("Name or area");
        JsonNode channels=input.path("channels");
        if(!channels.isArray()||channels.isEmpty()||channels.size()>8)throw new IllegalArgumentException("Channels required");
        if(Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM iot_actuator_binding WHERE actuator_id=?)",Boolean.class,id)))
            throw new org.springframework.dao.DuplicateKeyException("Actuator identity reserved");
        Set<String> ids=new HashSet<>();
        // Validate the whole declaration before any rows are inserted.
        for(JsonNode channel:channels) {
            WaterTelemetry.fields(channel,Set.of("channelId","metric","unit","calibrationVersion"));
            String channelId=WaterTelemetry.code(WaterTelemetry.text(channel,"channelId"));
            if(!ids.add(channelId))throw new IllegalArgumentException("Duplicate channel");
            var metric=metrics.get(WaterTelemetry.text(channel,"metric"));
            if(metric==null||!metric.unit().equals(WaterTelemetry.text(channel,"unit")))throw new IllegalArgumentException("Unsupported node metric/unit");
            if(!channel.get("calibrationVersion").isNull()) {
                String version=WaterTelemetry.text(channel,"calibrationVersion");
                if(version.isBlank()||version.length()>40)throw new IllegalArgumentException("Calibration version");
            }
        }
        jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES(?,?,?,?,2)",id,name,area,type);
        for(JsonNode channel:channels)jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit,calibration_version) VALUES(?,?,?,?,?)",id,
            channel.get("channelId").textValue(),channel.get("metric").textValue(),channel.get("unit").textValue(),channel.get("calibrationVersion").isNull()?null:channel.get("calibrationVersion").textValue());
        return id;
    }

    @Transactional
    public boolean storeWater(String topic,WaterTelemetry.Packet packet) {
        if(!"WATER".equals(typeOf(packet.deviceId())))throw new IllegalArgumentException("Not a water node");
        return storeChannels(topic,packet);
    }
    private String typeOf(String id) {
        return jdbc.query("SELECT node_type FROM iot_node WHERE node_id=? AND telemetry_version=2",(rs,n)->rs.getString(1),id)
            .stream().findFirst().orElseThrow(()->new IllegalArgumentException("Unknown v2 node"));
    }

    @Transactional
    public boolean storeChannels(String topic,WaterTelemetry.Packet packet) {
        String type=typeOf(packet.deviceId());
        if(!topic.equals("smartfarm/FARM001/"+packet.deviceId()+"/telemetry")||!Set.of("WATER","SOIL").contains(type))
            throw new IllegalArgumentException("Unknown channel node or topic mismatch");
        for(var reading:packet.readings()) {
            Integer count=jdbc.queryForObject("""
                SELECT COUNT(*) FROM iot_channel WHERE node_id=? AND channel_id=? AND metric=? AND unit=?
                 AND calibration_version IS NOT DISTINCT FROM ?
                """,Integer.class,packet.deviceId(),reading.channelId(),reading.metric(),reading.unit(),reading.calibrationVersion());
            if(count==null||count!=1)throw new IllegalArgumentException("Undeclared channel/metric/unit/calibration");
        }
        var rows=jdbc.query("""
            INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,uptime_ms,data_source) VALUES(?,?,?,?,?,?)
            ON CONFLICT(node_id,boot_id,sequence) DO NOTHING RETURNING id
            """,(rs,n)->rs.getLong("id"),packet.deviceId(),packet.bootId(),packet.sequence(),Timestamp.from(packet.timestamp()),packet.uptimeMs(),packet.dataSource());
        if(rows.isEmpty())return false;
        for(var reading:packet.readings())jdbc.update("""
            INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,number_value,boolean_value,calibration_version) VALUES(?,?,?,?,?,?,?)
            """,rows.getFirst(),packet.deviceId(),reading.channelId(),reading.quality(),reading.value() instanceof Number?reading.value():null,
                reading.value() instanceof Boolean?reading.value():null,reading.calibrationVersion());
        if(type.equals("WATER"))waterAlerts.observe(packet,rows.getFirst());
        return true;
    }
}
