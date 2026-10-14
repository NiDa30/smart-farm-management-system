#pragma once
#include <stdint.h>
#include <math.h>

namespace water {
enum class Tank { WARMING_UP, EMPTY, MID, FULL, INCONSISTENT };
inline const char* tankName(Tank state) {
  switch(state) {
    case Tank::EMPTY: return "EMPTY";
    case Tank::MID: return "MID";
    case Tank::FULL: return "FULL";
    case Tank::INCONSISTENT: return "FLOAT_INCONSISTENT";
    default: return "WARMING_UP";
  }
}
class Floats {
 public:
  void update(bool lowWet, bool highWet, uint32_t tick) {
    if (!started || lowWet != low || highWet != high) {
      low = lowWet; high = highWet; changedAt = tick; started = true;
    }
  }
  Tank state(uint32_t tick) const {
    if (!started || uint32_t(tick-changedAt) < 100) return Tank::WARMING_UP;
    if (!low && high) return Tank::INCONSISTENT;
    return low ? (high ? Tank::FULL : Tank::MID) : Tank::EMPTY;
  }
  bool lowWet() const { return low; }
  bool highWet() const { return high; }
 private:
  bool started = false, low = false, high = false;
  uint32_t changedAt = 0;
};
struct Flow {
  bool valid;
  double litresPerMinute;
  const char* reason;
};
inline Flow measureFlow(uint32_t pulses, uint32_t elapsedMs, double pulsesPerLitre,
                        double maximumHz, bool overflow, bool calibrationReady) {
  if (!isfinite(pulsesPerLitre) || pulsesPerLitre <= 0 ||
      !isfinite(maximumHz) || maximumHz <= 0 || !calibrationReady)
    return {false, 0, "CALIBRATION_REQUIRED"};
  if (elapsedMs == 0 || elapsedMs > 15000 || overflow)
    return {false, 0, "SAMPLE_WINDOW_INVALID"};
  double hz = double(pulses) * 1000.0 / elapsedMs;
  if (hz > maximumHz) return {false, 0, "SIGNAL_TOO_FAST"};
  double rate = double(pulses) * 60000.0 / elapsedMs / pulsesPerLitre;
  if (!isfinite(rate)) return {false, 0, "FLOW_INVALID"};
  // Zero pulses is a valid zero measurement, not proof of a connected sensor.
  return {true, rate, "VALID"};
}
}
