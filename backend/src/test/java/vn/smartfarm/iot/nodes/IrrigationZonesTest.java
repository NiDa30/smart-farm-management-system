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
import vn.smartfarm.iot.zones.IrrigationZones;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class IrrigationZonesTest {
 @Autowired IrrigationZones zones;@Autowired NodeInventory nodes;@Autowired TelemetryRouter router;@Autowired ObjectMapper mapper;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
 long commands,runs;
 @BeforeEach void before()throws Exception{clean();commands=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);runs=jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class);register("ZONENODE");}
 @AfterEach void after(){assertEquals(commands,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));assertEquals(runs,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class));clean();}
 void clean(){jdbc.update("DELETE FROM irrigation_zone WHERE zone_id IN ('ZONE01','ZONE02')");jdbc.update("DELETE FROM iot_node WHERE node_id IN ('ZONENODE','ZONENODE2')");}
 void register(String id)throws Exception{
  var d=mapper.createObjectNode().put("nodeId",id).put("name",id).put("areaId","AREA001");var channels=d.putArray("channels");
  for(int i=1;i<=3;i++)channels.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").put("calibrationVersion","SIM_LINEAR_V1");nodes.registerSoil(d);
 }
 ObjectNode config(){var d=mapper.createObjectNode().put("zoneId","ZONE01").put("name","Dãy rau 1").put("areaId","AREA001").put("soilNodeId","ZONENODE").put("expectedSource","SIMULATOR").put("dryThreshold",30).put("wetThreshold",35);d.putArray("channelIds").add("SOIL1").add("SOIL2").add("SOIL3");return d;}
 ObjectNode packet(long seq,Instant at,Double... values){
  var p=mapper.createObjectNode().put("schemaVersion",2).put("deviceId","ZONENODE").put("bootId","44000000-0000-4000-8000-000000000001").put("sequence",seq).put("timestamp",at.toString()).put("uptimeMs",seq*5000).put("dataSource","SIMULATOR");var readings=p.putArray("readings");
  for(int i=0;i<values.length;i++){var c=readings.addObject().put("channelId","SOIL"+(i+1)).put("metric","SOIL_MOISTURE").put("unit","%").put("quality",values[i]==null?"SENSOR_FAULT":"VALID").put("calibrationVersion","SIM_LINEAR_V1");if(values[i]==null)c.putNull("value");else c.put("value",values[i]);}return p;
 }
 void send(ObjectNode p)throws Exception{router.store("smartfarm/FARM001/ZONENODE/telemetry",mapper.writeValueAsBytes(p));}
 @Test void registryWithNoDataCreatesNoAutomaticCommands()throws Exception{
  mvc.perform(post("/api/v1/irrigation-zones").contentType("application/json").content(mapper.writeValueAsBytes(config()))).andExpect(status().isCreated()).andExpect(header().string("Location","/api/v1/irrigation-zones/ZONE01")).andExpect(jsonPath("assessment.state").value("UNAVAILABLE"));
  var view=zones.find("ZONE01");assertEquals(1,view.config().revision());assertTrue(view.points().stream().allMatch(p->p.state().equals("MISSING")));assertNull(view.assessment().dryCount());
 }
 @Test void coherentFreshMajorityAndMixedSurveyRetainZero()throws Exception{
  zones.create(config());send(packet(1,Instant.now().minusSeconds(3),0.0,20.0,80.0));var dry=zones.find("ZONE01");assertEquals("DRY",dry.assessment().state());assertEquals(2,dry.assessment().dryCount());assertEquals(0.0,dry.points().getFirst().latest().value());assertTrue(dry.assessment().validUntil().isAfter(dry.asOf()));
  send(packet(2,Instant.now().minusSeconds(2),40.0,80.0,20.0));assertEquals("WET",zones.find("ZONE01").assessment().state());
  send(packet(3,Instant.now().minusSeconds(1),20.0,32.0,40.0));var mixed=zones.find("ZONE01");assertEquals("MIXED",mixed.assessment().state());assertEquals(1,mixed.assessment().dryCount());assertEquals(1,mixed.assessment().wetCount());
  var all=zones.snapshot();assertEquals(all.asOf(),all.zones().getFirst().asOf());
 }
 @Test void faultsStalenessAndClockProblemsBlockSurvey()throws Exception{
  zones.create(config());send(packet(1,Instant.now().minusSeconds(2),0.0,20.0,null));assertEquals("UNAVAILABLE",zones.find("ZONE01").assessment().state());assertEquals("SENSOR_FAULT",zones.find("ZONE01").points().get(2).state());
  jdbc.update("UPDATE node_sample SET observed_at=CURRENT_TIMESTAMP-INTERVAL '40 seconds' WHERE node_id='ZONENODE'");assertTrue(zones.find("ZONE01").points().stream().allMatch(p->p.state().equals("STALE")));
  jdbc.update("UPDATE node_sample SET observed_at=CURRENT_TIMESTAMP+INTERVAL '60 seconds' WHERE node_id='ZONENODE'");assertTrue(zones.find("ZONE01").points().stream().allMatch(p->p.state().equals("CLOCK_SKEW")));assertNull(zones.find("ZONE01").assessment().validUntil());
 }
 @Test void missingAndPartialNewPacketDoNotRefreshWholeZone()throws Exception{
  zones.create(config());send(packet(1,Instant.now().minusSeconds(3),20.0));assertEquals("MISSING",zones.find("ZONE01").points().get(1).state());
  send(packet(2,Instant.now().minusSeconds(2),20.0,20.0,80.0));assertEquals("DRY",zones.find("ZONE01").assessment().state());
  send(packet(3,Instant.now().minusSeconds(1),10.0));var partial=zones.find("ZONE01");assertEquals("INCOHERENT",partial.assessment().state());assertNull(partial.assessment().dryCount());assertEquals(2,partial.points().get(1).latest().sequence());
 }
 @Test void declaredSourceMustMatchEvenWhenThreePointsAreFresh()throws Exception{
  zones.create(config().put("expectedSource","PHYSICAL"));send(packet(1,Instant.now(),20.0,20.0,80.0));var v=zones.find("ZONE01");assertEquals("UNAVAILABLE",v.assessment().state());assertTrue(v.points().stream().allMatch(p->p.state().equals("SOURCE_MISMATCH")));
  var input=config().put("revision",1);zones.update("ZONE01",input);assertEquals("DRY",zones.find("ZONE01").assessment().state());
 }
 @Test void duplicateAndCrossAreaOrNonSoilDeclarationsAreRejectedWithoutPartialWrites()throws Exception{
  for(String field:List.of("areaId","soilNodeId","expectedSource")){var d=config();d.put(field,field.equals("soilNodeId")?"ENV01":"INVALID");mvc.perform(post("/api/v1/irrigation-zones").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isBadRequest());}
  var d=config();d.withArray("channelIds").set(2,mapper.getNodeFactory().textNode("SOIL1"));mvc.perform(post("/api/v1/irrigation-zones").contentType("application/json").content(mapper.writeValueAsBytes(d))).andExpect(status().isBadRequest());
  var bad=config();bad.withArray("channelIds").set(2,mapper.getNodeFactory().textNode("UNDECLARED"));mvc.perform(post("/api/v1/irrigation-zones").contentType("application/json").content(mapper.writeValueAsBytes(bad))).andExpect(status().isBadRequest());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone WHERE zone_id='ZONE01'",Integer.class));
 }
 @Test void channelsBelongToOneZoneAndFailedRebindRestoresEveryOldRow()throws Exception{
  zones.create(config());mvc.perform(post("/api/v1/irrigation-zones").contentType("application/json").content(mapper.writeValueAsBytes(config().put("zoneId","ZONE02")))).andExpect(status().isConflict());
  register("ZONENODE2");zones.update("ZONE01",config().put("revision",1).put("soilNodeId","ZONENODE2"));assertEquals(2,zones.find("ZONE01").config().revision());zones.create(config().put("zoneId","ZONE02"));
  mvc.perform(put("/api/v1/irrigation-zones/ZONE01").contentType("application/json").content(mapper.writeValueAsBytes(config().put("revision",2)))).andExpect(status().isConflict());
  var restored=zones.find("ZONE01").config();assertEquals(2,restored.revision());assertEquals("ZONENODE2",restored.soilNodeId());assertEquals(List.of("SOIL1","SOIL2","SOIL3"),restored.channelIds());assertEquals(6,jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_zone_channel WHERE zone_id IN ('ZONE01','ZONE02')",Integer.class));
 }
 @Test void concurrentEditsHaveOneWinnerAndCannotOverwriteNewerRevision()throws Exception{
  zones.create(config());try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
   var jobs=List.<java.util.concurrent.Callable<Boolean>>of(()->{try{zones.update("ZONE01",config().put("revision",1).put("name","A"));return true;}catch(org.springframework.web.server.ResponseStatusException e){return false;}},()->{try{zones.update("ZONE01",config().put("revision",1).put("name","B"));return true;}catch(org.springframework.web.server.ResponseStatusException e){return false;}});
   assertEquals(1,pool.invokeAll(jobs).stream().filter(f->{try{return f.get();}catch(Exception e){throw new RuntimeException(e);}}).count());
  }
  assertEquals(2,zones.find("ZONE01").config().revision());mvc.perform(put("/api/v1/irrigation-zones/ZONE01").contentType("application/json").content(mapper.writeValueAsBytes(config().put("revision",1)))).andExpect(status().isConflict());
 }
 @Test void strictBodiesThresholdsAndReadEndpointsValidateScope()throws Exception{
  for(String text:List.of(mapper.writeValueAsString(config().put("wetThreshold",34)),mapper.writeValueAsString(config().put("dryThreshold","30")),mapper.writeValueAsString(config().put("extra",1)),mapper.writeValueAsString(config()).replace("\"name\":","\"name\":\"hidden\",\"name\":")))
   mvc.perform(post("/api/v1/irrigation-zones").contentType("application/json").content(text)).andExpect(status().isBadRequest());
  zones.create(config());mvc.perform(get("/api/v1/irrigation-zones")).andExpect(status().isOk()).andExpect(jsonPath("farmId").value("FARM001"));mvc.perform(get("/api/v1/irrigation-zones/NOT_FOUND")).andExpect(status().isNotFound());
  mvc.perform(put("/api/v1/irrigation-zones/ZONE02").contentType("application/json").content(mapper.writeValueAsBytes(config().put("revision",1)))).andExpect(status().isBadRequest());
 }
}
