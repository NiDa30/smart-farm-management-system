import com.fasterxml.jackson.databind.*;import java.nio.file.*;import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.control.PumpService;
/** Dedicated offline fixture. Local test instance enables reservation but no CommandTransport exists. */
public class PumpHttpSmokeFixture {
 public static void main(String[] args)throws Exception{
  if(args.length!=1||!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=pump_http_smoke".equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_PUMP_FENCING_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED")))throw new IllegalArgumentException("Exact dedicated URL, fencing on and physical dispatch flags off required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas=pump_http_smoke","spring.flyway.default-schema=pump_http_smoke").run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"pump_http_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT COUNT(*) FROM pump_status",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0)throw new IllegalStateException("Refuse reseeding retained fixture");
   var p=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(Files.readAllBytes(Path.of(args[0])));p.put("timestamp",Instant.now().toString());var pump=app.getBean(PumpService.class);pump.receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(p));var s=pump.status();
   if(s.controlEnabled()||!s.commandFence().required()||!s.commandFence().deviceEnabled()||!s.commandFence().compatible()||s.commandFence().restartRequired()||s.commandFence().lastOrdinal()!=0)throw new IllegalStateException("Invalid native receive result");
   for(String table:java.util.List.of("pump_command","watering_run","irrigation_queue_request","irrigation_demo_command"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("Unexpected dispatch or preview");

   if(app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("No transport may exist");
   var local=new vn.smartfarm.iot.control.PumpCommandFencing(jdbc,mapper,app.getBeanProvider(vn.smartfarm.iot.control.CommandTransport.class),app.getBean(org.springframework.transaction.PlatformTransactionManager.class),true,true);
   local.invalidateHttpOnStartup();var context=local.view().intent();
   var intent=new vn.smartfarm.iot.control.PumpCommandFencing.HttpIntent(java.util.UUID.fromString("82000000-0000-4000-8000-000000000001"),"OFF",null,null,context.revision(),context.asOf());
   var receipt=local.createHttp(intent,()->{});
   if(!receipt.command().state().equals("FAILED")||!"MQTT_UNAVAILABLE".equals(receipt.command().errorCode()))throw new IllegalStateException("Offline OFF must not report executed");
   System.out.println("PASS guarded local harness: native status, offline OFF intent FAILED/MQTT_UNAVAILABLE, no CommandTransport or MQTT/GPIO; no reseed");
  }
 }
}
