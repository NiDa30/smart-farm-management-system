package vn.smartfarm.iot.automation.rules;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.ActuatorService;
import vn.smartfarm.iot.control.CommandTransport;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
    "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true","smartfarm.actuators.enabled=true"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class AutomationRulesTest {
    @Autowired AutomationRules rules;
    @Autowired ActuatorService actuators;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @MockitoBean CommandTransport transport;
    final List<String> sent = new ArrayList<>();
    final String boot = "ab6cfc5e-18ff-4a01-852b-03604df6b52f";
    long seq = 1000;

    @BeforeEach void setup() throws Exception {
        jdbc.execute("TRUNCATE automation_rule CASCADE");
        jdbc.execute("TRUNCATE irrigation_sequence CASCADE");
        jdbc.execute("TRUNCATE actuator_command,actuator_status,actuator_state_history,telemetry,pump_command,pump_status,pump_state_history,watering_run,watering_rule");
        jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
        reset(transport); sent.clear();
        when(transport.controlConnected()).thenReturn(true);
        doAnswer(i -> { sent.add(i.getArgument(0)); return null; }).when(transport).publishActuatorCommand(anyString(), any());
        for (String id : List.of("FAN01", "MIST01", "LIGHT01")) status(id, "OFF");
    }
    void status(String id, String state) {
        actuators.receive("smartfarm/FARM001/" + id + "/status", ("{\"schemaVersion\":3,\"deviceId\":\"" + id + "\",\"bootId\":\"" + boot + "\",\"sequence\":" + (seq++)
            + ",\"timestamp\":\"" + Instant.now() + "\",\"connection\":\"ONLINE\",\"reportedState\":\"" + state + "\",\"safetyLockout\":false,\"stateReason\":\"BOOT\",\"activeCommandId\":null}").getBytes());
    }
    /** ENV01 telemetry every 10 s for the last `seconds`, at the given temperature. */
    void temperature(double value, int seconds) {
        for (int s = seconds; s >= 0; s -= 10)
            jdbc.update("""
                INSERT INTO telemetry(farm_id,device_id,schema_version,boot_id,sequence,observed_at,received_at,temperature,humidity,soil_moisture,uptime_ms)
                VALUES('FARM001','ENV01',1,?::uuid,?,CURRENT_TIMESTAMP-make_interval(secs=>?),CURRENT_TIMESTAMP-make_interval(secs=>?),?,60,40,1000)
                """, boot, seq++, s, s, value);
    }
    JsonNode json(String text) { try { return mapper.readTree(text.replace('\'', '"')); } catch (Exception e) { throw new IllegalStateException(e); } }
    JsonNode fanRule(String actuator) {
        return json("{'conditions':{'op':'ALL','items':[{'type':'SENSOR','nodeId':'ENV01','channelId':'AIR_TEMP','comparator':'GT','value':32,'forSeconds':60}]},"
            + "'actions':[{'type':'ACTUATOR','actuatorId':'" + actuator + "','action':'ON','durationSeconds':600}],'cooldownSeconds':900,'maxRunsPerDay':2,'manualHoldSeconds':600}");
    }
    int code(Runnable r) { return assertThrows(ResponseStatusException.class, r::run).getStatusCode().value(); }

    @Test void firesOnlyOnHeldFreshConditionThenRespectsCooldown() {
        var rule = rules.setEnabled(rules.create(new AutomationRules.SaveRequest("Làm mát", fanRule("FAN01"))).id(), true);
        temperature(30, 90);
        rules.tick();
        assertEquals("FALSE", rules.find(rule.id()).lastOutcome());
        assertTrue(sent.isEmpty());
        jdbc.execute("TRUNCATE telemetry");
        temperature(34, 90);
        rules.tick();
        assertEquals(List.of("FAN01"), sent, "fan ON once the heat held for 60 s");
        var run = rules.runs(rule.id()).getFirst();
        assertEquals("FIRED", run.result());
        assertEquals("RULE", jdbc.queryForObject("SELECT source FROM actuator_command WHERE command_id=?", String.class, run.commandIds().getFirst()));
        rules.tick();
        assertEquals(1, sent.size());
        assertEquals("COOLDOWN", rules.find(rule.id()).lastSkip());
        jdbc.execute("TRUNCATE telemetry");
        rules.tick();
        assertEquals("UNKNOWN", rules.find(rule.id()).lastOutcome(), "no data is unknown, never TRUE");
    }

    @Test void manualHoldDailyLimitAndRefusedCommandsAreRecorded() {
        var rule = rules.setEnabled(rules.create(new AutomationRules.SaveRequest("Phun sương", fanRule("MIST01"))).id(), true);
        actuators.create("MIST01", new ActuatorService.Request("OFF", null));      // a person just touched it
        temperature(35, 90);
        rules.tick();
        assertEquals("MANUAL_HOLD", rules.find(rule.id()).lastSkip());
        jdbc.update("UPDATE actuator_command SET issued_at=issued_at-INTERVAL '20 minutes',expires_at=expires_at-INTERVAL '20 minutes'");
        status("MIST01", "ON");                                                    // device not OFF: ActuatorService refuses ON
        rules.tick();
        var run = rules.runs(rule.id()).getFirst();
        assertEquals("FAILED", run.result());
        assertTrue(run.detail().startsWith("Action 1 refused: 409"), run.detail());
        jdbc.update("UPDATE automation_rule SET last_fired_at=CURRENT_TIMESTAMP-INTERVAL '1 hour'");
        jdbc.update("INSERT INTO automation_rule_run(rule_id,rule_revision,result,detail) VALUES(?,1,'FIRED','x')", rule.id());
        rules.tick();
        assertEquals("MAX_RUNS_TODAY", rules.find(rule.id()).lastSkip());
    }

    @Test void conflictsValidationAndCrud() {
        var fan = rules.setEnabled(rules.create(new AutomationRules.SaveRequest("Quạt 1", fanRule("FAN01"))).id(), true);
        var other = rules.create(new AutomationRules.SaveRequest("Quạt 2", fanRule("FAN01")));
        assertEquals(409, code(() -> rules.setEnabled(other.id(), true)), "same actuator as an enabled rule");
        assertEquals(409, code(() -> rules.create(new AutomationRules.SaveRequest("Quạt 1", fanRule("LIGHT01")))), "duplicate name");
        assertEquals(400, code(() -> rules.create(new AutomationRules.SaveRequest("Bơm", json("{'conditions':{'op':'ALL','items':[{'type':'TIME','start':'06:00','end':'07:00','days':[1]}]},"
            + "'actions':[{'type':'ACTUATOR','actuatorId':'PUMP01','action':'ON','durationSeconds':60}],'cooldownSeconds':900,'maxRunsPerDay':1,'manualHoldSeconds':0}")))));
        var zones = rules.create(new AutomationRules.SaveRequest("Tưới sáng", json("{'conditions':{'op':'ALL','items':[{'type':'TIME','start':'06:00','end':'07:00','days':[1,2,3,4,5,6,7]}]},"
            + "'actions':[{'type':'ZONE_SEQUENCE','zones':[{'valveId':'VALVE01','pumpSeconds':120}]}],'cooldownSeconds':3600,'maxRunsPerDay':1,'manualHoldSeconds':0}")));
        jdbc.update("UPDATE watering_rule SET enabled=true");
        assertEquals(409, code(() -> rules.setEnabled(zones.id(), true)), "pump shared with the built-in watering rule");
        jdbc.update("UPDATE watering_rule SET enabled=false");
        assertTrue(rules.setEnabled(zones.id(), true).enabled());
        var updated = rules.update(fan.id(), new AutomationRules.SaveRequest("Quạt 1", fanRule("LIGHT01")));
        assertEquals(2, updated.revision());
        assertTrue(rules.setEnabled(other.id(), true).enabled(), "FAN01 freed by the update");
        assertEquals(400, code(() -> rules.update(fan.id(), new AutomationRules.SaveRequest("", fanRule("FAN01")))));
        rules.delete(other.id());
        assertEquals(404, code(() -> rules.find(other.id())));
        assertEquals(List.of("PUMP01"), List.copyOf(rules.view().wateringRule().targets()));
    }

    @Test void simulationReplaysStoredHistory() {
        temperature(34, 600);                                                     // 10 minutes hot
        var result = rules.simulate(new AutomationRules.SimulationRequest(fanRule("FAN01"), 1));
        assertEquals(1, result.fires().size(), "cooldown 15 min allows one run in the last 10 hot minutes");
        assertTrue(result.trueMinutes() >= 8, "true minutes " + result.trueMinutes());
        assertTrue(result.unknownMinutes() >= 45, "before the data: unknown " + result.unknownMinutes());
        assertEquals(400, code(() -> rules.simulate(new AutomationRules.SimulationRequest(fanRule("FAN01"), 73))));
        assertTrue(sent.isEmpty(), "simulation never commands");
    }
}
