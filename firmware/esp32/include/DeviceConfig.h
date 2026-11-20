#pragma once
#include <stdint.h>
#include <string.h>

// Remote configuration for ENV01. Pure C++ (native-tested); persistence is the caller's job.
// A config is applied whole or not at all, only with a strictly newer revision; re-sending the
// same configId returns the first result (idempotent ACK), so a backend retry is always safe.
struct DeviceSettings {
  uint16_t telemetrySeconds = 5;   // 5..10: backend freshness window is 15 s
  uint16_t heartbeatSeconds = 10;  // 5..20: backend offline threshold is 30 s
  uint16_t soilWetAdc = 0;         // calibration, 0..4095, |dry-wet| >= 200
  uint16_t soilDryAdc = 4095;
  uint16_t pumpMaxSeconds = 3600;  // may only narrow the contract cap (1..3600)
};

class DeviceConfig {
 public:
  static const char* validate(const DeviceSettings& s) {
    if (s.telemetrySeconds < 5 || s.telemetrySeconds > 10) return "INVALID_TELEMETRY_INTERVAL";
    if (s.heartbeatSeconds < 5 || s.heartbeatSeconds > 20) return "INVALID_HEARTBEAT_INTERVAL";
    if (s.soilWetAdc > 4095 || s.soilDryAdc > 4095) return "INVALID_SOIL_CALIBRATION";
    const int span = int(s.soilDryAdc) - int(s.soilWetAdc);
    if (span < 200 && span > -200) return "INVALID_SOIL_CALIBRATION";
    if (s.pumpMaxSeconds < 1 || s.pumpMaxSeconds > 3600) return "INVALID_PUMP_CAP";
    return nullptr;
  }

  // Restores a persisted state; anything invalid falls back to compiled defaults (revision 0).
  void restore(uint32_t revision, const DeviceSettings& persisted) {
    if (!validate(persisted)) { current = persisted; applied = revision; }
  }

  const char* apply(const char* configId, uint32_t revision, const DeviceSettings& s,
                    int64_t issued, int64_t expires, int64_t epoch) {
    if (!configId || strlen(configId) != 36) return "INVALID_CONFIG";
    if (lastId[0] && strcmp(lastId, configId) == 0) return lastError;  // duplicate delivery
    const char* error = nullptr;
    if (epoch < 1700000000) error = "CLOCK_NOT_READY";
    else if (issued <= 0 || expires <= issued || expires - issued > 60) error = "INVALID_LIFETIME";
    else if (issued > epoch + 10) error = "CLOCK_SKEW";
    else if (expires <= epoch) error = "EXPIRED";
    else if (revision <= applied) error = "STALE_REVISION";
    else error = validate(s);
    strncpy(lastId, configId, 36); lastId[36] = 0;
    lastError = error;
    if (!error) { current = s; applied = revision; }
    return error;
  }

  const DeviceSettings& settings() const { return current; }
  uint32_t revision() const { return applied; }

 private:
  DeviceSettings current;
  uint32_t applied = 0;
  char lastId[37] = {};
  const char* lastError = nullptr;
};
