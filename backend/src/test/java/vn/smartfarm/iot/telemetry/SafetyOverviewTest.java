package vn.smartfarm.iot.telemetry;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.smartfarm.iot.control.CommandTransport;
import vn.smartfarm.iot.safety.SafetyOverview;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class SafetyOverviewTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired SafetyOverview overview;
    @Autowired MockMvc mvc;
    @MockitoBean CommandTransport transport;

    @BeforeEach void setup() {
        jdbc.execute("TRUNCATE watering_run,watering_rule,pump_command,pump_status,pump_state_history,telemetry");
        jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
        reset(transport);
        when(transport.controlConnected()).thenReturn(false);
    }
    @AfterEach void neverPublishes() throws Exception { verify(transport,never()).publishCommand(any()); }
    UUID command(String state, boolean expired) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,error_code) VALUES(?,'ON',20,?,?,?,?)",
                id,Timestamp.from(Instant.now().minusSeconds(expired?60:1)),Timestamp.from(Instant.now().plusSeconds(expired?-50:9)),state,state.equals("FAILED")?"CLOCK_SKEW":null);
        return id;
    }
    @Test void emptyApiDistinguishesUnseenRelayFromUnlockedOff() throws Exception {
        mvc.perform(get("/api/v1/safety")).andExpect(status().isOk())
                .andExpect(jsonPath("$.farmId").value("FARM001"))
                .andExpect(jsonPath("$.mqtt.state").value("DISABLED"))
                .andExpect(jsonPath("$.controlEnabled").value(true))
                .andExpect(jsonPath("$.controlTransportConnected").value(false))
                .andExpect(jsonPath("$.relay").isEmpty()).andExpect(jsonPath("$.sensor").isEmpty())
                .andExpect(jsonPath("$.stateHistory").isEmpty()).andExpect(jsonPath("$.queue.unresolved").value(0));
    }
    @Test void keepsSourceAndReceiptEvidenceWithoutInventingLiveReadiness() {
        Instant old=Instant.now().minusSeconds(60),received=Instant.now();
        jdbc.update("INSERT INTO telemetry(farm_id,device_id,schema_version,boot_id,sequence,observed_at,received_at,temperature,humidity,soil_moisture,uptime_ms) VALUES('FARM001','ENV01',1,?,1,?,?,25,50,28,0)",UUID.randomUUID(),Timestamp.from(old),Timestamp.from(received));
        jdbc.update("INSERT INTO pump_status(singleton,boot_id,sequence,observed_at,received_at,reported_state,safety_lockout,state_reason) VALUES(1,?,1,?,?,'ON',true,'CONNECTION_LOST')",UUID.randomUUID(),Timestamp.from(old),Timestamp.from(received));
        var value=overview.snapshot();
        assertEquals(old.toEpochMilli(),value.sensor().observedAt().toEpochMilli());
        assertEquals(received.toEpochMilli(),value.sensor().receivedAt().toEpochMilli());
        assertEquals("ON",value.relay().reportedState());assertTrue(value.relay().safetyLockout());
        assertEquals("CONNECTION_LOST",value.relay().stateReason());
        assertEquals(1,value.stateHistory().size());
        assertEquals("CONNECTION_LOST",value.stateHistory().getFirst().stateReason());
    }
    @Test void pendingCountIsNotLimitedToRecentTwentyAndGetNeverExpiresOrPauses() throws Exception {
        UUID expired=command("SENT",true);command("PENDING",false);command("PUBLISH_UNCERTAIN",false);
        for(int i=0;i<25;i++)command("EXECUTED",false);
        jdbc.update("UPDATE watering_rule SET enabled=true,active_command=?,low_count=1,last_result='COMMAND_SENT'",expired);
        jdbc.update("INSERT INTO watering_run(command_id,result) VALUES(?,'COMMAND_SENT')",expired);
        mvc.perform(get("/api/v1/safety")).andExpect(status().isOk());
        var value=overview.snapshot();
        assertEquals(3,value.queue().unresolved());assertEquals(1,value.queue().overdue());
        assertEquals(2,value.recentProblems().size());
        assertTrue(value.rule().enabled());assertEquals(expired,value.rule().activeCommand());
        assertEquals("SENT",jdbc.queryForObject("SELECT state FROM pump_command WHERE command_id=?",String.class,expired));
        assertEquals("COMMAND_SENT",jdbc.queryForObject("SELECT result FROM watering_run WHERE command_id=?",String.class,expired));
        assertEquals(28,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class));
    }
    @Test void problemListIsBoundedAndRetainsFailureReasonWithoutCallingItOff() {
        for(int i=0;i<12;i++)command("PUBLISH_UNCERTAIN",true);
        UUID failed=command("FAILED",false);
        var value=overview.snapshot();
        assertEquals(12,value.queue().unresolved());assertEquals(12,value.queue().overdue());
        assertEquals(10,value.recentProblems().size());
        var item=value.recentProblems().stream().filter(c->c.commandId().equals(failed)).findFirst().orElseThrow();
        assertEquals("CLOCK_SKEW",item.errorCode());assertEquals("ON",item.action());
        assertNull(value.relay());
    }
    @Test void settingsAndCooldownAreReadFromDatabaseWithoutChangingThem() {
        Instant deadline=Instant.now().plusSeconds(120);
        jdbc.update("UPDATE watering_rule SET dry_threshold=25,wet_threshold=40,duration_seconds=12,cooldown_seconds=120,settings_revision=3,cooldown_until=?,last_result='MANUAL_HOLD'",Timestamp.from(deadline));
        when(transport.controlConnected()).thenReturn(true);
        var value=overview.snapshot();
        assertTrue(value.controlTransportConnected());assertEquals("DISABLED",value.mqtt().state());
        assertEquals(3,value.settings().revision());assertEquals(12,value.settings().durationSeconds());
        assertEquals(deadline.toEpochMilli(),value.rule().cooldownUntil().toEpochMilli());assertEquals("MANUAL_HOLD",value.rule().lastResult());
        assertEquals(3,jdbc.queryForObject("SELECT settings_revision FROM watering_rule",Long.class));
    }
    @Test void relayHistoryReturnsNewestFiftyWithUnknownLegacyReasonsIntact() {
        UUID boot=UUID.randomUUID();
        for(int i=0;i<55;i++)jdbc.update("INSERT INTO pump_state_history(boot_id,sequence,observed_at,reported_state,safety_lockout,change_type,state_reason) VALUES(?,?,CURRENT_TIMESTAMP,'OFF',false,'STATE_CHANGED',?)",boot,i,i==54?null:"TIMER_EXPIRED");
        var history=overview.snapshot().stateHistory();assertEquals(50,history.size());
        assertNull(history.getFirst().stateReason());
        for(int i=1;i<history.size();i++)assertTrue(history.get(i-1).id()>history.get(i).id());
    }
}
