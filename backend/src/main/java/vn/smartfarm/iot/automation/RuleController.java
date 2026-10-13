package vn.smartfarm.iot.automation;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/automation/watering")
public class RuleController {
    public record Settings(Boolean enabled) {}
    private final WateringRule rule;
    public RuleController(WateringRule rule) { this.rule=rule; }
    @GetMapping public WateringRule.State state() { return rule.state(); }
    @GetMapping("/runs") public List<WateringRule.Run> runs() { return rule.runs(); }
    @PutMapping public WateringRule.State configure(@RequestBody Settings settings) {
        if (settings.enabled()==null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
        return rule.configure(settings.enabled());
    }
}
