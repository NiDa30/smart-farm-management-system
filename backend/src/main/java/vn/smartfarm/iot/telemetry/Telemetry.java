package vn.smartfarm.iot.telemetry;

import java.time.Instant;
import java.util.UUID;

public record Telemetry(int schemaVersion, String deviceId, UUID bootId, long sequence,
                        Instant timestamp, double temperature, double humidity,
                        double soilMoisture, long uptimeMs) {}
