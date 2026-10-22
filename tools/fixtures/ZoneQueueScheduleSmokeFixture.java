import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;import java.time.*;import java.time.temporal.ChronoUnit;import java.util.*;
import org.springframework.boot.WebApplicationType;import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.jdbc.core.JdbcTemplate;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;import vn.smartfarm.iot.control.CommandTransport;
/** Real wall-clock scheduler -> queue only, isolated schema. Refuses reseeding and any transport. */
public class ZoneQueueScheduleSmokeFixture {
 public static void main(String[] args)throws Exception {
  String schema="zone_queue_schedule_smoke";Path evidence=Path.of("/tmp/zone-schedule-evidence.json");if(Files.exists(evidence))throw new IllegalStateException("Never replay fixture");
  var options=new ArrayList<String>(List.of("--spring.datasource.url=jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema,"--spring.datasource.username=smartfarm_test","--spring.datasource.password=","--spring.flyway.schemas="+schema,"--spring.flyway.default-schema="+schema,"--smartfarm.mqtt.enabled=false","--smartfarm.control.enabled=false","--smartfarm.control.pump-fencing-enabled=false","--smartfarm.control.circuit-route-required=false","--smartfarm.irrigation-queue.scheduling-enabled=false","--smartfarm.irrigation.queue-schedule-enabled=true","--smartfarm.irrigation.queue-schedule-poll-ms=100","--smartfarm.irrigation.queue-schedule-initial-delay-ms=100"));
  for(String flag:List.of("session","session-closure","queue-handoff","flow-stop","water-stop","rain-stop","circuit-demo","demo","monitor"))options.add("--smartfarm.irrigation."+flag+"-enabled=false");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).run(options.toArray(String[]::new))){
   var jdbc=app.getBean(JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var nodes=app.getBean(NodeInventory.class);var schedules=app.getBean(ZoneQueueSchedule.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT count(*) FROM irrigation_zone",Integer.class)!=0||app.getBeanNamesForType(CommandTransport.class).length!=0||app.getBeanNamesForType(CircuitValveTransport.class).length!=0)throw new IllegalStateException("Reseed/real transport forbidden");
   nodes.registerSoil(mapper.readTree("{\"nodeId\":\"SCSOIL\",\"name\":\"Đất lịch mẫu\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"S1\",\"metric\":\"SOIL_MOISTURE\",\"unit\":\"%\",\"calibrationVersion\":null},{\"channelId\":\"S2\",\"metric\":\"SOIL_MOISTURE\",\"unit\":\"%\",\"calibrationVersion\":null},{\"channelId\":\"S3\",\"metric\":\"SOIL_MOISTURE\",\"unit\":\"%\",\"calibrationVersion\":null}]}"));
   nodes.registerWater(mapper.readTree("{\"nodeId\":\"SCWATER\",\"name\":\"Trạm lịch mẫu\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"LOW\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"FLOW\",\"metric\":\"FLOW_RATE\",\"unit\":\"L/min\",\"calibrationVersion\":null}]}"));
   app.getBean(IrrigationZones.class).create(mapper.readTree("{\"zoneId\":\"SCZONE\",\"name\":\"Vùng có lịch mẫu\",\"areaId\":\"AREA001\",\"soilNodeId\":\"SCSOIL\",\"channelIds\":[\"S1\",\"S2\",\"S3\"],\"expectedSource\":\"SIMULATOR\",\"dryThreshold\":30,\"wetThreshold\":35}"));
   app.getBean(IrrigationCircuits.class).create(mapper.readTree("{\"circuitId\":\"SCC1\",\"name\":\"Nhánh lịch mẫu\",\"zoneId\":\"SCZONE\",\"zoneRevision\":1,\"controllerId\":\"IRRIGATION82\",\"valveId\":\"VALVE82\",\"pumpId\":\"PUMP01\",\"waterNodeId\":\"SCWATER\",\"lowChannelId\":\"LOW\",\"flowChannelId\":\"FLOW\",\"expectedSource\":\"SIMULATOR\"}"));
   var now=Instant.now();var due=now.truncatedTo(ChronoUnit.MINUTES).plusSeconds(60);if(Duration.between(now,due).getSeconds()<5)due=due.plusSeconds(60);var local=due.atZone(ZoneId.of(ZoneQueueSchedule.TIMEZONE));
   var definition=new ZoneQueueSchedule.Save(0,true,1,"SCC1",1,5,ZoneQueueSchedule.TIMEZONE,List.of(new ZoneQueueSchedule.Slot(List.of(local.getDayOfWeek().getValue()),local.toLocalTime().toString())),Instant.now());
   schedules.save("SCZONE",definition);System.out.println("Waiting for REAL scheduler due "+due+"; no transport");
   long timeout=System.nanoTime()+Duration.ofSeconds(80).toNanos();while(System.nanoTime()<timeout&&schedules.snapshot("SCZONE").occurrences().isEmpty())Thread.sleep(100);
   var observed=schedules.snapshot("SCZONE");if(observed.occurrences().size()!=1||!observed.occurrences().getFirst().state().equals("QUEUED"))throw new AssertionError("Expected real worker to enqueue once");
   var disabled=new ZoneQueueSchedule.Save(1,false,1,"SCC1",1,5,definition.timezone(),definition.slots(),Instant.now());schedules.save("SCZONE",disabled);
   for(String table:List.of("pump_command","circuit_demo_command","irrigation_session","watering_run"))if(jdbc.queryForObject("SELECT count(*) FROM "+table,Integer.class)!=0)throw new AssertionError("No device/session dispatch allowed");
   if(jdbc.queryForObject("SELECT count(*) FROM irrigation_queue_request",Integer.class)!=1)throw new AssertionError("Only one queue request");
   Files.writeString(evidence,mapper.writeValueAsString(Map.of("observed",observed,"retained",schedules.snapshot("SCZONE"),"queue",app.getBean(IrrigationQueue.class).snapshot(),"realTransport",false)),StandardOpenOption.CREATE_NEW);
   System.out.println("PASS REAL scheduler/DB -> one linked QUEUED item; plan disabled, zero commands/sessions/runs");
  }
 }
}
