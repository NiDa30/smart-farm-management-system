package vn.smartfarm.iot.irrigation;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataIntegrityViolationException;
import vn.smartfarm.iot.nodes.WaterTelemetry;
@RestController @RequestMapping("/api/v1/irrigation-circuits")
public class IrrigationCircuitController {
 private final IrrigationCircuits service;private final WaterTelemetry json;
 public IrrigationCircuitController(IrrigationCircuits service,WaterTelemetry json){this.service=service;this.json=json;}
 @GetMapping public IrrigationCircuits.Snapshot snapshot(){return service.snapshot();}
 @GetMapping("/{id}") public IrrigationCircuits.Config find(@PathVariable String id){return service.find(id);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public IrrigationCircuits.Config create(@RequestBody byte[] body){return service.create(json.object(body));}
 @PutMapping("/{id}") public IrrigationCircuits.Config update(@PathVariable String id,@RequestBody byte[] body){return service.update(id,json.object(body));}
 @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST) public void invalid(){}
 @ExceptionHandler(DataIntegrityViolationException.class) @ResponseStatus(HttpStatus.CONFLICT) public void conflict(){}
}
