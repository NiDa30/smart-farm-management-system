package vn.smartfarm.iot.control;
import java.time.Instant;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/pump-circuit-history")
public class PumpCircuitHistoryController {
 private final PumpCircuitHistory service;public PumpCircuitHistoryController(PumpCircuitHistory service){this.service=service;}
 @GetMapping public PumpCircuitHistory.Page list(@RequestParam Instant from,@RequestParam Instant to,@RequestParam(required=false)String circuitId,@RequestParam(required=false)String condition,@RequestParam(defaultValue="50")int limit,@RequestParam(required=false)String cursor){return service.list(from,to,circuitId,condition,limit,cursor);}
 @GetMapping("/commands") public PumpCircuitHistory.Commands commands(@RequestParam Instant from,@RequestParam Instant to,@RequestParam(required=false)String circuitId,@RequestParam(defaultValue="50")int limit){return service.commands(from,to,circuitId,limit);}
}
