package vn.smartfarm.iot.registry;

import java.net.URI;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
public class SensorRegistryController {
    public record NewArea(String id, String name) {}
    public record NewSensor(String deviceId, String name, String areaId) {}
    private final SensorRegistry registry;
    public SensorRegistryController(SensorRegistry registry) { this.registry = registry; }
    @GetMapping("/areas") public List<SensorRegistry.Area> areas() { return registry.areas(); }
    @GetMapping("/sensors") public List<SensorRegistry.Summary> sensors() { return registry.summaries(); }
    @GetMapping("/areas/{id}") public ResponseEntity<SensorRegistry.Area> area(@PathVariable String id) {
        return ResponseEntity.of(registry.areas().stream().filter(area -> area.id().equals(id)).findFirst());
    }
    @GetMapping("/sensors/{id}") public ResponseEntity<SensorRegistry.Sensor> sensor(@PathVariable String id) {
        return ResponseEntity.of(registry.find(id));
    }
    @PostMapping("/areas")
    public ResponseEntity<SensorRegistry.Area> addArea(@RequestBody NewArea input) {
        String id = identifier(input.id());
        String name = name(input.name());
        try { registry.addArea(id, name); }
        catch (DataIntegrityViolationException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Area code or name already exists");
        }
        return ResponseEntity.created(URI.create("/api/v1/areas/" + id)).body(new SensorRegistry.Area(id, name));
    }
    @PostMapping("/sensors")
    public ResponseEntity<SensorRegistry.Sensor> addSensor(@RequestBody NewSensor input) {
        String id = identifier(input.deviceId());
        String name = name(input.name());
        String area = identifier(input.areaId());
        if (!registry.areaExists(area)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown area");
        try { registry.addSensor(id, name, area); }
        catch (DataIntegrityViolationException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sensor code already exists");
        }
        return ResponseEntity.created(URI.create("/api/v1/sensors/" + id))
            .body(new SensorRegistry.Sensor(id, name, area, "ENVIRONMENT"));
    }
    private static String identifier(String value) {
        if (value == null || !value.matches("[A-Z][A-Z0-9_-]{1,31}"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid code");
        return value;
    }
    private static String name(String value) {
        if (value == null || value.strip().isEmpty() || value.strip().length() > 80)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name must contain 1..80 characters");
        return value.strip();
    }
}
