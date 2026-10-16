import com.fasterxml.jackson.databind.*;import java.nio.file.*;import java.time.*;import java.util.*;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;
/** Dedicated synthetic LED model only, never a real MQTT transport. Refuses replay. */
public class PumpCircuitRouteSmokeFixture {
 public static void main(String[] args)throws Exception{
  String schema="pump_route_smoke";
  if(args.length!=1||!Set.of("setup","exercise").contains(args[0])||!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_PUMP_FENCING_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_PUMP_CIRCUIT_ROUTE_REQUIRED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_CIRCUIT_DEMO_ENABLED")))throw new IllegalArgumentException("Exact isolated schema/flags required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema).run()){
   var jdbc=app.getBean(org.springframework.jdbc.core.JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var circuits=app.getBean(IrrigationCircuits.class);var control=app.getBean(CircuitValveControl.class);var pump=app.getBean(vn.smartfarm.iot.control.PumpService.class);var fencing=app.getBean(vn.smartfarm.iot.control.PumpCommandFencing.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||app.getBeanNamesForType(CircuitValveTransport.class).length!=0||app.getBeanNamesForType(vn.smartfarm.iot.control.CommandTransport.class).length!=0)throw new IllegalStateException("Real transports forbidden");
   for(String table:List.of("pump_command","watering_run","irrigation_demo_command","irrigation_queue_request","circuit_valve_status"))if(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)!=0)throw new IllegalStateException("Unrelated commands/monitor packets forbidden");
   if(args[0].equals("setup")){
    if(jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_circuit",Integer.class)!=0)throw new IllegalStateException("No reseeding");
    app.getBean(NodeInventory.class).registerWater(mapper.readTree("{\"nodeId\":\"PWATER\",\"name\":\"Trạm LED\",\"areaId\":\"AREA001\",\"channels\":[{\"channelId\":\"LOW\",\"metric\":\"WATER_PRESENT\",\"unit\":\"boolean\",\"calibrationVersion\":null},{\"channelId\":\"FLOW\",\"metric\":\"FLOW_RATE\",\"unit\":\"L/min\",\"calibrationVersion\":null}]}"));
    for(int i=1;i<=2;i++){
     var soil=mapper.createObjectNode().put("nodeId","PSOIL"+i).put("name","Đất LED "+i).put("areaId","AREA001");var channels=soil.putArray("channels");for(int c=1;c<=3;c++)channels.addObject().put("channelId","SOIL"+c).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");app.getBean(NodeInventory.class).registerSoil(soil);
     var zone=mapper.createObjectNode().put("zoneId","PZONE"+i).put("name","Vùng LED "+i).put("areaId","AREA001").put("soilNodeId","PSOIL"+i).put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);zone.set("channelIds",mapper.valueToTree(List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(zone);
     circuits.create(mapper.createObjectNode().put("circuitId","PC"+i).put("name","Nhánh LED "+i).put("zoneId","PZONE"+i).put("zoneRevision",1).put("controllerId","IRRIGATION"+(i+17)).put("valveId","VALVE"+(i+17)).put("pumpId","PUMP01").put("waterNodeId","PWATER").put("lowChannelId","LOW").put("flowChannelId","FLOW").put("expectedSource","SIMULATOR"));
    }
   }else{
    if(jdbc.queryForObject("SELECT COUNT(*) FROM circuit_demo_status",Integer.class)!=0||jdbc.queryForObject("SELECT COUNT(*) FROM circuit_demo_command",Integer.class)!=0)throw new IllegalStateException("Exercise exactly once, no clock refresh");
    if(jdbc.queryForObject("SELECT COUNT(*) FROM pump_status",Integer.class)!=0)throw new IllegalStateException("No pump clock refresh");
    receivePump(pump,run("pump"));receiveValve(control,mapper,run("valve","VALVE18"));receiveValve(control,mapper,run("valve","VALVE19"));
    app.getBeanFactory().registerSingleton("syntheticCircuitTransport",new CircuitValveTransport(){public boolean circuitValveConnected(String id){return id.equals("VALVE18")||id.equals("VALVE19");}public void publishCircuitValve(String id,byte[] payload)throws Exception{if(!id.equals("VALVE18"))throw new AssertionError("Cross valve");Files.write(Path.of("/tmp/pump-route-valve-command.json"),payload,StandardOpenOption.CREATE_NEW);}});
    app.getBeanFactory().registerSingleton("syntheticPumpTransport",new vn.smartfarm.iot.control.CommandTransport(){public boolean controlConnected(){return true;}public void publishCommand(byte[] payload)throws Exception{Files.write(Path.of("/tmp/pump-route-command.json"),payload,StandardOpenOption.CREATE_NEW);}});
    var initial=control.snapshot("PC1");var valve=control.create("PC1",new CircuitValveControl.Request(UUID.randomUUID(),"OPEN",30,initial.latest().bootId(),1,1,Instant.now()));
    receiveValve(control,mapper,run("valve","VALVE18","/tmp/pump-route-valve-command.json"));
    var proof=app.getBean(vn.smartfarm.iot.control.PumpCircuitProof.class).snapshot("PC1");if(!proof.readyToStart())throw new AssertionError("Preflight: "+proof.reason());
    var context=fencing.view().intent();var request=new vn.smartfarm.iot.control.PumpCommandFencing.HttpIntent(UUID.randomUUID(),"ON",5,context.bootId(),context.revision(),context.asOf(),proof.route());var cmd=fencing.createHttp(request,()->{});
    receivePump(pump,run("pump","/tmp/pump-route-command.json"));
    if(!fencing.lookupHttp(cmd.command().commandId()).command().state().equals("EXECUTED")||!pump.status().reportedState().equals("OFF")||fencing.view().ownership().blocked()||!control.lookup("PC1",valve.commandId()).state().equals("EXECUTED")||!control.snapshot("PC2").commands().isEmpty())throw new AssertionError("Actual receiver pipeline");
    var evidence=mapper.createObjectNode();evidence.set("proof",mapper.valueToTree(app.getBean(vn.smartfarm.iot.control.PumpCircuitProof.class).snapshot("PC1")));evidence.set("commands",mapper.valueToTree(pump.commands()));evidence.set("receipt",mapper.valueToTree(fencing.lookupHttp(cmd.command().commandId())));evidence.set("valve",mapper.valueToTree(control.snapshot("PC1")));evidence.set("other",mapper.valueToTree(control.snapshot("PC2")));evidence.set("pumpRow",mapper.valueToTree(jdbc.queryForMap("SELECT *,valve_interlock::text AS proof FROM pump_status")));
    Files.writeString(Path.of("/tmp/pump-route-evidence.json"),mapper.writerWithDefaultPrettyPrinter().writeValueAsString(evidence),StandardOpenOption.CREATE_NEW);
    System.out.println("PASS native two CLOSED valves -> OPEN/ACK -> exact pump route -> tracked command -> native ON/ACK/timer OFF -> actual receivers/PostgreSQL; no AWS/MQTT/GPIO");
   }
  }
 }
 static String run(String... arguments)throws Exception{var command=new ArrayList<String>();command.add("/tmp/pump-route-packet");command.addAll(List.of(arguments));var p=new ProcessBuilder(command).start();if(!p.waitFor(5,java.util.concurrent.TimeUnit.SECONDS)){p.destroyForcibly();throw new IllegalStateException("Native fixture timeout");}if(p.exitValue()!=0)throw new IllegalStateException("Native fixture rejected command");return new String(p.getInputStream().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}
 static void receiveValve(CircuitValveControl control,ObjectMapper mapper,String lines)throws Exception{for(String line:lines.lines().toList()){var p=mapper.readTree(line);control.receive(CircuitValveControl.topic(p.path("actuatorId").asText(),p.has("commandId")?"ack":"status"),line.getBytes(java.nio.charset.StandardCharsets.UTF_8),false);}}
 static void receivePump(vn.smartfarm.iot.control.PumpService pump,String lines){for(String line:lines.lines().toList())pump.receive(line.contains("\"commandId\"")?"smartfarm/FARM001/PUMP01/ack":"smartfarm/FARM001/PUMP01/status",line.getBytes(java.nio.charset.StandardCharsets.UTF_8));}

}
