package vn.smartfarm.iot.automation;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/automation/watering")
public class RuleController {
    public record Settings(Boolean enabled) {}
    private final WateringRule rule;
    private final IrrigationCalendar calendar;
    public RuleController(WateringRule rule,IrrigationCalendar calendar) { this.rule=rule;this.calendar=calendar; }
    @GetMapping public WateringRule.State state() { return rule.state(); }
    @GetMapping("/calendar") public IrrigationCalendar.View calendar() { return calendar.view(); }
    @PutMapping("/calendar") public IrrigationCalendar.View saveCalendar(@RequestBody IrrigationCalendar.Settings input) { return rule.saveCalendar(input); }
    @GetMapping("/settings") public WateringRule.Settings settings() { return rule.settings(); }
    @PutMapping("/settings") public WateringRule.Settings saveSettings(@RequestBody WateringRule.Settings settings) { return rule.saveSettings(settings); }
    @GetMapping("/runs") public List<WateringRule.Run> runs() { return rule.runs(); }
    @PutMapping public WateringRule.State configure(@RequestBody Settings settings) {
        if (settings.enabled()==null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
        return rule.configure(settings.enabled());
    }
}
