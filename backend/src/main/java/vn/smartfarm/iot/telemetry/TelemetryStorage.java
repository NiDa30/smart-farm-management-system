package vn.smartfarm.iot.telemetry;

import org.springframework.stereotype.Service;
import vn.smartfarm.iot.registry.SensorRegistry;

@Service
public class TelemetryStorage {
    private final vn.smartfarm.iot.alerts.SensorAlerts alerts;
    private final TelemetryValidator validator;
    private final SensorRegistry registry;
    private final TelemetryRepository repository;
    private final vn.smartfarm.iot.realtime.RealtimeNotifier realtime;
    public TelemetryStorage(TelemetryValidator validator, SensorRegistry registry, TelemetryRepository repository, vn.smartfarm.iot.alerts.SensorAlerts alerts,
                            vn.smartfarm.iot.realtime.RealtimeNotifier realtime) {
        this.alerts=alerts; this.realtime=realtime;
        this.validator = validator; this.registry = registry; this.repository = repository;
    }
    public Telemetry decodeRegistered(String topic, byte[] payload) {
        Telemetry value = validator.parse(payload);
        if (!topic.equals("smartfarm/FARM001/" + value.deviceId() + "/telemetry")
            || registry.find(value.deviceId()).isEmpty())
            throw new IllegalArgumentException("Unknown device or topic identity mismatch");
        return value;
    }
    @org.springframework.transaction.annotation.Transactional
    public boolean save(Telemetry value) {
        boolean inserted=repository.insert(value);
        if (inserted) { alerts.observe(value); realtime.telemetryStored(); }
        return inserted;
    }
}
