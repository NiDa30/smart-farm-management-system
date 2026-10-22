package vn.smartfarm.iot.irrigation;
import java.util.UUID;import org.springframework.http.HttpStatus;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-circuits/{circuit}/session/{session}/cycle")
public class IrrigationCycleController {
 private final IrrigationCycle service;public IrrigationCycleController(IrrigationCycle service){this.service=service;}
 public record Pause(UUID armId) {}
 @GetMapping public IrrigationCycle.View view(@PathVariable String circuit,@PathVariable UUID session){return service.snapshot(circuit,session);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public IrrigationCycle.Cycle arm(@PathVariable String circuit,@PathVariable UUID session,@RequestBody IrrigationCycle.Arm body){return service.arm(circuit,session,body);}
 @PostMapping("/pause") public IrrigationCycle.Cycle pause(@PathVariable String circuit,@PathVariable UUID session,@RequestBody Pause body){return service.pause(circuit,session,body==null?null:body.armId());}
}
