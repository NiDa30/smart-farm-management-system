import com.fasterxml.jackson.databind.ObjectMapper;import java.nio.file.*;import java.util.*;
import org.springframework.boot.WebApplicationType;import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.jdbc.core.JdbcTemplate;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.*;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.IrrigationCircuits;
/** Native LOW samples through real router/DB; isolated fixture, no transport or dispatch. */
public class CircuitWaterGateSmokeFixture {
 public static void main(String[] args)throws Exception {
  String schema="water_gate_smoke";Path evidence=Path.of("/tmp/water-gate-evidence.json");
  if(!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||Files.exists(evidence))throw new IllegalArgumentException("Exact isolated schema; refuse replay");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   var jdbc=app.getBean(JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var nodes=app.getBean(NodeInventory.class);var router=app.getBean(TelemetryRouter.class);var gate=app.getBean(CircuitWaterGate.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT count(*) FROM irrigation_circuit",Integer.class)!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.irrigation.CircuitValveTransport.class).length!=0)throw new IllegalStateException("No reseed or real transport");
   nodes.registerWater(mapper.readTree("{\"nodeId\":\"WATER01\",\"name\":\"Bồn kiểm thử chốt LOW\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"LOW\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"HIGH\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"FLOW\",\"metric\":\"FLOW_RATE\",\"unit\":\"L/min\",\"calibrationVersion\":\"SIM_FLOW_V1\"}]}"));
   var soil=mapper.createObjectNode().put("nodeId","WCSOIL").put("name","Đất kiểm thử chốt nước").put("areaId","AREA001");var channels=soil.putArray("channels");for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");nodes.registerSoil(soil);
   var zone=mapper.createObjectNode().put("zoneId","WCZONE").put("name","Vùng kiểm thử nguồn nước").put("areaId","AREA001").put("soilNodeId","WCSOIL").put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);zone.set("channelIds",mapper.valueToTree(List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(zone);
   app.getBean(IrrigationCircuits.class).create(mapper.readTree("{\"circuitId\":\"WC1\",\"name\":\"Nhánh kiểm thử phao LOW\",\"zoneId\":\"WCZONE\",\"zoneRevision\":1,\"controllerId\":\"IRRIGATION73\",\"valveId\":\"VALVE73\",\"pumpId\":\"PUMP01\",\"waterNodeId\":\"WATER01\",\"lowChannelId\":\"LOW\",\"flowChannelId\":\"FLOW\",\"expectedSource\":\"SIMULATOR\"}"));
   gate.save("WC1",new CircuitWaterGate.Request(0,1,null,true));var states=new ArrayList<String>();states.add(gate.snapshot("WC1").state());var packets=Files.readAllLines(Path.of("/tmp/water-admission-packets.jsonl"));if(packets.size()!=4)throw new AssertionError();
   for(String line:packets){if(!router.store("smartfarm/FARM001/WATER01/telemetry",line.getBytes(java.nio.charset.StandardCharsets.UTF_8)))throw new AssertionError();states.add(gate.snapshot("WC1").state());}
   if(!states.equals(List.of("MISSING","AVAILABLE","EMPTY","SENSOR_FAULT","AVAILABLE")))throw new AssertionError(states);
   for(String table:List.of("pump_command","watering_run","irrigation_session","circuit_demo_command"))if(jdbc.queryForObject("SELECT count(*) FROM "+table,Integer.class)!=0)throw new AssertionError("No dispatch");
   Files.writeString(evidence,mapper.writeValueAsString(Map.of("states",states,"view",gate.snapshot("WC1"),"source","WaterPacket.h","realTransport",false,"commands",0)),StandardOpenOption.CREATE_NEW);
   System.out.println("PASS native WaterPacket->router->DB: missing/present/empty/fault/recovery; flow0 not substituted for LOW; commands0");
  }
 }
}
