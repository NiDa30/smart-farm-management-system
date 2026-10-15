package vn.smartfarm.iot.irrigation;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterTelemetry;
@RestController
@RequestMapping("/api/v1/irrigation-demo")
public class IrrigationDemoController {
 private final IrrigationDemo service;private final WaterTelemetry json;
 public IrrigationDemoController(IrrigationDemo service,WaterTelemetry json){this.service=service;this.json=json;}
 @GetMapping public IrrigationDemo.Snapshot snapshot(){return service.snapshot();}
 @GetMapping("/commands/{id}") public IrrigationDemo.Command command(@PathVariable java.util.UUID id){return service.lookup(id);}
 @PutMapping("/binding") public IrrigationDemo.Binding bind(@RequestBody byte[] input){try{return service.bind(json.object(input));}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid binding");}}
 @PostMapping("/commands") @ResponseStatus(HttpStatus.ACCEPTED) public IrrigationDemo.Command command(@RequestBody IrrigationDemo.Request r){return service.create(r);}
}
