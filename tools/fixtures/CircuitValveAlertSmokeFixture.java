import com.fasterxml.jackson.databind.*;import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.*;import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;
/** Native packets through the actual receiver, only in an isolated local schema. Never dispatches. */
public class CircuitValveAlertSmokeFixture {
 public static void main(String[] args)throws Exception{
  String schema="circuit_valve_alert_smoke";
  if(args.length!=1||!java.util.Set.of("fault","recovery").contains(args[0])||!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_MONITOR_ENABLED")))throw new IllegalArgumentException("Exact isolated URL and monitor-only flags required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   if(app.getBeanNamesForType(IrrigationTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("Actual transports forbidden");
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var alerts=app.getBean(CircuitValveAlerts.class);var monitor=app.getBean(CircuitValveMonitor.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class)))throw new IllegalStateException("Isolated schema required");
   for(String table:java.util.List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("No command/run/queue records allowed");
   var packets=mapper.readTree(Files.readAllBytes(Path.of("backend/src/test/resources/circuit-valve-alert-packets.json")));
   if(args[0].equals("fault")){
    if(jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_valve_alert",Integer.class)!=0)throw new IllegalStateException("Refuse reseeding");
    var soil=mapper.createObjectNode().put("nodeId","ASOIL1").put("name","Đất nhánh thử").put("areaId","AREA001");var channels=soil.putArray("channels");for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");app.getBean(NodeInventory.class).registerSoil(soil);
    app.getBean(NodeInventory.class).registerWater(mapper.readTree("{\"nodeId\":\"AWATER\",\"name\":\"Trạm thử\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"LOW\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"FLOW\",\"metric\":\"FLOW_RATE\",\"unit\":\"L/min\",\"calibrationVersion\":null}]}"));
    app.getBean(IrrigationZones.class).create(mapper.readTree("{\"zoneId\":\"AZONE1\",\"name\":\"Vùng nhánh thử\",\"areaId\":\"AREA001\",\"soilNodeId\":\"ASOIL1\",\"channelIds\":[\"SOIL1\",\"SOIL2\",\"SOIL3\"],\"expectedSource\":\"SIMULATOR\",\"dryThreshold\":30,\"wetThreshold\":35}"));
    app.getBean(IrrigationCircuits.class).create(mapper.readTree("{\"circuitId\":\"ALERTC1\",\"name\":\"Nhánh cảnh báo thử\",\"zoneId\":\"AZONE1\",\"zoneRevision\":1,\"controllerId\":\"IRRIGATION04\",\"valveId\":\"VALVE04\",\"pumpId\":\"PUMP01\",\"waterNodeId\":\"AWATER\",\"lowChannelId\":\"LOW\",\"flowChannelId\":\"FLOW\",\"expectedSource\":\"SIMULATOR\"}"));
    var packet=(ObjectNode)packets.get(0);packet.put("timestamp",Instant.now().toString());monitor.receive("smartfarm/FARM001/VALVE04/status",mapper.writeValueAsBytes(packet),false);
    if(alerts.list().size()!=1||alerts.list().getFirst().clearedAt()!=null)throw new IllegalStateException("Expected one active native fault");
   }else{
    if(alerts.list().size()!=1||alerts.list().getFirst().clearedAt()!=null||alerts.list().getFirst().acknowledgedAt()==null||monitor.latest("VALVE04").sequence()!=0)throw new IllegalStateException("Retained acknowledged opening required; no replay");
    long id=alerts.list().getFirst().id();Instant source=Instant.now().minusMillis(50);
    for(int i=1;i<=2;i++){var packet=(ObjectNode)packets.get(i);packet.put("timestamp",source.plusMillis(i).toString());monitor.receive("smartfarm/FARM001/VALVE04/status",mapper.writeValueAsBytes(packet),false);if((alerts.find(id).clearedAt()!=null)!=(i==2))throw new IllegalStateException("Exactly two healthy samples must clear");}
   }
   for(String table:java.util.List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("No dispatch permitted");
   System.out.println("PASS native valve alert "+args[0]+" -> actual receiver/PostgreSQL; zero commands, runs and queue; no AWS; timestamps assigned once");
  }
 }
}
