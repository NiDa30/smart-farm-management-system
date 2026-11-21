package vn.smartfarm.iot.analytics;

import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
    "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class IotAnalyticsTest {
    @Autowired IotAnalytics analytics;
    @Autowired JdbcTemplate jdbc;
    final String boot = "6a1e1f1e-1d50-4c51-8e7e-0d41b34e9a11";

    @BeforeEach void setup() {
        jdbc.execute("TRUNCATE actuator_status,actuator_state_history,actuator_command,pump_status,pump_state_history,pump_command,watering_run,watering_rule");
        jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
        jdbc.execute("TRUNCATE irrigation_sequence CASCADE");
        jdbc.update("UPDATE iot_actuator_binding SET rated_watts=NULL");
    }
    void fan(String state, int secondsAgo, long sequence) {
        jdbc.update("""
            INSERT INTO actuator_status(actuator_id,boot_id,sequence,observed_at,reported_state,safety_lockout,state_reason)
            VALUES('FAN01',?::uuid,?,CURRENT_TIMESTAMP-make_interval(secs=>?),?,false,?)
            ON CONFLICT(actuator_id) DO UPDATE SET sequence=EXCLUDED.sequence,observed_at=EXCLUDED.observed_at,reported_state=EXCLUDED.reported_state,state_reason=EXCLUDED.state_reason
            """, boot, sequence, secondsAgo, state, state.equals("ON") ? "COMMAND_ON" : "COMMAND_OFF");
    }

    @Test void energyIsDeviceConfirmedRuntimeTimesRatedPower() {
        fan("OFF", 4000, 1); fan("ON", 3600, 2); fan("OFF", 1800, 3);   // 30 min ON
        var fan = analytics.energy(1).actuators().stream().filter(a -> a.actuatorId().equals("FAN01")).findFirst().orElseThrow();
        assertTrue(Math.abs(fan.seconds() - 1800) <= 1, "runtime " + fan.seconds());
        assertNull(fan.kilowattHours(), "no rated power yet");
        assertTrue(analytics.energy(1).unrated().contains("FAN01"));
        var rated = analytics.setPower("FAN01", new IotAnalytics.PowerRequest(200));
        assertEquals(200, rated.ratedWatts());
        assertEquals(0.1, analytics.energy(1).actuators().stream().filter(a -> a.actuatorId().equals("FAN01")).findFirst().orElseThrow().kilowattHours(), 0.001);
        assertEquals("ESTIMATED_FROM_RUNTIME", analytics.energy(7).method());
        assertThrows(ResponseStatusException.class, () -> analytics.setPower("FAN01", new IotAnalytics.PowerRequest(0)));
        assertThrows(ResponseStatusException.class, () -> analytics.setPower("NOPE", new IotAnalytics.PowerRequest(10)));
        assertThrows(ResponseStatusException.class, () -> analytics.energy(32));
    }

    @Test void stillOnCountsOnlyUntilTheLastReport() {
        fan("ON", 600, 1);
        fan("ON", 300, 2);   // same state: no history row, but the device was heard 300 s ago
        var fan = analytics.energy(1).actuators().stream().filter(a -> a.actuatorId().equals("FAN01")).findFirst().orElseThrow();
        assertTrue(Math.abs(fan.seconds() - 300) <= 1, "runtime " + fan.seconds());
    }

    @Test void analyticsCountsCommandsAndAutomation() {
        jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,error_code) VALUES(gen_random_uuid(),'ON',10,now(),now()+interval '10s','EXECUTED',NULL)");
        jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,error_code) VALUES(gen_random_uuid(),'ON',10,now(),now()+interval '10s','FAILED','WATER_LOW')");
        jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,error_code) VALUES(gen_random_uuid(),'ON',10,now()-interval '40 days',now()-interval '40 days'+interval '10s','FAILED','WATER_LOW')");
        jdbc.update("INSERT INTO irrigation_sequence(state,finished_at,result) VALUES('COMPLETED',now(),'COMPLETED'),('ABORTED',now(),'CANCELLED')");
        var result = analytics.analytics(7);
        assertEquals(2, result.pump().total());
        assertEquals(1, result.pump().executed());
        assertEquals(1, result.pump().errors().get("WATER_LOW"));
        assertEquals(1, result.sequencesCompleted());
        assertEquals(1, result.sequencesAborted());
        assertEquals(java.util.Set.of("SENSOR", "WATER", "DEVICE_HEALTH"), result.alertsOpened().keySet());
        assertFalse(result.runtime().isEmpty());
        assertEquals("PUMP01", result.runtime().getFirst().actuatorId());
        assertTrue(result.from().isBefore(Instant.now()));
    }
}
