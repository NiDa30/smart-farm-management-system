package vn.smartfarm.iot.health;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Only runs with a live MQTT subscription; without one, silence carries no evidence. */
@Component
@ConditionalOnProperty(name = "smartfarm.mqtt.enabled", havingValue = "true")
public class HealthScheduler {
    private static final Logger LOG = LoggerFactory.getLogger(HealthScheduler.class);
    private final DeviceHealth health;
    public HealthScheduler(DeviceHealth health) { this.health = health; }

    @Scheduled(fixedDelay = 10000, initialDelay = 15000)
    public void evaluate() {
        try {
            var result = health.evaluate(Instant.now());
            if (result.opened() + result.cleared() > 0)
                LOG.info("DEVICE_HEALTH opened={} cleared={}", result.opened(), result.cleared());
        } catch (RuntimeException error) {
            LOG.error("Device health evaluation failed ({}); episodes unchanged", error.getClass().getSimpleName());
        }
    }
}
