package vn.smartfarm.iot.irrigation;
import java.util.UUID;import org.springframework.http.HttpStatus;import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/irrigation-circuits/{circuit}/session/{session}/closure")
public class SessionClosureController {
 private final SessionClosure service;public SessionClosureController(SessionClosure service){this.service=service;}
 public record Pause(UUID armId) {}
 @GetMapping public SessionClosure.View view(@PathVariable String circuit,@PathVariable UUID session){return service.snapshot(circuit,session);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public SessionClosure.Record arm(@PathVariable String circuit,@PathVariable UUID session,@RequestBody SessionClosure.Arm body){return service.arm(circuit,session,body);}
 @PostMapping("/pause") public SessionClosure.Record pause(@PathVariable String circuit,@PathVariable UUID session,@RequestBody Pause body){return service.pause(circuit,session,body==null?null:body.armId());}
}
