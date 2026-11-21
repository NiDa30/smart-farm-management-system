#pragma once
#include <stdint.h>
#include <string.h>
#include "RelaySafety.h"

// Cross-actuator interlocks for one controller (ENV01). Pure C++, Arduino loop thread only,
// so the same logic runs in native tests. GPIO is applied by the caller from outputAllowed().
//
// Rules, in addition to each channel's own RelaySafety (dedup, lifetime, hard cap, lockout):
//  - PUMP with pumpRequiresValve: ON is refused (NO_VALVE_OPEN) unless a valve is running,
//    and the pump stops (VALVE_CLOSED, no lockout) as soon as the last valve stops for any
//    reason. outputAllowed() also refuses the pump output without a running valve, so the
//    pump GPIO drops in the same pass that drops the valve GPIO.
//  - VALVE: at most maxOpenValves run at once (VALVE_LIMIT); one shared pump, one zone.
//  - Reservoir users (PUMP, and MIST when configured) share the float switch: dry trips them
//    OFF with lockout, exactly like the original PUMP01 interlock.
//  - Network loss stops every running channel with lockout (RelaySafety::tickSafety).
enum ActuatorKind : uint8_t { KIND_PUMP, KIND_VALVE, KIND_FAN, KIND_LIGHT, KIND_MIST };

class ActuatorBank {
 public:
  static const int MAX = 8;
  // Returns the channel index, or -1 when full or the configuration is inconsistent.
  int add(const char* id, ActuatorKind kind, unsigned maxSeconds, bool usesReservoir) {
    if (count >= MAX || !id || strlen(id) > 15 || maxSeconds < 1 || maxSeconds > 86400) return -1;
    if (kind == KIND_PUMP && pumpIndex >= 0) return -1;
    Channel& c = channels[count];
    strncpy(c.id, id, 15); c.id[15] = 0;
    c.kind = kind; c.reservoir = usesReservoir || kind == KIND_PUMP;
    c.relay.setMaxSeconds(maxSeconds);
    c.reason = "BOOT";
    if (kind == KIND_PUMP) pumpIndex = count;
    return count++;
  }
  void configure(bool requireValve, unsigned maxValves) {
    pumpRequiresValve = requireValve;
    maxOpenValves = maxValves < 1 ? 1 : maxValves;
  }
  int size() const { return count; }
  int pump() const { return pumpIndex; }
  int find(const char* id) const {
    for (int i = 0; i < count; i++) if (strcmp(channels[i].id, id) == 0) return i;
    return -1;
  }
  const char* id(int i) const { return channels[i].id; }
  ActuatorKind kind(int i) const { return channels[i].kind; }
  bool usesReservoir(int i) const { return channels[i].reservoir; }
  bool isOn(int i) const { return channels[i].relay.isOn(); }
  bool lockout(int i) const { return channels[i].relay.lockout(); }
  unsigned maxSeconds(int i) const { return channels[i].relay.maxDuration(); }
  const char* reason(int i) const { return channels[i].reason; }
  void setReason(int i, const char* value) { channels[i].reason = value; }

  int runningValves() const {
    int n = 0;
    for (int i = 0; i < count; i++) if (channels[i].kind == KIND_VALVE && channels[i].relay.isOn()) n++;
    return n;
  }
  bool hasValves() const {
    for (int i = 0; i < count; i++) if (channels[i].kind == KIND_VALVE) return true;
    return false;
  }

  // Interlock part of the output decision; the caller adds link/forcedOff/float checks.
  bool outputAllowed(int i) const {
    if (!channels[i].relay.isOn()) return false;
    if (i == pumpIndex && pumpRequiresValve && runningValves() == 0) return false;
    return true;
  }

