package vn.smartfarm.iot.irrigation;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-queue/dispatch")
public class IrrigationQueueDispatchController {
 private final IrrigationQueueDispatch service;
 public IrrigationQueueDispatchController(IrrigationQueueDispatch service){this.service=service;}
 @GetMapping public IrrigationQueueDispatch.View view(){return service.snapshot();}
 public record Stop(java.util.UUID stopId) {}
 @PostMapping("/stop") public IrrigationQueueDispatch.Policy stop(@RequestBody Stop body){return service.stop(body==null?null:body.stopId());}
 @PutMapping public IrrigationQueueDispatch.Policy save(@RequestBody IrrigationQueueDispatch.Change change){return service.save(change);}
}
