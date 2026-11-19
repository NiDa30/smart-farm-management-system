package vn.smartfarm.iot.health;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import vn.smartfarm.iot.monitoring.MqttHealth;
import vn.smartfarm.iot.realtime.RealtimeNotifier;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class DeviceHealthTest {
 @Autowired JdbcTemplate jdbc; @Autowired MockMvc mvc;
 // Evaluation time is shifted past the 60 s "recently connected" guard; all data is relative to it.
 Instant now; MqttHealth connected;
 // One boot for all samples: a new boot per sample would read as hundreds of restarts.
 static final UUID BOOT=UUID.fromString("44444444-4444-4444-4444-444444444444");
 @BeforeEach void setup() {
  jdbc.execute("TRUNCATE device_health_alert,telemetry,pump_status,pump_state_history,channel_sample,water_alert,water_alert_state,water_alert_cursor,node_sample");
  jdbc.update("DELETE FROM iot_node WHERE node_id='WHTEST'");
  jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES('WHTEST','Health flow','AREA001','WATER',2)");
  jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES('WHTEST','FLOW','FLOW_RATE','L/min')");
  connected=new MqttHealth(true); connected.connected();
  now=Instant.now().plusSeconds(61);
 }
 DeviceHealth health(int stuckMinutes) {
  return new DeviceHealth(jdbc,connected,RealtimeNotifier.NONE,60,stuckMinutes,"WHTEST/FLOW",0.5,20,true);
 }
 void env(Instant at,double soil) {
  jdbc.update("INSERT INTO telemetry(farm_id,device_id,schema_version,boot_id,sequence,observed_at,received_at,temperature,humidity,soil_moisture,uptime_ms) VALUES('FARM001','ENV01',1,?,?,?,?,25,60,?,1000)",
   BOOT,at.toEpochMilli(),Timestamp.from(at),Timestamp.from(at),soil);
 }
 void pump(String state,Instant at) {
  jdbc.update("""
   INSERT INTO pump_status(singleton,boot_id,sequence,observed_at,received_at,reported_state,safety_lockout) VALUES(1,'33333333-3333-3333-3333-333333333333',?,?,?,?,false)
   ON CONFLICT(singleton) DO UPDATE SET sequence=EXCLUDED.sequence,observed_at=EXCLUDED.observed_at,received_at=EXCLUDED.received_at,reported_state=EXCLUDED.reported_state
   """,at.toEpochMilli(),Timestamp.from(at),Timestamp.from(at),state);
 }
 void flow(Instant at,double rate) {
  long id=jdbc.queryForObject("INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,received_at,uptime_ms) VALUES('WHTEST',?,?,?,?,1) RETURNING id",Long.class,
   UUID.randomUUID(),at.toEpochMilli(),Timestamp.from(at),Timestamp.from(at));
  jdbc.update("INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,number_value) VALUES(?,'WHTEST','FLOW','VALID',?)",id,rate);
 }
 int open(String type) { return jdbc.queryForObject("SELECT COUNT(*) FROM device_health_alert WHERE type=? AND cleared_at IS NULL",Integer.class,type); }

 @Test void decidesNothingWithoutAnEstablishedBackendSubscription() {
  env(now.minusSeconds(600),40);
  var disabled=new DeviceHealth(jdbc,new MqttHealth(false),RealtimeNotifier.NONE,60,30,"",0.5,20,true);
  assertFalse(disabled.evaluate(now).evaluated());
  var fresh=new MqttHealth(true); fresh.connected();
  var recent=new DeviceHealth(jdbc,fresh,RealtimeNotifier.NONE,60,30,"",0.5,20,true);
  assertEquals("MQTT_RECENTLY_CONNECTED",recent.evaluate(Instant.now()).skippedReason());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM device_health_alert",Integer.class));
 }
 @Test void offlineOpensAfterSilenceKeepsHysteresisAndClearsOnFreshReceipt() {
  env(now.minusSeconds(61),40);
  var service=health(0);
  assertEquals(1,service.evaluate(now).opened());
  assertEquals(1,open("DEVICE_OFFLINE"));
  assertEquals(0,service.evaluate(now).opened(),"an open episode is not duplicated");
  env(now.minusSeconds(45),40); // inside the hysteresis band: neither opens nor clears
  service.evaluate(now);
  assertEquals(1,open("DEVICE_OFFLINE"));
  env(now.minusSeconds(5),40);
  assertEquals(1,service.evaluate(now).cleared());
  assertEquals(0,open("DEVICE_OFFLINE"));
 }
 @Test void neverSeenDevicesAndFutureReceiptsDoNotAlert() {
  var service=health(0);
  service.evaluate(now);
  assertEquals(0,open("DEVICE_OFFLINE"));
  env(now.plusSeconds(30),40);
  service.evaluate(now);
  assertEquals(0,open("DEVICE_OFFLINE"));
 }
 @Test void stuckValueRequiresEnoughSamplesAndClearsWhenTheValueMoves() {
  var service=health(5);
  for(int i=0;i<20;i++)env(now.minusSeconds(5L*i),40); // 20 < 30 required samples for 5 minutes
  service.evaluate(now);
  assertEquals(0,open("STUCK_VALUE"));
  jdbc.execute("TRUNCATE telemetry");
  for(int i=0;i<55;i++)env(now.minusSeconds(5L*i),40);
  service.evaluate(now);
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM device_health_alert WHERE type='STUCK_VALUE' AND channel_key='SOIL' AND cleared_at IS NULL",Integer.class));
  env(now.minusSeconds(1),41);
  service.evaluate(now);
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM device_health_alert WHERE type='STUCK_VALUE' AND channel_key='SOIL' AND cleared_at IS NULL",Integer.class));
 }
 @Test void pumpNoFlowWaitsForGraceAndClearsWhenPumpIsOff() {
  var service=health(0);
  pump("OFF",now.minusSeconds(40));
  pump("ON",now.minusSeconds(30));
  pump("ON",now.minusSeconds(2));
  flow(now.minusSeconds(15),0); // within 20 s of start: no decision
  service.evaluate(now);
  assertEquals(0,open("PUMP_NO_FLOW"));
  flow(now.minusSeconds(3),0.1);
  service.evaluate(now);
  assertEquals(1,open("PUMP_NO_FLOW"));
  assertTrue(jdbc.queryForObject("SELECT opened_detail FROM device_health_alert WHERE type='PUMP_NO_FLOW'",String.class).startsWith("FLOW 0.1 L/min"));
  pump("OFF",now.minusSeconds(1));
  service.evaluate(now);
  assertEquals(0,open("PUMP_NO_FLOW"));
 }
 @Test void staleFlowOrStalePumpStatusDecidesNothing() {
  var service=health(0);
  pump("OFF",now.minusSeconds(80));
  pump("ON",now.minusSeconds(60));
  pump("ON",now.minusSeconds(2));
  flow(now.minusSeconds(30),0);
  service.evaluate(now);
  assertEquals(0,open("PUMP_NO_FLOW"));
 }
 @Test void acknowledgementIsIdempotentAndRejectsClearedEpisodes() throws Exception {
  jdbc.update("INSERT INTO device_health_alert(device_id,type,channel_key,opened_at,opened_detail) VALUES('ENV01','DEVICE_OFFLINE','',CURRENT_TIMESTAMP,'LAST_RECEIVED x')");
  long id=jdbc.queryForObject("SELECT id FROM device_health_alert",Long.class);
  mvc.perform(put("/api/v1/health-alerts/"+id+"/acknowledgement").contentType(MediaType.APPLICATION_JSON).content("{\"note\":\" kiểm tra nguồn \"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.acknowledgementNote").value("kiểm tra nguồn"));
  mvc.perform(put("/api/v1/health-alerts/"+id+"/acknowledgement").contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"kiểm tra nguồn\"}")).andExpect(status().isOk());
  mvc.perform(put("/api/v1/health-alerts/"+id+"/acknowledgement").contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"khác\"}")).andExpect(status().isConflict());
  mvc.perform(put("/api/v1/health-alerts/"+id+"/acknowledgement").contentType(MediaType.APPLICATION_JSON).content("{\"note\":5}")).andExpect(status().isBadRequest());
  jdbc.update("INSERT INTO device_health_alert(device_id,type,channel_key,opened_at,opened_detail,cleared_at) VALUES('PUMP01','PUMP_NO_FLOW','',CURRENT_TIMESTAMP,'x',CURRENT_TIMESTAMP)");
  long cleared=jdbc.queryForObject("SELECT MAX(id) FROM device_health_alert",Long.class);
  mvc.perform(put("/api/v1/health-alerts/"+cleared+"/acknowledgement").contentType(MediaType.APPLICATION_JSON).content("{\"note\":null}")).andExpect(status().isConflict());
  mvc.perform(get("/api/v1/health-alerts")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
 }
 @Test void statisticsReportGapsRebootsAndJumpsWithoutInventingBattery() throws Exception {
  Instant base=Instant.now().minusSeconds(600);
  for(int i=0;i<100;i++)if(i<40||i>45)env(base.plusSeconds(5L*i),i==70?80:40);
  mvc.perform(get("/api/v1/monitoring/statistics?hours=1")).andExpect(status().isOk())
   .andExpect(jsonPath("$.devices[?(@.deviceId=='ENV01')].gaps").value(1))
   .andExpect(jsonPath("$.devices[?(@.deviceId=='ENV01')].spikes").value(2))
   .andExpect(jsonPath("$.devices[?(@.deviceId=='ENV01')].expectedSamples").value(720))
   .andExpect(jsonPath("$.devices[?(@.deviceId=='WHTEST')].spikes").value(org.hamcrest.Matchers.contains((Object)null)))
   .andExpect(jsonPath("$.devices[0].battery").doesNotExist());
  mvc.perform(get("/api/v1/monitoring/statistics?hours=25")).andExpect(status().isBadRequest());
 }
 @Test void rejectsMalformedFlowChannelSetting() {
  assertThrows(IllegalArgumentException.class,()->new DeviceHealth(jdbc,connected,RealtimeNotifier.NONE,60,30,"water01/flow",0.5,20,true));
  assertThrows(IllegalArgumentException.class,()->new DeviceHealth(jdbc,connected,RealtimeNotifier.NONE,10,30,"",0.5,20,true));
 }
}
