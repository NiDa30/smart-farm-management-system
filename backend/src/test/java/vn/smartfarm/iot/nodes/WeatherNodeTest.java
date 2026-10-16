package vn.smartfarm.iot.nodes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
@AutoConfigureMockMvc @EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class WeatherNodeTest {
 @Autowired NodeInventory nodes; @Autowired TelemetryRouter router; @Autowired WaterTelemetry parser;
 @Autowired WaterHistory history; @Autowired ObjectMapper mapper; @Autowired JdbcTemplate jdbc; @Autowired MockMvc mvc;
 String topic="smartfarm/FARM001/WEATHER01/telemetry";
 @BeforeEach void before(){clean();}
 @AfterEach void clean(){jdbc.update("DELETE FROM iot_node WHERE node_id IN ('WEATHER01','WEATHER02')");}
 ObjectNode declaration(){
  var d=mapper.createObjectNode().put("nodeId","WEATHER01").put("name","Thời tiết vườn").put("areaId","AREA001");
  var c=d.putArray("channels");c.addObject().put("channelId","RAIN").put("metric","RAIN_DETECTED").put("unit","boolean").putNull("calibrationVersion");
  c.addObject().put("channelId","LIGHT").put("metric","LIGHT_ILLUMINANCE").put("unit","lux").put("calibrationVersion","SIM_LUX_V1");return d;
 }
 void register()throws Exception {mvc.perform(post("/api/v1/nodes/weather").contentType("application/json").content(mapper.writeValueAsBytes(declaration()))).andExpect(status().isCreated()).andExpect(header().string("Location","/api/v1/nodes/WEATHER01")).andExpect(jsonPath("$.nodeType").value("WEATHER"));}
 ObjectNode packet(long seq,Instant at)throws Exception {try(var stream=getClass().getResourceAsStream("/weather-firmware-packet.json")){assertNotNull(stream);return ((ObjectNode)mapper.readTree(stream)).put("sequence",seq).put("timestamp",at.toString());}}
 ObjectNode reading(ObjectNode p,int n){return (ObjectNode)p.path("readings").get(n);}
 boolean store(ObjectNode p)throws Exception{return router.store(topic,mapper.writeValueAsBytes(p));}
 NodeInventory.Node weather(){return nodes.snapshot().nodes().stream().filter(n->n.nodeId().equals("WEATHER01")).findFirst().orElseThrow();}
 long samples(){return jdbc.queryForObject("SELECT count(*) FROM node_sample WHERE node_id='WEATHER01'",Long.class);}
 @Test void nativeFirmwarePacketStoresBooleanRainAndLuxWithoutCommandsOrRuleChanges()throws Exception {
  var before=jdbc.queryForMap("SELECT (SELECT count(*) FROM pump_command) AS commands,(SELECT count(*) FROM watering_run) AS runs,(SELECT count(*) FROM telemetry) AS legacy,(SELECT row_to_json(w)::text FROM watering_rule w WHERE singleton=1) AS rule");
  register();assertTrue(store(packet(1,Instant.now())));var n=weather();assertEquals(2,n.channels().size());assertEquals(0,n.actuators().size());
  assertEquals(200000.0,n.channels().getFirst().latest().value());assertEquals(false,n.channels().getLast().latest().value());
  assertEquals(before,jdbc.queryForMap("SELECT (SELECT count(*) FROM pump_command) AS commands,(SELECT count(*) FROM watering_run) AS runs,(SELECT count(*) FROM telemetry) AS legacy,(SELECT row_to_json(w)::text FROM watering_rule w WHERE singleton=1) AS rule"));
 }
 @Test void declarationRejectsMixedMetricsWrongUnitsAndPartialWrites()throws Exception {
  for(String field:List.of("metric","unit","calibrationVersion")){
   var d=declaration();((ObjectNode)d.path("channels").get(1)).put(field,field.equals("metric")?"FLOW_RATE":field.equals("unit")?"mm":" ");
   mvc.perform(post("/api/v1/nodes/weather").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isBadRequest());assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM iot_node WHERE node_id='WEATHER01'",Integer.class));
  }
  var d=declaration().put("areaId","MISSING");mvc.perform(post("/api/v1/nodes/weather").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isBadRequest());
 }
 @Test void identitiesAreSharedAndMultipleWeatherNodesCanBeDeclared()throws Exception {
  register();mvc.perform(post("/api/v1/nodes/weather").contentType("application/json").content(mapper.writeValueAsBytes(declaration()))).andExpect(status().isConflict());
  var d=declaration().put("nodeId","WEATHER02");mvc.perform(post("/api/v1/nodes/weather").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isCreated());
  for(String id:List.of("ENV01","PUMP01","IRRIGATION01","VALVE01")){d.put("nodeId",id);mvc.perform(post("/api/v1/nodes/weather").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isConflict());}
 }
 @Test void duplicateOrMissingChannelsAndWrongNodeTypesAreRejected()throws Exception {
  var d=declaration();((ObjectNode)d.path("channels").get(1)).put("channelId","RAIN");assertThrows(IllegalArgumentException.class,()->nodes.registerWeather(d));
  assertThrows(IllegalArgumentException.class,()->nodes.registerWater(declaration()));assertThrows(IllegalArgumentException.class,()->nodes.registerSoil(declaration()));
 }
 @Test void onlyBooleansAreRainAndLuxMustBeFiniteWithinContract()throws Exception {
  register();for(var bad:List.of(mapper.getNodeFactory().numberNode(0),mapper.getNodeFactory().textNode("false"))){var p=packet(1,Instant.now());reading(p,0).set("value",bad);assertThrows(IllegalArgumentException.class,()->store(p));}
  for(double bad:List.of(-0.1,200000.1,Double.POSITIVE_INFINITY)){var p=packet(1,Instant.now());reading(p,1).put("value",bad);assertThrows(IllegalArgumentException.class,()->store(p));}
  var p=packet(1,Instant.now());reading(p,1).put("value","123");assertThrows(IllegalArgumentException.class,()->store(p));assertEquals(0,samples());
 }
 @Test void faultMustRemainNullAndCannotBecomeNoRainOrDarkness()throws Exception {
  register();var p=packet(1,Instant.now());reading(p,0).put("quality","SENSOR_FAULT");assertThrows(IllegalArgumentException.class,()->store(p));
  reading(p,0).putNull("value");reading(p,1).put("quality","SENSOR_FAULT").putNull("value");assertTrue(store(p));assertTrue(weather().channels().stream().allMatch(c->c.latest().value()==null&&c.latest().quality().equals("SENSOR_FAULT")));
 }
 @Test void mismatchedTopicCalibrationOrChannelRejectWholePacket()throws Exception {
  register();var good=packet(1,Instant.now());assertThrows(IllegalArgumentException.class,()->router.store("smartfarm/FARM002/WEATHER01/telemetry",mapper.writeValueAsBytes(good)));
  for(String field:List.of("channelId","calibrationVersion","unit")){var p=good.deepCopy();reading(p,1).put(field,"OTHER");assertThrows(IllegalArgumentException.class,()->store(p));assertEquals(0,samples());}
 }
 @Test void waterOnlyParserDoesNotAcceptWeatherButV2RouterDoes()throws Exception {
  register();var p=packet(1,Instant.now());assertThrows(IllegalArgumentException.class,()->parser.parse(mapper.writeValueAsBytes(p)));assertTrue(store(p));
 }
 @Test void duplicateCannotChangeRainValueOrSourceAndOldPacketCannotRefreshLatest()throws Exception {
  register();var p=packet(2,Instant.now());assertTrue(store(p));p.put("dataSource","PHYSICAL");reading(p,0).put("value",true);assertFalse(store(p));
  var old=packet(1,Instant.now().minusSeconds(60));reading(old,0).put("value",true);assertTrue(store(old));var r=weather().channels().getLast().latest();assertEquals(false,r.value());assertEquals("SIMULATOR",r.dataSource());assertEquals(2,r.sequence());
 }
 @Test void partialLightPacketDoesNotRefreshRain()throws Exception {
  register();var at=Instant.now().minusSeconds(60).truncatedTo(java.time.temporal.ChronoUnit.MICROS);assertTrue(store(packet(1,at)));var p=packet(2,Instant.now());p.withArray("readings").remove(0);assertTrue(store(p));
  var n=weather();assertEquals(2,n.channels().getFirst().latest().sequence());assertEquals(1,n.channels().getLast().latest().sequence());assertEquals(at.truncatedTo(java.time.temporal.ChronoUnit.MICROS),n.channels().getLast().latest().observedAt());
 }
 @Test void historyPreservesBooleanFalseZeroFaultAndSourceWithScopedCursor()throws Exception {
  register();Instant to=Instant.now().plusSeconds(1),from=to.minusSeconds(3600);assertTrue(store(packet(1,to.minusSeconds(3))));
  var p=packet(2,to.minusSeconds(2));reading(p,0).put("quality","SENSOR_FAULT").putNull("value");reading(p,1).put("value",0);assertTrue(store(p));
  var a=history.list("WEATHER01","RAIN",from,to,"SIMULATOR",null,1,null);assertNull(a.items().getFirst().value());var b=history.list("WEATHER01","RAIN",from,to,"SIMULATOR",null,1,a.nextCursor());assertEquals(false,b.items().getFirst().value());
  assertThrows(Exception.class,()->history.list("WEATHER01","LIGHT",from,to,"SIMULATOR",null,1,a.nextCursor()));assertEquals(0.0,history.list("WEATHER01","LIGHT",from,to,null,null,50,null).items().getFirst().value());
 }
 @Test void futureTimesUnknownSourceDuplicateJsonAndUnexpectedFieldsAreRejected()throws Exception {
  register();assertThrows(IllegalArgumentException.class,()->store(packet(1,Instant.now().plusSeconds(30))));var p=packet(1,Instant.now());p.put("dataSource","FORECAST");assertThrows(IllegalArgumentException.class,()->store(p));p.put("dataSource","SIMULATOR").put("rainfallMm",2);assertThrows(IllegalArgumentException.class,()->store(p));
  var bytes=mapper.writeValueAsString(packet(1,Instant.now())).replace("\"schemaVersion\":2","\"schemaVersion\":2,\"schemaVersion\":2");assertThrows(IllegalArgumentException.class,()->router.store(topic,bytes.getBytes(java.nio.charset.StandardCharsets.UTF_8)));assertEquals(0,samples());
 }
 @Test void historyAndInventoryReadsCannotGenerateCommandsOrRefreshClock()throws Exception {
  register();assertTrue(store(packet(1,Instant.now().minusSeconds(60))));var before=jdbc.queryForObject("SELECT row_to_json(s)::text FROM node_sample s WHERE node_id='WEATHER01'",String.class);
  mvc.perform(get("/api/v1/nodes/WEATHER01")).andExpect(status().isOk()).andExpect(jsonPath("$.channels[1].latest.value").value(false));
  mvc.perform(get("/api/v1/nodes/WEATHER01/channels/RAIN/history")).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].value").value(false));assertEquals(before,jdbc.queryForObject("SELECT row_to_json(s)::text FROM node_sample s WHERE node_id='WEATHER01'",String.class));
 }
}
