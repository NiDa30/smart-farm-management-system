package vn.smartfarm.iot.irrigation;
import java.util.UUID;import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/v1/irrigation-circuits/{id}/session")
public class IrrigationSessionController {
 private final IrrigationSession service;public IrrigationSessionController(IrrigationSession service){this.service=service;}
 @GetMapping public IrrigationSession.View view(@PathVariable String id){return service.snapshot(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public IrrigationSession.Run start(@PathVariable String id,@RequestBody IrrigationSession.Start body){return service.start(id,body);}
 @GetMapping("/{session}") public IrrigationSession.Run find(@PathVariable String id,@PathVariable UUID session){return service.find(id,session);}
 @PostMapping("/{session}/actions") @ResponseStatus(HttpStatus.ACCEPTED) public IrrigationSession.Receipt act(@PathVariable String id,@PathVariable UUID session,@RequestBody IrrigationSession.Action body){return service.act(id,session,body);}
 @GetMapping("/actions/{request}") public IrrigationSession.Operation lookup(@PathVariable String id,@PathVariable UUID request){return service.operation(id,request);}
}
