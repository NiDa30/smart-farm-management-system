import com.fasterxml.jackson.databind.*;import java.nio.file.*;import java.time.*;import java.util.*;
import org.springframework.boot.WebApplicationType;import org.springframework.boot.builder.SpringApplicationBuilder;import org.springframework.jdbc.core.JdbcTemplate;
import vn.smartfarm.SmartFarmApplication;import vn.smartfarm.iot.nodes.*;import vn.smartfarm.iot.zones.IrrigationZones;import vn.smartfarm.iot.irrigation.*;import vn.smartfarm.iot.control.*;
/** Native initial observations -> durable preparation only. Refuses reseed and any command publish. */
public class QueueHandoffSmokeFixture {
 public static void main(String[] args)throws Exception {
  String schema="queue_handoff_smoke";Path evidence=Path.of("/tmp/queue-handoff-evidence.json");
  if(!("jdbc:postgresql://127.0.0.1:55439/smartfarm_test?currentSchema="+schema).equals(System.getenv("SMARTFARM_DB_URL"))||!"false".equals(System.getenv("SMARTFARM_MQTT_ENABLED"))||Files.exists(evidence))throw new IllegalArgumentException("Isolated schema/MQTT disabled/no replay required");
  try(var app=new SpringApplicationBuilder(SmartFarmApplication.class).web(WebApplicationType.NONE).properties("spring.flyway.schemas="+schema,"spring.flyway.default-schema="+schema,"smartfarm.irrigation-queue.scheduling-enabled=false").run()){
   var jdbc=app.getBean(JdbcTemplate.class);var mapper=app.getBean(ObjectMapper.class);var nodes=app.getBean(NodeInventory.class);var valves=app.getBean(CircuitValveControl.class);var pump=app.getBean(PumpService.class);var queue=app.getBean(IrrigationQueue.class);var handoff=app.getBean(IrrigationQueueHandoff.class);
   if(!schema.equals(jdbc.queryForObject("SELECT current_schema()",String.class))||jdbc.queryForObject("SELECT count(*) FROM irrigation_zone",Integer.class)!=0||app.getBeanNamesForType(CommandTransport.class).length!=0||app.getBeanNamesForType(CircuitValveTransport.class).length!=0)throw new IllegalStateException("Real transport/reseed forbidden");
   nodes.registerWater(mapper.readTree("""
    {"nodeId":"WATER01","name":"Bồn kiểm thử chuyển phiên","areaId":"AREA001","channels":[
    {"channelId":"LOW","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
    {"channelId":"HIGH","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
    {"channelId":"FLOW","metric":"FLOW_RATE","unit":"L/min","calibrationVersion":"SIM_FLOW_V1"}]}
    """));
   var soil=mapper.createObjectNode().put("nodeId","PSOIL1").put("name","Đất kiểm thử").put("areaId","AREA001");var channels=soil.putArray("channels");for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").putNull("calibrationVersion");nodes.registerSoil(soil);
   var z=mapper.createObjectNode().put("zoneId","PZONE1").put("name","Vùng kiểm thử chuyển hàng chờ").put("areaId","AREA001").put("soilNodeId","PSOIL1").put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);z.set("channelIds",mapper.valueToTree(List.of("SOIL1","SOIL2","SOIL3")));app.getBean(IrrigationZones.class).create(z);
   app.getBean(IrrigationCircuits.class).create(mapper.readTree("{\"circuitId\":\"PC1\",\"name\":\"Nhánh kiểm thử chuyển phiên\",\"zoneId\":\"PZONE1\",\"zoneRevision\":1,\"controllerId\":\"IRRIGATION18\",\"valveId\":\"VALVE18\",\"pumpId\":\"PUMP01\",\"waterNodeId\":\"WATER01\",\"lowChannelId\":\"LOW\",\"flowChannelId\":\"FLOW\",\"expectedSource\":\"SIMULATOR\"}"));
   IrrigationSessionSmokeFixture.receivePump(pump,IrrigationSessionSmokeFixture.run("pump"));IrrigationSessionSmokeFixture.receiveValve(valves,mapper,IrrigationSessionSmokeFixture.run("valve","VALVE18"));
   var nativeProcess=new ProcessBuilder("/tmp/water-admission-packet",Instant.now().toString()).start();if(!nativeProcess.waitFor(5,java.util.concurrent.TimeUnit.SECONDS)||nativeProcess.exitValue()!=0)throw new AssertionError();String first=new String(nativeProcess.getInputStream().readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).lines().findFirst().orElseThrow();app.getBean(TelemetryRouter.class).store("smartfarm/FARM001/WATER01/telemetry",first.getBytes(java.nio.charset.StandardCharsets.UTF_8));app.getBean(CircuitWaterGate.class).save("PC1",new CircuitWaterGate.Request(0,1,null,true));
   app.getBeanFactory().registerSingleton("syntheticCircuitTransport",new CircuitValveTransport(){public boolean circuitValveConnected(String id){return id.equals("VALVE18");}public void publishCircuitValve(String id,byte[] bytes){throw new AssertionError("Preparation must not dispatch valve");}});
   app.getBeanFactory().registerSingleton("syntheticPumpTransport",new CommandTransport(){public boolean controlConnected(){return true;}public void publishCommand(byte[] bytes){throw new AssertionError("Preparation must not dispatch pump");}});
   var ids=new ArrayList<UUID>();for(int seconds:List.of(5,6)){UUID id=UUID.randomUUID();ids.add(id);queue.enqueue(mapper.createObjectNode().put("requestId",id.toString()).put("zoneId","PZONE1").put("zoneRevision",1).put("circuitId","PC1").put("circuitRevision",1).put("durationSeconds",seconds).put("requestedAt",Instant.now().toString()));}
   var v=handoff.snapshot(ids.getFirst());if(!v.canPrepare())throw new AssertionError(v.reason());var r=v.review();var input=new IrrigationQueueHandoff.Request(v.queueRevision(),new IrrigationSession.Start(UUID.randomUUID(),r.circuitRevision(),r.zoneRevision(),r.pumpBootId(),r.valveBootId(),5,r.reviewedAt()));var receipt=handoff.prepare(ids.getFirst(),input);
   if(!receipt.session().phase().equals("PREPARED")||!queue.lookup(ids.getFirst()).state().equals("HANDED_OFF")||!queue.lookup(ids.get(1)).state().equals("QUEUED")||!handoff.prepare(ids.getFirst(),input).equals(receipt)||jdbc.queryForObject("SELECT count(*) FROM irrigation_queue_handoff",Integer.class)!=1)throw new AssertionError("Expected one preparation with exact duplicate result");
   for(String table:List.of("pump_command","circuit_demo_command","irrigation_session_action","watering_run"))if(jdbc.queryForObject("SELECT count(*) FROM "+table,Integer.class)!=0)throw new AssertionError("No dispatch/run/action expected");
   Files.writeString(evidence,mapper.writeValueAsString(Map.of("receipt",receipt,"queue",queue.snapshot(),"realTransport",false)),StandardOpenOption.CREATE_NEW);
   System.out.println("PASS native initial observations->FIFO head prepared atomically; exact duplicate; next waiting; zero commands/actions/runs");
  }
 }
}
