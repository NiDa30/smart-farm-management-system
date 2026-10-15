package vn.smartfarm.iot.irrigation;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterTelemetry;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false","smartfarm.irrigation.demo-enabled=true","smartfarm.irrigation.position-feedback-required=true"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class ValvePositionTest {
 @Autowired IrrigationDemo service;@Autowired JdbcTemplate jdbc;@Autowired ObjectMapper mapper;
 @Autowired PlatformTransactionManager manager;@Autowired ObjectProvider<IrrigationTransport> providers;@Autowired WaterTelemetry json;
 @MockitoBean IrrigationTransport transport;
 final UUID boot=UUID.fromString("51000000-0000-4000-8000-000000000001");long seq,pumps,runs,queue;
 @BeforeEach void setup()throws Exception {
  jdbc.update("DELETE FROM irrigation_demo_command");jdbc.update("DELETE FROM irrigation_demo_status");jdbc.update("UPDATE irrigation_demo_binding SET zone_id=NULL,zone_revision=NULL,revision=1,close_fence_at=NULL");
  jdbc.update("DELETE FROM irrigation_zone WHERE zone_id='VFZONE'");jdbc.update("DELETE FROM iot_node WHERE node_id='VFSOIL'");
  jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES('VFSOIL','Test','AREA001','SOIL',2)");
  for(int i=1;i<=3;i++)jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES('VFSOIL',?,'SOIL_MOISTURE','%')","SOIL"+i);
  jdbc.update("INSERT INTO irrigation_zone(zone_id,name,area_id,soil_node_id,expected_source,dry_threshold,wet_threshold) VALUES('VFZONE','Position test','AREA001','VFSOIL','SIMULATOR',30,35)");
  service.bind(mapper.readTree("{\"zoneId\":\"VFZONE\",\"zoneRevision\":1,\"revision\":1}"));seq=0;
  pumps=count("pump_command");runs=count("watering_run");queue=count("irrigation_queue_request");reset(transport);when(transport.irrigationConnected()).thenReturn(true);
 }
 @AfterEach void noPumpOrQueue(){assertEquals(pumps,count("pump_command"));assertEquals(runs,count("watering_run"));assertEquals(queue,count("irrigation_queue_request"));cleanupOwnFixture();}
 void cleanupOwnFixture(){
  jdbc.update("DELETE FROM irrigation_demo_command WHERE zone_id='VFZONE'");
  jdbc.update("DELETE FROM irrigation_demo_status WHERE zone_id='VFZONE'");
  jdbc.update("UPDATE irrigation_demo_binding SET zone_id=NULL,zone_revision=NULL WHERE zone_id='VFZONE'");
  jdbc.update("DELETE FROM irrigation_zone WHERE zone_id='VFZONE'");
  jdbc.update("DELETE FROM iot_node WHERE node_id='VFSOIL'");
 }
 long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class);}
 ObjectNode legacy(UUID b){return mapper.createObjectNode().put("schemaVersion",1).put("controllerId","IRRIGATION01").put("actuatorId","VALVE01").put("zoneId","VFZONE").put("bootId",b.toString()).put("sequence",++seq).put("timestamp",Instant.now().toString()).put("dataSource","SIMULATOR").put("feedbackState","UNKNOWN").put("gpioState","CLOSED").put("reason","COMMAND_CLOSE").put("demoEnabled",true).put("lastOrdinal",0);}
 ObjectNode packet(String state,String fault,long ordinal,String gpio){var p=legacy(boot).put("feedbackState",state).put("lastOrdinal",ordinal).put("gpioState",gpio).put("reason",fault!=null?"POSITION_FAULT":gpio.equals("OPEN")?"COMMAND_OPEN":"COMMAND_CLOSE");var f=p.putObject("positionFeedback").put("version",1).put("enabled",true).put("state",state);if(fault==null)f.putNull("fault");else f.put("fault",fault);return p;}
 void receive(String leaf,JsonNode p)throws Exception{service.receive("smartfarm/FARM001/VALVE01/"+leaf,mapper.writeValueAsBytes(p));}
 void report(String state,String fault)throws Exception{receive("status",packet(state,fault,0,"CLOSED"));}
 IrrigationDemo.Request request(String action){return new IrrigationDemo.Request(UUID.randomUUID(),action,action.equals("OPEN")?5:null,action.equals("OPEN")?service.snapshot().latest().bootId():null,service.snapshot().binding().revision(),Instant.now());}

 @Test void requiredProfileDoesNotTreatLegacyGpioClosedAsPosition()throws Exception{receive("status",legacy(boot));assertNull(service.snapshot().latest().positionFeedback());assertTrue(service.snapshot().feedbackRequired());assertFalse(service.snapshot().readyToOpen());assertThrows(ResponseStatusException.class,()->service.create(request("OPEN")));verify(transport,never()).publishIrrigation(any());}
 @Test void independentClosedEnablesOpenAndCommitsReceipt()throws Exception{report("CLOSED",null);assertTrue(service.snapshot().readyToOpen());assertEquals("SENT",service.create(request("OPEN")).state());assertEquals("CLOSED",service.snapshot().latest().positionFeedback().state());}
 @Test void gpioClosedWithOpenOrUnknownFeedbackCannotAuthorize()throws Exception{for(String s:List.of("OPEN","UNKNOWN")){report(s,null);assertFalse(service.snapshot().readyToOpen());assertThrows(ResponseStatusException.class,()->service.create(request("OPEN")));}assertEquals(0,count("irrigation_demo_command"));}
 @Test void localFaultBlocksOpenButCloseAlwaysAvailable()throws Exception{report("CONFLICT","SWITCH_CONFLICT");assertFalse(service.snapshot().readyToOpen());assertThrows(ResponseStatusException.class,()->service.create(request("OPEN")));assertEquals("SENT",service.create(request("CLOSE")).state());assertEquals("SWITCH_CONFLICT",service.snapshot().latest().positionFeedback().fault());}
 @Test void faultCannotDisappearWithinBootWithoutNewCloseOrdinal()throws Exception{report("CLOSED","OPEN_TIMEOUT");long previous=service.snapshot().latest().sequence();report("CLOSED",null);assertEquals(previous,service.snapshot().latest().sequence());assertEquals("OPEN_TIMEOUT",service.snapshot().latest().positionFeedback().fault());var c=service.create(request("CLOSE"));receive("status",packet("CLOSED",null,c.ordinal(),"CLOSED"));assertNull(service.snapshot().latest().positionFeedback().fault());jdbc.update("UPDATE irrigation_demo_binding SET close_fence_at=NULL");assertTrue(service.snapshot().readyToOpen());}
 @Test void sameBootCannotDowngradeCapability()throws Exception{report("CLOSED",null);long previous=service.snapshot().latest().sequence();receive("status",legacy(boot));assertEquals(previous,service.snapshot().latest().sequence());assertNotNull(service.snapshot().latest().positionFeedback());receive("status",legacy(UUID.randomUUID()));assertNull(service.snapshot().latest().positionFeedback());assertFalse(service.snapshot().readyToOpen());}
 @Test void stalePositionAndSourceCannotRefreshState()throws Exception{report("CLOSED",null);long previous=service.snapshot().latest().sequence();assertThrows(IllegalArgumentException.class,()->receive("status",packet("OPEN",null,0,"CLOSED").put("timestamp",Instant.now().minusSeconds(20).toString())));assertThrows(IllegalArgumentException.class,()->receive("status",packet("OPEN",null,0,"CLOSED").put("dataSource","PHYSICAL")));assertEquals(previous,service.snapshot().latest().sequence());}
 @Test void oldSequenceOrRegressedOrdinalCannotOverwrite()throws Exception{report("CLOSED",null);var c=service.create(request("CLOSE"));receive("status",packet("CLOSED",null,c.ordinal(),"CLOSED"));long previous=service.snapshot().latest().sequence();receive("status",packet("OPEN",null,0,"CLOSED"));assertEquals(previous,service.snapshot().latest().sequence());}
 @Test void malformedOrContradictoryMetadataRejected()throws Exception{
  var candidates=new ArrayList<ObjectNode>();var p=packet("CLOSED",null,0,"CLOSED");((ObjectNode)p.get("positionFeedback")).put("version",2);candidates.add(p);
  p=packet("CLOSED",null,0,"CLOSED");((ObjectNode)p.get("positionFeedback")).put("enabled",false);candidates.add(p);
  p=packet("CLOSED",null,0,"CLOSED");((ObjectNode)p.get("positionFeedback")).put("state","OPEN");candidates.add(p);
  p=packet("CONFLICT",null,0,"CLOSED");candidates.add(p);p=packet("CLOSED","OPEN_TIMEOUT",0,"OPEN");candidates.add(p);
  p=packet("CLOSED",null,0,"CLOSED");((ObjectNode)p.get("positionFeedback")).put("extra",true);candidates.add(p);
  for(var v:candidates)assertThrows(IllegalArgumentException.class,()->receive("status",v));assertNull(service.snapshot().latest());
 }
 @Test void acknowledgementDoesNotInventLatestPosition()throws Exception{report("CLOSED",null);var c=service.create(request("OPEN"));var p=packet("OPEN",null,c.ordinal(),"OPEN").put("commandId",c.commandId().toString()).put("ordinal",c.ordinal()).put("action","OPEN").put("result","EXECUTED").putNull("errorCode");receive("ack",p);assertEquals("EXECUTED",service.lookup(c.commandId()).state());assertEquals("CLOSED",service.snapshot().latest().positionFeedback().state());}
 @Test void optionalBackendStillHonorsAdvertisedCapability()throws Exception{var optional=new IrrigationDemo(jdbc,mapper,json,providers,manager,true,false);receive("status",legacy(boot));assertTrue(optional.snapshot().readyToOpen());report("OPEN",null);assertFalse(optional.snapshot().readyToOpen());assertThrows(ResponseStatusException.class,()->optional.create(request("OPEN")));}
 @Test void bindingChangeRequiresClosedPositionNotJustGpio()throws Exception{report("OPEN",null);assertThrows(ResponseStatusException.class,()->service.bind(mapper.readTree("{\"zoneId\":\"VFZONE\",\"zoneRevision\":1,\"revision\":2}")));assertEquals(2,service.snapshot().binding().revision());}
 @Test void nativePacketUsesRealParserWithoutDispatch()throws Exception{try(var in=getClass().getResourceAsStream("/valve-feedback-status.json")){assertNotNull(in);var p=(ObjectNode)mapper.readTree(in);p.put("zoneId","VFZONE").put("timestamp",Instant.now().toString());receive("status",p);assertTrue(service.snapshot().readyToOpen());assertEquals("CLOSED",service.snapshot().latest().positionFeedback().state());assertEquals(0,count("irrigation_demo_command"));}}
 @Test void v24UpgradePreservesLegacyStatusAsUnverified(){String schema="valve_pos_upgrade_"+UUID.randomUUID().toString().replace("-","");try{org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).target("24").load().migrate();jdbc.update("INSERT INTO "+schema+".irrigation_demo_status(singleton,zone_id,boot_id,sequence,observed_at,received_at,gpio_state,reason,demo_enabled,last_ordinal) VALUES(1,'ZONE01',?,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'CLOSED','BOOT',true,0)",boot);org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).load().migrate();assertEquals("UNKNOWN",jdbc.queryForObject("SELECT feedback_state FROM "+schema+".irrigation_demo_status",String.class));assertFalse(jdbc.queryForObject("SELECT feedback_enabled FROM "+schema+".irrigation_demo_status",Boolean.class));assertEquals(boot,jdbc.queryForObject("SELECT boot_id FROM "+schema+".irrigation_demo_status",UUID.class));}finally{jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}}
}
