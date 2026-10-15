package vn.smartfarm.iot.telemetry;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.control.*;
import vn.smartfarm.iot.automation.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false","smartfarm.control.enabled=true","smartfarm.control.pump-fencing-enabled=true"})
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class PumpOwnershipTest {
    @Autowired PumpService pump;
    @MockitoSpyBean PumpCommandFencing fencing;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired PlatformTransactionManager manager;
    @Autowired ObjectProvider<CommandTransport> providers;
    @Autowired WateringRule rule;
    @Autowired IrrigationCalendar calendar;
    @Autowired TelemetryRepository telemetry;
    @MockitoBean CommandTransport transport;
    final UUID boot=UUID.fromString("91000000-0000-4000-8000-000000000001");
    final UUID sensor=UUID.fromString("91000000-0000-4000-8000-000000000002");
    long sequence,queue;
    @BeforeEach void setup()throws Exception {
        jdbc.execute("TRUNCATE pump_command,pump_status,pump_state_history,watering_run,watering_rule,telemetry");
        jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
        jdbc.update("UPDATE watering_calendar SET mode='ANY_TIME',windows='[]'::jsonb,revision=1");
        queue=jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_queue_request",Long.class);
        reset(transport);when(transport.controlConnected()).thenReturn(true);sequence=0;report(boot,0,"OFF");
    }
    @AfterEach void queueIsStillPreview(){assertEquals(queue,jdbc.queryForObject("SELECT COUNT(*) FROM irrigation_queue_request",Long.class));}
    void report(UUID b,long ordinal,String state)throws Exception {
        var p=mapper.createObjectNode().put("schemaVersion",1).put("deviceId","PUMP01").put("bootId",b.toString()).put("sequence",++sequence).put("timestamp",Instant.now().toString()).put("connection","ONLINE").put("reportedState",state).put("safetyLockout",false);
        p.putObject("commandFence").put("version",1).put("lastOrdinal",ordinal).put("restartRequired",false);
        pump.receive("smartfarm/FARM001/PUMP01/status",mapper.writeValueAsBytes(p));
    }
    void ack(PumpService.Command c,String state)throws Exception {
        var p=mapper.createObjectNode().put("schemaVersion",1).put("deviceId","PUMP01").put("bootId",boot.toString()).put("sequence",++sequence).put("timestamp",Instant.now().toString()).put("reportedState",state).put("safetyLockout",false).put("commandId",c.commandId().toString()).put("stage","EXECUTED").put("status","SUCCESS").putNull("errorCode");
        p.putObject("commandFence").put("version",1).put("ordinal",rank(c.commandId()));pump.receive("smartfarm/FARM001/PUMP01/ack",mapper.writeValueAsBytes(p));
    }
    long rank(UUID id){return jdbc.queryForObject("SELECT fence_ordinal FROM pump_command WHERE command_id=?",Long.class,id);}
    PumpCommandFencing.HttpIntent input(String action){var c=fencing.view().intent();return new PumpCommandFencing.HttpIntent(UUID.randomUUID(),action,action.equals("ON")?5:null,action.equals("OFF")?null:c.bootId(),c.revision(),c.asOf());}
    PumpService.Command manual(String action){return rule.manualRequest(input(action)).command();}
    PumpService.Command automatic(){jdbc.update("UPDATE watering_rule SET enabled=true");return fencing.createAutomatic(new PumpService.Request("ON",5),null,id->{
        assertEquals(1,jdbc.update("UPDATE watering_rule SET active_command=? WHERE singleton=1 AND enabled AND active_command IS NULL",id));
        jdbc.update("INSERT INTO watering_run(command_id,result) VALUES(?,'COMMAND_PENDING')",id);
    });}
    void settled(){jdbc.update("UPDATE pump_command SET state='TIMED_OUT' WHERE state IN ('PENDING','SENT','PUBLISH_UNCERTAIN')");}
    long count(){return jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Long.class);}
    void sample(double soil,Instant at,long seq){telemetry.insert(new Telemetry(1,"ENV01",sensor,seq,at,25,50,soil,0));}

    @Test void manualClaimAndPauseAreCommittedBeforeTransport()throws Exception {
        jdbc.update("UPDATE watering_rule SET enabled=true");
        doAnswer(call->{var id=UUID.fromString(mapper.readTree((byte[])call.getArgument(0)).path("commandId").asText());assertFalse(rule.state().enabled());assertEquals(id,fencing.view().ownership().holder().commandId());assertEquals("MANUAL",fencing.view().ownership().holder().source());assertTrue(fencing.view().ownership().blocked());return null;}).when(transport).publishCommand(any());
        manual("ON");assertEquals(1,count());
    }
    @Test void automaticClaimTrackingAndCallbackRollbackAreAtomic(){
        jdbc.update("UPDATE watering_rule SET enabled=true");
        assertThrows(RuntimeException.class,()->fencing.createAutomatic(new PumpService.Request("ON",5),null,id->{jdbc.update("UPDATE watering_rule SET active_command=?",id);throw new RuntimeException("rollback");}));
        assertNull(rule.state().activeCommand());assertEquals(0,count());assertEquals(0,fencing.view().ownership().unresolvedCount());
        var c=automatic();assertEquals(c.commandId(),rule.state().activeCommand());assertEquals("AUTOMATION",fencing.view().ownership().holder().source());
    }
    @Test void timeoutAndBackendRestartNeverReleaseOwnership(){
        var c=manual("ON");settled();jdbc.update("UPDATE pump_status SET observed_at=CURRENT_TIMESTAMP-INTERVAL '30 seconds'");
        var restarted=new PumpCommandFencing(jdbc,mapper,providers,manager,true,true);restarted.invalidateHttpOnStartup();rule.safeStartup();
        assertEquals(c.commandId(),restarted.view().ownership().holder().commandId());assertTrue(restarted.view().ownership().blocked());assertThrows(ResponseStatusException.class,()->manual("ON"));
    }
    @Test void offAckAloneCannotTransferOwner()throws Exception {
        var a=manual("ON");ack(a,"ON");var off=manual("OFF");ack(off,"OFF");
        assertTrue(fencing.view().ownership().blocked());assertThrows(ResponseStatusException.class,()->manual("ON"));
        report(boot,rank(off.commandId()),"OFF");assertFalse(fencing.view().ownership().blocked());
    }
    @Test void freshOffCoveringOrdinalClosesClaimOnlyWithNextReservation()throws Exception {
        var a=manual("ON");ack(a,"ON");report(boot,rank(a.commandId()),"OFF");
        assertFalse(fencing.view().ownership().blocked());assertNull(jdbc.queryForObject("SELECT owner_released_at FROM pump_command WHERE command_id=?",Instant.class,a.commandId()));
        var b=manual("ON");assertNotEquals(a.commandId(),b.commandId());assertNotNull(jdbc.queryForObject("SELECT owner_released_at FROM pump_command WHERE command_id=?",java.sql.Timestamp.class,a.commandId()));assertEquals(b.commandId(),fencing.view().ownership().holder().commandId());
    }
    @Test void unseenOfflineOffOrdinalStillBlocksTransfer()throws Exception {
        var a=manual("ON");ack(a,"ON");when(transport.controlConnected()).thenReturn(false);var off=manual("OFF");assertEquals("MQTT_UNAVAILABLE",off.errorCode());
        report(boot,rank(a.commandId()),"OFF");assertTrue(fencing.view().ownership().blocked());when(transport.controlConnected()).thenReturn(true);assertThrows(ResponseStatusException.class,()->manual("ON"));
        var retry=manual("OFF");ack(retry,"OFF");report(boot,rank(retry.commandId()),"OFF");assertFalse(fencing.view().ownership().blocked());manual("ON");
    }
    @Test void newBootOffCanCloseOldBootClaimButStaleStatusCannot()throws Exception {
        manual("ON");settled();UUID next=UUID.randomUUID();report(next,0,"OFF");
        jdbc.update("UPDATE pump_status SET received_at=CURRENT_TIMESTAMP-INTERVAL '30 seconds'");assertTrue(fencing.view().ownership().blocked());
        report(next,0,"OFF");assertFalse(fencing.view().ownership().blocked());assertEquals("SENT",manual("ON").state());
    }
    @Test void uncertainPublishKeepsClaimAndDuplicateNeverTransfersIt()throws Exception {
        doThrow(new RuntimeException("unknown")).when(transport).publishCommand(any());var r=input("ON");var receipt=rule.manualRequest(r);assertEquals("PUBLISH_UNCERTAIN",receipt.command().state());settled();
        assertEquals(receipt.command().commandId(),rule.manualRequest(r).command().commandId());assertTrue(fencing.view().ownership().blocked());verify(transport,times(1)).publishCommand(any());
    }
    @Test void manualOffPausesAutomaticOwnerEvenWhenMqttUnavailable(){
        var a=automatic();long epoch=jdbc.queryForObject("SELECT execution_epoch FROM watering_rule",Long.class);when(transport.controlConnected()).thenReturn(false);assertEquals("FAILED",manual("OFF").state());
        assertFalse(rule.state().enabled());assertEquals(a.commandId(),rule.state().activeCommand());assertTrue(jdbc.queryForObject("SELECT execution_epoch FROM watering_rule",Long.class)>epoch);assertTrue(fencing.view().ownership().blocked());
    }
    @Test void oldAutomaticStopCannotStopNewManualOwner()throws Exception {
        var old=automatic();settled();report(boot,rank(old.commandId()),"OFF");var current=manual("ON");long before=count();
        assertThrows(ResponseStatusException.class,()->fencing.createAutomatic(new PumpService.Request("OFF",null),old.commandId(),id->fail("Stale tracking callback")));
        assertEquals(before,count());assertEquals(current.commandId(),fencing.view().ownership().holder().commandId());
    }
    @Test void automaticStopRecordsItsOwnerAndDoesNotPauseRule(){
        var a=automatic();var off=fencing.createAutomatic(new PumpService.Request("OFF",null),a.commandId(),id->jdbc.update("UPDATE watering_rule SET stop_command=?",id));
        assertEquals(a.commandId(),jdbc.queryForObject("SELECT owner_command_id FROM pump_command WHERE command_id=?",UUID.class,off.commandId()));assertTrue(rule.state().enabled());
    }
    @Test void ruleEnableIsBlockedByManualClaim(){
        sample(45,Instant.now().minusSeconds(1),1);manual("ON");assertThrows(ResponseStatusException.class,()->rule.configure(true));assertFalse(rule.state().enabled());
    }
    @Test void pausedRuleCannotAcquireAutomaticOwnership(){
        assertThrows(ResponseStatusException.class,()->fencing.createAutomatic(new PumpService.Request("ON",5),null,id->fail("Paused rule callback")));assertEquals(0,count());
    }
    @Test void staleRuleDecisionAfterManualOffAndReenableCannotDispatch()throws Exception {
        sample(45,Instant.now().minusSeconds(10),1);rule.configure(true);sample(28,Instant.now().minusSeconds(6),2);sample(28,Instant.now().minusSeconds(2),3);
        var other=new PumpCommandFencing(jdbc,mapper,providers,manager,true,true);other.invalidateHttpOnStartup();
        var otherRule=new WateringRule(jdbc,pump,telemetry,manager,calendar,other);
        doAnswer(call->{var off=other.createHttp(input("OFF"),()->{}).command();settled();report(boot,rank(off.commandId()),"OFF");otherRule.configure(true);return call.callRealMethod();}).when(fencing).createAutomatic(any(),isNull(),any());
        rule.tick();assertTrue(rule.state().enabled());assertNull(rule.state().activeCommand());assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command WHERE action='ON'",Long.class));assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Long.class));
    }
    @Test void manualAndAutomaticRaceProduceOnlyOneOwner()throws Exception {
        jdbc.update("UPDATE watering_rule SET enabled=true");var other=new PumpCommandFencing(jdbc,mapper,providers,manager,true,true);other.invalidateHttpOnStartup();var r=input("ON");var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var a=pool.submit(()->{gate.await();try{return other.createHttp(r,()->{}).command().state();}catch(ResponseStatusException e){return "BLOCKED";}});
            var b=pool.submit(()->{gate.await();try{return fencing.createAutomatic(new PumpService.Request("ON",5),null,id->jdbc.update("UPDATE watering_rule SET active_command=? WHERE enabled=true",id)).state();}catch(ResponseStatusException e){return "BLOCKED";}});
            gate.countDown();var result=List.of(a.get(5,TimeUnit.SECONDS),b.get(5,TimeUnit.SECONDS));assertEquals(1,Collections.frequency(result,"SENT"));assertEquals(1,Collections.frequency(result,"BLOCKED"));
        }
        assertEquals(1,count());assertEquals(1,fencing.view().ownership().unresolvedCount());
    }
    @Test void duplicateReceiptNeverPausesOrChangesOwnershipGeneration(){
        var r=input("ON");rule.manualRequest(r);long epoch=jdbc.queryForObject("SELECT execution_epoch FROM watering_rule",Long.class);rule.manualRequest(r);
        assertEquals(epoch,jdbc.queryForObject("SELECT execution_epoch FROM watering_rule",Long.class));assertEquals(1,count());assertEquals(r.requestId(),fencing.view().ownership().holder().commandId());
    }
    @Test void legacyProfileDoesNotAdvertiseOwnership(){assertNull(new PumpCommandFencing(jdbc,mapper,providers,manager,false,false).view().ownership());}
    @Test void synchronousAckSeesAutomaticTrackingCommitted()throws Exception {
        doAnswer(call->{var id=UUID.fromString(mapper.readTree((byte[])call.getArgument(0)).path("commandId").asText());assertEquals(id,rule.state().activeCommand());assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run WHERE command_id=?",Long.class,id));return null;}).when(transport).publishCommand(any());
        automatic();assertEquals(1,count());
    }
    @Test void realRuleUsesAutomaticClaimAndOwnerQualifiedStop()throws Exception {
        sample(45,Instant.now().minusSeconds(10),1);rule.configure(true);
        sample(28,Instant.now().minusSeconds(6),2);sample(28,Instant.now().minusSeconds(2),3);rule.tick();
        UUID id=rule.state().activeCommand();assertNotNull(id);assertEquals("AUTOMATION",fencing.view().ownership().holder().source());
        var on=pump.commands().getFirst();ack(on,"ON");report(boot,rank(id),"ON");sample(40,Instant.now(),4);rule.tick();
        UUID stop=jdbc.queryForObject("SELECT stop_command FROM watering_rule",UUID.class);assertNotNull(stop);
        assertEquals(id,jdbc.queryForObject("SELECT owner_command_id FROM pump_command WHERE command_id=?",UUID.class,stop));
        var off=pump.commands().stream().filter(c->c.commandId().equals(stop)).findFirst().orElseThrow();ack(off,"OFF");report(boot,rank(stop),"OFF");rule.tick();
        assertNull(rule.state().activeCommand());assertEquals("REPORTED_OFF",rule.state().lastResult());assertFalse(fencing.view().ownership().blocked());
    }
    @Test void v23UpgradeRetainsExistingClaimRuleAndRun() {
        String schema="pump_owner_upgrade_"+UUID.randomUUID().toString().replace("-","");UUID id=UUID.randomUUID();
        try {
            org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).target("23").load().migrate();
            jdbc.update("INSERT INTO "+schema+".pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,fence_ordinal,target_boot_id) VALUES(?,'ON',5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP+INTERVAL '10 seconds','PUBLISH_UNCERTAIN',1,?)",id,boot);
            jdbc.update("UPDATE "+schema+".watering_rule SET enabled=true,active_command=?",id);jdbc.update("INSERT INTO "+schema+".watering_run(command_id,result) VALUES(?,'COMMAND_PENDING')",id);
            org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).load().migrate();
            assertEquals(id,jdbc.queryForObject("SELECT active_command FROM "+schema+".watering_rule",UUID.class));assertEquals(1,jdbc.queryForObject("SELECT execution_epoch FROM "+schema+".watering_rule",Long.class));
            assertEquals("LEGACY",jdbc.queryForObject("SELECT control_source FROM "+schema+".pump_command",String.class));assertNull(jdbc.queryForObject("SELECT owner_released_at FROM "+schema+".pump_command",java.sql.Timestamp.class));
            assertEquals("PUBLISH_UNCERTAIN",jdbc.queryForObject("SELECT state FROM "+schema+".pump_command",String.class));assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM "+schema+".watering_run WHERE command_id=?",Long.class,id));
        } finally { jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE"); }
    }
    @Test void ownerOutsideLastTwentyStillBlocksAcquisition()throws Exception {
        var first=manual("ON");for(int i=0;i<22;i++)manual("OFF");settled();
        assertEquals(20,pump.commands().size());assertEquals(first.commandId(),fencing.view().ownership().holder().commandId());
        assertThrows(ResponseStatusException.class,()->manual("ON"));
    }
    @Test void sampleBecomingWetBeforeReservationRollsBackClaim()throws Exception {
        sample(45,Instant.now().minusSeconds(10),1);rule.configure(true);sample(28,Instant.now().minusSeconds(6),2);sample(28,Instant.now().minusSeconds(2),3);
        doAnswer(call->{sample(40,Instant.now(),4);return call.callRealMethod();}).when(fencing).createAutomatic(any(),isNull(),any());
        rule.tick();assertEquals(0,count());assertNull(rule.state().activeCommand());assertFalse(rule.state().enabled());assertEquals(0,fencing.view().ownership().unresolvedCount());
    }
    @Test void upgradedLegacyAutomaticRunCanStillRequestStop(){
        var old=automatic();jdbc.update("UPDATE pump_command SET control_source='LEGACY' WHERE command_id=?",old.commandId());rule.safeStartup();
        var off=fencing.createAutomatic(new PumpService.Request("OFF",null),old.commandId(),id->{});
        assertEquals(old.commandId(),jdbc.queryForObject("SELECT owner_command_id FROM pump_command WHERE command_id=?",UUID.class,off.commandId()));assertFalse(rule.state().enabled());
    }
    @Test void legacyLabelWithoutRunLedgerCannotImpersonateAutomaticOwner(){
        var old=manual("ON");jdbc.update("UPDATE pump_command SET control_source='LEGACY' WHERE command_id=?",old.commandId());jdbc.update("UPDATE watering_rule SET active_command=?",old.commandId());
        assertThrows(ResponseStatusException.class,()->fencing.createAutomatic(new PumpService.Request("OFF",null),old.commandId(),id->fail("No automatic provenance")));assertEquals(1,count());
    }
}
