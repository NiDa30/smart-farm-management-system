package vn.smartfarm.iot.control;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/actuators/PUMP01")
public class PumpController {
    private final PumpService service;
    private final vn.smartfarm.iot.automation.WateringRule rule;
    private final PumpCommandFencing fencing;
    public PumpController(PumpService service, vn.smartfarm.iot.automation.WateringRule rule,PumpCommandFencing fencing) { this.service=service; this.rule=rule;this.fencing=fencing; }
    @GetMapping("/status") public PumpService.Status status() { return service.status(); }
    @GetMapping("/history") public List<PumpService.StateChange> history() { return service.stateHistory(); }
    @GetMapping("/commands") public List<PumpService.Command> commands() { return service.commands(); }
    @PostMapping("/commands") @ResponseStatus(HttpStatus.ACCEPTED)
    public PumpService.Command create(@RequestBody PumpService.Request request) {
        if(fencing.required()&&!"OFF".equals(request.action()))throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT,"Use versioned HTTP requests for manual ON/RESET");
        return rule.manualCommand(request);
    }
    @PostMapping("/requests") @ResponseStatus(HttpStatus.ACCEPTED)
    public PumpCommandFencing.Receipt request(@RequestBody PumpCommandFencing.HttpIntent request){return rule.manualRequest(request);}
    @GetMapping("/requests/{id}") public PumpCommandFencing.Receipt lookup(@PathVariable java.util.UUID id){return fencing.lookupHttp(id);}
}
