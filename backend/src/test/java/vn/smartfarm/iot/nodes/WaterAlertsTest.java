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
import vn.smartfarm.iot.alerts.WaterAlerts;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
 "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class WaterAlertsTest {
 @Autowired NodeInventory nodes;@Autowired TelemetryRouter router;@Autowired ObjectMapper mapper;
 @Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;@Autowired WaterAlerts alerts;
 Instant base;long commands,runs;final String device="WATERALERT",topic="smartfarm/FARM001/WATERALERT/telemetry";
 @BeforeEach void before()throws Exception {
  jdbc.update("DELETE FROM iot_node WHERE node_id=?",device);base=Instant.now().minusSeconds(25);
  commands=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);runs=jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class);
  nodes.registerWater(mapper.readTree("""
   {"nodeId":"WATERALERT","name":"Water alert test","areaId":"AREA001","channels":[
    {"channelId":"LOW","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
    {"channelId":"HIGH","metric":"WATER_PRESENT","unit":"boolean","calibrationVersion":null},
    {"channelId":"FLOW","metric":"FLOW_RATE","unit":"L/min","calibrationVersion":null}]}
   """));
 }
 @AfterEach void after(){
  assertEquals(commands,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));
  assertEquals(runs,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class));
  jdbc.update("DELETE FROM iot_node WHERE node_id=?",device);
 }
 ObjectNode packet(long seq,int seconds,Boolean low,Boolean high,Double flow)throws Exception {
  var p=mapper.createObjectNode();p.put("schemaVersion",2).put("deviceId",device).put("bootId","35000000-0000-4000-8000-000000000001")
   .put("sequence",seq).put("timestamp",base.plusSeconds(seconds).toString()).put("uptimeMs",seq*1000).put("dataSource","SIMULATOR");
  var r=p.putArray("readings");
  for(String id:List.of("LOW","HIGH","FLOW")){
   Object value=id.equals("LOW")?low:id.equals("HIGH")?high:flow;
   var item=r.addObject().put("channelId",id).put("metric",id.equals("FLOW")?"FLOW_RATE":"WATER_PRESENT")
    .put("unit",id.equals("FLOW")?"L/min":"boolean").put("quality",value==null?"SENSOR_FAULT":"VALID").putNull("calibrationVersion");
   if(value instanceof Boolean b)item.put("value",b);else if(value instanceof Number n)item.put("value",n.doubleValue());else item.putNull("value");
  }
  return p;
 }
 boolean send(ObjectNode p)throws Exception{return router.store(topic,mapper.writeValueAsBytes(p));}
 void sample(long seq,int time,Boolean low,Boolean high,Double flow)throws Exception{send(packet(seq,time,low,high,flow));}
 List<WaterAlerts.Alert> episodes(){return alerts.list().stream().filter(a->a.nodeId().equals(device)).toList();}
 WaterAlerts.Alert openLow()throws Exception{sample(1,0,false,false,0.0);sample(2,1,false,false,0.0);return episodes().getFirst();}
 @Test void twoFreshPacketsOpenOneEpisodeAndTwoGoodClearWithPacketEvidence()throws Exception {
  sample(1,0,false,false,0.0);assertTrue(episodes().isEmpty());sample(2,1,false,false,0.0);
  var alert=episodes().getFirst();assertEquals("LOW_WATER",alert.type());assertEquals("SIMULATOR",alert.dataSource());assertNull(alert.channelId());
  assertEquals(base.plusSeconds(1).toEpochMilli(),alert.openedAt().toEpochMilli());assertNotNull(alert.openedReceivedAt());
  sample(3,2,false,false,0.0);sample(4,3,true,false,0.0);assertNull(alerts.find(alert.id()).clearedAt());
  sample(5,4,true,true,0.0);var cleared=alerts.find(alert.id());assertNotNull(cleared.clearedSampleId());assertNotNull(cleared.clearedReceivedAt());
  assertEquals(1,episodes().size());assertEquals(base.plusSeconds(4).toEpochMilli(),cleared.clearedAt().toEpochMilli());
 }
 @Test void qosDuplicatesOldAndHistoricalSamplesDoNotOpenOrClear()throws Exception {
  var first=packet(1,0,false,false,0.0);send(first);assertFalse(send(first));assertTrue(episodes().isEmpty());
  sample(2,-1,false,false,0.0);assertTrue(episodes().isEmpty());sample(2,1,false,false,0.0); // duplicate identity already stored: not evaluated
  assertTrue(episodes().isEmpty());sample(3,2,false,false,0.0);assertTrue(episodes().isEmpty());
  sample(4,3,false,false,0.0);var alert=episodes().getFirst();
  sample(5,-50,true,false,0.0);sample(6,-49,true,false,0.0);assertNull(alerts.find(alert.id()).clearedAt());
 }
 @Test void missingChannelsSequenceGapRebootAndLongGapBreakTheStreak()throws Exception {
  sample(1,0,false,false,1.0);sample(3,1,false,false,1.0);assertTrue(episodes().isEmpty());
  var missing=packet(4,2,false,false,1.0);((ArrayNode)missing.path("readings")).remove(1);send(missing);
  sample(5,3,false,false,1.0);assertTrue(episodes().isEmpty());
  var reboot=packet(6,4,false,false,1.0);reboot.put("bootId","35000000-0000-4000-8000-000000000002");send(reboot);assertTrue(episodes().isEmpty());
  var later=packet(7,21,false,false,1.0);later.put("bootId",reboot.path("bootId").asText());send(later);assertTrue(episodes().isEmpty());
  var finalPacket=packet(8,22,false,false,1.0);finalPacket.put("bootId",reboot.path("bootId").asText());send(finalPacket);assertEquals(1,episodes().size());
 }
 @Test void faultsAndImpossibleFloatsDoNotClearLowAndZeroFlowIsNotNoFlowAlarm()throws Exception {
  var low=openLow();sample(3,2,false,true,0.0);sample(4,3,false,true,0.0);
  assertEquals(2,episodes().size());assertTrue(episodes().stream().anyMatch(a->a.type().equals("INCONSISTENT_FLOATS")));assertNull(alerts.find(low.id()).clearedAt());
  sample(5,4,null,null,0.0);sample(6,5,null,null,0.0);
  assertEquals(4,episodes().size());assertEquals(2,episodes().stream().filter(a->a.type().equals("SENSOR_FAULT")).count());
  sample(7,6,true,false,0.0);sample(8,7,true,false,0.0);assertTrue(episodes().stream().allMatch(a->a.clearedAt()!=null));
 }
 @Test void individualSensorFaultClearsWithTwoValidZeroSamples()throws Exception {
  sample(1,0,true,false,null);sample(2,1,true,false,null);var fault=episodes().getFirst();
  assertEquals("FLOW",fault.channelId());assertEquals("SENSOR_FAULT",fault.type());
  sample(3,2,true,false,0.0);assertNull(alerts.find(fault.id()).clearedAt());sample(4,3,true,false,0.0);assertNotNull(alerts.find(fault.id()).clearedAt());
 }
 @Test void differentSourcesNeverClearOrCompleteEachOthersEvidence()throws Exception {
  sample(1,0,false,false,1.0);
  var physical=packet(2,1,false,false,1.0);physical.put("dataSource","PHYSICAL");send(physical);assertTrue(episodes().isEmpty());
  var another=packet(3,2,false,false,1.0);another.put("dataSource","PHYSICAL");send(another);var alert=episodes().getFirst();
  assertEquals("PHYSICAL",alert.dataSource());sample(4,3,true,false,0.0);sample(5,4,true,false,0.0);assertNull(alerts.find(alert.id()).clearedAt());
  for(int i=6;i<8;i++){var p=packet(i,i-1,true,false,0.0);p.put("dataSource","PHYSICAL");send(p);}assertNotNull(alerts.find(alert.id()).clearedAt());
 }
 @Test void acknowledgementIsIdempotentCannotOverwriteOrClearEpisode()throws Exception {
  var alert=openLow();var ack=alerts.acknowledge(alert.id(),"  Checked water  ");assertEquals("Checked water",ack.acknowledgementNote());assertNull(ack.clearedAt());
  assertEquals(ack,alerts.acknowledge(alert.id(),"Checked water"));assertThrows(org.springframework.web.server.ResponseStatusException.class,()->alerts.acknowledge(alert.id(),"Other"));
  sample(3,2,true,false,0.0);sample(4,3,true,false,0.0);assertEquals(ack.acknowledgedAt(),alerts.acknowledge(alert.id(),"Checked water").acknowledgedAt());
  assertEquals("Checked water",alerts.find(alert.id()).acknowledgementNote());
 }
 @Test void concurrentAcknowledgementsPreserveOneWinnersNote()throws Exception {
  long id=openLow().id();try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
   var results=pool.invokeAll(List.of(()->{try{alerts.acknowledge(id,"A");return true;}catch(org.springframework.web.server.ResponseStatusException e){return false;}},
     ()->{try{alerts.acknowledge(id,"B");return true;}catch(org.springframework.web.server.ResponseStatusException e){return false;}}));
   assertEquals(1,results.stream().filter(r->{try{return (Boolean)r.get();}catch(Exception e){throw new RuntimeException(e);}}).count());
  }
  assertNotNull(alerts.find(id).acknowledgedAt());
 }
 @Test void endpointsStrictlyValidateNotesAndKeepLegacyCollectionIndependent()throws Exception {
  long id=openLow().id();mvc.perform(get("/api/v1/water-alerts")).andExpect(status().isOk()).andExpect(jsonPath("$[0].openedSampleId").isNumber());
  mvc.perform(get("/api/v1/water-alerts/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.dataSource").value("SIMULATOR"));
  for(String body:List.of("{}","{\"note\":1}","{\"note\":\"x\",\"extra\":1}","{\"note\":\""+"x".repeat(501)+"\"}"))
   mvc.perform(put("/api/v1/water-alerts/"+id+"/acknowledgement").contentType("application/json").content(body)).andExpect(status().isBadRequest());
  mvc.perform(get("/api/v1/water-alerts/0")).andExpect(status().isBadRequest());mvc.perform(get("/api/v1/water-alerts/99999999")).andExpect(status().isNotFound());
  mvc.perform(get("/api/v1/alerts")).andExpect(status().isOk());
  mvc.perform(put("/api/v1/water-alerts/"+id+"/acknowledgement").contentType("application/json").content("{\"note\":null}")).andExpect(status().isOk());
 }
 @Test void concurrentPacketsCannotDuplicateOpenEpisodeAndStateCanBeReloaded()throws Exception {
  sample(1,0,false,false,0.0);var bytes=mapper.writeValueAsBytes(packet(2,1,false,false,0.0));
  try(var pool=java.util.concurrent.Executors.newFixedThreadPool(4)){
   var calls=pool.invokeAll(Collections.nCopies(8,()->router.store(topic,bytes)));int inserted=0;for(var c:calls)if((Boolean)c.get())inserted++;assertEquals(1,inserted);
  }
  assertEquals(1,episodes().size());assertEquals(1,new WaterAlerts(jdbc).list().stream().filter(a->a.nodeId().equals(device)).count());
 }
 @Test void recurrenceCreatesNewUnacknowledgedEpisodeAndMissingFlowBreaksRecovery()throws Exception {
  sample(1,0,true,false,null);sample(2,1,true,false,null);long id=episodes().getFirst().id();alerts.acknowledge(id,"Inspect meter");
  sample(3,2,true,false,0.0);
  var missing=packet(4,3,true,false,0.0);((ArrayNode)missing.path("readings")).remove(2);send(missing);
  sample(5,4,true,false,0.0);assertNull(alerts.find(id).clearedAt());sample(6,5,true,false,0.0);assertNotNull(alerts.find(id).clearedAt());
  sample(7,6,true,false,null);sample(8,7,true,false,null);assertEquals(2,episodes().size());
  assertNotEquals(id,episodes().getFirst().id());assertNull(episodes().getFirst().acknowledgedAt());
 }
 @Test void sameSourceTimestampAndFailedValidationNeverCompleteEvidence()throws Exception {
  sample(1,0,false,false,1.0);sample(2,0,false,false,1.0);assertTrue(episodes().isEmpty());
  var bad=packet(2,1,false,false,1.0);bad.put("sequence",3);((ObjectNode)bad.path("readings").get(2)).put("unit","litres");
  assertThrows(IllegalArgumentException.class,()->send(bad));
  sample(3,2,false,false,1.0);assertTrue(episodes().isEmpty());sample(4,3,false,false,1.0);assertEquals(1,episodes().size());
 }

 @Test void lowerSequenceWithNewerClockCannotAdvanceTheCursor()throws Exception {
  sample(100,0,false,false,0.0);sample(99,1,false,false,0.0);sample(98,2,false,false,0.0);assertTrue(episodes().isEmpty());
  sample(101,3,false,false,0.0);assertEquals(1,episodes().size());
 }

}
