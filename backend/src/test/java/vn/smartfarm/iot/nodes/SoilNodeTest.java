package vn.smartfarm.iot.nodes;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
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
class SoilNodeTest {
 @Autowired NodeInventory nodes;@Autowired TelemetryRouter router;@Autowired WaterTelemetry parser;@Autowired WaterHistory history;
 @Autowired ObjectMapper mapper;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
 final String topic="smartfarm/FARM001/SOIL01/telemetry";
 @BeforeEach void before(){clean();}
 @AfterEach void clean(){jdbc.execute("DELETE FROM iot_node WHERE node_type='SOIL'");}
 ObjectNode declaration(){
  var d=mapper.createObjectNode().put("nodeId","SOIL01").put("name","Dãy rau 1").put("areaId","AREA001");
  var channels=d.putArray("channels");
  for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").put("calibrationVersion","SIM_LINEAR_V1");
  return d;
 }
 void register() throws Exception {mvc.perform(post("/api/v1/nodes/soil").contentType("application/json").content(mapper.writeValueAsBytes(declaration())))
   .andExpect(status().isCreated()).andExpect(header().string("Location","/api/v1/nodes/SOIL01"));}
 ObjectNode packet(long seq,Instant time) throws Exception {
  try(var stream=getClass().getResourceAsStream("/soil-firmware-packet.json")){
   assertNotNull(stream);var p=(ObjectNode)mapper.readTree(stream);p.put("sequence",seq).put("timestamp",time.toString());return p;
  }
 }
 ObjectNode reading(ObjectNode packet,int i){return (ObjectNode)packet.path("readings").get(i);}
 boolean store(ObjectNode p)throws Exception{return router.store(topic,mapper.writeValueAsBytes(p));}
 long samples(){return jdbc.queryForObject("SELECT COUNT(*) FROM node_sample WHERE node_id='SOIL01'",Long.class);}
 NodeInventory.Node soil(){return nodes.snapshot().nodes().stream().filter(n->n.nodeId().equals("SOIL01")).findFirst().orElseThrow();}
 @Test void nativePacketStoresThreeIndependentPointsWithoutCommandsOrLegacyTelemetry()throws Exception {
  long commands=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class),legacy=jdbc.queryForObject("SELECT COUNT(*) FROM telemetry",Long.class);
  register();assertTrue(store(packet(1,Instant.now())));var n=soil();
  assertEquals("SOIL",n.nodeType());assertEquals(0,n.actuators().size());assertEquals(3,n.channels().size());
  assertEquals(0.0,n.channels().get(0).latest().value());assertEquals(100.0,n.channels().get(1).latest().value());
  assertNull(n.channels().get(2).latest().value());assertEquals("SENSOR_FAULT",n.channels().get(2).latest().quality());
  assertTrue(n.channels().stream().allMatch(c->c.latest().dataSource().equals("SIMULATOR")));
  assertEquals(commands,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));assertEquals(legacy,jdbc.queryForObject("SELECT COUNT(*) FROM telemetry",Long.class));
 }
 @Test void invalidDeclarationsDoNotCreatePartialNodesAndIdentitiesAreShared()throws Exception {
  for(String field:List.of("metric","unit","calibrationVersion")){
   var d=declaration();((ObjectNode)d.path("channels").get(2)).put(field,field.equals("metric")?"FLOW_RATE":field.equals("unit")?"L/min":" ");
   mvc.perform(post("/api/v1/nodes/soil").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isBadRequest());assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM iot_node WHERE node_type='SOIL'",Integer.class));
  }
  var bad=declaration();bad.put("areaId","MISSING");mvc.perform(post("/api/v1/nodes/soil").contentType("application/json").content(mapper.writeValueAsBytes(bad))).andExpect(status().isBadRequest());
  for(String id:List.of("ENV01","PUMP01")){var d=declaration().put("nodeId",id);mvc.perform(post("/api/v1/nodes/soil").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isConflict());}
  register();mvc.perform(post("/api/v1/nodes/soil").contentType("application/json").content(mapper.writeValueAsBytes(declaration()))).andExpect(status().isConflict());
  mvc.perform(post("/api/v1/sensors").contentType("application/json").content("{\"deviceId\":\"SOIL01\",\"name\":\"Wrong\",\"areaId\":\"AREA001\"}")).andExpect(status().isConflict());
 }
 @Test void wrongTopicUndeclaredChannelAndCalibrationRejectEntirePacket()throws Exception {
  register();var good=packet(1,Instant.now());assertThrows(IllegalArgumentException.class,()->router.store("smartfarm/FARM002/SOIL01/telemetry",mapper.writeValueAsBytes(good)));
  for(String field:List.of("channelId","metric","unit","calibrationVersion")){
   var p=good.deepCopy();reading(p,2).put(field,switch(field){case "channelId"->"OTHER";case "metric"->"FLOW_RATE";case "unit"->"L/min";default->"OTHER-V2";});
   assertThrows(IllegalArgumentException.class,()->store(p));assertEquals(0,samples());
  }
  assertThrows(IllegalArgumentException.class,()->nodes.storeWater(topic,parser.parseChannels(mapper.writeValueAsBytes(good))));
  assertTrue(store(good));
 }
 @Test void rejectsOutOfRangeCoercionAndFaultWithNumberIncludingFinalChannel()throws Exception {
  register();for(double value:List.of(-0.1,100.1,Double.POSITIVE_INFINITY)){
   var p=packet(1,Instant.now());reading(p,2).put("quality","VALID").put("value",value);assertThrows(IllegalArgumentException.class,()->store(p));
  }
  var p=packet(1,Instant.now());reading(p,2).put("value",0);assertThrows(IllegalArgumentException.class,()->store(p));
  reading(p,2).put("quality","VALID").put("value","0");assertThrows(IllegalArgumentException.class,()->store(p));assertEquals(0,samples());
 }
 @Test void duplicateCannotReclassifySourceAndOldPartialPacketDoesNotOverwriteNewPoint()throws Exception {
  register();Instant now=Instant.now();var p=packet(2,now);assertTrue(store(p));p.put("dataSource","PHYSICAL");reading(p,0).put("value",99);assertFalse(store(p));
  assertEquals("SIMULATOR",soil().channels().getFirst().latest().dataSource());assertEquals(0.0,soil().channels().getFirst().latest().value());
  var old=packet(1,now.minusSeconds(60));old.withArray("readings").remove(2);old.withArray("readings").remove(1);reading(old,0).put("value",50);assertTrue(store(old));
  assertTrue(soil().channels().stream().allMatch(c->c.latest().sequence()==2));
 }
 @Test void newerPartialPacketDoesNotRefreshOtherPoints()throws Exception {
  register();assertTrue(store(packet(1,Instant.now().minusSeconds(60))));var p=packet(2,Instant.now());
  p.withArray("readings").remove(2);p.withArray("readings").remove(1);assertTrue(store(p));
  assertEquals(2,soil().channels().getFirst().latest().sequence());assertEquals(1,soil().channels().get(1).latest().sequence());
 }
 @Test void soilHistoryKeepsZeroFaultSourceAndScopesCursor()throws Exception {
  register();Instant end=Instant.now().plusSeconds(1),start=end.minusSeconds(3600);
  assertTrue(store(packet(1,end.minusSeconds(3))));var p=packet(2,end.minusSeconds(2));reading(p,0).put("quality","SENSOR_FAULT").putNull("value");assertTrue(store(p));
  var page=history.list("SOIL01","SOIL1",start,end,"SIMULATOR",null,1,null);assertNull(page.items().getFirst().value());assertNotNull(page.nextCursor());
  var next=history.list("SOIL01","SOIL1",start,end,"SIMULATOR",null,1,page.nextCursor());assertEquals(0.0,next.items().getFirst().value());assertNull(next.nextCursor());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->history.list("SOIL01","SOIL2",start,end,"SIMULATOR",null,1,page.nextCursor()));
  mvc.perform(get("/api/v1/nodes/SOIL01/channels/SOIL3/history")).andExpect(status().isOk()).andExpect(jsonPath("items[0].quality").value("SENSOR_FAULT"));
 }
 @Test void strictWaterParserStillRefusesSoilAndSoilNeverCreatesWaterAlertCursor()throws Exception {
  register();long alerts=jdbc.queryForObject("SELECT COUNT(*) FROM water_alert",Long.class);
  var p=packet(1,Instant.now());assertThrows(IllegalArgumentException.class,()->parser.parse(mapper.writeValueAsBytes(p)));assertTrue(store(p));
  assertEquals(alerts,jdbc.queryForObject("SELECT COUNT(*) FROM water_alert",Long.class));
  String v1="{\"schemaVersion\":1,\"deviceId\":\"SOIL01\"}";
  assertThrows(IllegalArgumentException.class,()->router.store(topic,v1.getBytes()));
 }
}
