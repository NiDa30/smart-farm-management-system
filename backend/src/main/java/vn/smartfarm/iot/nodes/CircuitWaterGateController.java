package vn.smartfarm.iot.nodes;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-circuits/{id}/water-gate")
public class CircuitWaterGateController {
 private final CircuitWaterGate gate;public CircuitWaterGateController(CircuitWaterGate gate){this.gate=gate;}
 @GetMapping public CircuitWaterGate.View view(@PathVariable String id){return gate.snapshot(id);}
 @PutMapping public CircuitWaterGate.Policy save(@PathVariable String id,@RequestBody CircuitWaterGate.Request body){return gate.save(id,body);}
}
