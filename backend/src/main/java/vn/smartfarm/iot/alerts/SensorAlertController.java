package vn.smartfarm.iot.alerts;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/alerts")
public class SensorAlertController {
    private final SensorAlerts service;
    public SensorAlertController(SensorAlerts service) { this.service=service; }
    @GetMapping public List<SensorAlerts.Alert> list() { return service.list(); }
}
