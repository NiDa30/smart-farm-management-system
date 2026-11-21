package vn.smartfarm.iot.automation.rules;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/automation/rules")
public class AutomationRulesController {
    public record Toggle(Boolean enabled) {}
    private final AutomationRules rules;
    public AutomationRulesController(AutomationRules rules) { this.rules = rules; }

    @GetMapping public AutomationRules.View list() { return rules.view(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public AutomationRules.Rule create(@RequestBody AutomationRules.SaveRequest request) { return rules.create(request); }
    @GetMapping("/{id}") public AutomationRules.Rule find(@PathVariable long id) { return rules.find(id); }
    @PutMapping("/{id}") public AutomationRules.Rule update(@PathVariable long id, @RequestBody AutomationRules.SaveRequest request) { return rules.update(id, request); }
    @PutMapping("/{id}/enabled") public AutomationRules.Rule enable(@PathVariable long id, @RequestBody Toggle toggle) {
        if (toggle == null || toggle.enabled() == null) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "enabled required");
        return rules.setEnabled(id, toggle.enabled());
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable long id) { rules.delete(id); }
    @GetMapping("/runs") public List<AutomationRules.Run> runs(@RequestParam(required = false) Long ruleId) { return rules.runs(ruleId); }
    @PostMapping("/simulation") public AutomationRules.Simulation simulate(@RequestBody AutomationRules.SimulationRequest request) { return rules.simulate(request); }
}
