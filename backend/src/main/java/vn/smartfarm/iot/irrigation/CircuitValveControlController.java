package vn.smartfarm.iot.irrigation;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/irrigation-circuits/{id}/control")
public class CircuitValveControlController {
 private final CircuitValveControl control;
 public CircuitValveControlController(CircuitValveControl control){this.control=control;}
 @GetMapping public CircuitValveControl.Snapshot snapshot(@PathVariable String id){return control.snapshot(id);}
 @GetMapping("/commands/{key}") public CircuitValveControl.Command lookup(@PathVariable String id,@PathVariable UUID key){return control.lookup(id,key);}
 @PostMapping("/commands") @ResponseStatus(HttpStatus.ACCEPTED)
 public CircuitValveControl.Command create(@PathVariable String id,@RequestBody CircuitValveControl.Request r){return control.create(id,r);}
}
