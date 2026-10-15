package vn.smartfarm.iot.irrigation;
import com.fasterxml.jackson.databind.*;
import java.time.*;import java.sql.Timestamp;import java.util.*;import java.util.concurrent.*;
import org.junit.jupiter.api.*;import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.test.web.servlet.MockMvc;import org.springframework.transaction.PlatformTransactionManager;import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false","smartfarm.irrigation.demo-enabled=false","smartfarm.irrigation-queue.scheduling-enabled=false"})
@AutoConfigureMockMvc @EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class IrrigationQueueTest {
 @Autowired IrrigationQueue queue;@Autowired JdbcTemplate jdbc;@Autowired ObjectMapper mapper;@Autowired MockMvc mvc;@Autowired PlatformTransactionManager manager;
 long pumps,runs,valves;String rule,binding;
 @BeforeEach void setup(){
  jdbc.update("DELETE FROM irrigation_queue_request");jdbc.update("UPDATE irrigation_queue_state SET revision=1");
  jdbc.update("DELETE FROM irrigation_zone_channel WHERE zone_id IN ('QZONE1','QZONE2')");jdbc.update("DELETE FROM irrigation_zone WHERE zone_id IN ('QZONE1','QZONE2')");
  jdbc.update("DELETE FROM iot_node WHERE node_id IN ('QSOIL1','QSOIL2')");
  for(int i=1;i<=2;i++){
   jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES(?,?,'AREA001','SOIL',2)","QSOIL"+i,"Soil "+i);
   jdbc.update("INSERT INTO irrigation_zone(zone_id,name,area_id,soil_node_id,expected_source,dry_threshold,wet_threshold) VALUES(?,?,'AREA001',?,'SIMULATOR',30,35)","QZONE"+i,"Vùng "+i,"QSOIL"+i);
   for(int c=1;c<=3;c++){jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES(?,?,'SOIL_MOISTURE','%')","QSOIL"+i,"SOIL"+c);jdbc.update("INSERT INTO irrigation_zone_channel(zone_id,node_id,channel_id,position) VALUES(?,?,?,?)","QZONE"+i,"QSOIL"+i,"SOIL"+c,c-1);}
  }
  pumps=count("pump_command");runs=count("watering_run");valves=count("irrigation_demo_command");rule=jdbc.queryForObject("SELECT COALESCE(json_agg(r)::text,'[]') FROM watering_rule r",String.class);binding=jdbc.queryForObject("SELECT COALESCE(json_agg(r)::text,'[]') FROM irrigation_demo_binding r",String.class);
 }
 @AfterEach void unchanged(){try{assertEquals(pumps,count("pump_command"));assertEquals(runs,count("watering_run"));assertEquals(valves,count("irrigation_demo_command"));assertEquals(rule,jdbc.queryForObject("SELECT COALESCE(json_agg(r)::text,'[]') FROM watering_rule r",String.class));assertEquals(binding,jdbc.queryForObject("SELECT COALESCE(json_agg(r)::text,'[]') FROM irrigation_demo_binding r",String.class));}finally{jdbc.update("DELETE FROM irrigation_queue_request");jdbc.update("DELETE FROM irrigation_zone WHERE zone_id IN ('QZONE1','QZONE2')");jdbc.update("DELETE FROM iot_node WHERE node_id IN ('QSOIL1','QSOIL2')");}}
 long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class);}
 JsonNode request(UUID id,String zone,int duration){return mapper.createObjectNode().put("requestId",id.toString()).put("zoneId",zone).put("zoneRevision",1).put("durationSeconds",duration).put("requestedAt",Instant.now().toString());}
 IrrigationQueue.Item add(String zone,int seconds){return queue.enqueue(request(UUID.randomUUID(),zone,seconds));}
 long revision(){return queue.snapshot().revision();}
 @Test void fifoAcrossTwoZonesKeepsOnePreviewSlotAndNeedsExplicitNext(){
  var a=add("QZONE1",3);var b=add("QZONE2",4);assertEquals(List.of(a.requestId(),b.requestId()),queue.snapshot().waiting().stream().map(IrrigationQueue.Item::requestId).toList());
  assertThrows(ResponseStatusException.class,()->queue.rehearse(b.requestId(),revision()));var active=queue.rehearse(a.requestId(),revision());assertEquals("REHEARSING",active.state());assertThrows(ResponseStatusException.class,()->queue.rehearse(b.requestId(),revision()));
  queue.maintainAt(active.plannedEndAt());assertEquals("REHEARSED",queue.lookup(a.requestId()).state());assertNull(queue.snapshot().active());assertEquals("QUEUED",queue.lookup(b.requestId()).state());
  assertEquals("REHEARSING",queue.rehearse(b.requestId(),revision()).state());
 }
 @Test void exactDeadlineAndWaitExpiryUseServerTime(){var a=add("QZONE1",5);var active=queue.rehearse(a.requestId(),revision());queue.maintainAt(active.plannedEndAt().minusMillis(1));assertNotNull(queue.snapshot().active());queue.maintainAt(active.plannedEndAt());assertNull(queue.snapshot().active());var b=add("QZONE2",1);queue.maintainAt(b.expiresAt());assertEquals("EXPIRED",queue.lookup(b.requestId()).state());assertEquals("WAIT_EXPIRED",queue.lookup(b.requestId()).reason());}
 @Test void duplicateEnqueueReturnsSameRecordEvenAfterExpiryAndChangedZone(){UUID id=UUID.randomUUID();var q=request(id,"QZONE1",5);var a=queue.enqueue(q);queue.maintainAt(a.expiresAt());jdbc.update("UPDATE irrigation_zone SET revision=2 WHERE zone_id='QZONE1'");assertEquals(a.ticket(),queue.enqueue(q).ticket());assertEquals(1,count("irrigation_queue_request"));assertThrows(ResponseStatusException.class,()->queue.enqueue(request(id,"QZONE1",6)));}
 @Test void delayedDuplicateRehearseCannotStartAnotherItem(){var a=add("QZONE1",1);var b=add("QZONE2",5);long old=revision();queue.rehearse(a.requestId(),old);queue.maintainAt(queue.lookup(a.requestId()).plannedEndAt());assertEquals("REHEARSED",queue.rehearse(a.requestId(),old).state());assertEquals("QUEUED",queue.lookup(b.requestId()).state());assertNull(queue.snapshot().active());}
 @Test void staleRevisionCannotCancelOrStartAndNoPartialMutation(){var a=add("QZONE1",5);long before=revision();add("QZONE2",5);assertThrows(ResponseStatusException.class,()->queue.rehearse(a.requestId(),before));assertThrows(ResponseStatusException.class,()->queue.cancel(a.requestId(),before));assertEquals("QUEUED",queue.lookup(a.requestId()).state());}
 @Test void cancelledActiveDoesNotReserveNextOrClaimItRan(){var a=add("QZONE1",5);var b=add("QZONE2",5);queue.rehearse(a.requestId(),revision());var done=queue.cancel(a.requestId(),revision());assertEquals("CANCELLED",done.state());assertEquals("USER_CANCELLED",done.reason());assertNotNull(done.finishedAt());assertEquals("QUEUED",queue.lookup(b.requestId()).state());assertEquals("CANCELLED",queue.cancel(a.requestId(),1).state());}
 @Test void changedZoneInvalidatesWaitingAndInterruptsActive(){var a=add("QZONE1",5);var b=add("QZONE2",5);queue.rehearse(a.requestId(),revision());jdbc.update("UPDATE irrigation_zone SET revision=revision+1 WHERE zone_id IN ('QZONE1','QZONE2')");queue.maintain();assertEquals("INTERRUPTED",queue.lookup(a.requestId()).state());assertEquals("INVALIDATED",queue.lookup(b.requestId()).state());assertNull(queue.snapshot().active());assertEquals(1,queue.lookup(a.requestId()).zoneSnapshot().path("revision").asInt());}
 @Test void changedSourceBlocksNewAndExistingRequests(){jdbc.update("UPDATE irrigation_zone SET expected_source='PHYSICAL' WHERE zone_id='QZONE2'");assertThrows(ResponseStatusException.class,()->add("QZONE2",5));var a=add("QZONE1",5);jdbc.update("UPDATE irrigation_zone SET expected_source='PHYSICAL' WHERE zone_id='QZONE1'");assertThrows(ResponseStatusException.class,()->queue.rehearse(a.requestId(),revision()));queue.maintain();assertEquals("INVALIDATED",queue.lookup(a.requestId()).state());}
 @Test void restartInterruptsActiveWithoutResumingWaiting(){var a=add("QZONE1",5);var b=add("QZONE2",5);queue.rehearse(a.requestId(),revision());queue.interruptOnStartup();assertEquals("INTERRUPTED",queue.lookup(a.requestId()).state());assertEquals("BACKEND_RESTARTED",queue.lookup(a.requestId()).reason());assertEquals("QUEUED",queue.lookup(b.requestId()).state());long rev=revision();queue.interruptOnStartup();assertEquals(rev,revision());}
 @Test void startupMaintenanceCannotCompleteAnOverdueRunBeforeRecovery(){
  var a=add("QZONE1",1);queue.rehearse(a.requestId(),revision());
  jdbc.update("UPDATE irrigation_queue_request SET enqueued_at=CURRENT_TIMESTAMP-INTERVAL '1 minute',expires_at=CURRENT_TIMESTAMP+INTERVAL '4 minutes',started_at=CURRENT_TIMESTAMP-INTERVAL '10 seconds',planned_end_at=CURRENT_TIMESTAMP-INTERVAL '9 seconds' WHERE request_id=?",a.requestId());
  var booting=new IrrigationQueue(jdbc,mapper,manager);booting.maintain();assertEquals("REHEARSING",queue.lookup(a.requestId()).state());booting.interruptOnStartup();booting.maintain();assertEquals("INTERRUPTED",queue.lookup(a.requestId()).state());assertEquals("BACKEND_RESTARTED",queue.lookup(a.requestId()).reason());
 }
 @Test void fullHistoryLookupIsIndependentOfTwentyRowPreview(){var first=add("QZONE1",5);queue.cancel(first.requestId(),revision());for(int i=0;i<22;i++){var a=add("QZONE2",1);queue.cancel(a.requestId(),revision());}assertEquals(20,queue.snapshot().history().size());assertEquals(first.requestId(),queue.lookup(first.requestId()).requestId());}
 @Test void boundedQueueHasNoHiddenFiftyFirstRequest(){for(int i=0;i<50;i++)add(i%2==0?"QZONE1":"QZONE2",1);assertThrows(ResponseStatusException.class,()->add("QZONE1",1));assertEquals(50,queue.snapshot().waiting().size());}
 @Test void competingInstancesCannotAcquireTwoSlots()throws Exception{
  var a=add("QZONE1",5);add("QZONE2",5);var other=new IrrigationQueue(jdbc,mapper,manager);var gate=new CountDownLatch(1);long rev=revision();
  try(var pool=Executors.newFixedThreadPool(2)){var x=pool.submit(()->{gate.await();return queue.rehearse(a.requestId(),rev);});var y=pool.submit(()->{gate.await();return other.rehearse(a.requestId(),rev);});gate.countDown();assertEquals(a.requestId(),x.get(5,TimeUnit.SECONDS).requestId());assertEquals(a.requestId(),y.get(5,TimeUnit.SECONDS).requestId());}
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_queue_request WHERE state='REHEARSING'",Integer.class));assertEquals(4,revision());
 }
 @Test void competingDifferentItemsNeverBypassFifo()throws Exception{
  var a=add("QZONE1",5);var b=add("QZONE2",5);var other=new IrrigationQueue(jdbc,mapper,manager);var gate=new CountDownLatch(1);long rev=revision();
  try(var pool=Executors.newFixedThreadPool(2)){var x=pool.submit(()->{gate.await();return queue.rehearse(a.requestId(),rev).state();});var y=pool.submit(()->{gate.await();try{other.rehearse(b.requestId(),rev);return "WRONG";}catch(ResponseStatusException e){return "BLOCKED";}});gate.countDown();assertEquals("REHEARSING",x.get(5,TimeUnit.SECONDS));assertEquals("BLOCKED",y.get(5,TimeUnit.SECONDS));}
  assertEquals(a.requestId(),queue.snapshot().active().requestId());
 }
 @Test void getIsReadOnlyEvenAfterDeadline()throws Exception{var a=add("QZONE1",5);long rev=revision();mvc.perform(get("/api/v1/irrigation-queue")).andExpect(status().isOk()).andExpect(jsonPath("$.mode").value("PREVIEW_ONLY")).andExpect(jsonPath("$.waiting[0].requestId").value(a.requestId().toString()));assertEquals(rev,revision());mvc.perform(get("/api/v1/irrigation-queue/requests/"+a.requestId())).andExpect(status().isOk());}
 @Test void httpRejectsMalformedUnknownDuplicateAndStaleInput()throws Exception{
  String base="/api/v1/irrigation-queue/requests";
  for(String body:List.of("{}","[]","{\"requestId\":1,\"requestId\":2}",request(UUID.randomUUID(),"QZONE1",0).toString(),request(UUID.randomUUID(),"QZONE1",31).toString(),((com.fasterxml.jackson.databind.node.ObjectNode)request(UUID.randomUUID(),"QZONE1",5)).put("requestedAt","not-a-date").toString(),request(UUID.randomUUID(),"QZONE1",5).toString()+"{}",((com.fasterxml.jackson.databind.node.ObjectNode)request(UUID.randomUUID(),"QZONE1",5)).put("extra",1).toString()))mvc.perform(post(base).contentType("application/json").content(body)).andExpect(status().isBadRequest());
  var stale=(com.fasterxml.jackson.databind.node.ObjectNode)request(UUID.randomUUID(),"QZONE1",5);stale.put("requestedAt",Instant.now().minusSeconds(20).toString());mvc.perform(post(base).contentType("application/json").content(stale.toString())).andExpect(status().isConflict());assertEquals(0,count("irrigation_queue_request"));
 }
 @Test void httpEnqueueRunCancelAndUnknownOperation()throws Exception{
  UUID id=UUID.randomUUID();mvc.perform(post("/api/v1/irrigation-queue/requests").contentType("application/json").content(request(id,"QZONE1",2).toString())).andExpect(status().isCreated());
  mvc.perform(post("/api/v1/irrigation-queue/requests/"+id+"/rehearse").contentType("application/json").content("{\"revision\":"+revision()+"}")).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("REHEARSING"));
  mvc.perform(post("/api/v1/irrigation-queue/requests/"+id+"/cancel").contentType("application/json").content("{\"revision\":"+revision()+"}")).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("CANCELLED"));
  mvc.perform(post("/api/v1/irrigation-queue/requests/"+id+"/execute").contentType("application/json").content("{\"revision\":1}")).andExpect(status().isNotFound());mvc.perform(get("/api/v1/irrigation-queue/requests/"+UUID.randomUUID())).andExpect(status().isNotFound());
 }
}
