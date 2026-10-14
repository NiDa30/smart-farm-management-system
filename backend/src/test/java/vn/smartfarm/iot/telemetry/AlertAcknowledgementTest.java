package vn.smartfarm.iot.telemetry;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.smartfarm.iot.alerts.SensorAlerts;
import vn.smartfarm.iot.events.EventLog;
import vn.smartfarm.iot.dashboard.IoTOverview;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class AlertAcknowledgementTest {
    @Autowired JdbcTemplate jdbc; @Autowired SensorAlerts alerts; @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper; @Autowired EventLog events; @Autowired IoTOverview overview;
    Instant base;long id;
    @BeforeEach void setup() {
        jdbc.execute("TRUNCATE sensor_alert,sensor_alert_state");
        base=Instant.now().minusSeconds(5);
        alerts.observe(sample(0,28));id=alerts.list().getFirst().id();
    }
    Telemetry sample(int seconds,double soil) {return new Telemetry(1,"ENV01",UUID.randomUUID(),seconds,base.plusSeconds(seconds),25,50,soil,0);}
    @Test void apiAcknowledgesWithoutClearingOrReducingActiveCount() throws Exception {
        int commands=jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class);
        mvc.perform(put("/api/v1/alerts/"+id+"/acknowledgement").contentType("application/json").content("{\"note\":\" Checked sensor \"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.acknowledgedAt").isNotEmpty())
            .andExpect(jsonPath("$.acknowledgementNote").value("Checked sensor")).andExpect(jsonPath("$.clearedAt").isEmpty());
        assertEquals(1,overview.snapshot().activeAlertCount());
        assertEquals(commands,jdbc.queryForObject("SELECT COUNT(*) FROM pump_command",Integer.class));
        assertTrue(jdbc.queryForObject("SELECT low_soil FROM sensor_alert_state WHERE device_id='ENV01'",Boolean.class));
    }
    @Test void identicalRetryPreservesFirstNoteAndTimeEvenAfterClear() {
        var first=alerts.acknowledge(id," Checked sensor ");
        var retry=alerts.acknowledge(id,"Checked sensor");assertEquals(first,retry);
        alerts.observe(sample(1,40));
        var after=alerts.acknowledge(id,"Checked sensor");
        assertNotNull(after.clearedAt());assertEquals(first.acknowledgedAt(),after.acknowledgedAt());
        assertEquals(first.acknowledgementNote(),after.acknowledgementNote());
    }
    @Test void anotherTabCannotOverwriteTheFirstAcknowledgement() throws Exception {
        var first=alerts.acknowledge(id,"First note");
        mvc.perform(put("/api/v1/alerts/"+id+"/acknowledgement").contentType("application/json").content("{\"note\":\"Second note\"}"))
            .andExpect(status().isConflict());
        assertEquals(first,alerts.find(id));
    }
    @Test void clearedAlertRejectsFirstAcknowledgementAndMissingIdIs404() throws Exception {
        alerts.observe(sample(1,40));
        mvc.perform(put("/api/v1/alerts/"+id+"/acknowledgement").contentType("application/json").content("{}"))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/alerts/9223372036854775807")).andExpect(status().isNotFound());
        assertNull(alerts.find(id).acknowledgedAt());
    }
    @Test void invalidRequestDoesNotChangeMetadata() throws Exception {
        for(String body:List.of(mapper.writeValueAsString(Map.of("note","a".repeat(501))),"{\"note\":123}","{\"note\":\"ok\",\"clearedAt\":\"now\"}","null"))
            mvc.perform(put("/api/v1/alerts/"+id+"/acknowledgement").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/alerts/0")).andExpect(status().isBadRequest());
        assertNull(alerts.find(id).acknowledgedAt());
    }
    @Test void emptyNoteAllowedAndRecurrenceNeedsItsOwnAcknowledgement() {
        var first=alerts.acknowledge(id,"   ");assertNull(first.acknowledgementNote());assertNotNull(first.acknowledgedAt());
        alerts.observe(sample(1,32));assertNull(alerts.find(id).clearedAt()); // hysteresis unchanged
        alerts.observe(sample(2,40));assertNotNull(alerts.find(id).clearedAt());
        alerts.observe(sample(3,28));
        var next=alerts.list().getFirst();assertNotEquals(id,next.id());assertNull(next.acknowledgedAt());
        assertEquals(first.acknowledgedAt(),alerts.find(id).acknowledgedAt());
    }
    @Test void concurrentRequestsAreIdempotentAndOnlyOneStoredFactAppearsInEventLog() throws Exception {
        CountDownLatch start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            Callable<SensorAlerts.Alert> task=()->{start.await();return alerts.acknowledge(id,"Same note");};
            var one=pool.submit(task);var two=pool.submit(task);start.countDown();
            assertEquals(one.get(5,TimeUnit.SECONDS),two.get(5,TimeUnit.SECONDS));
        }
        var list=events.list(base.minusSeconds(1),Instant.now().plusSeconds(1),"ALERT","ENV01",100,null).items();
        assertEquals(1,list.stream().filter(e->e.type().equals("ALERT_ACKNOWLEDGED")).count());
        var seen=list.stream().filter(e->e.type().equals("ALERT_ACKNOWLEDGED")).findFirst().orElseThrow();
        assertNull(seen.sourceAt());assertEquals(alerts.find(id).acknowledgedAt(),seen.recordedAt());
        assertEquals("ACKNOWLEDGED",seen.state());assertNull(seen.commandId());
    }
    @Test void acknowledgementEventCursorCanPaginateWithoutMissingOpenedEvent() {
        alerts.acknowledge(id,null);
        Instant from=base.minusSeconds(1),to=Instant.now().plusSeconds(1);
        var first=events.list(from,to,"ALERT","ENV01",1,null);
        assertEquals("ALERT_ACKNOWLEDGED",first.items().getFirst().type());assertNotNull(first.nextCursor());
        var second=events.list(from,to,"ALERT","ENV01",1,first.nextCursor());
        assertEquals("ALERT_OPENED",second.items().getFirst().type());assertNull(second.nextCursor());
    }
    @Test void directLookupWorksOutsideLatestHundredAndNewReaderKeepsSavedMetadata() throws Exception {
        alerts.acknowledge(id,"Archived note");alerts.observe(sample(1,40));
        for(int i=0;i<101;i++)jdbc.update("INSERT INTO sensor_alert(device_id,type,opened_at,opened_value,cleared_at,cleared_value) VALUES('ENV01','LOW_SOIL',CURRENT_TIMESTAMP,28,CURRENT_TIMESTAMP,40)");
        assertEquals(100,alerts.list().size());assertTrue(alerts.list().stream().noneMatch(a->a.id()==id));
        mvc.perform(get("/api/v1/alerts/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.acknowledgementNote").value("Archived note"));
        assertNotNull(new SensorAlerts(jdbc).find(id).acknowledgedAt());
    }
    @Test void v12UpgradeKeepsHistoricalIncidentsUnacknowledgedWithoutInventingTimes() {
        String schema="ack_upgrade_"+UUID.randomUUID().toString().replace("-", "");
        try {
            org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).target("11").load().migrate();
            jdbc.update("INSERT INTO "+schema+".sensor_alert(device_id,type,opened_at,opened_value) VALUES('ENV01','LOW_SOIL',CURRENT_TIMESTAMP,28)");
            org.flywaydb.core.Flyway.configure().dataSource(jdbc.getDataSource()).schemas(schema).defaultSchema(schema).load().migrate();
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM "+schema+".sensor_alert WHERE cleared_at IS NULL",Integer.class));
            assertNull(jdbc.queryForObject("SELECT acknowledged_at FROM "+schema+".sensor_alert",java.sql.Timestamp.class));
            assertNull(jdbc.queryForObject("SELECT acknowledgement_note FROM "+schema+".sensor_alert",String.class));
            assertEquals(20,jdbc.queryForObject("SELECT duration_seconds FROM "+schema+".watering_rule",Integer.class));
        } finally {jdbc.execute("DROP SCHEMA IF EXISTS "+schema+" CASCADE");}
    }
}
