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
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import vn.smartfarm.iot.alerts.SoilAlerts;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
 "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class SoilAlertsTest {
 @Autowired NodeInventory nodes;@Autowired TelemetryRouter router;@Autowired ObjectMapper mapper;
 @Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;@Autowired SoilAlerts alerts;@Autowired PlatformTransactionManager transactions;
 Instant base;long commands,runs;final String device="SOILALERT",topic="smartfarm/FARM001/SOILALERT/telemetry";
 @BeforeEach void before()throws Exception {
  jdbc.update("DELETE FROM iot_node WHERE node_id=?",device);base=Instant.now().minusSeconds(25);
  commands=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);runs=jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class);
  var d=mapper.createObjectNode().put("nodeId",device).put("name","Soil alerts test").put("areaId","AREA001");var c=d.putArray("channels");
  for(int i=1;i<=3;i++)c.addObject().put("channelId","SOIL"+i).put("metric","SOIL_MOISTURE").put("unit","%").put("calibrationVersion","SIM_LINEAR_V1");
  nodes.registerSoil(d);
 }
 @AfterEach void after(){
  assertEquals(commands,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));assertEquals(runs,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class));
  jdbc.update("DELETE FROM iot_node WHERE node_id=?",device);
 }
 ObjectNode packet(long seq,int seconds,Double... values){
  var p=mapper.createObjectNode().put("schemaVersion",2).put("deviceId",device).put("bootId","42000000-0000-4000-8000-000000000001")
   .put("sequence",seq).put("timestamp",base.plusSeconds(seconds).toString()).put("uptimeMs",seq*1000).put("dataSource","SIMULATOR");
  var readings=p.putArray("readings");for(int i=0;i<values.length;i++){
   var item=readings.addObject().put("channelId","SOIL"+(i+1)).put("metric","SOIL_MOISTURE").put("unit","%")
    .put("quality",values[i]==null?"SENSOR_FAULT":"VALID").put("calibrationVersion","SIM_LINEAR_V1");
   if(values[i]==null)item.putNull("value");else item.put("value",values[i]);
  }return p;
 }
 boolean send(ObjectNode p)throws Exception{return router.store(topic,mapper.writeValueAsBytes(p));}
 void sample(long seq,int time,Double... values)throws Exception{send(packet(seq,time,values));}
 List<SoilAlerts.Alert> episodes(){return alerts.list().stream().filter(a->a.nodeId().equals(device)).toList();}
 SoilAlerts.Alert openDry()throws Exception{sample(1,0,20.0);sample(2,1,0.0);return episodes().getFirst();}
 @Test void thresholdsNeedTwoConsecutiveSamplesAndRecordZeroAndClearValue()throws Exception {
  sample(1,0,30.0);sample(2,1,30.0);assertTrue(episodes().isEmpty());sample(3,2,29.99);assertTrue(episodes().isEmpty());sample(4,3,0.0);
  var a=episodes().getFirst();assertEquals("DRY_SOIL",a.type());assertEquals("SOIL1",a.channelId());assertEquals(0.0,a.openedValue());assertNotNull(a.openedReceivedAt());
  sample(5,4,34.99);assertNull(alerts.find(a.id()).clearedAt());sample(6,5,35.0);assertNull(alerts.find(a.id()).clearedAt());sample(7,6,35.0);
  assertEquals(35.0,alerts.find(a.id()).clearedValue());assertNotNull(alerts.find(a.id()).clearedSampleId());assertEquals(1,episodes().size());
 }
 @Test void pointsAreIndependentAndFaultIsNotDryZero()throws Exception {
  sample(1,0,0.0,100.0,null);sample(2,1,0.0,100.0,null);assertEquals(2,episodes().size());
  assertTrue(episodes().stream().anyMatch(a->a.type().equals("DRY_SOIL")&&a.channelId().equals("SOIL1")));
  var fault=episodes().stream().filter(a->a.type().equals("SENSOR_FAULT")).findFirst().orElseThrow();assertEquals("SOIL3",fault.channelId());assertNull(fault.openedValue());
  sample(3,2,0.0,100.0,0.0);assertNull(alerts.find(fault.id()).clearedAt());sample(4,3,0.0,100.0,0.0);
  assertEquals(0.0,alerts.find(fault.id()).clearedValue());assertEquals(3,episodes().size());
 }
 @Test void hysteresisBandBreaksPendingOpenAndPendingClear()throws Exception {
  sample(1,0,20.0);sample(2,1,32.0);sample(3,2,20.0);assertTrue(episodes().isEmpty());sample(4,3,20.0);var a=episodes().getFirst();
  sample(5,4,35.0);sample(6,5,32.0);sample(7,6,35.0);assertNull(alerts.find(a.id()).clearedAt());sample(8,7,35.0);assertNotNull(alerts.find(a.id()).clearedAt());
 }
 @Test void faultAndMissingPointNeverClearDryAndOtherPointDoesNotSatisfyEvidence()throws Exception {
  var a=openDry();sample(3,2,(Double)null);sample(4,3,(Double)null);assertEquals(2,episodes().size());assertNull(alerts.find(a.id()).clearedAt());
  var absent=packet(5,4,40.0);((ObjectNode)absent.path("readings").get(0)).put("channelId","SOIL2");send(absent);
  sample(6,5,35.0);assertNull(alerts.find(a.id()).clearedAt());sample(7,6,35.0);assertNotNull(alerts.find(a.id()).clearedAt());
 }
 @Test void missingChannelSequenceGapRebootAndLongGapResetPendingStreak()throws Exception {
  sample(1,0,20.0);var absent=packet(2,1,20.0);((ObjectNode)absent.path("readings").get(0)).put("channelId","SOIL2");send(absent);
  sample(3,2,20.0);assertTrue(episodes().isEmpty());sample(5,3,20.0);assertTrue(episodes().isEmpty());
  var reboot=packet(6,4,20.0);reboot.put("bootId","42000000-0000-4000-8000-000000000002");send(reboot);assertTrue(episodes().isEmpty());
  var later=packet(7,21,20.0);later.put("bootId",reboot.path("bootId").asText());send(later);assertTrue(episodes().isEmpty());
  var last=packet(8,22,20.0);last.put("bootId",reboot.path("bootId").asText());send(last);assertEquals(1,episodes().size());
 }
 @Test void duplicateOldAndHistoricalPacketsCannotOpenOrClear()throws Exception {
  var p=packet(1,0,20.0);send(p);assertFalse(send(p));sample(2,-60,20.0);assertTrue(episodes().isEmpty());
  sample(3,1,20.0);assertTrue(episodes().isEmpty());sample(4,2,20.0);var a=episodes().getFirst();
  sample(5,-59,100.0);sample(6,-58,100.0);assertNull(alerts.find(a.id()).clearedAt());
 }
 @Test void equalTimeOrLowerSequenceDoesNotProduceConsecutiveEvidence()throws Exception {
  sample(100,0,20.0);sample(101,0,20.0);sample(99,1,20.0);assertTrue(episodes().isEmpty());
  sample(102,2,20.0);assertTrue(episodes().isEmpty());sample(103,3,20.0);assertEquals(1,episodes().size());
 }
 @Test void sourcesNeverCompleteOrClearEachOthersEpisodes()throws Exception {
  sample(1,0,20.0);var p=packet(2,1,20.0);p.put("dataSource","PHYSICAL");send(p);assertTrue(episodes().isEmpty());
  p=packet(3,2,20.0);p.put("dataSource","PHYSICAL");send(p);var a=episodes().getFirst();assertEquals("PHYSICAL",a.dataSource());
  sample(4,3,40.0);sample(5,4,40.0);assertNull(alerts.find(a.id()).clearedAt());
  for(int i=6;i<=7;i++){p=packet(i,i-1,40.0);p.put("dataSource","PHYSICAL");send(p);}assertNotNull(alerts.find(a.id()).clearedAt());
 }
 @Test void faultRecoveryInBandClearsFaultOnlyWhileDryEpisodeHolds()throws Exception {
  var a=openDry();sample(3,2,(Double)null);sample(4,3,(Double)null);var fault=episodes().stream().filter(e->e.type().equals("SENSOR_FAULT")).findFirst().orElseThrow();
  sample(5,4,32.0);sample(6,5,32.0);assertNotNull(alerts.find(fault.id()).clearedAt());assertNull(alerts.find(a.id()).clearedAt());
 }
 @Test void acknowledgementIsFirstNoteIdempotentAndCannotClearCondition()throws Exception {
  var a=openDry();var ack=alerts.acknowledge(a.id(),"  Kiểm tra đầu dò  ");assertEquals("Kiểm tra đầu dò",ack.acknowledgementNote());assertNull(ack.clearedAt());
  assertEquals(ack,alerts.acknowledge(a.id(),"Kiểm tra đầu dò"));assertThrows(org.springframework.web.server.ResponseStatusException.class,()->alerts.acknowledge(a.id(),"Other"));
  sample(3,2,35.0);sample(4,3,35.0);assertEquals(ack.acknowledgedAt(),alerts.acknowledge(a.id(),"Kiểm tra đầu dò").acknowledgedAt());
 }
 @Test void clearedUnseenEpisodeCannotBeAcknowledgedAndNewEpisodeStartsUnseen()throws Exception {
  var a=openDry();sample(3,2,35.0);sample(4,3,35.0);assertThrows(org.springframework.web.server.ResponseStatusException.class,()->alerts.acknowledge(a.id(),null));
  sample(5,4,20.0);sample(6,5,20.0);assertEquals(2,episodes().size());assertNull(episodes().stream().filter(e->e.clearedAt()==null).findFirst().orElseThrow().acknowledgedAt());
 }
 @Test void concurrentAcknowledgementsKeepOneWinnersNote()throws Exception {
  long id=openDry().id();try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
   var jobs=List.<java.util.concurrent.Callable<Boolean>>of(()->{try{alerts.acknowledge(id,"A");return true;}catch(org.springframework.web.server.ResponseStatusException e){return false;}},
    ()->{try{alerts.acknowledge(id,"B");return true;}catch(org.springframework.web.server.ResponseStatusException e){return false;}});
   var result=pool.invokeAll(jobs);assertEquals(1,result.stream().filter(f->{try{return f.get();}catch(Exception e){throw new RuntimeException(e);}}).count());
   assertTrue(List.of("A","B").contains(alerts.find(id).acknowledgementNote()));
  }
 }
 @Test void concurrentDuplicatePacketsOpenOneEpisodeAndReloadStoredEvidence()throws Exception {
  sample(1,0,20.0);byte[] p=mapper.writeValueAsBytes(packet(2,1,20.0));
  try(var pool=java.util.concurrent.Executors.newFixedThreadPool(4)){
   var jobs=new ArrayList<java.util.concurrent.Callable<Boolean>>();for(int i=0;i<8;i++)jobs.add(()->router.store(topic,p));
   assertEquals(1,pool.invokeAll(jobs).stream().filter(f->{try{return f.get();}catch(Exception e){throw new RuntimeException(e);}}).count());
  }
  assertEquals(1,episodes().size());assertEquals(episodes().getFirst(),new SoilAlerts(jdbc).find(episodes().getFirst().id()));
 }
 @Test void packetAndAlertStateRollBackTogether()throws Exception {
  sample(1,0,20.0);byte[] p=mapper.writeValueAsBytes(packet(2,1,20.0));
  assertThrows(IllegalStateException.class,()->new TransactionTemplate(transactions).execute(s->{router.store(topic,p);throw new IllegalStateException("synthetic rollback");}));
  assertTrue(episodes().isEmpty());assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM node_sample WHERE node_id=?",Integer.class,device));
  assertTrue(router.store(topic,p));assertEquals(1,episodes().size());
 }
 @Test void endpointsStrictlyValidateNoteBodyAndKeepWaterLegacyIndependent()throws Exception {
  long water=jdbc.queryForObject("SELECT COUNT(*) FROM water_alert",Long.class);var a=openDry();String url="/api/v1/soil-alerts/"+a.id()+"/acknowledgement";
  for(String bad:List.of("{}","{\"note\":4}","{\"note\":null,\"other\":1}","{\"note\":null,\"note\":\"hidden\"}","{\"note\":\""+"x".repeat(501)+"\"}"))
   mvc.perform(put(url).contentType("application/json").content(bad)).andExpect(status().isBadRequest());
  mvc.perform(put(url).contentType("application/json").content("{\"note\":\"  \"}")).andExpect(status().isOk()).andExpect(jsonPath("acknowledgementNote").doesNotExist());
  mvc.perform(get("/api/v1/soil-alerts/"+a.id())).andExpect(status().isOk()).andExpect(jsonPath("channelId").value("SOIL1")).andExpect(jsonPath("openedValue").value(0.0));
  mvc.perform(get("/api/v1/soil-alerts/0")).andExpect(status().isBadRequest());mvc.perform(get("/api/v1/soil-alerts/999999999")).andExpect(status().isNotFound());
  assertEquals(water,jdbc.queryForObject("SELECT COUNT(*) FROM water_alert",Long.class));
 }
}
