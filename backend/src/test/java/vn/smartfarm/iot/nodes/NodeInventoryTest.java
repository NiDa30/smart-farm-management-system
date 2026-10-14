package vn.smartfarm.iot.nodes;

import com.fasterxml.jackson.databind.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
 "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class NodeInventoryTest {
 @Autowired NodeInventory nodes;@Autowired TelemetryRouter router;@Autowired ObjectMapper mapper;
 @Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
 final String topic="smartfarm/FARM001/WATER01/telemetry";
 final String declaration="""
 {"nodeId":"WATER01","name":"Trạm nước","areaId":"AREA001","channels":[
 {"channelId":"LOW","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
 {"channelId":"FLOW","metric":"FLOW_RATE","unit":"L/min","calibrationVersion":"FLOW-V1"}]}
 """;
 @BeforeEach void before(){clean();}
 @AfterEach void clean(){jdbc.execute("DELETE FROM iot_node WHERE node_type='WATER'");}
 void register() throws Exception {mvc.perform(post("/api/v1/nodes").contentType("application/json").content(declaration)).andExpect(status().isCreated()).andExpect(header().string("Location","/api/v1/nodes/WATER01"));}
 byte[] packet(long sequence,Instant time) throws Exception {
  return mapper.writeValueAsBytes(mapper.readTree("""
   {"schemaVersion":2,"deviceId":"WATER01","bootId":"31000000-0000-4000-8000-000000000001",
   "sequence":%d,"timestamp":"%s","uptimeMs":1000,"readings":[
   {"channelId":"LOW","metric":"WATER_PRESENT","unit":"boolean","quality":"VALID","value":false,"calibrationVersion":null},
   {"channelId":"FLOW","metric":"FLOW_RATE","unit":"L/min","quality":"VALID","value":0,"calibrationVersion":"FLOW-V1"}]}
   """.formatted(sequence,time)));
 }
 long samples(){return jdbc.queryForObject("SELECT COUNT(*) FROM node_sample",Long.class);}
 NodeInventory.Node water(){return nodes.snapshot().nodes().stream().filter(n->n.nodeId().equals("WATER01")).findFirst().orElseThrow();}
 @Test void migrationMapsLegacyNodeChannelsAndActuator() throws Exception {
  var env=nodes.snapshot().nodes().stream().filter(n->n.nodeId().equals("ENV01")).findFirst().orElseThrow();
  assertEquals(1,env.telemetryVersion());assertEquals(3,env.channels().size());assertEquals("PUMP01",env.actuators().getFirst().actuatorId());
  mvc.perform(get("/api/v1/nodes")).andExpect(status().isOk()).andExpect(jsonPath("$.farmId").value("FARM001"));
  mvc.perform(get("/api/v1/nodes/MISSING")).andExpect(status().isNotFound());
 }
 @Test void registersAndStoresFalseAndZeroWithoutFabricatedEnvironment() throws Exception {
  register();assertTrue(water().channels().stream().allMatch(c->c.latest()==null));
  assertTrue(router.store(topic,packet(1,Instant.now())));assertEquals(1,samples());
  mvc.perform(get("/api/v1/nodes/WATER01")).andExpect(status().isOk()).andExpect(jsonPath("$.telemetryVersion").value(2));
  var low=water().channels().stream().filter(c->c.channelId().equals("LOW")).findFirst().orElseThrow();
  assertEquals(false,low.latest().value());assertEquals("VALID",low.latest().quality());
  var flow=water().channels().stream().filter(c->c.channelId().equals("FLOW")).findFirst().orElseThrow();
  assertEquals(0.0,flow.latest().value());assertEquals("FLOW-V1",flow.latest().calibrationVersion());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM telemetry WHERE device_id='WATER01'",Integer.class));
 }
 @Test void rejectsUnknownTopicChannelUnitCalibrationAndMixedBatchAtomically() throws Exception {
  register();var good=packet(1,Instant.now());
  for(String wrong:List.of(topic.replace("FARM001","FARM002"),topic.replace("WATER01","ENV01")))assertThrows(IllegalArgumentException.class,()->router.store(wrong,good));
  String text=new String(good,java.nio.charset.StandardCharsets.UTF_8);
  for(String wrong:List.of(text.replace("\"LOW\"","\"OTHER\""),text.replace("FLOW-V1","FLOW-V2"),text.replace("L/min","litres")))
   assertThrows(IllegalArgumentException.class,()->router.store(topic,wrong.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
  assertEquals(0,samples());
  jdbc.execute("DELETE FROM iot_node WHERE node_id='WATER01'");assertThrows(IllegalArgumentException.class,()->router.store(topic,good));
 }
 @Test void qosDuplicatesConcurrentAndReorderedPacketsCannotReplaceNewerSource() throws Exception {
  register();var now=Instant.now();var bytes=packet(2,now);
  try(var executor=java.util.concurrent.Executors.newFixedThreadPool(4)){
   var results=executor.invokeAll(Collections.nCopies(8,()->router.store(topic,bytes)));
   int count=0;for(var result:results)if((Boolean)result.get())count++;assertEquals(1,count);
  }
  assertEquals(1,samples());assertTrue(router.store(topic,packet(1,now)));
  assertTrue(water().channels().stream().allMatch(c->c.latest().sequence()==2));
 }
 @Test void latestFaultIsNullAndDoesNotFallBackToEarlierGoodValue() throws Exception {
  register();router.store(topic,packet(1,Instant.now().minusSeconds(2)));
  var value=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(packet(2,Instant.now()));
  var reading=(com.fasterxml.jackson.databind.node.ObjectNode)value.path("readings").get(0);
  reading.put("quality","SENSOR_FAULT");reading.putNull("value");router.store(topic,mapper.writeValueAsBytes(value));
  var low=water().channels().stream().filter(c->c.channelId().equals("LOW")).findFirst().orElseThrow();
  assertNull(low.latest().value());assertEquals("SENSOR_FAULT",low.latest().quality());
 }
 @Test void creationRejectsInvalidDeclarationsDuplicatesAndReservedActuator() throws Exception {
  register();mvc.perform(post("/api/v1/nodes").contentType("application/json").content(declaration)).andExpect(status().isConflict());
  mvc.perform(post("/api/v1/nodes").contentType("application/json").content(declaration.replace("WATER01","PUMP01"))).andExpect(status().isConflict());
  for(String bad:List.of(declaration.replace("WATER01","WATER02").replace("AREA001","NO_AREA"),declaration.replace("L/min","kWh"),declaration.replace("\"name\":","\"name\":\"hidden\",\"name\":")))
   mvc.perform(post("/api/v1/nodes").contentType("application/json").content(bad)).andExpect(status().isBadRequest());
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM iot_node WHERE node_type='WATER'",Integer.class));
 }
 @Test void legacyRegistrationSynchronizesAndCannotReuseWaterIdentity() throws Exception {
  register();
  mvc.perform(post("/api/v1/sensors").contentType("application/json").content("{\"deviceId\":\"WATER01\",\"name\":\"Wrong\",\"areaId\":\"AREA001\"}")).andExpect(status().isConflict());
  assertFalse(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM sensor_device WHERE device_id='WATER01')",Boolean.class));
  try {
   mvc.perform(post("/api/v1/sensors").contentType("application/json").content("{\"deviceId\":\"ENVCHAN\",\"name\":\"New\",\"areaId\":\"AREA001\"}")).andExpect(status().isCreated());
   assertEquals(3,jdbc.queryForObject("SELECT COUNT(*) FROM iot_channel WHERE node_id='ENVCHAN'",Integer.class));
  }finally{jdbc.update("DELETE FROM sensor_device WHERE device_id='ENVCHAN'");}
 }
 @Test void v1RouterStillPersistsEnvironmentAndRefusesWaterDisguisedAsEnvironment() throws Exception {
  long seq=System.nanoTime();String value="""
  {"schemaVersion":1,"deviceId":"ENV01","bootId":"32000000-0000-4000-8000-000000000001","sequence":%d,"timestamp":"%s",
   "temperature":25,"humidity":50,"soilMoisture":40,"uptimeMs":1}
  """.formatted(seq,Instant.now());
  assertTrue(router.store("smartfarm/FARM001/ENV01/telemetry",value.getBytes()));
  register();assertThrows(IllegalArgumentException.class,()->router.store(topic,value.replace("ENV01","WATER01").getBytes()));
  assertThrows(IllegalArgumentException.class,()->router.store("smartfarm/FARM001/ENV01/telemetry",packet(1,Instant.now())));
 }
 @Test void provenancePersistsPerSampleAndDuplicateCannotReclassifyIt() throws Exception {
  register();var node=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(packet(1,Instant.now()));
  node.put("dataSource","SIMULATOR");assertTrue(router.store(topic,mapper.writeValueAsBytes(node)));
  assertTrue(water().channels().stream().allMatch(c->c.latest().dataSource().equals("SIMULATOR")));
  node.put("dataSource","PHYSICAL");assertFalse(router.store(topic,mapper.writeValueAsBytes(node)));
  assertTrue(water().channels().stream().allMatch(c->c.latest().dataSource().equals("SIMULATOR")));
  node.put("sequence",2);node.put("timestamp",Instant.now().toString());node.remove("dataSource");assertTrue(router.store(topic,mapper.writeValueAsBytes(node)));
  assertTrue(water().channels().stream().allMatch(c->c.latest().dataSource().equals("UNSPECIFIED")));
 }
 @Test void compiledFirmwarePacketStoresThreeChannelsWithoutEnvironmentTelemetry() throws Exception {
  long commandsBefore=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);
  String input=declaration.replace("\"FLOW-V1\"","null");
  var registration=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(input);
  var channels=(com.fasterxml.jackson.databind.node.ArrayNode)registration.path("channels");
  channels.add(mapper.createObjectNode().put("channelId","HIGH").put("metric","WATER_PRESENT").put("unit","boolean").putNull("calibrationVersion"));
  nodes.registerWater(registration);
  try(var stream=getClass().getResourceAsStream("/water-firmware-packet.json")){
   assertNotNull(stream);var payload=(com.fasterxml.jackson.databind.node.ObjectNode)mapper.readTree(stream);payload.put("timestamp",Instant.now().toString());
   assertTrue(router.store(topic,mapper.writeValueAsBytes(payload)));
   assertEquals(3,water().channels().size());
   assertTrue(water().channels().stream().allMatch(c->c.latest()!=null&&c.latest().dataSource().equals("SIMULATOR")));
   assertEquals(6.0,water().channels().stream().filter(c->c.channelId().equals("FLOW")).findFirst().orElseThrow().latest().value());
   assertEquals(commandsBefore,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));
  }
 }
}
