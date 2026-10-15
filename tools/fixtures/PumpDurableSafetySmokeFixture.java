import com.fasterxml.jackson.databind.*;import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.*;import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.control.PumpService;
/** Receive native encoder output once in a dedicated local schema. No command transport. */
public class PumpDurableSafetySmokeFixture {
 public static void main(String[] args)throws Exception{
  String schema="pump_durable_safety_smoke";
  if(args.length!=1||!java.util.Set.of("boot","fault").contains(args[0])||!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED")))throw new IllegalArgumentException("Exact isolated URL with MQTT/control/demo false required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   if(app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.irrigation.IrrigationTransport.class).length!=0)throw new IllegalStateException("No actual transport allowed");
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var pump=app.getBean(PumpService.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class)))throw new IllegalStateException("Dedicated fixture required");
   for(String table:java.util.List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("No commands/runs/queue permitted");
   int count=jdbc.queryForObject("SELECT COUNT(*) FROM pump_status",Integer.class);
   if(args[0].equals("boot")?count!=0:count!=1||jdbc.queryForObject("SELECT sequence FROM pump_status WHERE singleton=1",Integer.class)!=0)throw new IllegalStateException("Refuse replay or refresh; only one initial packet then one new storage-fault packet");
   var frames=mapper.readTree(Files.readAllBytes(Path.of("backend/src/test/resources/pump-durable-safety-packets.json")));var p=(ObjectNode)frames.get(args[0].equals("boot")?0:1);p.put("timestamp",Instant.now().toString());pump.receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(p));
   if(!pump.status().safetyLockout()||!pump.status().reportedState().equals("OFF"))throw new IllegalStateException("Expected OFF with corresponding proof latch");
   System.out.println("PASS native durable journal "+args[0]+" -> real receiver/PostgreSQL; timestamp assigned once; no commands, MQTT, AWS or hardware actuation");
  }
 }
}
