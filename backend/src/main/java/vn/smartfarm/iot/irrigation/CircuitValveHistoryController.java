package vn.smartfarm.iot.irrigation;
import java.time.Instant;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/valve-history")
public class CircuitValveHistoryController {
 private final CircuitValveHistory service;public CircuitValveHistoryController(CircuitValveHistory service){this.service=service;}
 @GetMapping public CircuitValveHistory.Page list(@RequestParam Instant from,@RequestParam Instant to,@RequestParam(required=false)String circuitId,@RequestParam(required=false)String valveId,@RequestParam(required=false)String condition,@RequestParam(defaultValue="50")int limit,@RequestParam(required=false)String cursor){return service.list(from,to,circuitId,valveId,condition,limit,cursor);}
}
