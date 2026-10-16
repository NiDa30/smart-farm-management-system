package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
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

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false","smartfarm.control.pump-fencing-enabled=false"})
@AutoConfigureMockMvc @EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class IrrigationSessionHistoryTest {
    @Autowired IrrigationSessionHistory history;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired MockMvc mvc;
    Instant base,from,to;
    UUID boot=UUID.fromString("87000000-0000-4000-8000-000000000001");
    List<UUID> commands=new ArrayList<>();
    IrrigationCircuits.Config config(String id) { return new IrrigationCircuits.Config(id,"Historical "+id,"SHZONE",1,"IRRIGATION66","VALVE66","PUMP01","SHWATER","LOW","FLOW","SIMULATOR",1); }
    @BeforeEach void setup() { cleanup(); base=Instant.now().minusSeconds(5).truncatedTo(ChronoUnit.MICROS);from=base.minusSeconds(10);to=base.plusSeconds(20); }
    @AfterEach void cleanup() {
        jdbc.update("DELETE FROM irrigation_session_action WHERE session_id IN(SELECT session_id FROM irrigation_session WHERE circuit_id IN ('SH1','SH2'))");
        jdbc.update("DELETE FROM irrigation_session WHERE circuit_id IN ('SH1','SH2')");
        for(var id:commands) { jdbc.update("DELETE FROM pump_command WHERE command_id=?",id);jdbc.update("DELETE FROM circuit_demo_command WHERE command_id=?",id); } commands.clear();
    }
    UUID session(String circuit,Instant at) throws Exception {
        UUID id=UUID.randomUUID();jdbc.update("INSERT INTO irrigation_session(session_id,circuit_id,config_snapshot,pump_boot,valve_boot,duration_seconds,requested_at,created_at,phase,reason,stop_requested,finished_at) VALUES(?,?,?::jsonb,?,?,5,?,?,'CLOSED_CONFIRMED','OPERATOR_FINISH',true,?)",id,circuit,mapper.writeValueAsString(config(circuit)),boot,boot,Timestamp.from(at),Timestamp.from(at),Timestamp.from(at.plusSeconds(1)));return id;
    }
    UUID action(UUID session,String step) throws Exception {
        UUID id=UUID.randomUUID();var definition=new IrrigationSession.Action(id,step,1,base);Object payload=null;
        if(step.equals("ON")||step.equals("OFF"))payload=new PumpCommandFencing.HttpIntent(id,step,step.equals("ON")?5:null,step.equals("ON")?boot:null,1L,base,step.equals("ON")?new PumpCircuitRoute("SH1",1,"SHZONE",1,"IRRIGATION66","VALVE66"):null);
        if(step.equals("OPEN")||step.equals("CLOSE"))payload=new CircuitValveControl.Request(id,step,step.equals("OPEN")?30:null,boot,1,1,base);
        jdbc.update("INSERT INTO irrigation_session_action(request_id,session_id,action,definition,payload,state,created_at) VALUES(?,?,?,?::jsonb,?::jsonb,?,?)",id,session,step,mapper.writeValueAsString(definition),payload==null?null:mapper.writeValueAsString(payload),step.equals("FINISH")?"RETURNED":"UNRESOLVED",Timestamp.from(base));return id;
    }
    void pumpCommand(UUID id,String step) {
        commands.add(id);jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,fence_ordinal,target_boot_id,http_intent_revision,http_reviewed_at,http_expected_boot,circuit_route) VALUES(?,?,?,?,?,'SENT',nextval('pump_fence_ordinal_seq'),?,1,?,?,?::jsonb)",id,step,step.equals("ON")?5:null,Timestamp.from(base),Timestamp.from(base.plusSeconds(10)),boot,Timestamp.from(base),step.equals("ON")?boot:null,step.equals("ON")?"{\"circuitId\":\"SH1\",\"circuitRevision\":1,\"zoneId\":\"SHZONE\",\"zoneRevision\":1,\"controllerId\":\"IRRIGATION66\",\"valveId\":\"VALVE66\"}":null);
    }
    @Test void historyUsesStoredConfigWithoutCurrentRegistryOrEnabledControl() throws Exception {
        UUID s=session("SH1",base);var p=history.list(from,to,"SH1","ALL",50,null);assertEquals(s,p.items().getFirst().session().sessionId());assertEquals(config("SH1"),p.items().getFirst().session().config());assertEquals(0,p.items().getFirst().actionCount());
    }
    @Test void rangeIsHalfOpenOnCreationNotRequestedOrFinishedTime() throws Exception {
        var s=session("SH1",base);jdbc.update("UPDATE irrigation_session SET requested_at=?,finished_at=? WHERE session_id=?",Timestamp.from(from.minusSeconds(5)),Timestamp.from(to.plusSeconds(5)),s);
        assertTrue(history.list(from,base,"SH1",null,50,null).items().isEmpty());assertEquals(1,history.list(base,to,"SH1",null,50,null).items().size());
    }
    @Test void filtersSeparateCircuitsAndCurrentPhases() throws Exception {
        session("SH1",base);var s=session("SH2",base);jdbc.update("UPDATE irrigation_session SET phase='RECOVERY_REQUIRED',finished_at=NULL WHERE session_id=?",s);
        assertEquals(2,history.list(from,to,null,"ALL",50,null).items().size());assertEquals(1,history.list(from,to,null,"UNFINISHED",50,null).items().size());assertEquals(1,history.list(from,to,null,"CLOSED",50,null).items().size());assertEquals(s,history.list(from,to,null,"RECOVERY",50,null).items().getFirst().session().sessionId());assertTrue(history.list(from,to,"SH1","RECOVERY",50,null).items().isEmpty());
    }
    @Test void cursorOrdersEqualTimestampsAndExcludesNewRowsEvenBackdated() throws Exception {
        for(int i=0;i<4;i++)session("SH1",base);var a=history.list(from,to,"SH1","ALL",2,null);UUID late=session("SH1",base.minusSeconds(1));var b=history.list(from,to,"SH1","ALL",2,a.nextCursor());
        assertEquals(a.ceilingId(),b.ceilingId());assertNull(b.nextCursor());var ids=new HashSet<UUID>();a.items().forEach(x->ids.add(x.session().sessionId()));b.items().forEach(x->ids.add(x.session().sessionId()));assertEquals(4,ids.size());assertFalse(ids.contains(late));
    }
    @Test void cursorCannotCrossFiltersTimeCircuitOrEndpoint() throws Exception {
        var s=session("SH1",base);session("SH1",base);var c=history.list(from,to,"SH1","ALL",1,null).nextCursor();assertNotNull(c);
        assertThrows(Exception.class,()->history.list(from,to,"SH2","ALL",1,c));assertThrows(Exception.class,()->history.list(from,to,"SH1","CLOSED",1,c));assertThrows(Exception.class,()->history.list(from.minusSeconds(1),to,"SH1","ALL",1,c));assertThrows(Exception.class,()->history.steps("SH1",s,1,c));
    }
    @Test void invalidRangesLimitsConditionsIdentifiersAndTokensAreRejected() {
        assertThrows(Exception.class,()->history.list(to,from,null,null,50,null));assertThrows(Exception.class,()->history.list(from,from.plusSeconds(32*86400),null,null,50,null));for(int n:new int[]{0,101})assertThrows(Exception.class,()->history.list(from,to,null,null,n,null));assertThrows(Exception.class,()->history.list(from,to,"bad",null,50,null));assertThrows(Exception.class,()->history.list(from,to,null,"ON",50,null));assertThrows(Exception.class,()->history.list(from,to,null,null,50,"bad"));
    }
    @Test void summaryCountsAllActionsNotOnlyCurrentStepIds() throws Exception {
        var s=session("SH1",base);action(s,"OPEN");action(s,"CLOSE");action(s,"FINISH");var e=history.list(from,to,"SH1",null,50,null).items().getFirst();assertEquals(3,e.actionCount());assertEquals(2,e.unresolvedCount());
    }
    @Test void allStepsBeyondOldTwentyLimitArePagedWithoutReplaying() throws Exception {
        var s=session("SH1",base);for(int i=0;i<24;i++)action(s,"FINISH");var a=history.steps("SH1",s,20,null);var late=action(s,"OFF");var b=history.steps("SH1",s,20,a.nextCursor());assertEquals(20,a.items().size());assertEquals(4,b.items().size());assertNull(b.nextCursor());assertTrue(b.items().stream().noneMatch(x->x.operation().requestId().equals(late)));
    }
    @Test void stepCursorCannotCrossSessionAndWrongCircuitIsNotFound() throws Exception {
        var s=session("SH1",base);action(s,"FINISH");action(s,"FINISH");var c=history.steps("SH1",s,1,null).nextCursor();var other=session("SH1",base);assertThrows(Exception.class,()->history.steps("SH1",other,1,c));mvc.perform(get("/api/v1/irrigation-session-history/SH2/"+s+"/steps")).andExpect(status().isNotFound());
    }
    @Test void missingCommandIsUnknownAndFinishNeverInventsACommand() throws Exception {
        var s=session("SH1",base);action(s,"FINISH");action(s,"ON");var p=history.steps("SH1",s,50,null);assertTrue(p.items().stream().allMatch(x->x.command()==null));
    }
    @Test void currentPumpAckIsSeparateFromSavedDispatchResultAndDoesNotChangeSessionPhase() throws Exception {
        var s=session("SH1",base);var id=action(s,"ON");pumpCommand(id,"ON");assertEquals("SENT",history.steps("SH1",s,50,null).items().getFirst().command().state());
        jdbc.update("UPDATE pump_command SET state='EXECUTED',reported_state='ON',acknowledged_at=?,ack_boot_id=?,ack_sequence=2 WHERE command_id=?",Timestamp.from(base.plusSeconds(1)),boot,id);
        var step=history.steps("SH1",s,50,null);assertEquals("EXECUTED",step.items().getFirst().command().state());assertEquals(2,step.items().getFirst().command().ackSequence());assertNull(step.items().getFirst().operation().result());assertEquals("CLOSED_CONFIRMED",step.session().phase());
    }
    @Test void routeFreeOffIsMatchedByItsSavedHttpIntent() throws Exception {var s=session("SH1",base);var id=action(s,"OFF");pumpCommand(id,"OFF");assertEquals("OFF",history.steps("SH1",s,50,null).items().getFirst().command().action());}
    @Test void reusedUuidWithDifferentCommandDefinitionCannotBorrowLedgerEvidence() throws Exception {
        var s=session("SH1",base);var id=action(s,"ON");pumpCommand(id,"ON");jdbc.update("UPDATE pump_command SET http_intent_revision=2 WHERE command_id=?",id);assertNull(history.steps("SH1",s,50,null).items().getFirst().command());
    }
    @Test void valveAckKeepsSequenceWithoutInventingAckClockOrGpioStatus() throws Exception {
        var s=session("SH1",base);var id=action(s,"OPEN");commands.add(id);
        jdbc.update("INSERT INTO circuit_demo_command(command_id,circuit_id,valve_id,config_snapshot,boot_id,action,duration_seconds,requested_at,issued_at,expires_at,state,ack_sequence) VALUES(?,'SH1','VALVE66',?::jsonb,?,'OPEN',30,?,?,?,'EXECUTED',4)",id,mapper.writeValueAsString(config("SH1")),boot,Timestamp.from(base),Timestamp.from(base),Timestamp.from(base.plusSeconds(10)));
        var c=history.steps("SH1",s,50,null).items().getFirst().command();assertEquals("VALVE",c.kind());assertEquals(4,c.ackSequence());assertNull(c.acknowledgedAt());assertNull(c.reportedState());
        jdbc.update("UPDATE circuit_demo_command SET boot_id=? WHERE command_id=?",UUID.randomUUID(),id);assertNull(history.steps("SH1",s,50,null).items().getFirst().command());
    }
    @Test void readonlyHttpPreservesAllStoredSessionAndCommandContent() throws Exception {
        var s=session("SH1",base);var id=action(s,"OFF");pumpCommand(id,"OFF");String before=snapshot();
        mvc.perform(get("/api/v1/irrigation-session-history").param("from",from.toString()).param("to",to.toString()).param("circuitId","SH1")).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].session.sessionId").value(s.toString()));
        mvc.perform(get("/api/v1/irrigation-session-history/SH1/"+s+"/steps")).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].command.action").value("OFF"));assertEquals(before,snapshot());
    }
    String snapshot() {return jdbc.queryForObject("SELECT jsonb_build_array((SELECT jsonb_agg(to_jsonb(s) ORDER BY history_id) FROM irrigation_session s),(SELECT jsonb_agg(to_jsonb(a) ORDER BY history_id) FROM irrigation_session_action a),(SELECT jsonb_agg(to_jsonb(c) ORDER BY command_id) FROM pump_command c))::text",String.class);}
}
