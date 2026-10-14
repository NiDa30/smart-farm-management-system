import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.nodes.*;

/** Dedicated test-schema fixture through the actual parser/router/store/evaluator, no broker. */
public class WaterAlertSmokeFixtures {
 public static void main(String[] args)throws Exception {
  if(args.length!=1||!java.util.Set.of("open","clear").contains(args[0])
    ||!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=water_alert_smoke".equals(System.getenv("SMARTFARM_DB_URL"))
    ||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED")))
    throw new IllegalArgumentException("Only the dedicated loopback water_alert_smoke database with MQTT/control disabled is allowed");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE)
    .properties("spring.flyway.schemas=water_alert_smoke","spring.flyway.default-schema=water_alert_smoke").run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);
   if(!jdbc.queryForObject("SELECT current_schema()",String.class).equals("water_alert_smoke"))throw new IllegalStateException("Test schema required");
   var mapper=app.getBean(ObjectMapper.class);var nodes=app.getBean(NodeInventory.class);var router=app.getBean(TelemetryRouter.class);
   boolean clear=args[0].equals("clear");
   if(jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0
     ||jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Integer.class)!=0)throw new IllegalStateException("Not an empty command fixture");
   if(!clear)nodes.registerWater(mapper.readTree("""
    {"nodeId":"WATERALARM","name":"Trạm thử cảnh báo","areaId":"AREA001","channels":[
    {"channelId":"LOW","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
    {"channelId":"HIGH","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
    {"channelId":"FLOW","metric":"FLOW_RATE","unit":"L/min","calibrationVersion":null}]}
    """));
   Instant now=Instant.now();int start=clear?3:1;
   for(int i=0;i<2;i++){
    var p=mapper.createObjectNode().put("schemaVersion",2).put("deviceId","WATERALARM").put("bootId","36000000-0000-4000-8000-000000000001")
     .put("sequence",start+i).put("timestamp",now.minusMillis(500-i*250).toString()).put("uptimeMs",(start+i)*5000).put("dataSource","SIMULATOR");
    var r=p.putArray("readings");
    r.addObject().put("channelId","LOW").put("metric","WATER_PRESENT").put("unit","boolean").put("quality","VALID").put("value",clear).putNull("calibrationVersion");
    r.addObject().put("channelId","HIGH").put("metric","WATER_PRESENT").put("unit","boolean").put("quality","VALID").put("value",false).putNull("calibrationVersion");
    r.addObject().put("channelId","FLOW").put("metric","FLOW_RATE").put("unit","L/min").put("quality","VALID").put("value",0).putNull("calibrationVersion");
    if(!router.store("smartfarm/FARM001/WATERALARM/telemetry",mapper.writeValueAsBytes(p)))throw new IllegalStateException("Duplicate fixture");
   }
   System.out.println("PASS actual water router/parser/store/evaluator fixture "+args[0]+"; MQTT disabled, not live sensor evidence");
  }
 }
}
