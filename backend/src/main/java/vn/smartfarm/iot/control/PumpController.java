package vn.smartfarm.iot.control;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/actuators/PUMP01")
public class PumpController {
    private final PumpService service;
    private final vn.smartfarm.iot.automation.WateringRule rule;
    public PumpController(PumpService service, vn.smartfarm.iot.automation.WateringRule rule) { this.service=service; this.rule=rule; }
    @GetMapping("/status") public PumpService.Status status() { return service.status(); }
    @GetMapping("/history") public List<PumpService.StateChange> history() { return service.stateHistory(); }
    @GetMapping("/commands") public List<PumpService.Command> commands() { return service.commands(); }
    @PostMapping("/commands") @ResponseStatus(HttpStatus.ACCEPTED)
    public PumpService.Command create(@RequestBody PumpService.Request request) { return rule.manualCommand(request); }
}
