package vn.smartfarm.iot.analytics;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/iot")
public class IotAnalyticsController {
    private final IotAnalytics analytics;
    public IotAnalyticsController(IotAnalytics analytics) { this.analytics = analytics; }

    @GetMapping("/energy") public IotAnalytics.Energy energy(@RequestParam(required = false) Integer days) { return analytics.energy(days); }
    @GetMapping("/analytics") public IotAnalytics.Analytics analytics(@RequestParam(required = false) Integer days) { return analytics.analytics(days); }
    @PutMapping("/actuators/{id}/rated-power")
    public IotAnalytics.ActuatorEnergy power(@PathVariable String id, @RequestBody IotAnalytics.PowerRequest request) { return analytics.setPower(id, request); }
}
