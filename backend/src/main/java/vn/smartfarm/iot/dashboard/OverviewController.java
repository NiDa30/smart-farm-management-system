package vn.smartfarm.iot.dashboard;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/dashboard/overview")
public class OverviewController {
    private final IoTOverview service;
    public OverviewController(IoTOverview service) {this.service=service;}
    @GetMapping public IoTOverview.Snapshot overview() {return service.snapshot();}
}
