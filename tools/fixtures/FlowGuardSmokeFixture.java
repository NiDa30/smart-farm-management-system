import com.fasterxml.jackson.databind.*;
import java.nio.file.Path;
import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.control.PumpService;
/** Test-schema receive fixture only, never a command or AWS publisher. */
public class FlowGuardSmokeFixture {
 public static void main(String[] args)throws Exception {
  if(!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=flow_guard_smoke".equals(System.getenv("SMARTFARM_DB_URL"))
   ||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED")))
   throw new IllegalArgumentException("Dedicated loopback flow_guard_smoke and disabled MQTT/control required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE)
   .properties("spring.flyway.schemas=flow_guard_smoke","spring.flyway.default-schema=flow_guard_smoke").run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
   if(!jdbc.queryForObject("SELECT current_schema()",String.class).equals("flow_guard_smoke")
    ||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM pump_status",Integer.class)!=0)
    throw new IllegalStateException("Unseeded dedicated fixture required; do not overwrite existing status");
   var mapper=app.getBean(ObjectMapper.class);var pump=app.getBean(PumpService.class);
   var payload=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(Path.of("backend/src/test/resources/flow-trip-status.json").toFile());
   payload.put("timestamp",Instant.now().toString());pump.receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(payload));
   payload.put("sequence",8).put("timestamp",Instant.now().toString()).put("stateReason","FLOW_SENSOR_FAULT");
   pump.receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(payload));
   if(!pump.status().safetyLockout()||!pump.status().reportedState().equals("OFF"))throw new IllegalStateException("Expected locked OFF");
   System.out.println("PASS local receive fixture FLOW_LOW/FLOW_SENSOR_FAULT, no MQTT/AWS/command publish; not hardware evidence");
  }
 }
}
