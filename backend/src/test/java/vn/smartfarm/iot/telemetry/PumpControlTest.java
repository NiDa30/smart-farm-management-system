package vn.smartfarm.iot.telemetry;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
    "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class PumpControlTest {
    @Autowired PumpService pump;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @MockitoBean CommandTransport transport;
    @BeforeEach void clear() {
        jdbc.execute("TRUNCATE telemetry_test.pump_command,telemetry_test.pump_status");
        reset(transport); when(transport.controlConnected()).thenReturn(true);
    }
    void status(String state,boolean locked) throws Exception {
        String payload="{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"bootId\":\"ab6cfc5e-18ff-4a01-852b-03604df6b52f\",\"sequence\":1,\"timestamp\":\""+Instant.now()+"\",\"reportedState\":\""+state+"\",\"safetyLockout\":"+locked+",\"connection\":\"ONLINE\"}";
        pump.receive("smartfarm/FARM001/PUMP01/status",payload.getBytes());
    }
    void ack(UUID id,String state) {
        String payload="{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"bootId\":\"ab6cfc5e-18ff-4a01-852b-03604df6b52f\",\"sequence\":2,\"timestamp\":\""+Instant.now()+"\",\"commandId\":\""+id+"\",\"stage\":\"EXECUTED\",\"status\":\"SUCCESS\",\"reportedState\":\""+state+"\",\"safetyLockout\":false,\"errorCode\":null}";
        pump.receive("smartfarm/FARM001/PUMP01/ack",payload.getBytes());
    }
    @Test void refusesUnknownStaleOnAndInvalidDurations() throws Exception {
        assertEquals(409,assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("ON",3))).getStatusCode().value());
        assertEquals(400,assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("ON",31))).getStatusCode().value());
        status("OFF",false);
        jdbc.update("UPDATE pump_status SET observed_at=CURRENT_TIMESTAMP-INTERVAL '20 seconds'");
        assertEquals("UNKNOWN",pump.status().reportedState());
        assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("ON",3)));
        assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("OFF",3)));
    }
    @Test void ackBeforePublishCompletionCannotBeOverwrittenAsSent() throws Exception {
        status("OFF",false);
        AtomicReference<byte[]> sent=new AtomicReference<>();
        doAnswer(invocation->{ byte[] payload=invocation.getArgument(0); sent.set(payload);
            ack(UUID.fromString(mapper.readTree(payload).path("commandId").asText()),"ON"); return null;
        }).when(transport).publishCommand(any());
        var command=pump.create(new PumpService.Request("ON",3));
        assertEquals("EXECUTED",command.state()); assertEquals("ON",command.reportedState());
        var payload=mapper.readTree(sent.get());
        assertEquals(3,payload.path("durationSeconds").asInt());
        assertEquals(command.issuedAt().plusSeconds(10),command.expiresAt());
        ack(UUID.randomUUID(),"OFF");
        assertEquals(1,pump.commands().size());
    }
    @Test void unknownPublishDeliveryIsNotRetriedAndCanAcceptMatchingAck() throws Exception {
        status("OFF",false);
        doThrow(new java.io.IOException("not confirmed")).when(transport).publishCommand(any());
        assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("ON",3)));
        var command=pump.commands().getFirst();
        assertEquals("PUBLISH_UNCERTAIN",command.state());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("ON",3))).getStatusCode().value());
        ack(command.commandId(),"ON");
        assertEquals("EXECUTED",pump.commands().getFirst().state());
    }
    @Test void locksBlockOnButAllowResetAndEmergencyOff() throws Exception {
        status("OFF",true);
        assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("ON",3)));
        assertEquals("SENT",pump.create(new PumpService.Request("RESET_LOCKOUT",null)).state());
        assertEquals("SENT",pump.create(new PumpService.Request("OFF",null)).state());
    }
    @Test void cachedOffStatusOlderThanOnAckCannotAuthorizeAnotherOn() throws Exception {
        status("OFF",false);
        doAnswer(invocation->{ byte[] payload=invocation.getArgument(0);
            ack(UUID.fromString(mapper.readTree(payload).path("commandId").asText()),"ON"); return null;
        }).when(transport).publishCommand(any());
        assertEquals("EXECUTED",pump.create(new PumpService.Request("ON",3)).state());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->pump.create(new PumpService.Request("ON",3))).getStatusCode().value());
        // A fresh OFF heartbeat causally newer than ACK releases the gate.
        jdbc.update("UPDATE pump_status SET sequence=3,observed_at=CURRENT_TIMESTAMP,received_at=CURRENT_TIMESTAMP,reported_state='OFF'");
        assertEquals("EXECUTED",pump.create(new PumpService.Request("ON",3)).state());
    }
    @Test void unacknowledgedCommandTimesOutWithoutAssumingRelayState() throws Exception {
        status("OFF",false);
        pump.create(new PumpService.Request("ON",3));
        jdbc.execute("UPDATE pump_command SET issued_at=CURRENT_TIMESTAMP-INTERVAL '25 seconds', expires_at=CURRENT_TIMESTAMP-INTERVAL '15 seconds'");
        assertEquals("TIMED_OUT",pump.commands().getFirst().state());
        assertNull(pump.commands().getFirst().reportedState());
    }
}
