package vn.smartfarm.iot.nodes;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-zones/{id}/weather")
public class ZoneRainGateController {
 private final ZoneRainGate gate;public ZoneRainGateController(ZoneRainGate gate){this.gate=gate;}
 @GetMapping public ZoneRainGate.View view(@PathVariable String id){return gate.snapshot(id);}
 @PutMapping public ZoneRainGate.Policy save(@PathVariable String id,@RequestBody ZoneRainGate.Request body){return gate.save(id,body);}
}
