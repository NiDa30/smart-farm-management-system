import com.fasterxml.jackson.databind.*;import java.nio.file.*;import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.irrigation.CircuitValveMonitor;
/** Add one native monitor observation to the retained local V26 fixture, without changing it. */
public class CircuitValveMonitorSmokeFixture {
 public static void main(String[] args)throws Exception{
  if(args.length!=1||!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=irrigation_circuit_smoke".equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_MONITOR_ENABLED")))throw new IllegalArgumentException("Dedicated retained fixture, monitor true and live transports false required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas=irrigation_circuit_smoke","spring.flyway.default-schema=irrigation_circuit_smoke").run()){
   if(app.getBeanNamesForType(vn.smartfarm.iot.irrigation.IrrigationTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("Actual transports forbidden");
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"irrigation_circuit_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_circuit",Integer.class)!=2||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_demo_command",Integer.class)!=0)throw new IllegalStateException("Retained V26 fixture required");
   var packet=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(Files.readAllBytes(Path.of(args[0])));var monitor=app.getBean(CircuitValveMonitor.class);var previous=monitor.latest("VALVE02");
   if(previous==null){if(packet.path("sequence").asInt()!=0||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_valve_status",Integer.class)!=0)throw new IllegalStateException("Initial sequence0 only");packet.put("timestamp",Instant.now().toString());}
   else if(previous.sequence()!=0||packet.path("sequence").asInt()!=1||!previous.bootId().toString().equals(packet.path("bootId").asText())||!Instant.parse(packet.path("timestamp").asText()).isAfter(previous.observedAt()))throw new IllegalStateException("Only one new native heartbeat1 may follow initial fixture; no reseed/refresh");
   monitor.receive("smartfarm/FARM001/VALVE02/status",mapper.writeValueAsBytes(packet),false);
   var status=monitor.latest("VALVE02");if(status==null||!status.positionFeedback().closed()||monitor.latest("VALVE03")!=null)throw new IllegalStateException("Independent observation required");
   System.out.println("PASS native monitor encoder -> real Java receiver -> PostgreSQL; VALVE03 unchanged; no commands or AWS; timestamp set once");
  }
 }
}
