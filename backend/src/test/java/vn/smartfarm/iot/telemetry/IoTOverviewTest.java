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
  jdbc.execute("TRUNCATE irrigation_zone,water_alert,soil_alert,node_sample CASCADE");
  jdbc.update("DELETE FROM iot_node WHERE node_id LIKE 'AGR_%'");
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
 private long sample(String id,String type,Instant at,String source) {
  jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES(?,?,'AREA001',?,2)",id,id,type);
  jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES(?,?,?,?)",id,type.equals("SOIL")?"SOIL1":"LOW",type.equals("SOIL")?"SOIL_MOISTURE":"WATER_PRESENT",type.equals("SOIL")?"%":"boolean");
  return jdbc.queryForObject("INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,uptime_ms,data_source) VALUES(?,?,1,?,5000,?) RETURNING id",Long.class,id,UUID.randomUUID(),Timestamp.from(at),source);
 }
 @Test void agriculturalCountsIncludeAllSourcesAcknowledgedAndStaleEpisodesBeyondOneHundred() throws Exception {
  Instant old=Instant.now().minusSeconds(90);
  for(int i=0;i<105;i++){String id="AGR_SOIL_"+i;long sample=sample(id,"SOIL",old,i%2==0?"SIMULATOR":"PHYSICAL");
   jdbc.update("INSERT INTO soil_alert(node_id,data_source,type,channel_key,opened_sample_id,acknowledged_at) VALUES(?,?,'DRY_SOIL','SOIL1',?,CURRENT_TIMESTAMP)",id,i%2==0?"SIMULATOR":"PHYSICAL",sample);
  }
  for(int i=0;i<7;i++){String id="AGR_WATER_"+i;long sample=sample(id,"WATER",old,"UNSPECIFIED");jdbc.update("INSERT INTO water_alert(node_id,data_source,type,channel_key,opened_sample_id) VALUES(?,'UNSPECIFIED','LOW_WATER','',?)",id,sample);}
  var result=overview.snapshot();assertEquals(105,result.agriculture().soilActiveCount());assertEquals(7,result.agriculture().waterActiveCount());assertEquals(5,result.agriculture().recentChannelAlerts().size());
  assertTrue(result.agriculture().recentChannelAlerts().stream().allMatch(a->a.family().equals("SOIL")&&a.acknowledgedAt()!=null));
  assertEquals(result.agriculture().inventory().asOf(),result.agriculture().zones().asOf());
  mvc.perform(get("/api/v1/dashboard/overview")).andExpect(status().isOk()).andExpect(jsonPath("$.agriculture.soilActiveCount").value(105));
 }
 @Test void clearedChannelEpisodesAreExcludedAndAlertIdentitiesKeepTheirFamily() {
  Instant now=Instant.now();long soil=sample("AGR_SOIL","SOIL",now,"SIMULATOR"),water=sample("AGR_WATER","WATER",now,"PHYSICAL");
  // Overlapping IDs are valid because these are independent alert tables.
  jdbc.update("INSERT INTO soil_alert(id,node_id,data_source,type,channel_key,opened_sample_id) OVERRIDING SYSTEM VALUE VALUES(900001,'AGR_SOIL','SIMULATOR','DRY_SOIL','SOIL1',?)",soil);
  jdbc.update("INSERT INTO water_alert(id,node_id,data_source,type,channel_key,opened_sample_id) OVERRIDING SYSTEM VALUE VALUES(900001,'AGR_WATER','PHYSICAL','LOW_WATER','',?)",water);
  var a=overview.snapshot().agriculture();assertEquals(2,a.recentChannelAlerts().size());assertEquals(2,a.recentChannelAlerts().stream().map(r->r.family()+":"+r.id()).distinct().count());
  jdbc.update("UPDATE water_alert SET cleared_sample_id=? WHERE node_id='AGR_WATER'",water);
  a=overview.snapshot().agriculture();assertEquals(0,a.waterActiveCount());assertEquals(1,a.soilActiveCount());assertEquals(1,a.recentChannelAlerts().size());
 }
 @Test void zoneSurveyUsesInventoryClockAndPreservesZeroAndMissingChannels() {
  Instant now=Instant.now();long id=sample("AGR_ZERO","SOIL",now,"SIMULATOR");
  jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES('AGR_ZERO','SOIL2','SOIL_MOISTURE','%'),('AGR_ZERO','SOIL3','SOIL_MOISTURE','%')");
  jdbc.update("INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,number_value) VALUES(?,'AGR_ZERO','SOIL1','VALID',0)",id);
  jdbc.update("INSERT INTO irrigation_zone(zone_id,name,area_id,soil_node_id,expected_source,dry_threshold,wet_threshold) VALUES('AGR_ZONE','Zone','AREA001','AGR_ZERO','SIMULATOR',30,35)");
  for(int i=1;i<=3;i++)jdbc.update("INSERT INTO irrigation_zone_channel(zone_id,node_id,channel_id,position) VALUES('AGR_ZONE','AGR_ZERO',?,?)","SOIL"+i,i-1);
  var a=overview.snapshot().agriculture();var z=a.zones().zones().getFirst();assertEquals(a.inventory().asOf(),z.asOf());assertEquals("UNAVAILABLE",z.assessment().state());assertEquals(0.0,((Number)z.points().getFirst().latest().value()).doubleValue());assertNull(z.points().get(1).latest());
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class));
 }
 @Test void overviewGetNeverDispatchesExpiresOrPausesRules() throws Exception {
  UUID id=UUID.randomUUID();
  jdbc.update("INSERT INTO pump_command(command_id,action,issued_at,expires_at,state) VALUES(?,'OFF',CURRENT_TIMESTAMP-INTERVAL '1 minute',CURRENT_TIMESTAMP-INTERVAL '50 seconds','SENT')",id);
  mvc.perform(get("/api/v1/dashboard/overview")).andExpect(status().isOk());
  assertEquals("SENT",jdbc.queryForObject("SELECT state FROM pump_command WHERE command_id=?",String.class,id));
  assertEquals(Boolean.TRUE,jdbc.queryForObject("SELECT enabled FROM watering_rule",Boolean.class));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class));
 }
}
