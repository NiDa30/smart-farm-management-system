package vn.smartfarm.iot.telemetry;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Enforces telemetry v1 at the MQTT boundary. No coercion of strings into numbers. */
@Component
public class TelemetryValidator {
    private static final Set<String> FIELDS = Set.of("schemaVersion", "deviceId", "bootId", "sequence",
        "timestamp", "temperature", "humidity", "soilMoisture", "uptimeMs");
    private final ObjectMapper mapper;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public TelemetryValidator(ObjectMapper mapper) { this(mapper, Clock.systemUTC()); }
    TelemetryValidator(ObjectMapper mapper, Clock clock) {
        this.mapper = mapper.copy().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
        this.clock = clock;
    }

    public Telemetry parse(byte[] payload) {
        if (payload.length == 0 || payload.length > 4096) throw new IllegalArgumentException("payload size");
        try {
            JsonNode node = mapper.readTree(payload);
            if (!node.isObject()) throw new IllegalArgumentException("object required");
            Set<String> actual = new HashSet<>();
            node.fieldNames().forEachRemaining(actual::add);
            if (!actual.equals(FIELDS)) throw new IllegalArgumentException("unexpected or missing fields");
            if (integer(node, "schemaVersion") != 1 || !"ENV01".equals(text(node, "deviceId")))
                throw new IllegalArgumentException("version or device");
            String boot = text(node, "bootId");
            if (!boot.matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
                throw new IllegalArgumentException("bootId");
            var timestamp = OffsetDateTime.parse(text(node, "timestamp")).toInstant();
            // Historical messages are accepted; future timestamps cannot displace latest readings.
            if (timestamp.isAfter(clock.instant().plusSeconds(60))) throw new IllegalArgumentException("future timestamp");
            return new Telemetry(1, "ENV01", UUID.fromString(boot), integer(node, "sequence"), timestamp,
                number(node, "temperature", -40, 80), number(node, "humidity", 0, 100),
                number(node, "soilMoisture", 0, 100), integer(node, "uptimeMs"));
        } catch (Exception error) {
            // Do not include raw payload or parser excerpts in application logs/errors.
            throw new IllegalArgumentException("Invalid telemetry v1", error);
        }
    }

    private static String text(JsonNode node, String name) {
        if (!node.get(name).isTextual()) throw new IllegalArgumentException(name);
        return node.get(name).textValue();
    }
    private static long integer(JsonNode node, String name) {
        JsonNode value = node.get(name);
        if (!value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() < 0)
            throw new IllegalArgumentException(name);
        return value.longValue();
    }
    private static double number(JsonNode node, String name, double min, double max) {
        JsonNode value = node.get(name);
        double result = value.doubleValue();
        if (!value.isNumber() || !Double.isFinite(result) || result < min || result > max)
            throw new IllegalArgumentException(name);
        return result;
    }
}
