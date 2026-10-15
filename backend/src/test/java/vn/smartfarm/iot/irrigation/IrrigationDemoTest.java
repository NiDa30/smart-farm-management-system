package vn.smartfarm.iot.irrigation;
import com.fasterxml.jackson.databind.*;
import java.time.*;import java.sql.Timestamp;import java.util.*;
import org.junit.jupiter.api.*;import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;import org.springframework.jdbc.core.JdbcTemplate;import org.springframework.test.web.servlet.MockMvc;import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false","smartfarm.irrigation.demo-enabled=true"})
@AutoConfigureMockMvc @EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class IrrigationDemoTest {
 @Autowired IrrigationDemo service;@Autowired JdbcTemplate jdbc;@Autowired ObjectMapper mapper;@Autowired MockMvc mvc;@MockitoBean IrrigationTransport transport;
 final UUID boot=UUID.fromString("51000000-0000-4000-8000-000000000001");long pumps,runs;
 @BeforeEach void setup()throws Exception {
  jdbc.update("DELETE FROM irrigation_demo_command");jdbc.update("DELETE FROM irrigation_demo_status");jdbc.update("INSERT INTO irrigation_demo_binding(singleton) VALUES(1) ON CONFLICT DO NOTHING");jdbc.update("UPDATE irrigation_demo_binding SET zone_id=NULL,zone_revision=NULL,revision=1,close_fence_at=NULL");
  jdbc.update("DELETE FROM irrigation_zone WHERE zone_id='IRRZONE'");jdbc.update("DELETE FROM iot_node WHERE node_id='IRRSOIL'");
  jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES('IRRSOIL','Test','AREA001','SOIL',2)");
  for(int i=1;i<=3;i++)jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES('IRRSOIL',?,'SOIL_MOISTURE','%')","SOIL"+i);
  jdbc.update("INSERT INTO irrigation_zone(zone_id,name,area_id,soil_node_id,expected_source,dry_threshold,wet_threshold) VALUES('IRRZONE','Demo','AREA001','IRRSOIL','SIMULATOR',30,35)");
  pumps=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);runs=jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class);
  when(transport.irrigationConnected()).thenReturn(true);bind();reportStatus(1,0,"CLOSED",boot);
 }
 @AfterEach void after(){assertEquals(pumps,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class));assertEquals(runs,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class));cleanupOwnFixture();}
 void cleanupOwnFixture(){
  jdbc.update("DELETE FROM irrigation_demo_command WHERE zone_id='IRRZONE'");
  jdbc.update("DELETE FROM irrigation_demo_status WHERE zone_id='IRRZONE'");
  jdbc.update("UPDATE irrigation_demo_binding SET zone_id=NULL,zone_revision=NULL WHERE zone_id='IRRZONE'");
  jdbc.update("DELETE FROM irrigation_zone WHERE zone_id='IRRZONE'");
  jdbc.update("DELETE FROM iot_node WHERE node_id='IRRSOIL'");
 }
 void bind()throws Exception{service.bind(mapper.readTree("{\"zoneId\":\"IRRZONE\",\"zoneRevision\":1,\"revision\":1}"));}
 com.fasterxml.jackson.databind.node.ObjectNode packet(long seq,long last,String state,UUID b){return mapper.createObjectNode().put("schemaVersion",1).put("controllerId","IRRIGATION01").put("actuatorId","VALVE01").put("zoneId","IRRZONE").put("bootId",b.toString()).put("sequence",seq).put("timestamp",Instant.now().toString()).put("dataSource","SIMULATOR").put("feedbackState","UNKNOWN").put("gpioState",state).put("reason",state.equals("OPEN")?"COMMAND_OPEN":"COMMAND_CLOSE").put("demoEnabled",true).put("lastOrdinal",last);}
 void receive(String leaf,JsonNode p)throws Exception{service.receive("smartfarm/FARM001/VALVE01/"+leaf,mapper.writeValueAsBytes(p));}
 void reportStatus(long seq,long ordinal,String state,UUID b)throws Exception{receive("status",packet(seq,ordinal,state,b));}
 IrrigationDemo.Request request(UUID id,String action,Integer duration){return new IrrigationDemo.Request(id,action,duration,action.equals("OPEN")?service.snapshot().latest().bootId():null,service.snapshot().binding().revision(),Instant.now());}
 IrrigationDemo.Command open(){return service.create(request(UUID.randomUUID(),"OPEN",5));}
 void ack(IrrigationDemo.Command c,long seq,String state)throws Exception{receive("ack",packet(seq,c.ordinal(),state,boot).put("commandId",c.commandId().toString()).put("ordinal",c.ordinal()).put("action",c.action()).put("result","EXECUTED").putNull("errorCode"));}
 @Test void recordsBeforePublishAndDuplicateIdNeverPublishesAgain()throws Exception {
  doAnswer(call->{var p=mapper.readTree((byte[])call.getArgument(0));assertEquals("PENDING",jdbc.queryForObject("SELECT state FROM irrigation_demo_command WHERE command_id=?",String.class,UUID.fromString(p.path("commandId").asText())));assertEquals("VALVE01",p.path("actuatorId").asText());assertEquals(boot.toString(),p.path("bootId").asText());return null;}).when(transport).publishIrrigation(any());
  var c=open();assertEquals("SENT",c.state());assertEquals(c.commandId(),service.create(request(c.commandId(),"OPEN",5)).commandId());verify(transport,times(1)).publishIrrigation(any());
  assertEquals(409,assertThrows(ResponseStatusException.class,()->service.create(request(c.commandId(),"CLOSE",null))).getStatusCode().value());
 }
 @Test void pendingCommandOutsidePreviewStillBlocksNewOpen(){var c=open();for(int i=0;i<22;i++)service.create(request(UUID.randomUUID(),"CLOSE",null));assertEquals(20,service.snapshot().commands().size());jdbc.update("UPDATE irrigation_demo_command SET boot_id=? WHERE action='CLOSE'",UUID.randomUUID());jdbc.update("UPDATE irrigation_demo_binding SET close_fence_at=NULL");assertEquals(c.commandId(),service.lookup(c.commandId()).commandId());assertThrows(ResponseStatusException.class,this::open);}
 @Test void ackDuringPublishDoesNotGetOverwrittenBySent()throws Exception{doAnswer(call->{var p=mapper.readTree((byte[])call.getArgument(0));ack(service.snapshot().commands().getFirst(),2,"OPEN");return null;}).when(transport).publishIrrigation(any());assertEquals("EXECUTED",open().state());}
 @Test void uncertainPublishIsStoredAndNotRetried()throws Exception{doThrow(new RuntimeException("uncertain")).when(transport).publishIrrigation(any());var c=open();assertEquals("PUBLISH_UNCERTAIN",c.state());service.create(request(c.commandId(),"OPEN",5));verify(transport,times(1)).publishIrrigation(any());}
 @Test void staleOffOrUnseenOrdinalCannotAuthorizeOpen()throws Exception{jdbc.update("UPDATE irrigation_demo_status SET observed_at=CURRENT_TIMESTAMP-INTERVAL '20 seconds'");assertThrows(ResponseStatusException.class,this::open);assertThrows(IllegalArgumentException.class,()->reportStatus(2,999,"CLOSED",boot));}
 @Test void closeCanFenceUnconfirmedOpenAndNewOpenWaitsForClosedStatus()throws Exception{var a=open();var close=service.create(request(UUID.randomUUID(),"CLOSE",null));ack(close,3,"CLOSED");assertThrows(ResponseStatusException.class,this::open);reportStatus(4,close.ordinal(),"CLOSED",boot);jdbc.update("UPDATE irrigation_demo_binding SET close_fence_at=NULL");assertEquals("SENT",open().state());}
 @Test void lateOpenAckNeverOverwritesNewerClosedStatus()throws Exception{var a=open();var b=service.create(request(UUID.randomUUID(),"CLOSE",null));reportStatus(5,b.ordinal(),"CLOSED",boot);ack(a,2,"OPEN");jdbc.update("UPDATE irrigation_demo_binding SET close_fence_at=NULL");assertEquals("CLOSED",service.snapshot().latest().gpioState());assertEquals("SENT",open().state());}
 @Test void rebootFreshClosedAllowsNewBootCommandWhileOldOpenCannotTargetIt()throws Exception{open();UUID next=UUID.randomUUID();reportStatus(0,0,"CLOSED",next);assertEquals(next,open().bootId());}
 @Test void wrongBootAckAndConflictingDuplicateDoNotMutateLedger()throws Exception{var c=open();var p=packet(2,c.ordinal(),"OPEN",UUID.randomUUID()).put("commandId",c.commandId().toString()).put("ordinal",c.ordinal()).put("action","OPEN").put("result","EXECUTED").putNull("errorCode");receive("ack",p);assertEquals("SENT",service.snapshot().commands().getFirst().state());ack(c,3,"OPEN");p.put("bootId",boot.toString()).put("result","REJECTED").put("errorCode","BUSY");receive("ack",p);assertEquals("EXECUTED",service.snapshot().commands().getFirst().state());}
 @Test void changedZoneRevisionBlocksOpenButNotClose()throws Exception{jdbc.update("UPDATE irrigation_zone SET revision=2 WHERE zone_id='IRRZONE'");assertThrows(ResponseStatusException.class,this::open);assertEquals("SENT",service.create(request(UUID.randomUUID(),"CLOSE",null)).state());}
 @Test void bindRequiresVersionSimulatorSourceAndClosedCaughtUp()throws Exception{assertThrows(ResponseStatusException.class,this::bind);open();assertThrows(ResponseStatusException.class,()->service.bind(mapper.readTree("{\"zoneId\":\"IRRZONE\",\"zoneRevision\":1,\"revision\":2}")));}
 @Test void invalidStateSourceFieldsAndOldStatusAreRejectedOrIgnored()throws Exception{
  assertThrows(IllegalArgumentException.class,()->receive("status",packet(2,0,"OPEN",boot).put("reason","TIMER_EXPIRED")));
  assertThrows(IllegalArgumentException.class,()->receive("status",packet(2,0,"CLOSED",boot).put("feedbackState","OPEN")));
  assertThrows(IllegalArgumentException.class,()->receive("status",packet(2,0,"CLOSED",boot).put("dataSource","PHYSICAL")));
  reportStatus(0,0,"CLOSED",boot);assertEquals(1,service.snapshot().latest().sequence());
  var p=packet(4,0,"CLOSED",boot).put("timestamp",Instant.now().minusSeconds(20).toString());assertThrows(IllegalArgumentException.class,()->receive("status",p));
 }
 @Test void disconnectedTransportAndInvalidDurationsDoNotPublish()throws Exception{when(transport.irrigationConnected()).thenReturn(false);assertThrows(ResponseStatusException.class,this::open);for(int n:new int[]{0,31})assertThrows(ResponseStatusException.class,()->service.create(request(UUID.randomUUID(),"OPEN",n)));verify(transport,never()).publishIrrigation(any());}
 @Test void snapshotIsReadOnlyAndHttpRejectsUnknownFields()throws Exception{mvc.perform(get("/api/v1/irrigation-demo")).andExpect(status().isOk()).andExpect(jsonPath("$.controllerId").value("IRRIGATION01"));mvc.perform(post("/api/v1/irrigation-demo/commands").contentType("application/json").content("{\"requestId\":\""+UUID.randomUUID()+"\",\"action\":\"OPEN\",\"durationSeconds\":5,\"extra\":1}")).andExpect(status().isBadRequest());assertTrue(service.snapshot().commands().isEmpty());}
 @Test void delayedHttpOpenOlderThanCloseFenceCannotBeApplied()throws Exception{var pending=request(UUID.randomUUID(),"OPEN",5);service.create(request(UUID.randomUUID(),"CLOSE",null));assertThrows(ResponseStatusException.class,()->service.create(pending));}
 @Test void staleBootAndOldRequestAreRejected(){var q=request(UUID.randomUUID(),"OPEN",5);assertThrows(ResponseStatusException.class,()->service.create(new IrrigationDemo.Request(q.requestId(),q.action(),q.durationSeconds(),UUID.randomUUID(),q.bindingRevision(),q.requestedAt())));assertThrows(ResponseStatusException.class,()->service.create(new IrrigationDemo.Request(q.requestId(),q.action(),q.durationSeconds(),q.expectedBootId(),q.bindingRevision(),Instant.now().minusSeconds(20))));}
 @Test void reservedControllerIdsCannotBeRegisteredAsSensors(){assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("INSERT INTO sensor_device(device_id,name,area_id) VALUES('IRRIGATION01','bad','AREA001')"));}
}
