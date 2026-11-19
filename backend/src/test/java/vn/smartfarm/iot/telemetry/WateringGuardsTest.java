package vn.smartfarm.iot.telemetry;

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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.automation.RuleGuards;
import vn.smartfarm.iot.automation.WateringRule;
import vn.smartfarm.iot.control.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class WateringGuardsTest {
 @Autowired WateringRule rule; @Autowired TelemetryRepository repository; @Autowired JdbcTemplate jdbc;
 @Autowired PumpService pump; @Autowired MockMvc mvc;
 @MockitoBean CommandTransport transport;
 long seq=0; final UUID sensorBoot=UUID.randomUUID();
 @BeforeEach void setup() throws Exception {
  jdbc.execute("TRUNCATE watering_run,watering_rule,pump_command,pump_status,pump_state_history,telemetry,channel_sample,water_alert,water_alert_state,water_alert_cursor,node_sample");
  jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
  jdbc.update("UPDATE watering_calendar SET mode='ANY_TIME',windows='[]'::jsonb,revision=1");
  jdbc.update("INSERT INTO iot_node(node_id,name,area_id,node_type,telemetry_version) VALUES('WGUARD','Guard water','AREA001','WATER',2) ON CONFLICT DO NOTHING");
  jdbc.update("INSERT INTO iot_channel(node_id,channel_id,metric,unit) VALUES('WGUARD','LOW','WATER_PRESENT','boolean'),('WGUARD','FLOW','FLOW_RATE','L/min') ON CONFLICT DO NOTHING");
  reset(transport);when(transport.controlConnected()).thenReturn(true);
  pumpStatus("OFF"); sample(45,25,50,Instant.now().minusSeconds(10));
 }
 void sample(double soil,double temperature,double humidity,Instant at) { repository.insert(new Telemetry(1,"ENV01",sensorBoot,seq++,at,temperature,humidity,soil,0)); }
 void pumpStatus(String state) {
  String text="{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"bootId\":\"ab6cfc5e-18ff-4a01-852b-03604df6b52f\",\"sequence\":"+(seq++)+",\"timestamp\":\""+Instant.now()+"\",\"reportedState\":\""+state+"\",\"safetyLockout\":false,\"connection\":\"ONLINE\"}";
  pump.receive("smartfarm/FARM001/PUMP01/status",text.getBytes());
 }
 void water(boolean present) {
  long id=jdbc.queryForObject("INSERT INTO node_sample(node_id,boot_id,sequence,observed_at,uptime_ms) VALUES('WGUARD',?,?,?,1) RETURNING id",Long.class,UUID.randomUUID(),seq++,Timestamp.from(Instant.now()));
  jdbc.update("INSERT INTO channel_sample(sample_id,node_id,channel_id,quality,boolean_value) VALUES(?,'WGUARD','LOW','VALID',?)",id,present);
 }
 RuleGuards.Guards save(Double maxTemperature,Double maxHumidity,boolean water,Integer maxRuns) {
  return rule.saveGuards(new RuleGuards.Guards(null,maxTemperature,maxHumidity,water?"WGUARD":null,water?"LOW":null,maxRuns,rule.guards().revision()));
 }
 // Strictly increasing sample times: configure(true) takes the latest stored sample as its mark.
 Instant clock=Instant.now().minusSeconds(8);
 Instant next() { Instant now=Instant.now(); clock=clock.plusMillis(200).isAfter(now)?clock.plusMillis(200):now; return clock; }
 void dryTwice(double temperature,double humidity) {
  rule.configure(true);
  sample(28,temperature,humidity,next());rule.tick();
  sample(28,temperature,humidity,next());rule.tick();
 }

 @Test void withoutGuardsTheRuleDispatchesAsBefore() throws Exception {
  dryTwice(25,50);
  verify(transport,times(1)).publishCommand(any());
  assertEquals(1L,rule.runs().getFirst().guardRevision());
 }
 @Test void temperatureAndHumidityGuardsBlockDispatch() throws Exception {
  save(24.0,null,false,null);
  dryTwice(25,50);
  verify(transport,never()).publishCommand(any());assertEquals(RuleGuards.TEMPERATURE,rule.state().lastResult());
  rule.configure(false);save(null,50.0,false,null);
  dryTwice(25,55);
  verify(transport,never()).publishCommand(any());assertEquals(RuleGuards.HUMIDITY,rule.state().lastResult());
 }
 @Test void dailyLimitCountsRunsSinceVietnamMidnight() throws Exception {
  UUID earlier=UUID.randomUUID();
  jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state) VALUES(?,'ON',20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '10 seconds','EXECUTED')",earlier);
  jdbc.update("INSERT INTO watering_run(command_id,result) VALUES(?,'REPORTED_OFF')",earlier);
  save(null,null,false,1);
  dryTwice(25,50);
  verify(transport,never()).publishCommand(any());assertEquals(RuleGuards.DAILY_LIMIT,rule.state().lastResult());
 }
 @Test void waterGuardNeedsFreshConfirmationAndStopsAnActiveRunWhenWaterIsLost() throws Exception {
  save(null,null,true,null);
  dryTwice(25,50);
  verify(transport,never()).publishCommand(any());assertEquals(RuleGuards.WATER,rule.state().lastResult());
  water(true);
  sample(28,25,50,next());rule.tick();
  sample(28,25,50,next());rule.tick();
  verify(transport,times(1)).publishCommand(any());assertNotNull(rule.state().activeCommand());
  water(false);rule.tick();
  verify(transport,times(2)).publishCommand(any()); // OFF requested by the rule
  assertTrue(jdbc.queryForObject("SELECT stop_requested FROM watering_rule WHERE singleton=1",Boolean.class));
 }
 @Test void guardsSaveOnlyWhileDisabledWithMatchingRevisionAndDeclaredFloat() throws Exception {
  var saved=save(30.0,null,false,null);assertEquals(2,saved.revision());
  assertThrows(ResponseStatusException.class,()->rule.saveGuards(new RuleGuards.Guards(null,31.0,null,null,null,null,1)),"stale revision");
  rule.configure(true);
  assertThrows(ResponseStatusException.class,()->save(null,null,false,null),"enabled rule");
  rule.configure(false);
  mvc.perform(put("/api/v1/automation/watering/guards").contentType(MediaType.APPLICATION_JSON)
   .content("{\"minAirTemperature\":null,\"maxAirTemperature\":null,\"maxAirHumidity\":null,\"waterNode\":\"WGUARD\",\"waterChannel\":\"FLOW\",\"maxRunsPerDay\":null,\"revision\":2}"))
   .andExpect(status().isBadRequest());
  mvc.perform(put("/api/v1/automation/watering/guards").contentType(MediaType.APPLICATION_JSON)
   .content("{\"minAirTemperature\":null,\"maxAirTemperature\":null,\"maxAirHumidity\":null,\"waterNode\":null,\"waterChannel\":null,\"maxRunsPerDay\":2.5,\"revision\":2}"))
   .andExpect(status().isBadRequest());
  mvc.perform(get("/api/v1/automation/watering/guards")).andExpect(status().isOk()).andExpect(jsonPath("$.maxAirTemperature").value(30.0));
 }
 @Test void simulationReplaysStoredTelemetryWithoutDispatching() throws Exception {
  for(int i=0;i<12;i++)sample(20,25,50,Instant.now().minusSeconds(300-5L*i));
  mvc.perform(post("/api/v1/automation/watering/simulation").contentType(MediaType.APPLICATION_JSON).content("{\"hours\":1}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.runs").value(1)).andExpect(jsonPath("$.samples").value(13));
  mvc.perform(post("/api/v1/automation/watering/simulation").contentType(MediaType.APPLICATION_JSON)
   .content("{\"hours\":1,\"settings\":{\"dryThreshold\":10,\"wetThreshold\":20,\"durationSeconds\":20,\"cooldownSeconds\":60,\"revision\":1}}"))
   .andExpect(status().isOk()).andExpect(jsonPath("$.runs").value(0));
  mvc.perform(post("/api/v1/automation/watering/simulation").contentType(MediaType.APPLICATION_JSON).content("{\"hours\":169}")).andExpect(status().isBadRequest());
  verify(transport,never()).publishCommand(any());
 }
}
