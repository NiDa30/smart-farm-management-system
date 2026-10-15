import com.fasterxml.jackson.databind.*;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;
/** Creates simulator zone configuration only, in the dedicated empty queue smoke schema. */
public class IrrigationQueueSmokeFixture {
 public static void main(String[] args)throws Exception{
  if(!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=irrigation_queue_smoke".equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_IRRIGATION_DEMO_ENABLED")))throw new IllegalArgumentException("Exact dedicated URL and dispatch flags false required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas=irrigation_queue_smoke","spring.flyway.default-schema=irrigation_queue_smoke").run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"irrigation_queue_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_queue_request",Integer.class)!=0)throw new IllegalStateException("Refuse reseeding retained fixture");
   for(int i=1;i<=2;i++){
    var node=mapper.createObjectNode().put("nodeId","QUEUESOIL"+i).put("name","Đất diễn tập "+i).put("areaId","AREA001");var channels=node.putArray("channels");for(int c=1;c<=3;c++)channels.addObject().put("channelId","SOIL"+c).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");app.getBean(NodeInventory.class).registerSoil(node);
    var z=mapper.createObjectNode().put("zoneId","QDEMO0"+i).put("name","Dãy diễn tập "+i).put("areaId","AREA001").put("soilNodeId","QUEUESOIL"+i).put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);z.set("channelIds",mapper.valueToTree(java.util.List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(z);
   }
   System.out.println("PASS two simulator zone configurations, empty queue, no telemetry or commands; do not reseed");
  }
 }
}
