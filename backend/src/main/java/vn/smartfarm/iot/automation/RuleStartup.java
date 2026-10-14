package vn.smartfarm.iot.automation;

import org.springframework.stereotype.Component;

/** Pause persisted automation even when MQTT is disabled during this boot. */
@Component
public class RuleStartup {
    public RuleStartup(WateringRule rule) { rule.safeStartup(); }
}
