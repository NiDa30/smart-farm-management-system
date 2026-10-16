package vn.smartfarm.iot.irrigation;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-queue/requests/{id}/session-handoff")
public class IrrigationQueueHandoffController {
 private final IrrigationQueueHandoff service;
 public IrrigationQueueHandoffController(IrrigationQueueHandoff service){this.service=service;}
 @GetMapping public IrrigationQueueHandoff.View view(@PathVariable UUID id){return service.snapshot(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public IrrigationQueueHandoff.Receipt prepare(@PathVariable UUID id,@RequestBody IrrigationQueueHandoff.Request body){return service.prepare(id,body);}
}
