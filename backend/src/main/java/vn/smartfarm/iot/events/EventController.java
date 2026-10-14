package vn.smartfarm.iot.events;
import java.time.Instant;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/events")
public class EventController {
    private final EventLog log;
    public EventController(EventLog log) { this.log=log; }
    @GetMapping public EventLog.Page list(@RequestParam(required=false) Instant from,
        @RequestParam(required=false) Instant to,@RequestParam(required=false) String category,
        @RequestParam(required=false) String deviceId,@RequestParam(defaultValue="50") int limit,
        @RequestParam(required=false) String cursor) { return log.list(from,to,category,deviceId,limit,cursor); }
}
