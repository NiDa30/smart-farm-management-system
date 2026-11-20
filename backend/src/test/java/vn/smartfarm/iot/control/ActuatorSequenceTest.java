package vn.smartfarm.iot.control;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.automation.IrrigationSequence;
import vn.smartfarm.iot.automation.IrrigationSequence.Zone;
import vn.smartfarm.iot.automation.WateringRule;
import vn.smartfarm.iot.nodes.NodeInventory;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
    "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true","smartfarm.actuators.enabled=true"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class ActuatorSequenceTest {
    @Autowired ActuatorService actuators;
    @Autowired PumpService pump;
    @Autowired IrrigationSequence sequence;
    @Autowired WateringRule rule;
    @Autowired NodeInventory nodes;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @MockitoBean CommandTransport transport;

    /** Everything the backend published, in order: [topicOwner, json]. */
    final List<String[]> sent = new ArrayList<>();
    final String boot = "ab6cfc5e-18ff-4a01-852b-03604df6b52f";
    long seq = 100;

    @BeforeEach void setup() throws Exception {
        jdbc.execute("TRUNCATE irrigation_sequence CASCADE");
        jdbc.execute("TRUNCATE actuator_command,actuator_status,pump_command,pump_status,pump_state_history,watering_run,watering_rule");
        jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
        reset(transport); sent.clear();
        when(transport.controlConnected()).thenReturn(true);
        doAnswer(i -> { sent.add(new String[]{i.getArgument(0), new String((byte[]) i.getArgument(1))}); return null; })
            .when(transport).publishActuatorCommand(anyString(), any());
        doAnswer(i -> { sent.add(new String[]{"PUMP01", new String((byte[]) i.getArgument(0))}); return null; })
            .when(transport).publishCommand(any());
        for (String id : List.of("VALVE01", "VALVE02", "FAN01", "MIST01")) status(id, "OFF", false, "BOOT");
        status("PUMP01", "OFF", false, "BOOT");
    }

    // ---- simulated ENV01 ----
    void status(String id, String state, boolean locked, String reason) {
        boolean isPump = id.equals("PUMP01");
        String json = "{\"schemaVersion\":" + (isPump ? 1 : 3) + ",\"deviceId\":\"" + id + "\",\"bootId\":\"" + boot + "\",\"sequence\":" + (seq++)
            + ",\"timestamp\":\"" + Instant.now() + "\",\"connection\":\"ONLINE\",\"reportedState\":\"" + state + "\",\"safetyLockout\":" + locked
            + ",\"stateReason\":\"" + reason + "\",\"activeCommandId\":null}";
        if (isPump) pump.receive("smartfarm/FARM001/PUMP01/status", json.getBytes());
        else actuators.receive("smartfarm/FARM001/" + id + "/status", json.getBytes());
    }
    void ack(String id, String commandId, String state, String error) {
        boolean isPump = id.equals("PUMP01");
        String json = "{\"schemaVersion\":" + (isPump ? 1 : 3) + ",\"deviceId\":\"" + id + "\",\"bootId\":\"" + boot + "\",\"sequence\":" + (seq++)
            + ",\"timestamp\":\"" + Instant.now() + "\",\"commandId\":\"" + commandId + "\",\"stage\":\"EXECUTED\",\"status\":\""
            + (error == null ? "SUCCESS" : "FAILED") + "\",\"reportedState\":\"" + state + "\",\"errorCode\":" + (error == null ? "null" : "\"" + error + "\"")
            + ",\"safetyLockout\":false}";
        if (isPump) pump.receive("smartfarm/FARM001/PUMP01/ack", json.getBytes());
        else actuators.receive("smartfarm/FARM001/" + id + "/ack", json.getBytes());
    }
    JsonNode last(String owner) throws Exception {
        for (int i = sent.size() - 1; i >= 0; i--) if (sent.get(i)[0].equals(owner)) return mapper.readTree(sent.get(i)[1]);
        fail("nothing published to " + owner); return null;
    }
    /** Device obeys the last command for this actuator: ACK + status. */
    void obey(String id) throws Exception {
        JsonNode command = last(id);
        String state = command.path("action").asText().equals("ON") ? "ON" : "OFF";
        ack(id, command.path("commandId").asText(), state, null);
        status(id, state, false, state.equals("ON") ? "COMMAND_ON" : "COMMAND_OFF");
    }
    String phase() {
        var current = sequence.view().current();
        if (current == null) return "NONE";
        return current.steps().get(current.currentStep() - 1).phase();
    }
    void waterZone(String valve, int pumpSeconds) throws Exception {
        assertEquals("OPENING_VALVE", phase());
        JsonNode open = last(valve);
        assertEquals(3, open.path("schemaVersion").asInt());
        assertEquals("ON", open.path("action").asText());
        assertEquals(pumpSeconds + 60, open.path("durationSeconds").asInt());
        sequence.tick();
        assertEquals("OPENING_VALVE", phase(), "no pump before the valve confirms");
        obey(valve);
        sequence.tick();
        assertEquals("STARTING_PUMP", phase());
        JsonNode pumpOn = last("PUMP01");
        assertEquals("ON", pumpOn.path("action").asText());
        assertEquals(pumpSeconds, pumpOn.path("durationSeconds").asInt());
        obey("PUMP01");
        sequence.tick();
        assertEquals("WATERING", phase());
        int before = sent.size();
        sequence.tick();
        assertEquals("WATERING", phase());
        assertEquals(before, sent.size(), "nothing sent while the pump runs");
        Thread.sleep(5);
        status("PUMP01", "OFF", false, "TIMER_EXPIRED"); // device hard cap ended the pump
        sequence.tick();
        assertEquals("CLOSING_VALVE", phase());
        assertEquals("OFF", last(valve).path("action").asText());
        obey(valve);
        sequence.tick();
    }

    @Test void watersZonesOneAfterAnotherWithTheSharedPump() throws Exception {
        sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE02", 10), new Zone("VALVE01", 5))));
        waterZone("VALVE02", 10);
        assertEquals("WAITING", phase(), "second zone starts only after the first valve closed");
        sequence.tick();
        assertEquals("OPENING_VALVE", phase());
        assertEquals("VALVE01", sent.get(sent.size() - 1)[0]);
        waterZone("VALVE01", 5);
        sequence.tick();
        var run = sequence.view().recent().getFirst();
        assertEquals("COMPLETED", run.state());
        assertTrue(run.steps().stream().allMatch(s -> s.phase().equals("DONE")));
        assertNull(sequence.view().current());
        // Command order on the wire: valve2 ON, pump ON, valve2 OFF, valve1 ON, pump ON, valve1 OFF.
        assertEquals(List.of("VALVE02", "PUMP01", "VALVE02", "VALVE01", "PUMP01", "VALVE01"), sent.stream().map(s -> s[0]).toList());
        assertEquals(4, jdbc.queryForObject("SELECT COUNT(*) FROM actuator_command WHERE source='SEQUENCE' AND state='EXECUTED'", Integer.class));
    }

    @Test void deviceRefusalAbortsAndAsksForEverythingOff() throws Exception {
        sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE01", 10), new Zone("VALVE02", 10))));
        ack("VALVE01", last("VALVE01").path("commandId").asText(), "OFF", "VALVE_LIMIT");
        sequence.tick();
        var run = sequence.view().recent().getFirst();
        assertEquals("ABORTED", run.state());
        assertEquals("VALVE_OPEN_FAILED VALVE_LIMIT", run.result());
        assertEquals("FAILED", run.steps().get(0).phase());
        assertEquals("SKIPPED", run.steps().get(1).phase());
        assertEquals("OFF", last("PUMP01").path("action").asText());
        assertEquals("OFF", last("VALVE01").path("action").asText());
        assertTrue(sent.stream().noneMatch(s -> s[0].equals("VALVE02")), "later zones never opened");
    }

    @Test void waterLowDuringWateringAborts() throws Exception {
        sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE01", 30))));
        obey("VALVE01"); sequence.tick(); obey("PUMP01"); sequence.tick();
        assertEquals("WATERING", phase());
        status("PUMP01", "OFF", true, "WATER_LOW");
        sequence.tick();
        var run = sequence.view().recent().getFirst();
        assertEquals("ABORTED", run.state());
        assertEquals("PUMP_STOPPED WATER_LOW", run.result());
        assertEquals("OFF", last("VALVE01").path("action").asText());
    }

    @Test void silentValveTimesOutAndCancelStopsARun() throws Exception {
        sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE01", 10))));
        jdbc.update("UPDATE irrigation_sequence_step SET phase_started_at=CURRENT_TIMESTAMP-INTERVAL '30 seconds'");
        jdbc.update("UPDATE actuator_command SET state='SENT'");
        sequence.tick();
        assertEquals("VALVE_OPEN_TIMEOUT", sequence.view().recent().getFirst().result());
        status("VALVE01", "OFF", false, "COMMAND_OFF");
        jdbc.update("UPDATE actuator_command SET state='EXECUTED'");
        sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE02", 10))));
        sequence.cancel();
        assertEquals("CANCELLED", sequence.view().recent().getFirst().result());
        assertNull(sequence.view().current());
    }

    @Test void startPreconditions() throws Exception {
        var code = (java.util.function.Function<Runnable, Integer>) r -> assertThrows(ResponseStatusException.class, r::run).getStatusCode().value();
        assertEquals(400, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of()))));
        assertEquals(400, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE01", 5), new Zone("VALVE01", 5))))));
        assertEquals(400, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE01", 1801))))));
        assertEquals(400, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("FAN01", 5))))));
        assertEquals(404, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("PUMP01", 5))))));
        jdbc.update("UPDATE watering_rule SET enabled=true");
        assertEquals(409, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE01", 5))))));
        jdbc.update("UPDATE watering_rule SET enabled=false");
        jdbc.update("UPDATE actuator_status SET observed_at=CURRENT_TIMESTAMP-INTERVAL '30 seconds' WHERE actuator_id='VALVE01'");
        assertEquals(409, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE01", 5))))));
        status("PUMP01", "OFF", true, "WATER_LOW");
        assertEquals(409, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE02", 5))))));
        status("PUMP01", "OFF", false, "LOCKOUT_RESET");
        sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE02", 5))));
        assertEquals(409, code.apply(() -> sequence.start(new IrrigationSequence.StartRequest(List.of(new Zone("VALVE02", 5))))));
        assertTrue(sent.stream().noneMatch(s -> s[0].equals("VALVE01")));
    }

    @Test void v3CommandsFollowThePumpDiscipline() throws Exception {
        var code = (java.util.function.Function<Runnable, Integer>) r -> assertThrows(ResponseStatusException.class, r::run).getStatusCode().value();
        assertEquals(400, code.apply(() -> actuators.create("MIST01", new ActuatorService.Request("ON", 601))));
        assertEquals(400, code.apply(() -> actuators.create("FAN01", new ActuatorService.Request("OFF", 5))));
        assertEquals(404, code.apply(() -> actuators.create("PUMP01", new ActuatorService.Request("ON", 5))));
        var fan = actuators.create("FAN01", new ActuatorService.Request("ON", 14400));
        assertEquals("SENT", fan.state());
        JsonNode wire = last("FAN01");
        assertEquals(3, wire.path("schemaVersion").asInt());
        assertEquals("FAN01", wire.path("deviceId").asText());
        assertEquals(10, java.time.Duration.between(Instant.parse(wire.path("issuedAt").asText()), Instant.parse(wire.path("expiresAt").asText())).toSeconds());
        assertEquals(409, code.apply(() -> actuators.create("FAN01", new ActuatorService.Request("ON", 10))), "pending");
        // A FAILED ACK must name its error (contract v1/v3); JSON null is not a code.
        String nullError = "{\"schemaVersion\":3,\"deviceId\":\"FAN01\",\"bootId\":\"" + boot + "\",\"sequence\":" + (seq++) + ",\"timestamp\":\"" + Instant.now()
            + "\",\"commandId\":\"" + fan.commandId() + "\",\"stage\":\"EXECUTED\",\"status\":\"FAILED\",\"reportedState\":\"OFF\",\"errorCode\":null,\"safetyLockout\":false}";
        assertThrows(IllegalArgumentException.class, () -> actuators.receive("smartfarm/FARM001/FAN01/ack", nullError.getBytes()));
        assertThrows(IllegalArgumentException.class, () -> pump.receive("smartfarm/FARM001/PUMP01/ack", nullError.replace("\"schemaVersion\":3", "\"schemaVersion\":1")
            .replace("FAN01", "PUMP01").getBytes()));
        assertEquals("SENT", actuators.command(fan.commandId()).state());
        // An ACK that contradicts the action is rejected; a matching one resolves it.
        assertThrows(IllegalArgumentException.class, () -> ack("FAN01", fan.commandId().toString(), "OFF", null));
        ack("FAN01", fan.commandId().toString(), "ON", null);
        assertEquals("EXECUTED", actuators.command(fan.commandId()).state());
        status("FAN01", "ON", false, "COMMAND_ON");
        assertEquals("ON", actuators.actuator("FAN01").reportedState());
        assertEquals(409, code.apply(() -> actuators.create("FAN01", new ActuatorService.Request("ON", 10))), "already on");
        actuators.create("FAN01", new ActuatorService.Request("OFF", null));
        // Lockout blocks ON; OFF is always allowed.
        status("MIST01", "OFF", true, "WATER_LOW");
        assertEquals(409, code.apply(() -> actuators.create("MIST01", new ActuatorService.Request("ON", 10))));
        actuators.create("MIST01", new ActuatorService.Request("OFF", null));
        // Unknown/foreign identities and stale or bad statuses are refused.
        assertThrows(IllegalArgumentException.class, () -> actuators.receive("smartfarm/FARM001/PUMP01/status", "{}".getBytes()));
        assertThrows(IllegalArgumentException.class, () -> status("VALVE09", "OFF", false, "BOOT"));
        assertThrows(IllegalArgumentException.class, () -> status("FAN01", "OFF", false, "VALVE_CLOSED"));
        jdbc.update("UPDATE actuator_status SET observed_at=CURRENT_TIMESTAMP-INTERVAL '20 seconds' WHERE actuator_id='LIGHT01'");
        assertFalse(ActuatorService.handles("smartfarm/FARM001/PUMP01/status"));
        assertTrue(ActuatorService.handles("smartfarm/FARM001/VALVE01/ack"));
        // MQTT down: 503 and nothing persisted as sent.
        when(transport.controlConnected()).thenReturn(false);
        assertEquals(503, code.apply(() -> actuators.create("LIGHT01", new ActuatorService.Request("OFF", null))));
    }

    @Test void pumpAcceptsValveClosedReasonAndInventoryKeepsPumpFirst() {
        status("PUMP01", "OFF", false, "VALVE_CLOSED");
        assertEquals("OFF", pump.status().reportedState());
        var env = nodes.snapshot().nodes().stream().filter(n -> n.nodeId().equals("ENV01")).findFirst().orElseThrow();
        assertEquals("PUMP01", env.actuators().getFirst().actuatorId());
        assertEquals(8, env.actuators().size());
        assertEquals(7, actuators.overview().actuators().size());
        assertEquals("VALVE01", actuators.overview().actuators().getFirst().actuatorId());
    }
}
