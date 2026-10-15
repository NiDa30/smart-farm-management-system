import com.fasterxml.jackson.databind.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.control.*;

/** Local capture-only transport throws without a socket. Runtime control and MQTT stay off. */
public class PumpOwnershipSmokeFixture {
 public static void main(String[] args)throws Exception {
  if(args.length!=1||!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=pump_owner_smoke".equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_PUMP_FENCING_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED")))throw new IllegalArgumentException("Exact dedicated URL, fencing metadata on, dispatch flags off required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas=pump_owner_smoke","spring.flyway.default-schema=pump_owner_smoke").run()) {
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"pump_owner_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class)))throw new IllegalStateException("Wrong schema");
   for(String table:java.util.List.of("pump_status","pump_command","watering_run","irrigation_queue_request","irrigation_demo_command"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("Refuse reseeding retained data");
   if(app.getBeanNamesForType(CommandTransport.class).length!=0)throw new IllegalStateException("Runtime transport must be absent");
   var p=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(Files.readAllBytes(Path.of(args[0])));p.put("timestamp",Instant.now().toString());app.getBean(PumpService.class).receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(p));
   AtomicInteger captures=new AtomicInteger();var factory=new StaticListableBeanFactory();
   factory.addBean("captureOnly",new CommandTransport(){public boolean controlConnected(){return true;}public void publishCommand(byte[] bytes)throws Exception{captures.incrementAndGet();throw new java.io.IOException("Deliberate capture only; no network/socket");}});
   var local=new PumpCommandFencing(jdbc,mapper,factory.getBeanProvider(CommandTransport.class),app.getBean(org.springframework.transaction.PlatformTransactionManager.class),true,true);local.invalidateHttpOnStartup();var c=local.view().intent();
   var request=new PumpCommandFencing.HttpIntent(UUID.fromString("92000000-0000-4000-8000-000000000001"),"ON",5,c.bootId(),c.revision(),c.asOf());var receipt=local.createHttp(request,()->{});
   if(captures.get()!=1||!receipt.command().state().equals("PUBLISH_UNCERTAIN")||!local.view().ownership().blocked()||!local.view().ownership().holder().source().equals("MANUAL"))throw new IllegalStateException("Expected unresolved local capture claim");
   System.out.println("PASS capture-only local harness: one uncertain MANUAL owner, no runtime CommandTransport, AWS or GPIO; do not reseed");
  }
 }
}
