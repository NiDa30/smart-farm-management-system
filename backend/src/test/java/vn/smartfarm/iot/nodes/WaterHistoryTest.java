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
class WaterHistoryTest {
 @Autowired WaterHistory history;@Autowired NodeInventory nodes;@Autowired TelemetryRouter router;@Autowired ObjectMapper mapper;
 @Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
 final String id="WATERHIST";final Instant from=Instant.parse("2026-01-01T00:00:00Z"),to=from.plusSeconds(3600);
 long commands,runs;
 @BeforeEach void before()throws Exception{
  jdbc.update("DELETE FROM iot_node WHERE node_id=?",id);commands=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);runs=jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class);
  nodes.registerWater(mapper.readTree("""
   {"nodeId":"WATERHIST","name":"History test","areaId":"AREA001","channels":[
    {"channelId":"LOW","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
    {"channelId":"FLOW","metric":"FLOW_RATE","unit":"L/min","calibrationVersion":"FLOW-V1"}]}
   """));
 }
 @AfterEach void after(){
  assertEquals(commands,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));assertEquals(runs,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class));
  jdbc.update("DELETE FROM iot_node WHERE node_id=?",id);
 }
 void store(int seq,Instant at,String source,boolean fault)throws Exception{
  var p=mapper.createObjectNode().put("schemaVersion",2).put("deviceId",id).put("bootId","37000000-0000-4000-8000-000000000001")
   .put("sequence",seq).put("timestamp",at.toString()).put("uptimeMs",seq*1000).put("dataSource",source);
  var r=p.putArray("readings");r.addObject().put("channelId","LOW").put("metric","WATER_PRESENT").put("unit","boolean").put("quality","VALID").put("value",false).putNull("calibrationVersion");
  var flow=r.addObject().put("channelId","FLOW").put("metric","FLOW_RATE").put("unit","L/min").put("quality",fault?"SENSOR_FAULT":"VALID").put("calibrationVersion","FLOW-V1");
  if(fault)flow.putNull("value");else flow.put("value",0);
  assertTrue(router.store("smartfarm/FARM001/"+id+"/telemetry",mapper.writeValueAsBytes(p)));
 }
 WaterHistory.Page page(String channel,String source,String quality,int limit,String cursor){return history.list(id,channel,from,to,source,quality,limit,cursor);}
 @Test void returnsRawFalseZeroFaultNullSourceCalibrationAndReceipt()throws Exception{
  store(1,from.plusSeconds(1),"SIMULATOR",false);store(2,from.plusSeconds(2),"PHYSICAL",true);
  var rows=page("FLOW",null,null,100,null);assertEquals(2,rows.items().size());assertNull(rows.items().getFirst().value());assertEquals("SENSOR_FAULT",rows.items().getFirst().quality());
  assertEquals("PHYSICAL",rows.items().getFirst().dataSource());assertEquals(0.0,rows.items().getLast().value());assertEquals("FLOW-V1",rows.items().getLast().calibrationVersion());
  assertNotNull(rows.items().getFirst().receivedAt());assertEquals(false,page("LOW",null,null,100,null).items().getFirst().value());
 }
 @Test void rangeIsHalfOpenAndOldPacketsRemainHistorical()throws Exception{
  store(1,from.minusMillis(1),"UNSPECIFIED",false);store(2,from,"UNSPECIFIED",false);store(3,to.minusMillis(1),"UNSPECIFIED",false);store(4,to,"UNSPECIFIED",false);
  assertEquals(List.of(3L,2L),page("FLOW",null,null,10,null).items().stream().map(WaterHistory.Item::sequence).toList());
 }
 @Test void cursorPaginatesTimestampTiesWithoutDuplicateOrMissingRows()throws Exception{
  for(int i=1;i<=5;i++)store(i,from.plusSeconds(1),"SIMULATOR",false);
  var first=page("FLOW",null,null,2,null);var second=page("FLOW",null,null,2,first.nextCursor());var third=page("FLOW",null,null,2,second.nextCursor());
  var ids=new HashSet<Long>();for(var p:List.of(first,second,third)){assertEquals(first.snapshotId(),p.snapshotId());for(var row:p.items())assertTrue(ids.add(row.sampleId()));}
  assertEquals(5,ids.size());assertNull(third.nextCursor());
 }
 @Test void laterInsertedOldTimestampIsOutsideTheInitialIdCap()throws Exception{
  store(1,from.plusSeconds(10),"SIMULATOR",false);store(2,from.plusSeconds(20),"SIMULATOR",false);
  var first=page("FLOW",null,null,1,null);store(3,from.plusSeconds(5),"SIMULATOR",false);
  var second=page("FLOW",null,null,5,first.nextCursor());assertEquals(List.of(1L),second.items().stream().map(WaterHistory.Item::sequence).toList());assertNull(second.nextCursor());
  assertEquals(3,page("FLOW",null,null,10,null).items().size());
 }
 @Test void filtersSourceAndQualityAreIndependent()throws Exception{
  store(1,from.plusSeconds(1),"SIMULATOR",false);store(2,from.plusSeconds(2),"SIMULATOR",true);store(3,from.plusSeconds(3),"PHYSICAL",true);
  assertEquals(2,page("FLOW","SIMULATOR",null,100,null).items().size());assertEquals(2,page("FLOW",null,"SENSOR_FAULT",100,null).items().size());
  assertEquals(1,page("FLOW","PHYSICAL","SENSOR_FAULT",100,null).items().size());assertEquals(0,page("FLOW","PHYSICAL","VALID",100,null).items().size());
 }
 @Test void emptyRangeAndMissingChannelNeverInventMeasurements()throws Exception{
  assertTrue(page("FLOW",null,null,100,null).items().isEmpty());assertNull(page("FLOW",null,null,100,null).nextCursor());
  mvc.perform(get("/api/v1/nodes/WATERHIST/channels/PRESSURE/history")).andExpect(status().isNotFound());
  mvc.perform(get("/api/v1/nodes/ENV01/channels/SOIL/history")).andExpect(status().isNotFound());
 }
 @Test void cursorCannotBeReusedWithAnotherChannelRangeOrFilter()throws Exception{
  store(1,from.plusSeconds(1),"SIMULATOR",false);store(2,from.plusSeconds(2),"SIMULATOR",false);String cursor=page("FLOW",null,null,1,null).nextCursor();
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->page("LOW",null,null,1,cursor));
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->page("FLOW","SIMULATOR",null,1,cursor));
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->page("FLOW",null,"VALID",1,cursor));
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->history.list(id,"FLOW",from,to.plusSeconds(1),null,null,1,cursor));
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->history.list(id,"FLOW",null,null,null,null,1,cursor));
 }
 @Test void validatesParametersAndMalformedCursor()throws Exception{
  String url="/api/v1/nodes/WATERHIST/channels/FLOW/history";
  for(var pair:List.of(new String[]{"limit","0"},new String[]{"limit","1001"},new String[]{"quality","BAD"},new String[]{"dataSource","REAL"},new String[]{"from","not-a-date"}))
   mvc.perform(get(url).param(pair[0],pair[1])).andExpect(status().isBadRequest());
  for(String cursor:List.of("!bad","x".repeat(2049),Base64.getUrlEncoder().withoutPadding().encodeToString("wrong".getBytes())))
   mvc.perform(get(url).param("from",from.toString()).param("to",to.toString()).param("cursor",cursor)).andExpect(status().isBadRequest());
  mvc.perform(get(url).param("from",to.toString()).param("to",from.toString())).andExpect(status().isBadRequest());
  mvc.perform(get(url).param("from",from.toString()).param("to",from.plusSeconds(32*86400).toString())).andExpect(status().isBadRequest());
 }
 @Test void endpointDefaultsAndExplicitResponseScopeAreReadable()throws Exception{
  mvc.perform(get("/api/v1/nodes/WATERHIST/channels/FLOW/history")).andExpect(status().isOk()).andExpect(jsonPath("$.nodeId").value(id)).andExpect(jsonPath("$.channel.metric").value("FLOW_RATE")).andExpect(jsonPath("$.items").isArray());
  store(1,from.plusSeconds(1),"SIMULATOR",false);
  mvc.perform(get("/api/v1/nodes/WATERHIST/channels/FLOW/history").param("from",from.toString()).param("to",to.toString()).param("dataSource","SIMULATOR").param("quality","VALID"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].value").value(0)).andExpect(jsonPath("$.dataSource").value("SIMULATOR")).andExpect(jsonPath("$.quality").value("VALID"));
 }
}
