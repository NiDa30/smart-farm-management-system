import com.fasterxml.jackson.databind.*;import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.*;import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;
/** One-time isolated native receive fixture. No API ingress or device transport. */
public class CircuitValveHistorySmokeFixture {
 public static void main(String[] args)throws Exception{
  String schema="valve_history_smoke";
  if(args.length!=0||!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_MONITOR_ENABLED")))throw new IllegalArgumentException("Exact isolated URL and monitor-only flags required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   if(app.getBeanNamesForType(IrrigationTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("Actual transports forbidden");
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var monitor=app.getBean(CircuitValveMonitor.class);var circuits=app.getBean(IrrigationCircuits.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_valve_history",Integer.class)!=0)throw new IllegalStateException("Refuse reseeding retained data");
   for(String table:java.util.List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("No commands/runs/queue permitted");
   app.getBean(NodeInventory.class).registerWater(mapper.readTree("{\"nodeId\":\"AWATER\",\"name\":\"Trạm thử lịch sử\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"LOW\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"FLOW\",\"metric\":\"FLOW_RATE\",\"unit\":\"L/min\",\"calibrationVersion\":null}]}"));
   for(int i=1;i<=2;i++){
    var soil=mapper.createObjectNode().put("nodeId","ASOIL"+i).put("name","Đất nhánh thử "+i).put("areaId","AREA001");var channels=soil.putArray("channels");for(int c=1;c<=3;c++)channels.addObject().put("channelId","SOIL"+c).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");app.getBean(NodeInventory.class).registerSoil(soil);
    var zone=mapper.createObjectNode().put("zoneId","AZONE"+i).put("name","Vùng thử "+i).put("areaId","AREA001").put("soilNodeId","ASOIL"+i).put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);zone.set("channelIds",mapper.valueToTree(java.util.List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(zone);
    circuits.create(mapper.createObjectNode().put("circuitId","ALERTC"+i).put("name","Nhánh lịch sử "+i).put("zoneId","AZONE"+i).put("zoneRevision",1).put("controllerId","IRRIGATION0"+(i+3)).put("valveId","VALVE0"+(i+3)).put("pumpId","PUMP01").put("waterNodeId","AWATER").put("lowChannelId","LOW").put("flowChannelId","FLOW").put("expectedSource","SIMULATOR"));
   }
   var packets=mapper.readTree(Files.readAllBytes(Path.of("backend/src/test/resources/circuit-valve-alert-packets.json")));Instant source=Instant.now().minusMillis(50);
   for(int i=0;i<3;i++){var packet=(ObjectNode)packets.get(i);packet.put("timestamp",source.plusMillis(i).toString());monitor.receive("smartfarm/FARM001/VALVE04/status",mapper.writeValueAsBytes(packet),false);}
   if(jdbc.queryForObject("SELECT COUNT(*) FROM circuit_valve_history",Integer.class)!=3||monitor.latest("VALVE05")!=null)throw new IllegalStateException("Exactly three accepted packets for the independent first valve");
   circuits.update("ALERTC1",((ObjectNode)mapper.valueToTree(circuits.find("ALERTC1"))).put("name","Nhánh đã đổi tên"));
   if(jdbc.queryForObject("SELECT COUNT(*) FROM circuit_valve_history WHERE circuit_snapshot->>'name'='Nhánh lịch sử 1' AND circuit_snapshot->>'revision'='1'",Integer.class)!=3)throw new IllegalStateException("Historical snapshots must remain unchanged");
   for(String table:java.util.List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("No dispatch permitted");
   System.out.println("PASS three native accepted packets -> history/real receiver/PostgreSQL; old configuration preserved after revision2; second valve empty; zero commands/runs/queue, no AWS; refuse reseed");
  }
 }
}
