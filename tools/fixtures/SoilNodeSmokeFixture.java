import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.nio.file.Path;
import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.nodes.*;
/** Synthetic receive path only: dedicated schema, no MQTT or command publisher. */
public class SoilNodeSmokeFixture {
 public static void main(String[] args)throws Exception {
  if(!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=soil_node_smoke".equals(System.getenv("SMARTFARM_DB_URL"))
   ||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED")))
   throw new IllegalArgumentException("Dedicated soil_node_smoke schema and disabled MQTT/control required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE)
   .properties("spring.flyway.schemas=soil_node_smoke","spring.flyway.default-schema=soil_node_smoke").run()) {
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
   if(!"soil_node_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))
    ||jdbc.queryForObject("SELECT COUNT(*) FROM iot_node WHERE node_id='SOIL01'",Integer.class)!=0
    ||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0)
    throw new IllegalStateException("Unseeded dedicated fixture required; never overwrite existing records");
   var mapper=app.getBean(ObjectMapper.class);var declaration=mapper.createObjectNode().put("nodeId","SOIL01").put("name","Đất ba điểm (fixture)").put("areaId","AREA001");
   var channels=declaration.putArray("channels");for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").put("calibrationVersion","SIM_LINEAR_V1");
   app.getBean(NodeInventory.class).registerSoil(declaration);
   var router=app.getBean(TelemetryRouter.class);Instant now=Instant.now();
   var packet=(ObjectNode)mapper.readTree(Path.of("backend/src/test/resources/soil-firmware-packet.json").toFile());
   packet.put("timestamp",now.minusSeconds(70).toString());router.store("smartfarm/FARM001/SOIL01/telemetry",mapper.writeValueAsBytes(packet));
   packet.put("sequence",2).put("timestamp",now.minusSeconds(5).toString());packet.withArray("readings").remove(1);
   ((ObjectNode)packet.path("readings").get(0)).put("quality","SENSOR_FAULT").putNull("value");
   router.store("smartfarm/FARM001/SOIL01/telemetry",mapper.writeValueAsBytes(packet));
   packet.put("sequence",3).put("timestamp",now.toString());((ObjectNode)packet.path("readings").get(0)).put("quality","VALID").put("value",0);
   router.store("smartfarm/FARM001/SOIL01/telemetry",mapper.writeValueAsBytes(packet));
   System.out.println("PASS SOIL fixture: independent zero/100/fault, old adjacent sample, no MQTT/AWS/commands; not Wokwi acceptance");
  }
 }
}
