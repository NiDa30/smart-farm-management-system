package vn.smartfarm.iot.control;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.smartfarm.iot.automation.IrrigationSequence;

@RestController
public class ActuatorController {
    private final ActuatorService service;
    private final IrrigationSequence sequence;
    public ActuatorController(ActuatorService service, IrrigationSequence sequence) { this.service = service; this.sequence = sequence; }

    @GetMapping("/api/v1/actuators") public ActuatorService.Overview overview() { return service.overview(); }
    @GetMapping("/api/v1/actuators/v3/commands") public List<ActuatorService.Command> commands() { return service.commands(null); }
    @PostMapping("/api/v1/actuators/v3/{id}/commands") @ResponseStatus(HttpStatus.ACCEPTED)
    public ActuatorService.Command create(@PathVariable String id, @RequestBody ActuatorService.Request request) {
        if (!id.matches("[A-Z0-9]{2,16}")) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown v3 actuator");
        return service.create(id, request);
    }

    @GetMapping("/api/v1/automation/zone-sequence") public IrrigationSequence.View zoneSequence() { return sequence.view(); }
    @PostMapping("/api/v1/automation/zone-sequence") @ResponseStatus(HttpStatus.ACCEPTED)
    public IrrigationSequence.View start(@RequestBody IrrigationSequence.StartRequest request) { return sequence.start(request); }
    @PostMapping("/api/v1/automation/zone-sequence/cancel") public IrrigationSequence.View cancel() { return sequence.cancel(); }
}
