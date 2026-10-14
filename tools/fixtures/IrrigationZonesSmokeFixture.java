import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.nodes.*;
/** Dedicated local receive fixture. Never sends MQTT/AWS or actuator commands. */
public class IrrigationZonesSmokeFixture {
 public static void main(String[] args)throws Exception {
  if(!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=irrigation_zones_smoke".equals(System.getenv("SMARTFARM_DB_URL"))
   ||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED")))throw new IllegalArgumentException("Exact test schema and disabled MQTT/control required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE)
   .properties("spring.flyway.schemas=irrigation_zones_smoke","spring.flyway.default-schema=irrigation_zones_smoke").run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"irrigation_zones_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))
    ||jdbc.queryForObject("SELECT COUNT(*) FROM iot_node WHERE node_id IN ('ZONESOIL_A','ZONESOIL_B')",Integer.class)!=0
    ||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone",Integer.class)!=0
    ||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0)throw new IllegalStateException("Unseeded dedicated test schema required; refuse overwrite");
   for(int n=0;n<2;n++){
    String id=n==0?"ZONESOIL_A":"ZONESOIL_B";var d=mapper.createObjectNode().put("nodeId",id).put("name","Zone soil fixture "+(n==0?"A":"B")).put("areaId","AREA001");var channels=d.putArray("channels");
    for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").put("calibrationVersion","SIM_LINEAR_V1");app.getBean(NodeInventory.class).registerSoil(d);
    var p=mapper.createObjectNode().put("schemaVersion",2).put("deviceId",id).put("bootId",n==0?"45000000-0000-4000-8000-000000000001":"45000000-0000-4000-8000-000000000002").put("sequence",1).put("timestamp",Instant.now().toString()).put("uptimeMs",5000).put("dataSource","SIMULATOR");var readings=p.putArray("readings");double[] values=n==0?new double[]{0,20,80}:new double[]{40,50,20};
    for(int i=0;i<3;i++)readings.addObject().put("channelId","SOIL"+(i+1)).put("metric","SOIL_MOISTURE").put("unit","%").put("quality","VALID").put("value",values[i]).put("calibrationVersion","SIM_LINEAR_V1");app.getBean(TelemetryRouter.class).store("smartfarm/FARM001/"+id+"/telemetry",mapper.writeValueAsBytes(p));
   }
   System.out.println("PASS two SOIL node receive fixtures only; zone declarations must be created through UI; no MQTT/AWS/command");
  }
 }
}