  const char* apply(int i, const char* commandId, RelaySafety::Action action, unsigned seconds,
                    int64_t issued, int64_t expires, int64_t epoch, uint32_t tick, unsigned tolerance) {
    Channel& c = channels[i];
    const char* interlock = nullptr;
    if (action == RelaySafety::ON) {
      if (i == pumpIndex && pumpRequiresValve && runningValves() == 0) interlock = "NO_VALVE_OPEN";
      else if (c.kind == KIND_VALVE && !c.relay.isOn() && runningValves() >= (int)maxOpenValves) interlock = "VALVE_LIMIT";
    }
    const bool wasOn = c.relay.isOn();
    const char* error = c.relay.apply(commandId, action, seconds, issued, expires, epoch, tick, tolerance, interlock);
    if (!error) {
      if (action == RelaySafety::ON && c.relay.isOn() && !wasOn) c.reason = "COMMAND_ON";
      else if (action == RelaySafety::OFF) { c.reason = "COMMAND_OFF"; if (wasOn) stopped |= maskOf(i); }
      else if (action == RelaySafety::RESET) c.reason = "LOCKOUT_RESET";
    }
    enforcePumpValve();
    return error;
  }

  // Timer cutoffs and link loss. Returns nothing: read takeStopped() afterwards.
  void tick(uint32_t now, bool link) {
    for (int i = 0; i < count; i++) {
      Channel& c = channels[i];
      const bool wasOn = c.relay.isOn();
      c.relay.tickSafety(now, link);
      if (wasOn && !c.relay.isOn()) { c.reason = link ? "TIMER_EXPIRED" : "CONNECTION_LOST"; stopped |= maskOf(i); }
    }
    enforcePumpValve();
  }
  // External stop sources: independent esp_timer cutoff (no lockout) and faults (lockout).
  void stopByTimer(int i) { stopWith(i, "TIMER_EXPIRED", false); enforcePumpValve(); }
  void trip(int i, const char* why) { stopWith(i, why, true); enforcePumpValve(); }
  void tripAll(const char* why) {
    for (int i = 0; i < count; i++) if (channels[i].relay.isOn()) stopWith(i, why, true);
  }
  void fail(int i, const char* commandId, const char* error) {
    const bool wasOn = channels[i].relay.isOn();
    channels[i].relay.fail(commandId, error);
    channels[i].reason = error;
    if (wasOn) stopped |= maskOf(i);
    enforcePumpValve();
  }
  // Float switch: returns true when the reading changed. Dry trips every reservoir user.
  bool setWaterAvailable(bool present) {
    bool changed = false;
    for (int i = 0; i < count; i++) {
      Channel& c = channels[i];
      if (!c.reservoir) continue;
      const bool wasOn = c.relay.isOn();
      changed = c.relay.setWaterAvailable(present) || changed;
      if (!present) { c.reason = "WATER_LOW"; if (wasOn) stopped |= maskOf(i); }
    }
    enforcePumpValve();
    return changed;
  }
  // Channels that went from ON to OFF since the last call (publish status, cancel timers).
  uint32_t takeStopped() { uint32_t value = stopped; stopped = 0; return value; }

 private:
  struct Channel {
    char id[16] = {};
    ActuatorKind kind = KIND_FAN;
    bool reservoir = false;
    RelaySafety relay;
    const char* reason = "BOOT";
  };
  static uint32_t maskOf(int i) { return uint32_t(1) << i; }
  void stopWith(int i, const char* why, bool lock) {
    Channel& c = channels[i];
    const bool wasOn = c.relay.isOn();
    if (lock) c.relay.trip(); else c.relay.stop();
    if (wasOn) { c.reason = why; stopped |= maskOf(i); }
    else if (lock) c.reason = why;
  }
  void enforcePumpValve() {
    if (pumpIndex < 0 || !pumpRequiresValve) return;
    if (channels[pumpIndex].relay.isOn() && runningValves() == 0) stopWith(pumpIndex, "VALVE_CLOSED", false);
  }
  Channel channels[MAX];
  int count = 0, pumpIndex = -1;
  bool pumpRequiresValve = false;
  unsigned maxOpenValves = 1;
  uint32_t stopped = 0;
};
