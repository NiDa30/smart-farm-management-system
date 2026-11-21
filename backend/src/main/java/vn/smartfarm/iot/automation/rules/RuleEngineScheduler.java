package vn.smartfarm.iot.automation.rules;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Evaluates enabled rules every 5 s, only with a live MQTT session. */
@Component
@ConditionalOnProperty(name = "smartfarm.mqtt.enabled", havingValue = "true")
public class RuleEngineScheduler {
    private final AutomationRules rules;
    public RuleEngineScheduler(AutomationRules rules) { this.rules = rules; }
    @Scheduled(fixedDelay = 5000, initialDelay = 10000)
    public void tick() { rules.tick(); }
}
