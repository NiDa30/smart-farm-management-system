#pragma once
#include <stdint.h>
#include <string.h>

// Single-thread owner: Arduino loop only. Duplicate commands never extend runtime.
class RelaySafety {
 public:
  enum Action { ON, OFF, RESET };
  const char* apply(const char* id, Action action, unsigned seconds,
                    int64_t issued, int64_t expires, int64_t epoch, uint32_t tick,
                    unsigned futureToleranceSeconds = 2) {
    tickSafety(tick, true);
    for (auto &item : cache) {
      if (item.used && epoch <= item.expires && strcmp(item.id, id) == 0) return item.error;
    }
    const char* error = nullptr;
    if (epoch < 1700000000) error = "CLOCK_NOT_READY";
    else if (issued <= 0 || expires <= issued || expires - issued > 15) error = "INVALID_LIFETIME";
    else if (issued > epoch + (futureToleranceSeconds > 10 ? 10 : futureToleranceSeconds)) error = "CLOCK_SKEW";
    else if (expires <= epoch) error = "EXPIRED";
    else if (action == ON && (seconds < 1 || seconds > 3600)) error = "INVALID_DURATION";
    else if (action == ON && locked) error = "SAFETY_LOCKOUT";
    else if (action == ON && running) error = "BUSY";
    else if (action == RESET && running) error = "BUSY";
    Cache* slot = nullptr;
    for (auto &item : cache) if (!item.used || epoch > item.expires) { slot = &item; break; }
    if (!slot) {
      // Emergency OFF is safe to repeat and must not be blocked by the dedup cache.
      if (action == OFF && !error) { running = false; return nullptr; }
      return "RATE_LIMIT";
    }
    slot->used = true; strncpy(slot->id, id, 36); slot->id[36] = 0;
    slot->expires = expires; slot->error = error;
    if (!error) {
      if (action == ON) { running = true; started = tick; durationMs = seconds * 1000; }
      else { running = false; if (action == RESET) locked = false; }
    }
    return error;
  }
  // Returns true on output transition; caller must apply GPIO before MQTT/IO.
  bool tickSafety(uint32_t tick, bool link) {
    if (!link) {
      bool wasOn = running;
      running = false;
      if (wasOn) locked = true;
      return wasOn;
    }
    if (running && uint32_t(tick - started) >= durationMs) { running = false; return true; }
    return false;
  }
  bool isOn() const { return running; }
  bool lockout() const { return locked; }
  void stop() { running = false; }
  void trip() { running = false; locked = true; }
  void fail(const char* id, const char* error) {
    trip();
    for (auto &item : cache) if (item.used && strcmp(item.id,id)==0) item.error=error;
  }
 private:
  struct Cache { bool used = false; char id[37] = {}; int64_t expires = 0; const char* error = nullptr; };
  Cache cache[32];
  bool running = false, locked = false;
  uint32_t started = 0, durationMs = 0;
};
