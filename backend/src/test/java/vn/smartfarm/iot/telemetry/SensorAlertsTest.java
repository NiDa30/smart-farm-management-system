package vn.smartfarm.iot.telemetry;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.smartfarm.iot.alerts.SensorAlerts;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test",
    "spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class SensorAlertsTest {
    @Autowired SensorAlerts alerts;
    @Autowired TelemetryStorage storage;
    @Autowired JdbcTemplate jdbc;
    Instant base;
    @BeforeEach void reset() {
        jdbc.execute("TRUNCATE sensor_alert,sensor_alert_state");
        base=Instant.now().minusSeconds(10);
    }
    Telemetry sample(int second,double temperature,double soil) {
        return new Telemetry(1,"ENV01",UUID.randomUUID(),second<0 ? 0 : second,base.plusSeconds(second),temperature,50,soil,0);
    }
    @Test void telemetrySaveCreatesAlertAndDuplicateDoesNotRetrigger() {
        Telemetry value=sample(0,36,29);
        assertTrue(storage.save(value));
        assertEquals(2,alerts.list().size());
        assertFalse(storage.save(value));
        assertEquals(2,alerts.list().size());
    }
    @Test void opensOnceUsesHysteresisAndClearsBothConditions() {
        alerts.observe(sample(0,36,29)); assertEquals(2,alerts.list().size());
        alerts.observe(sample(1,34,32)); assertTrue(alerts.list().stream().allMatch(a->a.clearedAt()==null));
        alerts.observe(sample(2,33,35)); assertTrue(alerts.list().stream().allMatch(a->a.clearedAt()!=null));
        alerts.observe(sample(3,36,29)); assertEquals(4,alerts.list().size());
    }
    @Test void staleFutureAndOutOfOrderCannotChangeAlerts() {
        alerts.observe(sample(-60,40,10)); assertTrue(alerts.list().isEmpty());
        alerts.observe(sample(60,40,10)); assertTrue(alerts.list().isEmpty());
        alerts.observe(sample(0,36,29));
        alerts.observe(sample(-1,20,80));
        alerts.observe(sample(0,20,80));
        assertEquals(2,alerts.list().size()); assertTrue(alerts.list().stream().allMatch(a->a.clearedAt()==null));
    }
    @Test void persistentStatePreventsDuplicateAfterNewServiceInstance() {
        alerts.observe(sample(0,36,29));
        new SensorAlerts(jdbc).observe(sample(1,36,29));
        assertEquals(2,alerts.list().size());
    }
}
