package vn.smartfarm.iot.monitoring;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/monitoring")
public class MonitoringController {
    private final DeviceMonitoring service;
    public MonitoringController(DeviceMonitoring service) {this.service=service;}
    @GetMapping public DeviceMonitoring.Overview overview() {return service.overview();}
}
