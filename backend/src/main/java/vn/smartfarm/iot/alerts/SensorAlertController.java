package vn.smartfarm.iot.alerts;
import java.util.List;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/alerts")
public class SensorAlertController {
    private final SensorAlerts service;
    public SensorAlertController(SensorAlerts service) { this.service=service; }
    public record AcknowledgementRequest(JsonNode note) {}
    @GetMapping("/{id}") public SensorAlerts.Alert find(@PathVariable long id) { return service.find(id); }
    @PutMapping("/{id}/acknowledgement") public SensorAlerts.Alert acknowledge(@PathVariable long id,@RequestBody AcknowledgementRequest request) {
        if(request==null)throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST);
        // Jackson otherwise coerces numeric JSON values into String even with scalar coercion disabled.
        JsonNode note=request.note();
        if(note!=null && !note.isNull() && !note.isTextual())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Text note required");
        return service.acknowledge(id,note==null || note.isNull()?null:note.textValue());
    }
    @GetMapping public List<SensorAlerts.Alert> list() { return service.list(); }
}
