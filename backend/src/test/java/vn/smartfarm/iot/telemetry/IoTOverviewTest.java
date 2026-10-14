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
import vn.smartfarm.iot.dashboard.IoTOverview;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class IoTOverviewTest {
 @Autowired IoTOverview overview;@Autowired JdbcTemplate jdbc;@Autowired MockMvc mvc;
 @BeforeEach void setup(){
  jdbc.execute("TRUNCATE watering_run,watering_rule,pump_command,pump_status,pump_state_history,telemetry,sensor_alert,sensor_alert_state");
  jdbc.update("INSERT INTO watering_rule(singleton,enabled,last_result) VALUES(1,true,'WAITING_SAMPLES')");
 }
 @Test void composesStoredDataWithoutInventingRelayState() throws Exception {
  jdbc.update("INSERT INTO telemetry(farm_id,device_id,schema_version,boot_id,sequence,observed_at,temperature,humidity,soil_moisture,uptime_ms) VALUES('FARM001','ENV01',1,?,1,?,25,50,28,1000)",UUID.randomUUID(),Timestamp.from(Instant.now()));
  var result=overview.snapshot();assertEquals("DISABLED",result.monitoring().mqtt().state());assertTrue(result.rule().enabled());
  var env=result.monitoring().devices().stream().filter(d->d.deviceId().equals("ENV01")).findFirst().orElseThrow();assertEquals("FRESH",env.dataState());assertEquals(25.0,env.temperature());
  var pump=result.monitoring().devices().stream().filter(d->d.deviceId().equals("PUMP01")).findFirst().orElseThrow();assertNull(pump.reportedState());
  mvc.perform(get("/api/v1/dashboard/overview")).andExpect(status().isOk()).andExpect(jsonPath("$.monitoring.mqtt.state").value("DISABLED")).andExpect(jsonPath("$.rule.enabled").value(true));
 }
 @Test void totalAlertsAreNotLimitedToFivePreviewRows() {
  for(int i=0;i<6;i++){
   String id="ENV_DASH_"+i;
   jdbc.update("INSERT INTO sensor_device(device_id,name,area_id) VALUES(?,?,'AREA001') ON CONFLICT DO NOTHING",id,id);
   jdbc.update("INSERT INTO sensor_alert(device_id,type,opened_at,opened_value) VALUES(?,'LOW_SOIL',CURRENT_TIMESTAMP,28)",id);
  }
  var result=overview.snapshot();assertEquals(6,result.activeAlertCount());assertEquals(5,result.recentActiveAlerts().size());assertTrue(result.recentActiveAlerts().stream().allMatch(a->a.clearedAt()==null));
  assertEquals(6,result.recentEvents().size());
 }
 @Test void overviewGetNeverDispatchesExpiresOrPausesRules() throws Exception {
  UUID id=UUID.randomUUID();
  jdbc.update("INSERT INTO pump_command(command_id,action,issued_at,expires_at,state) VALUES(?,'OFF',CURRENT_TIMESTAMP-INTERVAL '1 minute',CURRENT_TIMESTAMP-INTERVAL '50 seconds','SENT')",id);
  mvc.perform(get("/api/v1/dashboard/overview")).andExpect(status().isOk());
  assertEquals("SENT",jdbc.queryForObject("SELECT state FROM pump_command WHERE command_id=?",String.class,id));
  assertEquals(Boolean.TRUE,jdbc.queryForObject("SELECT enabled FROM watering_rule",Boolean.class));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class));
 }
}
