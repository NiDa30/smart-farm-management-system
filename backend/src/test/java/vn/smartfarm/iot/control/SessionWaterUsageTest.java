package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import vn.smartfarm.iot.irrigation.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false"})
@AutoConfigureMockMvc @EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class SessionWaterUsageTest {
 @Autowired SessionWaterUsage service; @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper mapper; @Autowired MockMvc mvc;
 final Instant base=Instant.parse("2026-01-02T00:00:00Z"); final UUID boot=UUID.fromString("88000000-0000-4000-8000-000000000001");
 UUID session,on,off;List<UUID> commands=new ArrayList<>();
 IrrigationCircuits.Config config(){return new IrrigationCircuits.Config("SW1","Historical station","SWZONE",1,"IRRIGATION66","VALVE66","PUMP01","SWWATER","LOW","FLOW","SIMULATOR",1);}
 @BeforeEach void setup()throws Exception {
  cleanup();jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES('SWWATER','Session water','AREA001','WATER',2)");
  jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES('SWWATER','FLOW','FLOW_RATE','L/min')");
  session=UUID.randomUUID();jdbc.update("INSERT INTO irrigation_session(session_id,circuit_id,config_snapshot,pump_boot,valve_boot,duration_seconds,requested_at,created_at,phase,reason,finished_at) VALUES(?,'SW1',?::jsonb,?,?,10,?,?,'CLOSED_CONFIRMED','OPERATOR_FINISH',?)",session,mapper.writeValueAsString(config()),boot,boot,Timestamp.from(base),Timestamp.from(base),Timestamp.from(base.plusSeconds(20)));
  on=action("ON",base);off=action("OFF",base.plusSeconds(10));jdbc.update("UPDATE irrigation_session SET on_id=?,off_id=? WHERE session_id=?",on,off,session);
 }
 @AfterEach void cleanup(){
  jdbc.update("DELETE FROM irrigation_session_action WHERE session_id IN (SELECT session_id FROM irrigation_session WHERE circuit_id='SW1')");jdbc.update("DELETE FROM irrigation_session WHERE circuit_id='SW1'");
  for(UUID id:commands)jdbc.update("DELETE FROM pump_command WHERE command_id=?",id);commands.clear();jdbc.update("DELETE FROM iot_node WHERE node_id='SWWATER'");
 }
 UUID action(String step,Instant at)throws Exception {
  UUID id=UUID.randomUUID();var def=new IrrigationSession.Action(id,step,1,at);var route=step.equals("ON")?PumpCircuitRoute.from(config()):null;
  var payload=new PumpCommandFencing.HttpIntent(id,step,step.equals("ON")?10:null,step.equals("ON")?boot:null,1L,at,route);
  jdbc.update("INSERT INTO irrigation_session_action(request_id,session_id,action,definition,payload,state,created_at) VALUES(?,?,?,?::jsonb,?::jsonb,'RETURNED',?)",id,session,step,mapper.writeValueAsString(def),mapper.writeValueAsString(payload),Timestamp.from(at));commands.add(id);
  jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,reported_state,fence_ordinal,target_boot_id,http_intent_revision,http_reviewed_at,http_expected_boot,circuit_route,acknowledged_at,ack_boot_id,ack_sequence) VALUES(?,?,?,?,?,'EXECUTED',?,nextval('pump_fence_ordinal_seq'),?,1,?,?,?::jsonb,?,?,1)",id,step,step.equals("ON")?10:null,Timestamp.from(at),Timestamp.from(at.plusSeconds(10)),step,boot,Timestamp.from(at),step.equals("ON")?boot:null,route==null?null:mapper.writeValueAsString(route),Timestamp.from(at.plusSeconds(1)),boot);return id;
 }
 void point(int seq,int second,Double flow,String quality,String source,String calibration){
  long id=jdbc.queryForObject("INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,received_at,uptime_ms,data_source) VALUES('SWWATER',?,?,?,?,0,?) RETURNING id",Long.class,boot,seq,Timestamp.from(base.plusSeconds(second)),Timestamp.from(base.plusSeconds(second)),source);
  if(quality!=null)jdbc.update("INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,number_value,calibration_version) VALUES(?,'SWWATER','FLOW',?,?,?)",id,quality,flow,calibration);
 }
 void point(int seq,int second,double value){point(seq,second,value,"VALID","SIMULATOR","F1");}
 SessionWaterUsage.Report read(){return service.read("SW1",session);}
 @Test void frozenMappingAndServerIntentWindowEstimateOnlyCoveredStationIntervals(){point(1,1,6);point(2,6,6);point(3,10,100);var r=read();assertEquals("ESTIMATED",r.state());assertEquals(base,r.from());assertEquals(base.plusSeconds(10),r.to());assertEquals(.5,r.volume().estimatedLitres().doubleValue());assertEquals(5,r.volume().coveredSeconds().doubleValue());assertEquals(5,r.volume().uncoveredSeconds().doubleValue());assertEquals("SWWATER",r.waterNodeId());assertEquals(1,r.circuitRevision());}
 @Test void missingOnIntentDoesNotInventRangeOrZero(){jdbc.update("UPDATE irrigation_session SET on_id=NULL WHERE session_id=?",session);assertEquals("NO_ON_INTENT",read().reason());assertNull(read().volume());}
 @Test void missingOwnOnStepDoesNotBorrowLedger(){jdbc.update("DELETE FROM irrigation_session_action WHERE request_id=?",on);assertEquals("ON_EVIDENCE_UNAVAILABLE",read().reason());}
 @Test void noOffDoesNotUseRequestedDurationOrFinishTime(){jdbc.update("DELETE FROM irrigation_session_action WHERE request_id=?",off);assertEquals("NO_OFF_INTENT",read().reason());assertNull(read().to());}
 @Test void firstOffAttemptNotLatestRetryBoundsTheWindow()throws Exception {var retry=action("OFF",base.plusSeconds(20));jdbc.update("UPDATE irrigation_session SET off_id=? WHERE session_id=?",retry,session);assertEquals(off,read().offId());assertEquals(base.plusSeconds(10),read().to());}
 @Test void failedFirstOffCannotBeHiddenBySuccessfulRetry()throws Exception {action("OFF",base.plusSeconds(20));jdbc.update("UPDATE pump_command SET state='FAILED' WHERE command_id=?",off);assertEquals("COMMAND_EVIDENCE_UNCONFIRMED",read().reason());}
 @Test void sentIsNotExecutedAck(){jdbc.update("UPDATE pump_command SET state='SENT' WHERE command_id=?",on);assertEquals("COMMAND_EVIDENCE_UNCONFIRMED",read().reason());}
 @Test void wrongAckBootAndMissingClockAreNotProof(){jdbc.update("UPDATE pump_command SET ack_boot_id=? WHERE command_id=?",UUID.randomUUID(),off);assertEquals("COMMAND_EVIDENCE_UNCONFIRMED",read().reason());jdbc.update("UPDATE pump_command SET ack_boot_id=?,acknowledged_at=NULL WHERE command_id=?",boot,off);assertEquals("COMMAND_EVIDENCE_UNCONFIRMED",read().reason());}
 @Test void reusedCommandIdentityOrUnresolvedCallCannotBorrowAck(){jdbc.update("UPDATE pump_command SET http_intent_revision=2 WHERE command_id=?",on);assertEquals("COMMAND_EVIDENCE_UNCONFIRMED",read().reason());jdbc.update("UPDATE pump_command SET http_intent_revision=1 WHERE command_id=?",on);jdbc.update("UPDATE irrigation_session_action SET state='UNRESOLVED' WHERE request_id=?",on);assertEquals("COMMAND_EVIDENCE_UNCONFIRMED",read().reason());}
 @Test void sameInstantOrTooLongWindowIsRejected(){jdbc.update("UPDATE irrigation_session_action SET created_at=? WHERE request_id=?",Timestamp.from(base),off);assertEquals("INVALID_INTENT_WINDOW",read().reason());jdbc.update("UPDATE irrigation_session_action SET created_at=? WHERE request_id=?",Timestamp.from(base.plusSeconds(86401)),off);assertEquals("INVALID_INTENT_WINDOW",read().reason());}
 @Test void noSamplesOrOneSampleIsUnknownMeasuredZeroNeedsTwo(){assertEquals("NO_VALID_INTERVALS",read().reason());point(1,1,0);assertNull(read().volume().estimatedLitres());point(2,6,0);assertEquals("ESTIMATED",read().state());assertEquals(0,read().volume().estimatedLitres().doubleValue());}
 @Test void faultOtherSourceAndMissingChannelAreNeverBridged(){point(1,0,6);point(2,2,null,"SENSOR_FAULT","SIMULATOR","F1");point(3,4,6.0,"VALID","PHYSICAL","F1");point(4,6,null,null,"SIMULATOR","F1");point(5,8,6);assertNull(read().volume().estimatedLitres());assertEquals(0,read().volume().acceptedIntervals());}
 @Test void calibrationGroupsDoNotBecomeOneTotal(){point(1,0,6);point(2,2,6);point(3,4,6.0,"VALID","SIMULATOR","F2");point(4,6,6.0,"VALID","SIMULATOR","F2");var r=read();assertEquals("MULTIPLE_CALIBRATIONS",r.reason());assertNull(r.volume().estimatedLitres());assertEquals(2,r.volume().groups().size());}
 @Test void excessiveFlowBecomesUnavailableWithoutRollingBackRead(){
  jdbc.update("UPDATE irrigation_session_action SET created_at=? WHERE request_id=?",Timestamp.from(base.plusSeconds(80)),off);
  for(int i=0;i<6;i++)point(i+1,i*15,Double.MAX_VALUE);
  assertEquals("ESTIMATE_LIMIT_EXCEEDED",read().reason());
 }
 @Test void deletedFlowDeclarationGivesExplicitUnavailable(){jdbc.update("DELETE FROM iot_channel WHERE node_id='SWWATER'");assertEquals("WATER_CHANNEL_UNAVAILABLE",read().reason());}
 @Test void recoverySessionIsHistoricalAndNoCurrentReadinessRequired(){jdbc.update("UPDATE irrigation_session SET phase='RECOVERY_REQUIRED' WHERE session_id=?",session);point(1,1,6);point(2,6,6);assertEquals("ESTIMATED",read().state());}
 @Test void httpReadTwicePreservesStoredRowsAndDoesNotDispatch()throws Exception {
  point(1,1,6);point(2,6,6);String before=snapshot();for(int i=0;i<2;i++)mvc.perform(get("/api/v1/irrigation-session-history/SW1/"+session+"/water-usage")).andExpect(status().isOk()).andExpect(jsonPath("$.mode").value("SESSION_STATION_FLOW")).andExpect(jsonPath("$.volume.estimatedLitres").value(.5));assertEquals(before,snapshot());
  mvc.perform(get("/api/v1/irrigation-session-history/SW2/"+session+"/water-usage")).andExpect(status().isNotFound());
 }
 String snapshot(){return jdbc.queryForObject("SELECT jsonb_build_array((SELECT jsonb_agg(to_jsonb(s) ORDER BY session_id) FROM irrigation_session s),(SELECT jsonb_agg(to_jsonb(a) ORDER BY request_id) FROM irrigation_session_action a),(SELECT jsonb_agg(to_jsonb(c) ORDER BY command_id) FROM pump_command c),(SELECT count(*) FROM watering_run),(SELECT count(*) FROM circuit_demo_command),(SELECT count(*) FROM node_sample))::text",String.class);}
}
