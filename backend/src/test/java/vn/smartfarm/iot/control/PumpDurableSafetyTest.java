package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.*;
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

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=false","smartfarm.control.pump-fencing-enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class PumpDurableSafetyTest {
    @Autowired PumpService pump; @Autowired JdbcTemplate jdbc; @Autowired ObjectMapper mapper; @Autowired MockMvc mvc;
    Instant base; long commands,runs;
    @BeforeEach void setup(){jdbc.update("DELETE FROM pump_status");jdbc.update("DELETE FROM pump_state_history");base=Instant.now().minusSeconds(2);commands=count("pump_command");runs=count("watering_run");}
    @AfterEach void cleanup(){assertEquals(commands,count("pump_command"));assertEquals(runs,count("watering_run"));jdbc.update("DELETE FROM pump_status");jdbc.update("DELETE FROM pump_state_history");}
    long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Long.class);}
    ObjectNode packet(int seq,String state,String reason,boolean locked){var p=mapper.createObjectNode().put("schemaVersion",1).put("deviceId","PUMP01").put("bootId","85000000-0000-4000-8000-000000000001").put("sequence",seq).put("timestamp",base.plusMillis(seq).toString()).put("connection","ONLINE").put("reportedState","OFF").put("safetyLockout",locked).put("stateReason",reason).putNull("activeCommandId");p.putObject("durableSafety").put("version",1).put("enabled",true).put("storage","NVS").put("state",state);p.putObject("commandFence").put("version",1).put("lastOrdinal",0).put("restartRequired",false);return p;}
    ObjectNode locked(int seq){return packet(seq,"LOCKED","RESTART_LOCKOUT",true);}
    void receive(ObjectNode p)throws Exception{pump.receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(p));}
    String stored(){return jdbc.queryForObject("SELECT durable_safety->>'state' FROM pump_status",String.class);}
    @Test void restartLockStoredAndExposedWithoutDispatch()throws Exception{receive(locked(0));assertEquals("LOCKED",stored());assertTrue(pump.status().safetyLockout());mvc.perform(get("/api/v1/safety")).andExpect(status().isOk()).andExpect(jsonPath("$.relay.durableSafety.storage").value("NVS"));}
    @Test void storageFaultMustBeLockedOff()throws Exception{var p=packet(0,"STORAGE_FAULT","SAFETY_STORAGE_FAULT",true);receive(p);assertEquals("STORAGE_FAULT",stored());assertThrows(Exception.class,()->receive(p.put("sequence",1).put("safetyLockout",false)));assertThrows(Exception.class,()->receive(p.put("safetyLockout",true).put("reportedState","ON")));}
    @Test void malformedMetadataNeverReplacesObservation()throws Exception{receive(locked(0));for(String field:List.of("version","enabled","storage","state")){var p=locked(1);((ObjectNode)p.get("durableSafety")).remove(field);assertThrows(Exception.class,()->receive(p));}var p=locked(1);((ObjectNode)p.get("durableSafety")).put("extra",true);assertThrows(Exception.class,()->receive(p));assertEquals(0,jdbc.queryForObject("SELECT sequence FROM pump_status",Integer.class));}
    @Test void wrongTypesAndUnknownStatesAreRejected()throws Exception{for(int i=0;i<5;i++){var p=locked(0);var d=(ObjectNode)p.get("durableSafety");switch(i){case 0->d.put("version",2);case 1->d.put("enabled",false);case 2->d.put("storage","RAM");case 3->d.put("state","SAFE");default->d.put("enabled","true");}assertThrows(Exception.class,()->receive(p));}assertEquals(0,count("pump_status"));}
    @Test void capabilityCannotDisappearInSameBoot()throws Exception{receive(locked(0));var p=packet(1,"READY","COMMAND_OFF",false);p.remove("durableSafety");receive(p);assertEquals("LOCKED",stored());}
    @Test void lockCannotClearThroughOrdinaryOffOrReadyReport()throws Exception{receive(locked(0));receive(packet(1,"READY","COMMAND_OFF",false));assertEquals("LOCKED",stored());assertTrue(pump.status().safetyLockout());receive(packet(2,"READY","LOCKOUT_RESET",false));assertEquals("READY",stored());assertFalse(pump.status().safetyLockout());}
    @Test void storageFaultAlsoNeedsExplicitResetReport()throws Exception{receive(packet(0,"STORAGE_FAULT","SAFETY_STORAGE_FAULT",true));receive(packet(1,"READY","TIMER_EXPIRED",false));assertEquals("STORAGE_FAULT",stored());receive(packet(2,"READY","LOCKOUT_RESET",false));assertEquals("READY",stored());}
    @Test void metadataNeedsFencingAndStatusTopic()throws Exception{var p=locked(0);p.remove("commandFence");assertThrows(Exception.class,()->receive(p));assertThrows(Exception.class,()->pump.receive("smartfarm/FARM001/PUMP01/ack",mapper.writeValueAsBytes(locked(0))));}
    @Test void reasonsCannotInventCapability()throws Exception{for(String reason:PumpDurableSafety.REASONS){var p=locked(0).put("stateReason",reason);p.remove("durableSafety");assertThrows(Exception.class,()->receive(p));}}
    @Test void restartDoesNotBorrowPreviousCapability()throws Exception{receive(locked(0));var p=packet(1,"READY","BOOT",false).put("bootId","85000000-0000-4000-8000-000000000002");p.remove("durableSafety");receive(p);assertNull(stored());}
    @Test void staleSequenceAndReadOnlySafetyDoNotRefreshClocks()throws Exception{receive(locked(1));String before=jdbc.queryForObject("SELECT row_to_json(s)::text FROM pump_status s",String.class);receive(locked(1));receive(locked(0));mvc.perform(get("/api/v1/safety")).andExpect(status().isOk());assertEquals(before,jdbc.queryForObject("SELECT row_to_json(s)::text FROM pump_status s",String.class));}
    @Test void nativeJournalEncoderGoesThroughReceiver()throws Exception{try(var in=getClass().getResourceAsStream("/pump-durable-safety-packets.json")){assertNotNull(in);for(var frame:mapper.readTree(in)){var p=(ObjectNode)frame;p.put("timestamp",base.plusMillis(p.path("sequence").asInt()).toString());receive(p);assertEquals(p.path("durableSafety").path("state").asText(),stored());}assertEquals("SAFETY_STORAGE_FAULT",pump.stateHistory().getFirst().stateReason());}}
    @Test void consistencyRejectsReadyOnAndLockedResetButAllowsPendingCutoff(){for(var p:List.of(packet(0,"READY","COMMAND_ON",false).put("reportedState","ON"),packet(0,"LOCKED","LOCKOUT_RESET",true),packet(0,"READY","RESTART_LOCKOUT",false),packet(0,"ARMED","COMMAND_ON",true)))assertThrows(Exception.class,()->PumpDurableSafety.parse(p.get("durableSafety"),p.path("reportedState").asText(),p.path("safetyLockout").asBoolean(),p.path("stateReason").asText()));var p=packet(0,"ARMED","COMMAND_ON",false);assertEquals("ARMED",PumpDurableSafety.parse(p.get("durableSafety"),"OFF",false,"COMMAND_ON").state());assertEquals("ARMED",PumpDurableSafety.parse(p.get("durableSafety"),"ON",false,"COMMAND_ON").state());}
    @Test void valveFaultAndDurableLockCanCoexist()throws Exception{var p=locked(0).put("stateReason","VALVE_PROOF_LOST");p.putObject("valveInterlock").put("version",1).put("enabled",true).put("dataSource","SIMULATOR").put("state","UNKNOWN").put("fault","VALVE_PROOF_LOST");receive(p);assertEquals("LOCKED",stored());assertEquals("VALVE_PROOF_LOST",pump.stateHistory().getFirst().stateReason());}
}
