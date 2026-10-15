import com.fasterxml.jackson.databind.*;import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.*;import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;
/** One setup, then one native observation in a dedicated schema. Never refresh retained clocks. */
public class CircuitMonitorPackageSmokeFixture {
 public static void main(String[] args)throws Exception{
  String schema="circuit_package_smoke";
  if(args.length<1||!java.util.Set.of("setup","receive").contains(args[0])||args[0].equals("setup")&&args.length!=1||args[0].equals("receive")&&args.length!=2||!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_MONITOR_ENABLED")))throw new IllegalArgumentException("Exact isolated URL/flags and phase required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   if(app.getBeanNamesForType(IrrigationTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("Actual transports forbidden");
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var monitor=app.getBean(CircuitValveMonitor.class);var circuits=app.getBean(IrrigationCircuits.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class)))throw new IllegalStateException("Dedicated fixture only");
   for(String table:java.util.List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("No commands/runs/queue permitted");
   if(args[0].equals("setup")){
    if(jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_circuit",Integer.class)!=0)throw new IllegalStateException("Refuse reseeding retained data");
    app.getBean(NodeInventory.class).registerWater(mapper.readTree("{\"nodeId\":\"PKWATER\",\"name\":\"Trạm thử gói\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"LOW\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"FLOW\",\"metric\":\"FLOW_RATE\",\"unit\":\"L/min\",\"calibrationVersion\":null}]}"));
    for(int i=1;i<=2;i++){
     var soil=mapper.createObjectNode().put("nodeId","PKSOIL"+i).put("name","Đất thử gói "+i).put("areaId","AREA001");var channels=soil.putArray("channels");for(int c=1;c<=3;c++)channels.addObject().put("channelId","SOIL"+c).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");app.getBean(NodeInventory.class).registerSoil(soil);
     var zone=mapper.createObjectNode().put("zoneId","PKZONE"+i).put("name","Vùng thử gói "+i).put("areaId","AREA001").put("soilNodeId","PKSOIL"+i).put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);zone.set("channelIds",mapper.valueToTree(java.util.List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(zone);
     circuits.create(mapper.createObjectNode().put("circuitId","PKC"+i).put("name","Nhánh thử gói "+i).put("zoneId","PKZONE"+i).put("zoneRevision",1).put("controllerId","IRRIGATION0"+(i+5)).put("valveId","VALVE0"+(i+5)).put("pumpId","PUMP01").put("waterNodeId","PKWATER").put("lowChannelId","LOW").put("flowChannelId","FLOW").put("expectedSource","SIMULATOR"));
    }
    System.out.println("PASS two independent current monitor circuits created once; no device packets or commands");
   }else{
    if(jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_circuit",Integer.class)!=2||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_valve_history",Integer.class)!=0)throw new IllegalStateException("Receive once only, no clock refresh");
    var path=Path.of(args[1]).toAbsolutePath().normalize();if(!path.startsWith(Path.of("/tmp")))throw new IllegalArgumentException("Public native fixture path in /tmp required");var p=(ObjectNode)mapper.readTree(Files.readAllBytes(path));
    if(!p.path("controllerId").asText().equals("IRRIGATION06")||!p.path("actuatorId").asText().equals("VALVE06")||!p.path("circuitId").asText().equals("PKC1")||p.path("sequence").asLong()!=0)throw new IllegalArgumentException("Exported first board packet required");
    p.put("timestamp",Instant.now().toString());monitor.receive("smartfarm/FARM001/VALVE06/status",mapper.writeValueAsBytes(p),false);
    if(monitor.latest("VALVE06")==null||monitor.latest("VALVE07")!=null||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_valve_history",Integer.class)!=1)throw new IllegalStateException("No cross-valve observations");
    System.out.println("PASS exported config/native encoder -> actual monitor receiver/PostgreSQL; second valve empty; no MQTT/AWS/GPIO");
   }
  }
 }
}
