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
 @Autowired vn.smartfarm.iot.automation.IrrigationCalendar calendar;
 @Autowired WateringRule rule; @Autowired TelemetryRepository repository; @Autowired JdbcTemplate jdbc;
 @Autowired PumpService pump; @Autowired ObjectMapper mapper;
 @Autowired PumpController controller;
 @MockitoBean CommandTransport transport;
 long seq=0;
 @BeforeEach void setup() throws Exception {
  jdbc.execute("TRUNCATE watering_run,watering_rule,pump_command,pump_status,pump_state_history,telemetry");
  jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
  jdbc.update("UPDATE watering_calendar SET mode='ANY_TIME',windows='[]'::jsonb,revision=1");
  reset(transport);when(transport.controlConnected()).thenReturn(true);
  status("OFF"); sample(45,Instant.now().minusSeconds(10));
 }
 final UUID sensorBoot=UUID.randomUUID();
 void sample(double soil,Instant at) { repository.insert(new Telemetry(1,"ENV01",sensorBoot,seq++,at,25,50,soil,0)); }
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
  assertFalse(rule.state().enabled());assertNotNull(rule.state().activeCommand());
  assertEquals(1,rule.runs().size()); // tracked before publish, not duplicated by the exception handler
  assertEquals(1,pump.commands().stream().filter(c->c.action().equals("ON")).count());
  verify(transport,times(2)).publishCommand(any()); // one ON, one safety OFF; neither retries
 }
 @Test void completedRunStartsCooldownAndStaleSensorNeverStartsOn() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();sample(28,Instant.now());rule.tick();
  UUID id=rule.state().activeCommand();
  jdbc.update("UPDATE pump_command SET state='EXECUTED',issued_at=CURRENT_TIMESTAMP-INTERVAL '40 seconds',expires_at=CURRENT_TIMESTAMP-INTERVAL '30 seconds' WHERE command_id=?",id);
  status("OFF");rule.tick();
  assertNull(rule.state().activeCommand());assertTrue(rule.state().cooldownUntil().isAfter(Instant.now()));
  rule.tick();verify(transport,times(1)).publishCommand(any());
  jdbc.update("UPDATE watering_rule SET cooldown_until=NULL");
  jdbc.update("UPDATE telemetry SET observed_at=CURRENT_TIMESTAMP-INTERVAL '40 seconds'");
  rule.tick();assertEquals(0,rule.state().lowCount());verify(transport,times(1)).publishCommand(any());
 }
 @Test void wetSoilSendsOneOffAndDisableDoesNotFloodCommands() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();sample(28,Instant.now().minusMillis(5));rule.tick();
  status("ON");sample(35,Instant.now());rule.tick();rule.tick();
  assertEquals(2,pump.commands().size());
  assertEquals(1,pump.commands().stream().filter(c->c.action().equals("OFF")).count());
 }
 void start() {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();
  sample(28,Instant.now().minusMillis(5));rule.tick();assertNotNull(rule.state().activeCommand());
 }
 void ack(UUID id,String state) {
  String text="{\"schemaVersion\":1,\"deviceId\":\"PUMP01\",\"bootId\":\"ab6cfc5e-18ff-4a01-852b-03604df6b52f\",\"sequence\":"+(seq++)+",\"timestamp\":\""+Instant.now()+"\",\"commandId\":\""+id+"\",\"stage\":\"EXECUTED\",\"status\":\"SUCCESS\",\"reportedState\":\""+state+"\",\"safetyLockout\":false}";
  pump.receive("smartfarm/FARM001/PUMP01/ack",text.getBytes());
 }
 @Test void wetSampleBetweenDrySamplesIsNotSkippedByScheduler() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(6));rule.tick();
  sample(40,Instant.now().minusSeconds(4));sample(28,Instant.now().minusSeconds(2));rule.tick();
  assertEquals(1,rule.state().lowCount());verify(transport,never()).publishCommand(any());
 }
 @Test void twoSamplesBetweenTicksAreBothConsumed() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(6));sample(28,Instant.now().minusSeconds(2));rule.tick();
  verify(transport,times(1)).publishCommand(any());
 }
 @Test void offHeartbeatBeforeAckDoesNotFinishStopOrStartCooldown() throws Exception {
  start();rule.configure(false);status("OFF");rule.tick();
  assertNotNull(rule.state().activeCommand());assertNull(rule.state().cooldownUntil());
  UUID off=jdbc.queryForObject("SELECT stop_command FROM watering_rule",UUID.class);
  ack(off,"OFF");rule.tick(); // earlier OFF sequence cannot corroborate later ACK
  assertNotNull(rule.state().activeCommand());
  status("OFF");rule.tick();assertNull(rule.state().activeCommand());
  assertTrue(rule.state().cooldownUntil().isAfter(Instant.now().plusSeconds(59)));
 }
 @Test void restartDuringRunKeepsTrackingAndBlocksEnableUntilConfirmedOff() throws Exception {
  start();UUID id=rule.state().activeCommand();rule.safeStartup();
  assertFalse(rule.state().enabled());assertEquals(id,rule.state().activeCommand());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->rule.configure(true));
  ack(id,"ON");status("OFF");rule.tick();
  assertNull(rule.state().activeCommand());assertFalse(rule.state().enabled());
 }
 @Test void onAckCannotUseOlderOffStatusToFinishRun() throws Exception {
  start();UUID id=rule.state().activeCommand();ack(id,"ON");rule.tick();
  assertEquals(id,rule.state().activeCommand());assertNull(rule.state().cooldownUntil());
  status("OFF");rule.tick();assertNull(rule.state().activeCommand());
 }
 @Test void changedBootOrDecreasingSequenceCannotMakeTwoConsecutiveSamples() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();
  repository.insert(new Telemetry(1,"ENV01",sensorBoot,0,Instant.now().minusSeconds(3),25,50,28,0));rule.tick();
  assertEquals(1,rule.state().lowCount());
  repository.insert(new Telemetry(1,"ENV01",UUID.randomUUID(),0,Instant.now(),25,50,28,0));rule.tick();
  assertEquals(1,rule.state().lowCount());verify(transport,never()).publishCommand(any());
 }
 @Test void pendingCommandAndSafetyLockoutBlockAutomaticOn() throws Exception {
  rule.configure(true);pump.create(new PumpService.Request("OFF",null));
  sample(28,Instant.now().minusSeconds(5));sample(28,Instant.now());rule.tick();
  assertEquals("COMMAND_PENDING",rule.state().lastResult());assertNull(rule.state().activeCommand());
  jdbc.update("UPDATE pump_status SET safety_lockout=true");rule.tick();
  assertEquals("SAFETY_LOCKOUT",rule.state().lastResult());
 }
 @Test void greaterThanFifteenSecondGapResetsCount() throws Exception {
  rule.configure(true);
  jdbc.update("UPDATE watering_rule SET last_sample_at=CURRENT_TIMESTAMP-INTERVAL '20 seconds',low_count=1");
  sample(28,Instant.now());rule.tick();assertEquals(1,rule.state().lowCount());
  verify(transport,never()).publishCommand(any());
 }
 @Test void failedOffDoesNotReleaseRunOrRetryOffBeforeSafeDeadline() throws Exception {
  start();rule.configure(false);
  UUID off=jdbc.queryForObject("SELECT stop_command FROM watering_rule",UUID.class);
  jdbc.update("UPDATE pump_command SET state='FAILED' WHERE command_id=?",off);
  status("OFF");rule.tick();rule.tick();
  assertNotNull(rule.state().activeCommand());assertNull(rule.state().cooldownUntil());
  assertEquals(1,pump.commands().stream().filter(c->c.action().equals("OFF")).count());
  assertEquals("STOP_UNCONFIRMED",rule.state().lastResult());
  assertEquals("STOP_UNCONFIRMED",rule.runs().getFirst().result());
  jdbc.update("UPDATE pump_command SET expires_at=CURRENT_TIMESTAMP-INTERVAL '25 seconds' WHERE command_id=?",rule.state().activeCommand());
  status("OFF");rule.tick();assertNull(rule.state().activeCommand());
 }
 @Test void startupHookAlsoPausesWithoutMqttScheduler() throws Exception {
  rule.configure(true);new vn.smartfarm.iot.automation.RuleStartup(rule);
  assertFalse(rule.state().enabled());assertEquals("RESTART_PAUSED",rule.state().lastResult());
 }
 @Test void staleDeviceAndDisconnectedTransportNeverDispatchOn() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));sample(28,Instant.now());
  jdbc.update("UPDATE pump_status SET observed_at=CURRENT_TIMESTAMP-INTERVAL '20 seconds'");rule.tick();
  assertEquals("DEVICE_NOT_READY",rule.state().lastResult());verify(transport,never()).publishCommand(any());
  status("OFF");when(transport.controlConnected()).thenReturn(false);rule.tick();
  assertFalse(rule.state().enabled());verify(transport,never()).publishCommand(any());
 }
 @Test void staleFirstSampleCannotCombineWithFreshSecondEvenWhenGapIsBelowFifteenSeconds() throws Exception {
  rule.configure(true);
  jdbc.update("UPDATE watering_rule SET last_sample_at=CURRENT_TIMESTAMP-INTERVAL '16 seconds',low_count=1");
  // Remove only the setup sample in this test schema; it would otherwise reset the streak.
  jdbc.update("DELETE FROM telemetry");
  sample(28,Instant.now().minusSeconds(2));rule.tick();
  assertEquals(1,rule.state().lowCount());verify(transport,never()).publishCommand(any());
 }
 @Test void thirtyPercentBreaksDryStreak() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(6));rule.tick();
  sample(30,Instant.now().minusSeconds(4));sample(28,Instant.now().minusSeconds(2));rule.tick();
  assertEquals(1,rule.state().lowCount());verify(transport,never()).publishCommand(any());
 }
 @Test void trackingIsCommittedBeforePublishAndSurvivesCrashAtTransportBoundary() throws Exception {
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();
  doAnswer(invocation -> {
   UUID id=UUID.fromString(mapper.readTree((byte[])invocation.getArgument(0)).path("commandId").asText());
   // A second connection sees only committed rows, as a restarted process would.
   try (var connection=jdbc.getDataSource().getConnection();var statement=connection.prepareStatement(
      "SELECT COUNT(*) FROM watering_rule r JOIN watering_run w ON w.command_id=r.active_command WHERE r.active_command=?")) {
    statement.setObject(1,id);
    try (var rows=statement.executeQuery()) { assertTrue(rows.next());assertEquals(1,rows.getInt(1)); }
   }
   throw new LinkageError("simulated process termination at publish");
  }).when(transport).publishCommand(any());
  sample(28,Instant.now());assertThrows(LinkageError.class,()->rule.tick());
  UUID id=rule.state().activeCommand();assertNotNull(id);
  rule.safeStartup();rule.tick();
  assertFalse(rule.state().enabled());assertEquals(id,rule.state().activeCommand());
  assertEquals(1,rule.runs().size());verify(transport,times(1)).publishCommand(any());
 }
 @Test void manualOffThroughControllerPausesBeforePublishAndCannotAutoResume() throws Exception {
  start();ack(rule.state().activeCommand(),"ON");status("ON");
  doAnswer(invocation -> { assertFalse(rule.state().enabled());return null; }).when(transport).publishCommand(any());
  var off=controller.create(new PumpService.Request("OFF",null));
  assertEquals("MANUAL_HOLD",rule.state().lastResult());
  ack(off.commandId(),"OFF");status("OFF");rule.tick();
  assertNull(rule.state().activeCommand());assertFalse(rule.state().enabled());
  sample(28,Instant.now());rule.tick();
  assertEquals(1,pump.commands().stream().filter(c->c.action().equals("ON")).count());
 }
 @Test void pendingOutsideTwentyCommandHistoryStillBlocksWithoutPausingRule() throws Exception {
  rule.configure(true);
  UUID pending=UUID.randomUUID();
  jdbc.update("INSERT INTO pump_command(command_id,action,issued_at,expires_at,state) VALUES(?,'OFF',CURRENT_TIMESTAMP-INTERVAL '2 seconds',CURRENT_TIMESTAMP+INTERVAL '8 seconds','SENT')",pending);
  for (int i=0;i<20;i++) jdbc.update("INSERT INTO pump_command(command_id,action,issued_at,expires_at,state) VALUES(?,'OFF',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '10 seconds','EXECUTED')",UUID.randomUUID());
  sample(28,Instant.now().minusSeconds(5));sample(28,Instant.now());rule.tick();
  assertTrue(rule.state().enabled());assertEquals("COMMAND_PENDING",rule.state().lastResult());
  verify(transport,never()).publishCommand(any());
 }
 @Test void v10UpgradePreservesExistingRunAndAddsNullableSampleIdentity() {
  String schema="watering_upgrade_"+UUID.randomUUID().toString().replace("-", "");
  UUID id=UUID.randomUUID();
  try {
   org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).target("9").load().migrate();
   jdbc.update("INSERT INTO "+schema+".pump_command(command_id,action,duration_seconds,issued_at,expires_at,state) VALUES(?,'ON',20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '10 seconds','SENT')",id);
   jdbc.update("UPDATE "+schema+".watering_rule SET enabled=true,active_command=?,low_count=1",id);
   jdbc.update("INSERT INTO "+schema+".watering_run(command_id,result) VALUES(?,'COMMAND_SENT')",id);
   org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).load().migrate();
   assertEquals(id,jdbc.queryForObject("SELECT active_command FROM "+schema+".watering_rule",UUID.class));
   assertTrue(jdbc.queryForObject("SELECT enabled FROM "+schema+".watering_rule",Boolean.class));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM "+schema+".watering_run",Integer.class));
   assertNull(jdbc.queryForObject("SELECT last_sample_boot FROM "+schema+".watering_rule",UUID.class));
   assertNull(jdbc.queryForObject("SELECT last_sample_sequence FROM "+schema+".watering_rule",Long.class));
  } finally {
   // This generated schema exists only inside the dedicated test database.
   jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");
  }
 }
 @Test void settingsApiPersistsVersionAndLeavesCurrentCooldownUnchanged() throws Exception {
  var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new vn.smartfarm.iot.automation.RuleController(rule,calendar)).setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(mapper)).build();
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/automation/watering/settings"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.durationSeconds").value(20));
  Instant deadline=Instant.now().plusSeconds(90);
  jdbc.update("UPDATE watering_rule SET cooldown_until=?,low_count=1,last_sample_at=CURRENT_TIMESTAMP",java.sql.Timestamp.from(deadline));
  var saved=rule.saveSettings(new WateringRule.Settings(25,40,12,120,1));
  assertEquals(2,saved.revision());assertEquals(saved,rule.settings());
  assertEquals(deadline.toEpochMilli(),rule.state().cooldownUntil().toEpochMilli());
  assertEquals(0,rule.state().lowCount());
  assertNull(jdbc.queryForObject("SELECT last_sample_at FROM watering_rule",java.sql.Timestamp.class));
  verify(transport,never()).publishCommand(any());
 }
 @Test void settingsRejectInvalidRangesAndNonIntegerJsonWithoutChanges() throws Exception {
  var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new vn.smartfarm.iot.automation.RuleController(rule,calendar)).setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(mapper)).build();
  var initial=rule.settings();
  for (String body:java.util.List.of(
   "{}","null",
   "{\"dryThreshold\":30,\"wetThreshold\":34,\"durationSeconds\":20,\"cooldownSeconds\":60,\"revision\":1}",
   "{\"dryThreshold\":30,\"wetThreshold\":35,\"durationSeconds\":31,\"cooldownSeconds\":60,\"revision\":1}",
   "{\"dryThreshold\":30,\"wetThreshold\":35,\"durationSeconds\":20,\"cooldownSeconds\":59,\"revision\":1}",
   "{\"dryThreshold\":30.5,\"wetThreshold\":35,\"durationSeconds\":20,\"cooldownSeconds\":60,\"revision\":1}",
   "{\"dryThreshold\":\"30\",\"wetThreshold\":35,\"durationSeconds\":20,\"cooldownSeconds\":60,\"revision\":1}")) {
   mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/automation/watering/settings").contentType("application/json").content(body))
    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
   assertEquals(initial,rule.settings());
  }
 }
 @Test void staleSettingsRevisionCannotOverwriteAnotherTab() throws Exception {
  var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new vn.smartfarm.iot.automation.RuleController(rule,calendar)).setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(mapper)).build();
  var one=new WateringRule.Settings(25,40,12,120,1);
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/automation/watering/settings")
   .contentType("application/json").content(mapper.writeValueAsString(one)))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.revision").value(2));
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/automation/watering/settings")
   .contentType("application/json").content(mapper.writeValueAsString(new WateringRule.Settings(20,40,10,180,1))))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isConflict());
  assertEquals(12,rule.settings().durationSeconds());assertEquals(2,rule.settings().revision());
  verify(transport,never()).publishCommand(any());
 }
 @Test void settingsCannotChangeWhileEnabledOrUnresolvedRunEvenAfterRestart() throws Exception {
  rule.configure(true);
  var change=new WateringRule.Settings(25,40,12,120,1);
  assertEquals(org.springframework.http.HttpStatus.CONFLICT,assertThrows(org.springframework.web.server.ResponseStatusException.class,()->rule.saveSettings(change)).getStatusCode());
  sample(28,Instant.now().minusSeconds(5));rule.tick();sample(28,Instant.now());rule.tick();
  assertNotNull(rule.state().activeCommand());rule.safeStartup();
  assertFalse(rule.state().enabled());
  assertEquals(org.springframework.http.HttpStatus.CONFLICT,assertThrows(org.springframework.web.server.ResponseStatusException.class,()->rule.saveSettings(change)).getStatusCode());
  assertEquals(1,rule.settings().revision());
 }
 @Test void configuredThresholdsDriveOnDurationAndEarlyOffWithRunSnapshot() throws Exception {
  rule.saveSettings(new WateringRule.Settings(25,45,7,120,1));
  rule.configure(true);
  sample(28,Instant.now().minusSeconds(8));sample(28,Instant.now().minusSeconds(6));rule.tick();
  verify(transport,never()).publishCommand(any()); // old dry threshold 30 no longer controls watering
  sample(24,Instant.now().minusSeconds(4));sample(24,Instant.now().minusSeconds(2));rule.tick();
  var command=pump.commands().getFirst();assertEquals("ON",command.action());assertEquals(7,command.durationSeconds());
  var run=rule.runs().getFirst();
  assertEquals(25,run.dryThreshold());assertEquals(45,run.wetThreshold());assertEquals(7,run.durationSeconds());
  assertEquals(120,run.cooldownSeconds());assertEquals(2,run.settingsRevision());
  ack(command.commandId(),"ON");status("ON");
  sample(40,Instant.now().minusMillis(20));rule.tick();assertEquals(1,pump.commands().size());
  sample(45,Instant.now());rule.tick();assertEquals(1,pump.commands().stream().filter(c->c.action().equals("OFF")).count());
 }
 @Test void confirmedOffUsesConfiguredCooldownAndNextEditKeepsHistoricalRunSnapshot() throws Exception {
  rule.saveSettings(new WateringRule.Settings(30,35,10,120,1));start();
  UUID id=rule.state().activeCommand();ack(id,"ON");status("OFF");
  Instant before=Instant.now();rule.tick();
  assertNull(rule.state().activeCommand());
  assertTrue(rule.state().cooldownUntil().isAfter(before.plusSeconds(119)));
  assertTrue(rule.state().cooldownUntil().isBefore(Instant.now().plusSeconds(121)));
  rule.configure(false);Instant deadline=rule.state().cooldownUntil();
  rule.saveSettings(new WateringRule.Settings(25,40,5,60,2));
  assertEquals(deadline,rule.state().cooldownUntil());
  assertEquals(10,rule.runs().getFirst().durationSeconds());assertEquals(2,rule.runs().getFirst().settingsRevision());
 }
 @Test void restartPreservesSettingsButKeepsRuleDisabledAndDoesNotPublish() throws Exception {
  var saved=rule.saveSettings(new WateringRule.Settings(90,100,30,3600,1));
  rule.configure(true);rule.safeStartup();
  assertEquals(saved,rule.settings());assertFalse(rule.state().enabled());
  verify(transport,never()).publishCommand(any());
 }
 @Test void v11UpgradePreservesV10RunAndDoesNotInventHistoricalSettings() {
  String schema="settings_upgrade_"+UUID.randomUUID().toString().replace("-", "");
  UUID id=UUID.randomUUID();
  try {
   org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).target("10").load().migrate();
   jdbc.update("INSERT INTO "+schema+".pump_command(command_id,action,duration_seconds,issued_at,expires_at,state) VALUES(?,'ON',20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '10 seconds','SENT')",id);
   jdbc.update("UPDATE "+schema+".watering_rule SET enabled=true,active_command=?,low_count=1,last_sample_boot=?,last_sample_sequence=99",id,sensorBoot);
   jdbc.update("INSERT INTO "+schema+".watering_run(command_id,result) VALUES(?,'COMMAND_SENT')",id);
   org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).load().migrate();
   assertEquals(id,jdbc.queryForObject("SELECT active_command FROM "+schema+".watering_rule",UUID.class));
   assertTrue(jdbc.queryForObject("SELECT enabled FROM "+schema+".watering_rule",Boolean.class));
   assertEquals(99,jdbc.queryForObject("SELECT last_sample_sequence FROM "+schema+".watering_rule",Long.class));
   assertEquals(30,jdbc.queryForObject("SELECT dry_threshold FROM "+schema+".watering_rule",Integer.class));
   assertEquals(35,jdbc.queryForObject("SELECT wet_threshold FROM "+schema+".watering_rule",Integer.class));
   assertEquals(20,jdbc.queryForObject("SELECT duration_seconds FROM "+schema+".watering_rule",Integer.class));
   assertEquals(60,jdbc.queryForObject("SELECT cooldown_seconds FROM "+schema+".watering_rule",Integer.class));
   assertEquals(1,jdbc.queryForObject("SELECT settings_revision FROM "+schema+".watering_rule",Long.class));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM "+schema+".watering_run",Integer.class));
   assertNull(jdbc.queryForObject("SELECT settings_revision FROM "+schema+".watering_run",Long.class));
   assertNull(jdbc.queryForObject("SELECT duration_seconds FROM "+schema+".watering_run",Integer.class));
  } finally { jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE"); }
 }

 vn.smartfarm.iot.automation.IrrigationCalendar.Settings activeCalendar(boolean inside) {
  var time=java.time.ZonedDateTime.now(java.time.ZoneId.of(vn.smartfarm.iot.automation.IrrigationCalendar.ZONE));
  var from=time.minusMinutes(inside?5:120).toLocalTime().withSecond(0).withNano(0);
  var to=time.plusMinutes(inside?5:-60).toLocalTime().withSecond(0).withNano(0);
  return new vn.smartfarm.iot.automation.IrrigationCalendar.Settings("TIME_WINDOWS",vn.smartfarm.iot.automation.IrrigationCalendar.ZONE,calendar.settings().revision(),
   java.util.List.of(new vn.smartfarm.iot.automation.IrrigationCalendar.Window(java.util.List.of(1,2,3,4,5,6,7),from.toString(),to.toString())));
 }
 @Test void calendarOutsideWindowBlocksAutomaticOnAndResetsStreak() throws Exception {
  rule.saveCalendar(activeCalendar(false));rule.configure(true);
  sample(28,Instant.now().minusSeconds(5));sample(28,Instant.now());rule.tick();rule.tick();
  assertEquals("OUTSIDE_SCHEDULE",rule.state().lastResult());assertEquals(0,rule.state().lowCount());
  verify(transport,never()).publishCommand(any());
 }
 @Test void calendarInsideUsesExistingAckTrackingAndStoresWindowSnapshot() throws Exception {
  var saved=rule.saveCalendar(activeCalendar(true));start();
  var run=rule.runs().getFirst();assertEquals(saved.settings().revision(),run.calendarRevision());
  assertEquals("TIME_WINDOWS",run.calendarMode());assertNotNull(run.windowStart());assertTrue(run.windowEnd().isAfter(Instant.now()));
  ack(rule.state().activeCommand(),"ON");rule.tick();assertEquals("EXECUTION_CONFIRMED",rule.state().lastResult());
 }
 @Test void windowCloseSendsOneOffAndStillWaitsForCausalOffStatus() throws Exception {
  rule.saveCalendar(activeCalendar(true));start();
  var outside=activeCalendar(false);
  // Test-only SQL simulates the clock moving outside the current window; API edits while active stay forbidden.
  jdbc.update("UPDATE watering_calendar SET windows=CAST(? AS jsonb)",mapper.writeValueAsString(outside.windows()));
  rule.tick();rule.tick();
  assertEquals(1,pump.commands().stream().filter(c->c.action().equals("OFF")).count());
  assertNotNull(rule.state().activeCommand());assertNull(rule.state().cooldownUntil());
  UUID off=jdbc.queryForObject("SELECT stop_command FROM watering_rule",UUID.class);ack(off,"OFF");status("OFF");rule.tick();
  assertNull(rule.state().activeCommand());assertTrue(rule.state().cooldownUntil().isAfter(Instant.now()));
 }
 @Test void calendarEditRejectsActiveOrEnabledRuleAndStaleRevision() throws Exception {
  var input=activeCalendar(true);rule.configure(true);
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->rule.saveCalendar(input));
  rule.configure(false);var saved=rule.saveCalendar(input);assertEquals(2,saved.settings().revision());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->rule.saveCalendar(input));
  start();rule.safeStartup();assertFalse(rule.state().enabled());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->rule.saveCalendar(activeCalendar(false)));
  assertEquals("TIME_WINDOWS",calendar.settings().mode());
 }
 @Test void outsideSamplesCannotTriggerImmediateOnAtStartAndManualHoldRemainsIndependent() throws Exception {
  rule.saveCalendar(activeCalendar(false));
  rule.configure(true);sample(28,Instant.now().minusSeconds(5));rule.tick();
  var inside=activeCalendar(true);
  jdbc.update("UPDATE watering_calendar SET windows=CAST(? AS jsonb)",mapper.writeValueAsString(inside.windows()));
  // The old outside streak was reset; a single newly consumed sample must not replay an earlier trigger.
  jdbc.update("UPDATE watering_rule SET last_sample_at=?,last_sample_boot=?,last_sample_sequence=?",java.sql.Timestamp.from(Instant.now().minusSeconds(3)),sensorBoot,seq-1);
  sample(28,Instant.now());rule.tick();assertEquals(1,rule.state().lowCount());
  verify(transport,never()).publishCommand(any());
  rule.manualCommand(new PumpService.Request("OFF",null));assertFalse(rule.state().enabled());
  rule.tick();assertEquals(0,pump.commands().stream().filter(c->c.action().equals("ON")).count());
 }
 @Test void calendarApiSupportsPreviewAndRejectsInvalidPayloadWithoutPublishing() throws Exception {
  var mvc=org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(new vn.smartfarm.iot.automation.RuleController(rule,calendar)).setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(mapper)).build();
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/automation/watering/calendar"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.settings.mode").value("ANY_TIME"));
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/automation/watering/calendar").contentType("application/json").content(mapper.writeValueAsString(activeCalendar(true))))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.withinWindow").value(true));
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/automation/watering/calendar").contentType("application/json").content("{}"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest());
  assertEquals(2,calendar.settings().revision());verify(transport,never()).publishCommand(any());
 }
 @Test void v13UpgradeDefaultsToExistingAnyTimeAndDoesNotInventOldRunCalendar() {
  String schema="calendar_upgrade_"+UUID.randomUUID().toString().replace("-", "");
  try {
   org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).target("12").load().migrate();
   jdbc.update("INSERT INTO "+schema+".watering_run(result,duration_seconds,settings_revision) VALUES('REPORTED_OFF',20,1)");
   org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).load().migrate();
   assertEquals("ANY_TIME",jdbc.queryForObject("SELECT mode FROM "+schema+".watering_calendar",String.class));
   assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM "+schema+".watering_run",Integer.class));
   assertNull(jdbc.queryForObject("SELECT calendar_revision FROM "+schema+".watering_run",Long.class));
   assertEquals(20,jdbc.queryForObject("SELECT duration_seconds FROM "+schema+".watering_run",Integer.class));
  } finally {jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
 }

 @Test void sourceSamplesOutsideCalendarAreExcludedEvenIfCurrentTimeIsPermitted() throws Exception {
  rule.saveCalendar(activeCalendar(true));rule.configure(true);Instant boundary=Instant.now().minusSeconds(3);
  // Arithmetic is covered by IrrigationCalendarTest; this controlled boundary verifies rule/sample integration.
  try(var gates=mockStatic(vn.smartfarm.iot.automation.IrrigationCalendar.class,call->{
   if(call.getMethod().getName().equals("evaluate")) {
    Instant at=call.getArgument(1);return new vn.smartfarm.iot.automation.IrrigationCalendar.Evaluation(!at.isBefore(boundary),boundary,boundary.plusSeconds(60));
   }
   return call.callRealMethod();
  })) {
   sample(28,boundary.minusSeconds(2));sample(28,boundary.minusSeconds(1));rule.tick();
   assertEquals(0,rule.state().lowCount());assertEquals("WAITING_SCHEDULE_SAMPLE",rule.state().lastResult());
   sample(28,boundary.plusSeconds(1));rule.tick();
   assertEquals(1,rule.state().lowCount());verify(transport,never()).publishCommand(any());
   sample(28,Instant.now());rule.tick();assertNotNull(rule.state().activeCommand());
  }
 }
 @Test void manualOnOutsideCalendarPausesRuleRatherThanBecomingScheduledAutoOn() throws Exception {
  rule.saveCalendar(activeCalendar(false));rule.configure(true);rule.tick();
  assertEquals("OUTSIDE_SCHEDULE",rule.state().lastResult());
  var command=rule.manualCommand(new PumpService.Request("ON",5));
  assertEquals("ON",command.action());assertFalse(rule.state().enabled());assertEquals("MANUAL_HOLD",rule.state().lastResult());
  rule.tick();verify(transport,times(1)).publishCommand(any());
 }

}
