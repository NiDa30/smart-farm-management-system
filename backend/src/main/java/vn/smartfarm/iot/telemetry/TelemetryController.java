package vn.smartfarm.iot.telemetry;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Local read-only API. No ingestion or actuator endpoint is exposed. */
@RestController
@RequestMapping("/api/v1/devices/{deviceId}/telemetry")
public class TelemetryController {
    private final TelemetryRepository repository;
    public TelemetryController(TelemetryRepository repository) { this.repository = repository; }

    @GetMapping("/latest")
    public ResponseEntity<TelemetryRepository.Reading> latest(@PathVariable String deviceId) {
        checkDevice(deviceId);
        return ResponseEntity.of(repository.latest(deviceId));
    }
    @GetMapping
    public List<TelemetryRepository.Reading> history(@PathVariable String deviceId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "100") int limit) {
        checkDevice(deviceId);
        Instant end = to == null ? Instant.now() : to;
        Instant start = from == null ? end.minus(Duration.ofHours(24)) : from;
        if (!start.isBefore(end) || Duration.between(start, end).compareTo(Duration.ofDays(31)) > 0
            || limit < 1 || limit > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use an increasing range <=31 days and limit 1..1000");
        }
        return repository.history(deviceId, start, end, limit);
    }
    private static void checkDevice(String device) {
        if (!"ENV01".equals(device)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
