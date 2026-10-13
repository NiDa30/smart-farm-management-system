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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    @Autowired TelemetryStorage storage;
    @Autowired javax.sql.DataSource dataSource;
    @BeforeEach void clearTestSchema() {
        jdbc.execute("TRUNCATE telemetry_test.telemetry RESTART IDENTITY");
        jdbc.execute("DELETE FROM telemetry_test.sensor_device WHERE device_id <> 'ENV01'");
        jdbc.execute("DELETE FROM telemetry_test.sensor_area WHERE id <> 'AREA001'");
    }
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
    @Test
    void registerSensorAndKeepReadingsSeparatedByDevice() throws Exception {
        byte[] payload = """
            {"schemaVersion":1,"deviceId":"ENV02","bootId":"3e4d1219-4d80-456c-8561-ec0b744f5184",
             "sequence":1,"timestamp":"2026-10-13T08:00:00Z","temperature":28,"humidity":65,
             "soilMoisture":30,"uptimeMs":5000}
            """.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        assertThrows(IllegalArgumentException.class, () -> storage.decodeRegistered("smartfarm/FARM001/ENV02/telemetry", payload));
        mvc.perform(post("/api/v1/areas").contentType("application/json").content("{\"id\":\"AREA002\",\"name\":\"Khu B\"}"))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/sensors").contentType("application/json").content("{\"deviceId\":\"ENV02\",\"name\":\"Sensor B\",\"areaId\":\"AREA002\"}"))
            .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/sensors/ENV02")).andExpect(status().isOk()).andExpect(jsonPath("$.areaId").value("AREA002"));
        mvc.perform(get("/api/v1/areas/AREA002")).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Khu B"));
        mvc.perform(get("/api/v1/sensors")).andExpect(jsonPath("$[1].latest").isEmpty());
        var second = storage.decodeRegistered("smartfarm/FARM001/ENV02/telemetry", payload);
        assertTrue(storage.save(second));
        assertFalse(storage.save(second));
        assertTrue(repository.insert(sample(Instant.parse("2026-10-13T08:00:00Z"), 1)));
        mvc.perform(get("/api/v1/devices/ENV02/telemetry/latest"))
            .andExpect(jsonPath("$.telemetry.deviceId").value("ENV02")).andExpect(jsonPath("$.telemetry.temperature").value(28));
        mvc.perform(get("/api/v1/devices/ENV01/telemetry/latest")).andExpect(jsonPath("$.telemetry.temperature").value(31.2));
        mvc.perform(get("/api/v1/sensors")).andExpect(jsonPath("$[1].areaId").value("AREA002"))
            .andExpect(jsonPath("$[1].latest.telemetry.deviceId").value("ENV02"));
        assertThrows(IllegalArgumentException.class, () -> storage.decodeRegistered("smartfarm/FARM001/ENV01/telemetry", payload));
        assertThrows(IllegalArgumentException.class, () -> storage.decodeRegistered("smartfarm/FARM002/ENV02/telemetry", payload));
    }
    @Test
    void registryValidationRejectsDuplicatesAndUnknownAreas() throws Exception {
        mvc.perform(post("/api/v1/sensors").contentType("application/json").content("{\"deviceId\":\"ENV01\",\"name\":\"Duplicate\",\"areaId\":\"AREA001\"}"))
            .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/sensors").contentType("application/json").content("{\"deviceId\":\"ENV02\",\"name\":\"New\",\"areaId\":\"MISSING\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/areas").contentType("application/json").content("{\"id\":\"bad/id\",\"name\":\"New\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/areas").contentType("application/json").content("{\"id\":\"AREA002\",\"name\":\"   \"}"))
            .andExpect(status().isBadRequest());
    }
    @Test
    void registryMigrationPreservesExistingV1Telemetry() {
        String schema = "upgrade_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        try {
            org.flywaydb.core.Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                .target("1").load().migrate();
            jdbc.update("INSERT INTO " + schema + ".telemetry(farm_id,device_id,schema_version,boot_id,sequence,observed_at,temperature,humidity,soil_moisture,uptime_ms) "
                + "VALUES('FARM001','ENV01',1,?::uuid,1,CURRENT_TIMESTAMP,24,40,100,5000)", UUID.randomUUID().toString());
            org.flywaydb.core.Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                .load().migrate();
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM " + schema + ".telemetry", Integer.class));
            assertEquals(24.0, jdbc.queryForObject("SELECT temperature FROM " + schema + ".telemetry", Double.class));
            assertEquals("AREA001", jdbc.queryForObject("SELECT area_id FROM " + schema + ".sensor_device WHERE device_id='ENV01'", String.class));
        } finally {
            // Only the unique schema created by this test, never public/application data.
            jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
