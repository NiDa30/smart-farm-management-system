package vn.smartfarm.iot.automation;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Advances the running zone sequence; only with a live MQTT session (device evidence). */
@Component
@ConditionalOnProperty(name = "smartfarm.mqtt.enabled", havingValue = "true")
public class SequenceScheduler {
    private final IrrigationSequence sequence;
    public SequenceScheduler(IrrigationSequence sequence) { this.sequence = sequence; }
    @Scheduled(fixedDelay = 1000, initialDelay = 5000)
    public void tick() { sequence.tick(); }
}
