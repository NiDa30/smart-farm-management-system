package vn.smartfarm.iot.automation;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.*;
@Component
@EnableScheduling
@ConditionalOnProperty(name="smartfarm.mqtt.enabled",havingValue="true")
public class RuleScheduler {
    private final WateringRule rule;
    private final vn.smartfarm.iot.realtime.RealtimeNotifier realtime;
    public RuleScheduler(WateringRule rule,vn.smartfarm.iot.realtime.RealtimeNotifier realtime) { this.rule=rule; this.realtime=realtime; }
    // Browsers are told only when the rule state or run list actually moved, not every 2 s tick.
    private Object snapshot() { var runs=rule.runs(); return java.util.List.of(rule.state(),runs.isEmpty()?"":runs.getFirst()); }
    @Scheduled(fixedDelay=2000,initialDelay=5000) public void tick() {
        Object before=null;
        try { before=snapshot(); } catch (RuntimeException ignored) { }
        try { rule.tick(); if (before==null || !before.equals(snapshot())) realtime.automationChanged(); } catch (RuntimeException error) {
            org.slf4j.LoggerFactory.getLogger(RuleScheduler.class).error("Watering evaluation failed; no ON retry in this tick ({})",error.getClass().getSimpleName());
            rule.manualHold();
            realtime.automationChanged();
        }
    }
}
