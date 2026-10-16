import com.fasterxml.jackson.databind.*;import java.nio.file.*;import java.time.*;import java.util.*;
import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.boot.WebApplicationType;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.NodeInventory;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;
/** Dedicated synthetic LED model only, never a real MQTT transport. Refuses replay. */
public class IrrigationSessionSmokeFixture {
 public static void main(String[] args)throws Exception{
  String schema="irrigation_session_smoke";
  if(args.length!=1||!Set.of("setup","exercise").contains(args[0])||!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_CONTROL_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_PUMP_FENCING_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_PUMP_CIRCUIT_ROUTE_REQUIRED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_CIRCUIT_DEMO_ENABLED"))||!"true".equals(System.getenv("SMARTFARM_IRRIGATION_SESSION_ENABLED")))throw new IllegalArgumentException("Exact isolated schema/flags required");
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
    var sessions=app.getBean(IrrigationSession.class);
    app.getBeanFactory().registerSingleton("syntheticCircuitTransport",new CircuitValveTransport(){public boolean circuitValveConnected(String id){return id.equals("VALVE18")||id.equals("VALVE19");}public void publishCircuitValve(String id,byte[] bytes)throws Exception{
     if(!id.equals("VALVE18"))throw new AssertionError("Cross valve");var cmd=mapper.readTree(bytes);Files.write(Path.of("/tmp/irrigation-session-valve-"+cmd.path("action").asText()+".json"),bytes,StandardOpenOption.CREATE_NEW);
     if(cmd.path("action").asText().equals("OPEN"))receiveValve(control,mapper,run("valve","VALVE18","/tmp/irrigation-session-valve-OPEN.json"));else{
      var p=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(run("valve","VALVE18").strip());long seq=control.snapshot("PC1").latest().sequence()+1;p.put("sequence",seq).put("lastOrdinal",cmd.path("ordinal").asLong()).put("reason","COMMAND_CLOSE");var ack=p.deepCopy().put("commandId",cmd.path("commandId").asText()).put("ordinal",cmd.path("ordinal").asLong()).put("action","CLOSE").put("result","EXECUTED").putNull("errorCode");control.receive(CircuitValveControl.topic(id,"ack"),mapper.writeValueAsBytes(ack),false);p.put("sequence",seq+1);control.receive(CircuitValveControl.topic(id,"status"),mapper.writeValueAsBytes(p),false);
     }
    }});
    app.getBeanFactory().registerSingleton("syntheticPumpTransport",new vn.smartfarm.iot.control.CommandTransport(){public boolean controlConnected(){return true;}public void publishCommand(byte[] bytes)throws Exception{
     var cmd=mapper.readTree(bytes);Files.write(Path.of("/tmp/irrigation-session-pump-"+cmd.path("action").asText()+".json"),bytes,StandardOpenOption.CREATE_NEW);
     if(cmd.path("action").asText().equals("ON"))receivePump(pump,run("pump","/tmp/irrigation-session-pump-ON.json"));else{
      var p=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(run("pump").strip());p.put("sequence",5).put("stateReason","COMMAND_OFF");((com.fasterxml.jackson.databind.node.ObjectNode)p.path("commandFence")).put("lastOrdinal",cmd.path("commandFence").path("ordinal").asLong());var ack=p.deepCopy();ack.remove(List.of("connection","valveInterlock","stateReason","activeCommandId"));ack.put("sequence",4).put("commandId",cmd.path("commandId").asText()).put("stage","EXECUTED").put("status","SUCCESS");ack.putObject("commandFence").put("version",1).put("ordinal",cmd.path("commandFence").path("ordinal").asLong());pump.receive("smartfarm/FARM001/PUMP01/ack",mapper.writeValueAsBytes(ack));pump.receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(p));
     }
    }});
    var v=sessions.snapshot("PC1");if(!v.canStart())throw new AssertionError(v.startReason());var completed=sessions.start("PC1",new IrrigationSession.Start(UUID.randomUUID(),1,1,v.pump().commandFence().intent().bootId(),v.valve().latest().bootId(),5,v.asOf()));
    for(String action:List.of("OPEN","ON","OFF","CLOSE","FINISH")){var review=sessions.snapshot("PC1");var receipt=sessions.act("PC1",completed.sessionId(),new IrrigationSession.Action(UUID.randomUUID(),action,review.active().revision(),review.asOf()));completed=receipt.session();}
    if(!completed.phase().equals("CLOSED_CONFIRMED")||sessions.snapshot("PC1").active()!=null)throw new AssertionError("Confirmed sequence not complete");
    // Wait out the actual two-second CLOSE review fence; do not rewrite fixture timestamps.
    Thread.sleep(2100);v=sessions.snapshot("PC1");if(!v.canStart())throw new AssertionError("Next preparation "+v.startReason());var prepared=sessions.start("PC1",new IrrigationSession.Start(UUID.randomUUID(),1,1,v.pump().commandFence().intent().bootId(),v.valve().latest().bootId(),5,v.asOf()));
    if(jdbc.queryForObject("SELECT count(*) FROM pump_command",Integer.class)!=2||jdbc.queryForObject("SELECT count(*) FROM circuit_demo_command",Integer.class)!=2||jdbc.queryForObject("SELECT count(*) FROM irrigation_session_action",Integer.class)!=5)throw new AssertionError("Unexpected command count");
    var evidence=mapper.createObjectNode();evidence.set("completed",mapper.valueToTree(completed));evidence.set("prepared",mapper.valueToTree(prepared));evidence.set("viewBeforeRestart",mapper.valueToTree(sessions.snapshot("PC1")));evidence.set("history",mapper.valueToTree(app.getBean(vn.smartfarm.iot.control.PumpCircuitHistory.class).list(Instant.now().minusSeconds(3600),Instant.now().plusSeconds(1),"PC1","ALL",50,null)));Files.writeString(Path.of("/tmp/irrigation-session-evidence.json"),mapper.writerWithDefaultPrettyPrinter().writeValueAsString(evidence),StandardOpenOption.CREATE_NEW);
    System.out.println("PASS five explicit operator steps committed before fake IO; one CLOSED_CONFIRMED and one PREPARED for restart test; no real MQTT/AWS/GPIO");
   }
  }
 }
 static String run(String... arguments)throws Exception{var command=new ArrayList<String>();command.add("/tmp/pump-route-packet");command.addAll(List.of(arguments));var p=new ProcessBuilder(command).start();if(!p.waitFor(5,java.util.concurrent.TimeUnit.SECONDS)){p.destroyForcibly();throw new IllegalStateException("Native fixture timeout");}if(p.exitValue()!=0)throw new IllegalStateException("Native fixture rejected command");return new String(p.getInputStream().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);}
 static void receiveValve(CircuitValveControl control,ObjectMapper mapper,String lines)throws Exception{for(String line:lines.lines().toList()){var p=mapper.readTree(line);control.receive(CircuitValveControl.topic(p.path("actuatorId").asText(),p.has("commandId")?"ack":"status"),line.getBytes(java.nio.charset.StandardCharsets.UTF_8),false);}}
 static void receivePump(vn.smartfarm.iot.control.PumpService pump,String lines){for(String line:lines.lines().toList())pump.receive(line.contains("\"commandId\"")?"smartfarm/FARM001/PUMP01/ack":"smartfarm/FARM001/PUMP01/status",line.getBytes(java.nio.charset.StandardCharsets.UTF_8));}

}
