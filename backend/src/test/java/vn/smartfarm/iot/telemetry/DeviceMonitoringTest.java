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
import org.springframework.test.web.servlet.MockMvc;
import vn.smartfarm.iot.monitoring.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class DeviceMonitoringTest {
 @Autowired DeviceMonitoring monitor;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
 @BeforeEach void setup() {
  jdbc.execute("TRUNCATE telemetry,pump_status,pump_state_history,sensor_alert");
  jdbc.update("INSERT INTO sensor_device(device_id,name,area_id) VALUES('ENV_MONITOR_TEST','No data','AREA001') ON CONFLICT DO NOTHING");
 }
 void sample(Instant observed,Instant received) {
  jdbc.update("INSERT INTO telemetry(farm_id,device_id,schema_version,boot_id,sequence,observed_at,received_at,temperature,humidity,soil_moisture,uptime_ms) VALUES('FARM001','ENV01',1,?,1,?,?,25,50,28,1000)",UUID.randomUUID(),Timestamp.from(observed),Timestamp.from(received));
 }
 @Test void includesUnseenRegistrySensorsAndPumpWithoutInventingOnline() throws Exception {
  mvc.perform(get("/api/v1/monitoring")).andExpect(status().isOk()).andExpect(jsonPath("$.mqtt.state").value("DISABLED"));
  var overview=monitor.overview();
  var unseen=overview.devices().stream().filter(d->d.deviceId().equals("ENV_MONITOR_TEST")).findFirst().orElseThrow();
  assertEquals("EMPTY",unseen.dataState());assertEquals("NEVER_SEEN",unseen.activity());assertEquals("AREA001",unseen.areaId());assertNull(unseen.temperature());
  var pump=overview.devices().stream().filter(d->d.deviceId().equals("PUMP01")).findFirst().orElseThrow();assertNull(pump.reportedState());
 }
 @Test void distinguishesDelayedMeasurementFromRecentReceiptAndPreservesOpenAlerts() {
  sample(Instant.now().minusSeconds(60),Instant.now());
  jdbc.update("INSERT INTO sensor_alert(device_id,type,opened_at,opened_value) VALUES('ENV01','LOW_SOIL',CURRENT_TIMESTAMP-INTERVAL '1 minute',28)");
  var sensor=monitor.overview().devices().stream().filter(d->d.deviceId().equals("ENV01")).findFirst().orElseThrow();
  assertEquals("STALE",sensor.dataState());assertEquals("RECENT",sensor.activity());assertEquals(1,sensor.activeAlerts());assertEquals(28.0,sensor.soilMoisture());
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM sensor_alert WHERE cleared_at IS NULL",Integer.class));
 }
 @Test void lateOlderMeasurementUpdatesActivityButCannotReplaceLatestSourceData() {
  sample(Instant.now().minusSeconds(40),Instant.now().minusSeconds(40));
  sample(Instant.now().minusSeconds(60),Instant.now());
  var sensor=monitor.overview().devices().stream().filter(d->d.deviceId().equals("ENV01")).findFirst().orElseThrow();
  assertEquals("STALE",sensor.dataState());assertEquals("RECENT",sensor.activity());
  assertTrue(sensor.lastMessageAt().isAfter(sensor.receivedAt()));
 }
 @Test void pumpStatusUses15SecondsAndGetDoesNotExpireCommands() throws Exception {
  jdbc.update("INSERT INTO pump_status(singleton,boot_id,sequence,observed_at,received_at,reported_state,safety_lockout) VALUES(1,?,1,?,?,'OFF',true)",UUID.randomUUID(),Timestamp.from(Instant.now().minusSeconds(16)),Timestamp.from(Instant.now()));
  var pump=monitor.overview().devices().stream().filter(d->d.deviceId().equals("PUMP01")).findFirst().orElseThrow();
  assertEquals("STALE",pump.dataState());assertEquals(Boolean.TRUE,pump.safetyLockout());assertEquals("OFF",pump.reportedState());
  UUID command=UUID.randomUUID();jdbc.update("INSERT INTO pump_command(command_id,action,issued_at,expires_at,state) VALUES(?,'OFF',CURRENT_TIMESTAMP-INTERVAL '1 minute',CURRENT_TIMESTAMP-INTERVAL '50 seconds','SENT')",command);
  mvc.perform(get("/api/v1/monitoring")).andExpect(status().isOk());
  assertEquals("SENT",jdbc.queryForObject("SELECT state FROM pump_command WHERE command_id=?",String.class,command));
 }
}
