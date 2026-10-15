import com.fasterxml.jackson.databind.*;import java.nio.file.*;import java.time.*;import java.util.*;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;
/** Dedicated synthetic LED model only, never a real MQTT transport. Refuses replay. */
public class CircuitValveControlSmokeFixture {
 public static void main(String[] args)throws Exception{
  String schema="circuit_control_smoke";
  if(args.length!=1||!Set.of("setup","exercise").contains(args[0])||!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"false".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_CIRCUIT_DEMO_ENABLED")))throw new IllegalArgumentException("Exact isolated schema/flags required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var circuits=app.getBean(IrrigationCircuits.class);var control=app.getBean(CircuitValveControl.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||app.getBeanNamesForType(CircuitValveTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("Real transports forbidden");
   for(String table:List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request","circuit_valve_status"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("Unrelated commands/monitor packets forbidden");
   if(args[0].equals("setup")){
    if(jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_circuit",Integer.class)!=0)throw new IllegalStateException("No reseeding");
    app.getBean(NodeInventory.class).registerWater(mapper.readTree("{\"nodeId\":\"CCWATER\",\"name\":\"Trạm LED\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"LOW\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"FLOW\",\"metric\":\"FLOW_RATE\",\"unit\":\"L/min\",\"calibrationVersion\":null}]}"));
    for(int i=1;i<=2;i++){
     var soil=mapper.createObjectNode().put("nodeId","CCSOIL"+i).put("name","Đất LED "+i).put("areaId","AREA001");var channels=soil.putArray("channels");for(int c=1;c<=3;c++)channels.addObject().put("channelId","SOIL"+c).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");app.getBean(NodeInventory.class).registerSoil(soil);
     var zone=mapper.createObjectNode().put("zoneId","CCZONE"+i).put("name","Vùng LED "+i).put("areaId","AREA001").put("soilNodeId","CCSOIL"+i).put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);zone.set("channelIds",mapper.valueToTree(List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(zone);
     circuits.create(mapper.createObjectNode().put("circuitId","CC"+i).put("name","Nhánh LED "+i).put("zoneId","CCZONE"+i).put("zoneRevision",1).put("controllerId","IRRIGATION0"+(i+7)).put("valveId","VALVE0"+(i+7)).put("pumpId","PUMP01").put("waterNodeId","CCWATER").put("lowChannelId","LOW").put("flowChannelId","FLOW").put("expectedSource","SIMULATOR"));
    }
   }else{
    if(jdbc.queryForObject("SELECT COUNT(*) FROM circuit_demo_status",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_demo_command",Integer.class)!=0)throw new IllegalStateException("Exercise exactly once, no clock refresh");
    String seed=run();control.receive(CircuitValveControl.topic("VALVE08","status"),seed.strip().getBytes(java.nio.charset.StandardCharsets.UTF_8),false);
    app.getBeanFactory().registerSingleton("syntheticCircuitTransport",new CircuitValveTransport(){public boolean circuitValveConnected(String valve){return valve.equals("VALVE08");}public void publishCircuitValve(String valve,byte[] payload)throws Exception{if(!valve.equals("VALVE08"))throw new AssertionError("Cross valve");Files.write(Path.of("/tmp/circuit-control-command.json"),payload,StandardOpenOption.CREATE_NEW);}});
    var s=control.snapshot("CC1");if(!s.readyToOpen())throw new AssertionError("Native CLOSED not ready");var cmd=control.create("CC1",new CircuitValveControl.Request(UUID.randomUUID(),"OPEN",5,s.latest().bootId(),1,1,Instant.now()));
    String lines=run("/tmp/circuit-control-command.json");for(String line:lines.lines().toList()){var p=mapper.readTree(line);control.receive(CircuitValveControl.topic("VALVE08",p.has("commandId")?"ack":"status"),line.getBytes(java.nio.charset.StandardCharsets.UTF_8),false);}
    var latest=control.snapshot("CC1");if(!latest.latest().gpioState().equals("CLOSED")||!latest.latest().reason().equals("TIMER_EXPIRED")||latest.latest().sequence()!=3||!control.lookup("CC1",cmd.commandId()).state().equals("EXECUTED")||control.snapshot("CC2").latest()!=null)throw new AssertionError("Native command/ACK/timer pipeline");
    Files.writeString(Path.of("/tmp/circuit-control-evidence.json"),mapper.writerWithDefaultPrettyPrinter().writeValueAsString(latest),StandardOpenOption.CREATE_NEW);
    System.out.println("PASS native CLOSED -> tracked command -> native decoder/model/ACK/OPEN/timer CLOSED -> actual receiver/PostgreSQL; second valve empty; zero MQTT/AWS/GPIO");
   }
  }
 }
 static String run(String... arguments)throws Exception{var command=new ArrayList<String>();command.add("/tmp/circuit-control-packet");command.addAll(List.of(arguments));var p=new ProcessBuilder(command).start();if(!p.waitFor(5,java.util.concurrent.TimeUnit.SECONDS)){p.destroyForcibly();throw new IllegalStateException("Native fixture timeout");}if(p.exitValue()!=0)throw new IllegalStateException("Native fixture rejected command");return new String(p.getInputStream().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}
}
