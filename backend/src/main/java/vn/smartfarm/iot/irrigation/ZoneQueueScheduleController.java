package vn.smartfarm.iot.irrigation;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-zones/{zone}/queue-schedule")
public class ZoneQueueScheduleController {
 private final ZoneQueueSchedule service;
 public ZoneQueueScheduleController(ZoneQueueSchedule service){this.service=service;}
 @GetMapping public ZoneQueueSchedule.View read(@PathVariable String zone){return service.snapshot(zone);}
 @PutMapping public ZoneQueueSchedule.View save(@PathVariable String zone,@RequestBody ZoneQueueSchedule.Save body){return service.save(zone,body);}
}
