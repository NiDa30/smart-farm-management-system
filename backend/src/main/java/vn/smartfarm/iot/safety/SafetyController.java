package vn.smartfarm.iot.safety;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/safety")
public class SafetyController {
    private final SafetyOverview overview;
    public SafetyController(SafetyOverview overview) { this.overview = overview; }
    @GetMapping public SafetyOverview.Snapshot snapshot() { return overview.snapshot(); }
}
