package vn.smartfarm.iot.automation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.*;
@Component
@EnableScheduling
@ConditionalOnProperty(name="smartfarm.mqtt.enabled",havingValue="true")
public class RuleScheduler {
    private final WateringRule rule;
    public RuleScheduler(WateringRule rule) { this.rule=rule; }
    @jakarta.annotation.PostConstruct public void startup() { rule.safeStartup(); }
    @Scheduled(fixedDelay=2000,initialDelay=5000) public void tick() {
        try { rule.tick(); } catch (RuntimeException error) {
            org.slf4j.LoggerFactory.getLogger(RuleScheduler.class).error("Watering evaluation failed; no ON retry in this tick ({})",error.getClass().getSimpleName());
            rule.manualHold();
        }
    }
}
