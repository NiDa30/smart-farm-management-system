package vn.smartfarm.iot.health;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class HealthController {
    private final DeviceHealth alerts;
    private final DeviceStatistics statistics;
    public HealthController(DeviceHealth alerts, DeviceStatistics statistics) { this.alerts = alerts; this.statistics = statistics; }

    @GetMapping("/api/v1/health-alerts") public List<DeviceHealth.Alert> list() { return alerts.list(); }
    @GetMapping("/api/v1/health-alerts/{id}") public DeviceHealth.Alert find(@PathVariable long id) { return alerts.find(id); }
    @PutMapping("/api/v1/health-alerts/{id}/acknowledgement")
    public DeviceHealth.Alert acknowledge(@PathVariable long id, @RequestBody JsonNode body) {
        if (body == null || !body.isObject() || body.size() != 1 || !body.has("note") || !(body.get("note").isNull() || body.get("note").isTextual()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only a text/null note is accepted");
        return alerts.acknowledge(id, body.get("note").isNull() ? null : body.get("note").textValue());
    }
    @GetMapping("/api/v1/health-alerts/settings") public DeviceHealth.Settings settings() { return alerts.settings(); }

    @GetMapping("/api/v1/monitoring/statistics")
    public DeviceStatistics.Report statistics(@RequestParam(defaultValue = "1") int hours) {
        if (hours < 1 || hours > 24) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "hours must be 1..24");
        return statistics.report(Instant.now(), hours);
    }
}
