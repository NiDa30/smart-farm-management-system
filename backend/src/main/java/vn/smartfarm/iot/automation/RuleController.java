package vn.smartfarm.iot.automation;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/automation/watering")
public class RuleController {
    public record Settings(Boolean enabled) {}
    private final WateringRule rule;
    private final IrrigationCalendar calendar;
    private final vn.smartfarm.iot.realtime.RealtimeNotifier realtime;
    private final RuleSimulation simulation;
    public RuleController(WateringRule rule,IrrigationCalendar calendar,vn.smartfarm.iot.realtime.RealtimeNotifier realtime,RuleSimulation simulation) { this.rule=rule;this.calendar=calendar;this.realtime=realtime;this.simulation=simulation; }
    @GetMapping public WateringRule.State state() { return rule.state(); }
    @GetMapping("/calendar") public IrrigationCalendar.View calendar() { return calendar.view(); }
    @PutMapping("/calendar") public IrrigationCalendar.View saveCalendar(@RequestBody IrrigationCalendar.Settings input) { var saved=rule.saveCalendar(input); realtime.automationChanged(); return saved; }
    @GetMapping("/settings") public WateringRule.Settings settings() { return rule.settings(); }
    @PutMapping("/settings") public WateringRule.Settings saveSettings(@RequestBody WateringRule.Settings settings) { var saved=rule.saveSettings(settings); realtime.automationChanged(); return saved; }
    @GetMapping("/runs") public List<WateringRule.Run> runs() { return rule.runs(); }
    @GetMapping("/guards") public RuleGuards.Guards guards() { return rule.guards(); }
    @PutMapping("/guards") public RuleGuards.Guards saveGuards(@RequestBody RuleGuards.Guards guards) {
        if (guards==null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
        var saved=rule.saveGuards(guards); realtime.automationChanged(); return saved;
    }
    // Read-only replay of stored telemetry; never dispatches a command.
    @PostMapping("/simulation") public RuleSimulator.Result simulate(@RequestBody(required=false) RuleSimulation.Request request) { return simulation.simulate(request); }
    @PutMapping public WateringRule.State configure(@RequestBody Settings settings) {
        if (settings.enabled()==null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
        var state=rule.configure(settings.enabled());
        realtime.automationChanged();
        return state;
    }
}
