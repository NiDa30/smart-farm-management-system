package vn.smartfarm.iot.telemetry;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.smartfarm.iot.control.*;
import vn.smartfarm.iot.automation.WateringRule;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class WateringRuleTest {
 @Autowired WateringRule rule; @Autowired TelemetryRepository repository; @Autowired JdbcTemplate jdbc;
 @Autowired PumpService pump; @Autowired ObjectMapper mapper;
 @MockitoBean CommandTransport transport;
 long seq=0;
 @BeforeEach void setup() throws Exception {
  jdbc.execute("TRUNCATE watering_run,watering_rule,pump_command,pump_status,pump_state_history,telemetry");
  jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
  reset(transport);when(transport.controlConnected()).thenReturn(true);
  status("OFF"); sample(45,Instant.now().minusSeconds(10));
 }
 void sample(double soil,Instant at) { repository.insert(new Telemetry(1,"ENV01",UUID.randomUUID(),seq++,at,25,50,soil,0)); }
 void status(String state) {
  String text="{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"bootId\":\"ab6cfc5e-18ff-4a01-852b-03604df6b52f\",\"sequence\":"+(seq++)+",\"timestamp\":\""+Instant.now()+"\",\"reportedState\":\""+state+"\",\"safetyLockout\":false,\"connection\":\"ONLINE\"}";
  pump.receive("smartfarm/FARM001/PUMP01/status",text.getBytes());
 }
 @Test void needsTwoDistinctFreshSamplesAndNeverRepeatsOnWhilePending() throws Exception {
  rule.configure(true); sample(28,Instant.now().minusSeconds(5)); rule.tick();rule.tick();
  verify(transport,never()).publishCommand(any());
  sample(28,Instant.now());rule.tick();rule.tick();
  verify(transport,times(1)).publishCommand(any());assertNotNull(rule.state().activeCommand());
  assertEquals(20,pump.commands().get(0).durationSeconds());
 }
 @Test void manualHoldAndRestartPreventAutomaticOn() throws Exception {
  rule.configure(true);rule.manualHold();sample(28,Instant.now());rule.tick();
  assertFalse(rule.state().enabled());verify(transport,never()).publishCommand(any());
  rule.configure(true);rule.safeStartup();assertFalse(rule.state().enabled());
 }
 @Test void dispatchFailurePausesWithoutOnRetry() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();
  doThrow(new RuntimeException("test failure")).when(transport).publishCommand(any());
  sample(28,Instant.now());rule.tick();rule.tick();
  assertFalse(rule.state().enabled());verify(transport,times(1)).publishCommand(any());
 }
 @Test void completedRunStartsCooldownAndStaleSensorNeverStartsOn() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();sample(28,Instant.now());rule.tick();
  UUID id=rule.state().activeCommand();
  jdbc.update("UPDATE pump_command SET state='EXECUTED',issued_at=CURRENT_TIMESTAMP-INTERVAL '30 seconds' WHERE command_id=?",id);
  status("OFF");rule.tick();
  assertNull(rule.state().activeCommand());assertTrue(rule.state().cooldownUntil().isAfter(Instant.now()));
  rule.tick();verify(transport,times(1)).publishCommand(any());
  jdbc.update("UPDATE watering_rule SET cooldown_until=NULL");
  jdbc.update("UPDATE telemetry SET observed_at=CURRENT_TIMESTAMP-INTERVAL '40 seconds'");
  rule.tick();assertEquals(0,rule.state().lowCount());verify(transport,times(1)).publishCommand(any());
 }
 @Test void wetSoilSendsOneOffAndDisableDoesNotFloodCommands() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();sample(28,Instant.now().minusMillis(5));rule.tick();
  status("ON");sample(40,Instant.now());rule.tick();rule.tick();
  assertEquals(2,pump.commands().size());
  assertEquals(1,pump.commands().stream().filter(c->c.action().equals("OFF")).count());
 }
}
