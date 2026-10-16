import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.nodes.*;

/** Public native packets only, isolated schema and no broker. Refuses reseeding retained evidence. */
public class WeatherNodeSmokeFixture {
 public static void main(String[] args)throws Exception {
  String url="jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=weather_node_smoke";
  if(!url.equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED")))throw new IllegalStateException("Isolated monitor-only settings required");
  Path evidence=Path.of("/tmp/weather-node-evidence.json");if(Files.exists(evidence))throw new IllegalStateException("Evidence already retained; never replay");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE)
   .properties("spring.flyway.schemas=weather_node_smoke","spring.flyway.default-schema=weather_node_smoke").run()) {
   var jdbc=app.getBean(JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var nodes=app.getBean(NodeInventory.class);var router=app.getBean(TelemetryRouter.class);
   if(!"weather_node_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT count(*) FROM iot_node WHERE node_type='WEATHER'",Integer.class)!=0)throw new IllegalStateException("Fixture already seeded");
   var declaration=mapper.readTree("""
    {"nodeId":"WEATHER01","name":"Thời tiết diễn tập","areaId":"AREA001","channels":[
    {"channelId":"RAIN","metric":"RAIN_DETECTED","unit":"boolean","calibrationVersion":null},
    {"channelId":"LIGHT","metric":"LIGHT_ILLUMINANCE","unit":"lux","calibrationVersion":"SIM_LUX_V1"}]}
    """);nodes.registerWeather(declaration);
   var packets=Files.readAllLines(Path.of("/tmp/weather-node-native-packets.jsonl"));if(packets.size()!=5)throw new AssertionError("Five native samples required");
   for(int i=0;i<packets.size();i++) {
    if(!router.store("smartfarm/FARM001/WEATHER01/telemetry",packets.get(i).getBytes(java.nio.charset.StandardCharsets.UTF_8)))throw new AssertionError();
    if(i==3 && nodes.snapshot().nodes().stream().filter(n->n.nodeId().equals("WEATHER01")).findFirst().orElseThrow().channels().stream().anyMatch(c->c.latest().value()!=null))throw new AssertionError("Fault lost null quality");
   }
   var node=nodes.snapshot().nodes().stream().filter(n->n.nodeId().equals("WEATHER01")).findFirst().orElseThrow();
   if(!Boolean.TRUE.equals(node.channels().getLast().latest().value()))throw new AssertionError("Rain recovery not observed");
   if(jdbc.queryForObject("SELECT count(*) FROM pump_command",Integer.class)!=0||jdbc.queryForObject("SELECT count(*) FROM watering_run",Integer.class)!=0)throw new AssertionError("Monitor produced commands");
   var history=app.getBean(WaterHistory.class);var at=mapper.readTree(packets.getFirst()).path("timestamp").asText();Instant from=Instant.parse(at).minusSeconds(1),to=Instant.parse(at).plusSeconds(1);
   var result=new LinkedHashMap<String,Object>();result.put("nativeSource","WeatherPacket.h");result.put("node",node);
   result.put("rain",history.list("WEATHER01","RAIN",from,to,null,null,100,null));result.put("light",history.list("WEATHER01","LIGHT",from,to,null,null,100,null));
   Files.writeString(evidence,mapper.writeValueAsString(result),StandardOpenOption.CREATE_NEW);
   System.out.println("PASS native weather packets->router->PostgreSQL: five samples, ten readings, fault and recovery; commands/runs=0");
  }
 }
}
