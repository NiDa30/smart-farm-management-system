import com.fasterxml.jackson.databind.ObjectMapper;import java.nio.file.*;import java.util.*;
import org.springframework.boot.WebApplicationType;import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.jdbc.core.JdbcTemplate;import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.nodes.*;import vn.smartfarm.iot.zones.IrrigationZones;
/** Isolated native rain admission evidence. Never registers a transport or dispatches a command. */
public class ZoneRainGateSmokeFixture {
 public static void main(String[] args)throws Exception {
  String schema="rain_gate_smoke";
  if(!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||Files.exists(Path.of("/tmp/rain-gate-evidence.json")))throw new IllegalStateException("Exact isolated schema; refuse replay");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   var jdbc=app.getBean(JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var nodes=app.getBean(NodeInventory.class);var gate=app.getBean(ZoneRainGate.class);var router=app.getBean(TelemetryRouter.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT count(*) FROM irrigation_zone",Integer.class)!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.irrigation.CircuitValveTransport.class).length!=0)throw new IllegalStateException("No reseed or real transports");
   var soil=mapper.createObjectNode().put("nodeId","RSOIL01").put("name","Đất kiểm thử mưa").put("areaId","AREA001");var channels=soil.putArray("channels");for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");nodes.registerSoil(soil);
   var zone=mapper.createObjectNode().put("zoneId","RZONE01").put("name","Vùng kiểm thử chốt mưa").put("areaId","AREA001").put("soilNodeId","RSOIL01").put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);zone.set("channelIds",mapper.valueToTree(List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(zone);
   nodes.registerWeather(mapper.readTree("""
    {"nodeId":"WEATHER01","name":"Trạm thời tiết kiểm thử chốt mưa","areaId":"AREA001","channels":[{"channelId":"RAIN","metric":"RAIN_DETECTED","unit":"boolean","calibrationVersion":null},{"channelId":"LIGHT","metric":"LIGHT_ILLUMINANCE","unit":"lux","calibrationVersion":"SIM_LUX_V1"}]}
    """));
   gate.save("RZONE01",new ZoneRainGate.Request(0,1,"WEATHER01","RAIN","SIMULATOR",null,true));
   var states=new ArrayList<String>();states.add(gate.snapshot("RZONE01").state());
   var packets=Files.readAllLines(Path.of("/tmp/rain-gate-native-packets.jsonl"));if(packets.size()!=5)throw new AssertionError();
   for(String packet:packets){if(!router.store("smartfarm/FARM001/WEATHER01/telemetry",packet.getBytes(java.nio.charset.StandardCharsets.UTF_8)))throw new AssertionError();states.add(gate.snapshot("RZONE01").state());}
   if(!states.equals(List.of("MISSING","DRY","DRY","RAIN","SENSOR_FAULT","RAIN")))throw new AssertionError(states);
   for(String table:List.of("pump_command","watering_run","irrigation_session","circuit_demo_command"))if(jdbc.queryForObject("SELECT count(*) FROM "+table,Integer.class)!=0)throw new AssertionError("No commands");
   Files.writeString(Path.of("/tmp/rain-gate-evidence.json"),mapper.writeValueAsString(Map.of("states",states,"view",gate.snapshot("RZONE01"),"source","WeatherPacket.h","realTransport",false,"commands",0)),StandardOpenOption.CREATE_NEW);
   System.out.println("PASS isolated native rain gate: missing/dry/rain/fault/recovery; no transport or commands");
  }
 }
}
