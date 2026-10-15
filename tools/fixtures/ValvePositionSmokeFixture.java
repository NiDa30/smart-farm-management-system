import com.fasterxml.jackson.databind.*;import java.nio.file.*;import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.*;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.IrrigationDemo;
/** Guarded local native-packet receive only; no transport or command dispatch. */
public class ValvePositionSmokeFixture {
 public static void main(String[] args)throws Exception{
  if(args.length!=1||!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=valve_position_smoke".equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_POSITION_FEEDBACK_REQUIRED")))throw new IllegalArgumentException("Exact dedicated URL and all control/MQTT flags false required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas=valve_position_smoke","spring.flyway.default-schema=valve_position_smoke").run()){
   if(app.getBeanNamesForType(vn.smartfarm.iot.irrigation.IrrigationTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("No actual command transport may exist");
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"valve_position_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_demo_command",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_demo_status",Integer.class)!=0)throw new IllegalStateException("Refuse reseeding");
   var node=mapper.createObjectNode().put("nodeId","VALVESOIL").put("name","Valve soil fixture").put("areaId","AREA001");var channels=node.putArray("channels");for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");app.getBean(NodeInventory.class).registerSoil(node);
   app.getBean(IrrigationZones.class).create(mapper.readTree("{\"zoneId\":\"ZONE01\",\"name\":\"Vùng van fixture\",\"areaId\":\"AREA001\",\"soilNodeId\":\"VALVESOIL\",\"channelIds\":[\"SOIL1\",\"SOIL2\",\"SOIL3\"],\"expectedSource\":\"SIMULATOR\",\"dryThreshold\":30,\"wetThreshold\":35}"));
   var service=app.getBean(IrrigationDemo.class);service.bind(mapper.readTree("{\"zoneId\":\"ZONE01\",\"zoneRevision\":1,\"revision\":1}"));
   var packet=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(Files.readAllBytes(Path.of(args[0])));packet.put("timestamp",Instant.now().toString());service.receive("smartfarm/FARM001/VALVE01/status",mapper.writeValueAsBytes(packet));
   if(service.snapshot().demoEnabled()||!service.snapshot().feedbackRequired()||!service.snapshot().latest().positionFeedback().closed()||!service.snapshot().commands().isEmpty())throw new IllegalStateException("Demo remains disabled");
   System.out.println("PASS native feedback encoder -> Java receive -> PostgreSQL CLOSED independent inputs; timestamp refreshed for validation; no AWS/command/GPIO");
  }
 }
}
