package vn.smartfarm.iot.telemetry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TelemetryValidatorTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final TelemetryValidator validator = new TelemetryValidator(mapper,
        Clock.fixed(Instant.parse("2026-10-13T09:00:00Z"), ZoneOffset.UTC));
    private static final String SAMPLE = """
        {"schemaVersion":1,"deviceId":"ENV01","bootId":"3e4d1219-4d80-456c-8561-ec0b744f5184",
        "sequence":120,"timestamp":"2026-10-13T08:00:00Z","temperature":31.2,"humidity":72,
        "soilMoisture":28,"uptimeMs":600000}
        """;
    @Test
    void validValuesAndOffsetTimestamp() throws Exception {
        var value = validator.parse(SAMPLE.getBytes(StandardCharsets.UTF_8));
        assertEquals(120, value.sequence());
        assertEquals(31.2, value.temperature());
        ObjectNode node = (ObjectNode) mapper.readTree(SAMPLE);
        node.put("timestamp", "2026-10-13T15:00:00+07:00");
        assertEquals(value.timestamp(), validator.parse(mapper.writeValueAsBytes(node)).timestamp());
    }
    @Test
    void rejectsCoercionRangesFieldsAndFutureTime() throws Exception {
        for (String name : new String[]{"temperature", "humidity", "soilMoisture", "sequence", "uptimeMs", "schemaVersion"}) {
            ObjectNode node = (ObjectNode) mapper.readTree(SAMPLE);
            node.put(name, "1");
            assertThrows(IllegalArgumentException.class, () -> validator.parse(mapper.writeValueAsBytes(node)), name);
        }
        for (String name : new String[]{"temperature", "humidity", "soilMoisture", "sequence", "uptimeMs"}) {
            ObjectNode node = (ObjectNode) mapper.readTree(SAMPLE);
            node.put(name, -100);
            assertThrows(IllegalArgumentException.class, () -> validator.parse(mapper.writeValueAsBytes(node)), name);
        }
        ObjectNode future = (ObjectNode) mapper.readTree(SAMPLE);
        future.put("timestamp", "2026-10-13T10:00:00Z");
        assertThrows(IllegalArgumentException.class, () -> validator.parse(mapper.writeValueAsBytes(future)));
        ObjectNode unknown = (ObjectNode) mapper.readTree(SAMPLE);
        unknown.put("other", 1);
        assertThrows(IllegalArgumentException.class, () -> validator.parse(mapper.writeValueAsBytes(unknown)));
        ObjectNode missing = (ObjectNode) mapper.readTree(SAMPLE);
        missing.remove("soilMoisture");
        assertThrows(IllegalArgumentException.class, () -> validator.parse(mapper.writeValueAsBytes(missing)));
    }
    @Test
    void rejectsDuplicateKeysTrailingObjectsAndOversizedPayloads() {
        assertThrows(IllegalArgumentException.class, () -> validator.parse(
            SAMPLE.replace("\"sequence\":120", "\"sequence\":120,\"sequence\":121").getBytes(StandardCharsets.UTF_8)));
        assertThrows(IllegalArgumentException.class, () -> validator.parse((SAMPLE + "{}").getBytes(StandardCharsets.UTF_8)));
        assertThrows(IllegalArgumentException.class, () -> validator.parse(new byte[4097]));
    }
}
