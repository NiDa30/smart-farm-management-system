package vn.smartfarm.iot.telemetry;

import org.springframework.stereotype.Service;
import vn.smartfarm.iot.registry.SensorRegistry;

@Service
public class TelemetryStorage {
    private final TelemetryValidator validator;
    private final SensorRegistry registry;
    private final TelemetryRepository repository;
    public TelemetryStorage(TelemetryValidator validator, SensorRegistry registry, TelemetryRepository repository) {
        this.validator = validator; this.registry = registry; this.repository = repository;
    }
    public Telemetry decodeRegistered(String topic, byte[] payload) {
        Telemetry value = validator.parse(payload);
        if (!topic.equals("smartfarm/FARM001/" + value.deviceId() + "/telemetry")
            || registry.find(value.deviceId()).isEmpty())
            throw new IllegalArgumentException("Unknown device or topic identity mismatch");
        return value;
    }
    public boolean save(Telemetry value) { return repository.insert(value); }
}
