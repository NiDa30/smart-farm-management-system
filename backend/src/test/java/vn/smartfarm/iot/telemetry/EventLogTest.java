package vn.smartfarm.iot.telemetry;

import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import vn.smartfarm.iot.events.EventLog;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${SMARTFARM_TEST_DB_URL}","spring.flyway.schemas=telemetry_test","spring.flyway.default-schema=telemetry_test","smartfarm.mqtt.enabled=false"})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named="SMARTFARM_TEST_DB_URL",matches=".+")
class EventLogTest {
    @Autowired EventLog log;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    final UUID command=UUID.fromString("ab6cfc5e-18ff-4a01-852b-03604df6b52f");
    Instant start,end,at;
    @BeforeEach void setup() {
        // Dedicated cloud test container/schema only; never application/demo tables.
        jdbc.execute("TRUNCATE watering_run,watering_rule,pump_command,pump_status,pump_state_history,sensor_alert");
        jdbc.update("INSERT INTO watering_rule(singleton) VALUES(1)");
        end=Instant.now();start=end.minusSeconds(3600);at=end.minusSeconds(10).truncatedTo(java.time.temporal.ChronoUnit.MILLIS);
        var time=Timestamp.from(at);
        jdbc.update("INSERT INTO sensor_alert(device_id,type,opened_at,opened_value,cleared_at,cleared_value) VALUES('ENV01','LOW_SOIL',?,28,?,40)",time,time);
        jdbc.update("INSERT INTO pump_command(command_id,action,duration_seconds,issued_at,expires_at,state,reported_state,acknowledged_at) VALUES(?,'ON',20,?,?,'EXECUTED','ON',?)",command,time,Timestamp.from(at.plusSeconds(10)),time);
        jdbc.update("INSERT INTO watering_run(command_id,started_at,result) VALUES(?,?,'REPORTED_OFF')",command,time);
        jdbc.update("INSERT INTO pump_state_history(boot_id,sequence,observed_at,received_at,reported_state,safety_lockout,change_type,state_reason) VALUES(?,5,?,?,'OFF',false,'STATE_CHANGED','TIMER_EXPIRED')",UUID.randomUUID(),time,time);
    }
    @Test void combinesSourcesWithOnlyRealTimesAndCorrelations() {
        var events=log.list(start,end,null,null,50,null).items();
        assertEquals(6,events.size());
        var ack=events.stream().filter(e->e.type().equals("COMMAND_ACK")).findFirst().orElseThrow();
        assertNull(ack.sourceAt());assertEquals(at,ack.recordedAt());assertEquals(command,ack.commandId());assertNotNull(ack.runId());
        var alert=events.stream().filter(e->e.type().equals("ALERT_OPENED")).findFirst().orElseThrow();
        assertEquals(at,alert.sourceAt());assertNull(alert.recordedAt());assertNull(alert.commandId());
        var device=events.stream().filter(e->e.category().equals("DEVICE")).findFirst().orElseThrow();
        assertEquals("TIMER_EXPIRED",device.reason());assertNull(device.commandId());assertNull(device.runId());
    }
    @Test void cursorPaginatesEqualTimesWithoutDuplicatesOrMissingRecords() {
        Set<String> ids=new HashSet<>();String cursor=null;int pages=0;
        do {
            var page=log.list(start,end,null,null,2,cursor);
            for(var e:page.items()) assertTrue(ids.add(e.id()));
            cursor=page.nextCursor();pages++;
        } while(cursor!=null && pages<10);
        assertEquals(6,ids.size());assertEquals(3,pages);assertNull(cursor);
    }
    @Test void filtersCategoryDeviceAndHalfOpenRange() {
        assertEquals(2,log.list(start,end,"ALERT","ENV01",50,null).items().size());
        assertTrue(log.list(start,end,"RULE","ENV01",50,null).items().isEmpty());
        assertTrue(log.list(start,at,null,null,50,null).items().isEmpty());
        assertEquals(6,log.list(at,end,null,null,50,null).items().size());
        assertTrue(log.list(start,end,null,"ENV99",50,null).items().isEmpty());
    }
    @Test void endpointValidatesFiltersAndMalformedCursor() throws Exception {
        mvc.perform(get("/api/v1/events").param("category","ALERT").param("deviceId","ENV01"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2));
        for(String cursor:List.of("not-base64!",Base64.getUrlEncoder().encodeToString("bad-date\ndevice:1".getBytes())))
            mvc.perform(get("/api/v1/events").param("from",start.toString()).param("to",end.toString()).param("cursor",cursor)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/events").param("limit","101")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/events").param("category","FAKE")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/events").param("deviceId","ENV01' OR 1=1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/events").param("from",end.toString()).param("to",start.toString())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/events").param("from",end.minusSeconds(32*86400).toString()).param("to",end.toString())).andExpect(status().isBadRequest());
    }
    @Test void readingNeverExpiresCommandsOrChangesRule() throws Exception {
        jdbc.update("UPDATE pump_command SET state='SENT',acknowledged_at=NULL,issued_at=?,expires_at=?",Timestamp.from(end.minusSeconds(100)),Timestamp.from(end.minusSeconds(90)));
        jdbc.update("UPDATE watering_rule SET enabled=true,last_result='WAITING_SAMPLES'");
        mvc.perform(get("/api/v1/events")).andExpect(status().isOk());
        assertEquals("SENT",jdbc.queryForObject("SELECT state FROM pump_command",String.class));
        assertEquals(Boolean.TRUE,jdbc.queryForObject("SELECT enabled FROM watering_rule",Boolean.class));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM watering_run",Integer.class));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM pump_state_history",Integer.class));
    }
}
