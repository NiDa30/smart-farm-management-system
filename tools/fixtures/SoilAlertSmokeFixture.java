import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.nodes.*;
import vn.smartfarm.iot.alerts.SoilAlerts;
/** Synthetic test receive/clear only. Dedicated schema guard runs before Spring. */
public class SoilAlertSmokeFixture {
 public static void main(String[] args)throws Exception {
  if(args.length!=1||!java.util.Set.of("seed","clear").contains(args[0]))throw new IllegalArgumentException("Use seed or clear");
  if(!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=soil_alert_smoke".equals(System.getenv("SMARTFARM_DB_URL"))
   ||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED")))
   throw new IllegalArgumentException("Dedicated soil_alert_smoke and disabled MQTT/control required");
  boolean seed=args[0].equals("seed");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE)
   .properties("spring.flyway.schemas=soil_alert_smoke","spring.flyway.default-schema=soil_alert_smoke").run()) {
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"soil_alert_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))
    ||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Integer.class)!=0)
    throw new IllegalStateException("Dedicated zero-command fixture required");
   int nodes=jdbc.queryForObject("SELECT COUNT(*) FROM iot_node WHERE node_id='SOILWARN'",Integer.class);
   if(seed){
    if(nodes!=0)throw new IllegalStateException("Refusing to reseed existing SOILWARN");
    var d=mapper.createObjectNode().put("nodeId","SOILWARN").put("name","Soil alert fixture").put("areaId","AREA001");var c=d.putArray("channels");
    for(int i=1;i<=3;i++)c.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").put("calibrationVersion","SIM_LINEAR_V1");
    app.getBean(NodeInventory.class).registerSoil(d);
   }else if(nodes!=1||jdbc.queryForObject("SELECT COUNT(*) FROM node_sample WHERE node_id='SOILWARN'",Integer.class)!=2
    ||jdbc.queryForObject("SELECT COUNT(*) FROM soil_alert WHERE node_id='SOILWARN' AND cleared_sample_id IS NULL",Integer.class)!=2)
    throw new IllegalStateException("Clear requires exactly the two seeded packets and open conditions");
   Instant now=Instant.now();
   for(int step=0;step<2;step++) {
    var p=mapper.createObjectNode().put("schemaVersion",2).put("deviceId","SOILWARN").put("bootId","43000000-0000-4000-8000-000000000001")
     .put("sequence",(seed?1:3)+step).put("timestamp",now.minusSeconds(2-step).toString()).put("uptimeMs",(seed?1:3)*5000+step*5000).put("dataSource","SIMULATOR");
    var readings=p.putArray("readings");
    for(int i=1;i<=3;i++) {
     var c=readings.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").put("calibrationVersion","SIM_LINEAR_V1");
     if(seed&&i==3)c.put("quality","SENSOR_FAULT").putNull("value");
     else c.put("quality","VALID").put("value",i==2?100:seed?0:i==1?40:50);
    }
    app.getBean(TelemetryRouter.class).store("smartfarm/FARM001/SOILWARN/telemetry",mapper.writeValueAsBytes(p));
   }
   var alerts=app.getBean(SoilAlerts.class).list();
   if(alerts.size()!=2||alerts.stream().anyMatch(a->seed?a.clearedAt()!=null:a.clearedAt()==null))throw new IllegalStateException("Expected exactly two matching episodes");
   System.out.println("PASS SOIL alerts "+args[0]+": local receive fixture only, no MQTT/AWS or command; not Wokwi/hardware evidence");
  }
 }
}
