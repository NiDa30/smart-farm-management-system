package vn.smartfarm.iot.irrigation;

import java.time.Instant;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/irrigation-session-history")
public class IrrigationSessionHistoryController {
    private final IrrigationSessionHistory service;
    public IrrigationSessionHistoryController(IrrigationSessionHistory service) { this.service = service; }
    @GetMapping
    public IrrigationSessionHistory.Page list(@RequestParam Instant from, @RequestParam Instant to,
        @RequestParam(required=false) String circuitId, @RequestParam(required=false) String condition,
        @RequestParam(defaultValue="50") int limit, @RequestParam(required=false) String cursor) {
        return service.list(from, to, circuitId, condition, limit, cursor);
    }
    @GetMapping("/{circuitId}/{sessionId}/steps")
    public IrrigationSessionHistory.Steps steps(@PathVariable String circuitId, @PathVariable UUID sessionId,
        @RequestParam(defaultValue="50") int limit, @RequestParam(required=false) String cursor) {
        return service.steps(circuitId, sessionId, limit, cursor);
    }
}
