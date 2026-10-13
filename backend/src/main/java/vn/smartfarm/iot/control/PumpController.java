package vn.smartfarm.iot.control;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/actuators/PUMP01")
public class PumpController {
    private final PumpService service;
    public PumpController(PumpService service) { this.service=service; }
    @GetMapping("/status") public PumpService.Status status() { return service.status(); }
    @GetMapping("/commands") public List<PumpService.Command> commands() { return service.commands(); }
    @PostMapping("/commands") @ResponseStatus(HttpStatus.ACCEPTED)
    public PumpService.Command create(@RequestBody PumpService.Request request) { return service.create(request); }
}
