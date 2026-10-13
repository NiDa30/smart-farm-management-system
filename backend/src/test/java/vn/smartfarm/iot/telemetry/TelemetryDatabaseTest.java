package vn.smartfarm.iot.telemetry;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Callable;
import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Runs against real PostgreSQL in an isolated Flyway schema, never truncates production telemetry. */
@SpringBootTest(properties = {
    "spring.datasource.url=${SMARTFARM_TEST_DB_URL}",
    "spring.flyway.schemas=telemetry_test", "spring.flyway.default-schema=telemetry_test",
    "smartfarm.mqtt.enabled=false"
})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "SMARTFARM_TEST_DB_URL", matches = ".+")
class TelemetryDatabaseTest {
    @Autowired TelemetryRepository repository;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @BeforeEach void clearTestSchema() { jdbc.execute("TRUNCATE telemetry_test.telemetry RESTART IDENTITY"); }
    private Telemetry sample(Instant time, long sequence) {
        return new Telemetry(1, "ENV01", UUID.fromString("3e4d1219-4d80-456c-8561-ec0b744f5184"),
            sequence, time, 31.2, 72, 28, 600000);
    }
    @Test
    void concurrentDuplicateDeliveryCreatesOnlyOneReading() throws Exception {
        var sample = sample(Instant.now(), 1);
        try (var executor = Executors.newFixedThreadPool(4)) {
            var results = executor.invokeAll(Collections.nCopies(8, (Callable<Boolean>) () -> repository.insert(sample)));
            int inserted = 0;
            for (var result : results) if (result.get()) inserted++;
            assertEquals(1, inserted);
        }
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM telemetry_test.telemetry", Integer.class));
    }
    @Test
    void sourceTimeOrderingRangeAndApiErrors() throws Exception {
        Instant now = Instant.now().minusSeconds(10);
        assertTrue(repository.insert(sample(now, 2)));
        assertTrue(repository.insert(sample(now.minusSeconds(60), 1))); // arrives late
        assertEquals(2, repository.latest("ENV01").orElseThrow().telemetry().sequence());
        assertEquals(1, repository.history("ENV01", now.minusSeconds(30), now.plusSeconds(1), 10).size());
        mvc.perform(get("/api/v1/devices/ENV01/telemetry/latest"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.telemetry.sequence").value(2));
        mvc.perform(get("/api/v1/devices/ENV01/telemetry").param("limit", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/devices/ENV01/telemetry").param("limit", "1001"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/devices/ENV01/telemetry").param("from", "2026-10-13T00:00:00Z").param("to", "2026-10-12T00:00:00Z"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/devices/OTHER/telemetry/latest"))
            .andExpect(status().isNotFound());
    }
    @Test
    void noLatestReturns404AndEmptyHistory() throws Exception {
        mvc.perform(get("/api/v1/devices/ENV01/telemetry/latest")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/devices/ENV01/telemetry")).andExpect(status().isOk()).andExpect(content().json("[]"));
    }
}
