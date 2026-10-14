package vn.smartfarm.iot.zones;
import java.net.URI;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import vn.smartfarm.iot.nodes.WaterTelemetry;
@RestController
@RequestMapping("/api/v1/irrigation-zones")
public class ZoneController {
 private final IrrigationZones zones;private final WaterTelemetry json;
 public ZoneController(IrrigationZones zones,WaterTelemetry json){this.zones=zones;this.json=json;}
 @GetMapping public IrrigationZones.Snapshot list(){return zones.snapshot();}
 @GetMapping("/{id}") public IrrigationZones.View find(@PathVariable String id){return zones.find(id);}
 @PostMapping public ResponseEntity<IrrigationZones.View> create(@RequestBody byte[] bytes){var saved=save(null,bytes);return ResponseEntity.created(URI.create("/api/v1/irrigation-zones/"+saved.config().zoneId())).body(saved);}
 @PutMapping("/{id}") public IrrigationZones.View update(@PathVariable String id,@RequestBody byte[] bytes){return save(id,bytes);}
 private IrrigationZones.View save(String id,byte[] bytes){
  try{return id==null?zones.create(json.object(bytes)):zones.update(id,json.object(bytes));}
  catch(IllegalArgumentException error){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid zone declaration");}
  catch(DataIntegrityViolationException error){throw new ResponseStatusException(HttpStatus.CONFLICT,"Zone identity or soil channel already bound; reload registry");}
 }
}
