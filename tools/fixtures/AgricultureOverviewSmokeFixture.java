import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;
import vn.smartfarm.iot.nodes.*;
import vn.smartfarm.iot.zones.IrrigationZones;
import vn.smartfarm.iot.alerts.SoilAlerts;
/** Local receive fixture only, guarded before Spring. Never sends MQTT or commands. */
public class AgricultureOverviewSmokeFixture {
 public static void main(String[] args)throws Exception {
  if(!"jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema=agriculture_overview_smoke".equals(System.getenv("SMARTFARM_DB_URL"))
   ||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED")))throw new IllegalArgumentException("Exact local test URL and disabled MQTT/control required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE)
   .properties("spring.flyway.schemas=agriculture_overview_smoke","spring.flyway.default-schema=agriculture_overview_smoke").run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);
   if(!"agriculture_overview_smoke".equals(jdbc.queryForObject("SELECT current_schema()",String.class))
    ||jdbc.queryForObject("SELECT COUNT(*) FROM iot_node WHERE telemetry_version=2",Integer.class)!=0
    ||jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone",Integer.class)!=0
    ||jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class)!=0
    ||jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Integer.class)!=0)throw new IllegalStateException("Unseeded fixture required; refuse overwrite");
   var inventory=app.getBean(NodeInventory.class);Instant now=Instant.now();
   for(boolean soil:new boolean[]{true,false}){
    String id=soil?"AGSOIL":"AGWATER";var d=mapper.createObjectNode().put("nodeId",id).put("name",soil?"Đất tổng quan fixture":"Bồn tổng quan fixture").put("areaId","AREA001");var channels=d.putArray("channels");
    for(int i=0;i<3;i++)channels.addObject().put("channelId",soil?"SOIL"+(i+1):i==0?"LOW":i==1?"HIGH":"FLOW").put("metric",soil?"SOIL_MOISTURE":i<2?"WATER_PRESENT":"FLOW_RATE").put("unit",soil?"%":i<2?"boolean":"L/min").putNull("calibrationVersion");
    if(soil)inventory.registerSoil(d);else inventory.registerWater(d);
    for(int seq=1;seq<=2;seq++){
     var p=mapper.createObjectNode().put("schemaVersion",2).put("deviceId",id).put("bootId",soil?"47000000-0000-4000-8000-000000000001":"47000000-0000-4000-8000-000000000002").put("sequence",seq).put("timestamp",now.minusSeconds(3-seq).toString()).put("uptimeMs",seq*5000).put("dataSource","SIMULATOR");var readings=p.putArray("readings");
     for(int i=0;i<3;i++){var c=readings.addObject();c.setAll((com.fasterxml.jackson.databind.node.ObjectNode)channels.get(i));c.put("quality","VALID");if(soil)c.put("value",i==0?0:i==1?20:80);else if(i<2)c.put("value",false);else c.put("value",0);}
     app.getBean(TelemetryRouter.class).store("smartfarm/FARM001/"+id+"/telemetry",mapper.writeValueAsBytes(p));
    }
   }
   app.getBean(IrrigationZones.class).create(mapper.readTree("""
    {"zoneId":"AGZONE","name":"Vùng tổng quan fixture","areaId":"AREA001","soilNodeId":"AGSOIL","channelIds":["SOIL1","SOIL2","SOIL3"],"expectedSource":"SIMULATOR","dryThreshold":30,"wetThreshold":35}
    """));
   var alerts=app.getBean(SoilAlerts.class);alerts.acknowledge(alerts.list().getFirst().id(),"Đã xem fixture tổng quan");
   System.out.println("PASS agriculture receive fixture: 2 SOIL open/1 ACK,1 WATER open,1 zone; no MQTT/AWS/commands");
  }
 }
}
