package vn.smartfarm.iot.nodes;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-circuits/{id}/flow-guard")
public class CircuitFlowGuardController {
 private final CircuitFlowGuard guard;
 public CircuitFlowGuardController(CircuitFlowGuard guard){this.guard=guard;}
 @GetMapping public CircuitFlowGuard.View view(@PathVariable String id){return guard.snapshot(id);}
 @PutMapping public CircuitFlowGuard.Policy save(@PathVariable String id,@RequestBody CircuitFlowGuard.Request body){return guard.save(id,body);}
}
