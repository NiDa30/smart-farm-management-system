package vn.smartfarm.iot.irrigation;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.smartfarm.iot.nodes.WaterTelemetry;
@RestController @RequestMapping("/api/v1/valve-alerts")
public class CircuitValveAlertController {
 private final CircuitValveAlerts service;private final WaterTelemetry json;
 public CircuitValveAlertController(CircuitValveAlerts service,WaterTelemetry json){this.service=service;this.json=json;}
 @GetMapping public List<CircuitValveAlerts.Alert> list(){return service.list();}
 @GetMapping("/{id}") public CircuitValveAlerts.Alert find(@PathVariable long id){return service.find(id);}
 @PutMapping("/{id}/acknowledgement") public CircuitValveAlerts.Alert acknowledge(@PathVariable long id,@RequestBody byte[] bytes){JsonNode b=json.object(bytes);WaterTelemetry.fields(b,Set.of("note"));if(!b.get("note").isNull()&&!b.get("note").isTextual())throw new IllegalArgumentException("Text/null note required");return service.acknowledge(id,b.get("note").isNull()?null:b.get("note").textValue());}
 @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST) public void invalid(){}
}
