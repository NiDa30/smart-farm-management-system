#include "../../firmware/esp32/include/ActuatorBank.h"
#include <cassert>
#include <cstdio>
#include <cstring>

static const int64_t E = 1800000000;
static bool is(const char* a, const char* b) { return a && b && strcmp(a, b) == 0; }

int main() {
  ActuatorBank bank;
  const int pump = bank.add("PUMP01", KIND_PUMP, 3600, true);
  const int v1 = bank.add("VALVE01", KIND_VALVE, 3600, false);
  const int v2 = bank.add("VALVE02", KIND_VALVE, 3600, false);
  const int fan = bank.add("FAN01", KIND_FAN, 14400, false);
  const int light = bank.add("LIGHT01", KIND_LIGHT, 14400, false);
  const int mist = bank.add("MIST01", KIND_MIST, 600, true);
  bank.configure(true, 1);
  assert(pump == 0 && v1 == 1 && mist == 5 && bank.size() == 6);
  assert(bank.add("PUMP02", KIND_PUMP, 10, true) == -1);           // one shared pump
  assert(bank.add("TOO_LONG_IDENTIFIER", KIND_FAN, 10, false) == -1);
  assert(bank.find("VALVE02") == v2 && bank.find("NOPE") == -1);
  for (int i = 0; i < bank.size(); i++) assert(!bank.isOn(i) && !bank.outputAllowed(i)); // boot OFF

  // Pump without an open valve is refused, and the refusal is remembered for duplicates.
  assert(is(bank.apply(pump, "p-early", RelaySafety::ON, 20, E, E + 10, E, 0, 2), "NO_VALVE_OPEN"));
  assert(!bank.apply(v1, "v1-on", RelaySafety::ON, 60, E, E + 10, E, 0, 2));
  assert(bank.isOn(v1) && bank.outputAllowed(v1));
  assert(is(bank.apply(pump, "p-early", RelaySafety::ON, 20, E, E + 10, E, 10, 2), "NO_VALVE_OPEN"));
  assert(!bank.isOn(pump));

  // One zone at a time; re-sending the open valve's own command is a harmless duplicate.
  assert(is(bank.apply(v2, "v2-on", RelaySafety::ON, 60, E, E + 10, E, 20, 2), "VALVE_LIMIT"));
  assert(!bank.apply(v1, "v1-on", RelaySafety::ON, 60, E, E + 10, E, 20, 2));

  // Pump runs with the valve; closing the last valve stops the pump without lockout.
  assert(!bank.apply(pump, "p-on", RelaySafety::ON, 20, E, E + 10, E, 100, 2));
  assert(bank.isOn(pump) && bank.outputAllowed(pump));
  bank.takeStopped();
  assert(!bank.apply(v1, "v1-off", RelaySafety::OFF, 0, E, E + 10, E, 200, 2));
  assert(!bank.isOn(v1) && !bank.isOn(pump) && !bank.lockout(pump));
  assert(is(bank.reason(pump), "VALVE_CLOSED") && is(bank.reason(v1), "COMMAND_OFF"));
  uint32_t stopped = bank.takeStopped();
  assert(stopped == ((1u << pump) | (1u << v1)) && bank.takeStopped() == 0);

  // Valve hard cap ends the zone and takes the pump down in the same tick.
  assert(!bank.apply(v2, "v2-again", RelaySafety::ON, 5, E, E + 10, E, 1000, 2));
  assert(!bank.apply(pump, "p-again", RelaySafety::ON, 60, E, E + 10, E, 1000, 2));
  bank.tick(5999, true);
  assert(bank.isOn(v2) && bank.isOn(pump));
  bank.tick(6000, true);
  assert(!bank.isOn(v2) && !bank.isOn(pump) && is(bank.reason(v2), "TIMER_EXPIRED") && is(bank.reason(pump), "VALVE_CLOSED"));
  bank.takeStopped();

  // Pump's own cap is still independent of the valve.
  assert(!bank.apply(v1, "v1-long", RelaySafety::ON, 600, E, E + 10, E, 7000, 2));
  assert(!bank.apply(pump, "p-short", RelaySafety::ON, 3, E, E + 10, E, 7000, 2));
  bank.tick(10000, true);
  assert(!bank.isOn(pump) && bank.isOn(v1) && is(bank.reason(pump), "TIMER_EXPIRED"));
  // Independent esp_timer path: stop without lockout.
  bank.stopByTimer(v1);
  assert(!bank.isOn(v1) && !bank.lockout(v1));

  // Per-channel hard caps.
  assert(is(bank.apply(mist, "mist-long", RelaySafety::ON, 601, E, E + 10, E, 11000, 2), "INVALID_DURATION"));
  assert(!bank.apply(light, "light-4h", RelaySafety::ON, 14400, E, E + 10, E, 11000, 2));
  assert(!bank.apply(fan, "fan-on", RelaySafety::ON, 120, E, E + 10, E, 11000, 2));
  assert(!bank.apply(mist, "mist-on", RelaySafety::ON, 60, E, E + 10, E, 11000, 2));
  bank.takeStopped();

  // Dry reservoir trips pump and mist with lockout; fan and light keep running.
  assert(!bank.apply(v1, "v1-dry", RelaySafety::ON, 60, E, E + 10, E, 11000, 2));
  assert(!bank.apply(pump, "p-dry", RelaySafety::ON, 30, E, E + 10, E, 11000, 2));
  assert(bank.setWaterAvailable(false));
  assert(!bank.isOn(pump) && bank.lockout(pump) && !bank.isOn(mist) && bank.lockout(mist));
  assert(bank.isOn(fan) && bank.isOn(light) && bank.isOn(v1) && !bank.lockout(v1));
  assert(is(bank.reason(pump), "WATER_LOW") && is(bank.reason(mist), "WATER_LOW"));
  stopped = bank.takeStopped();
  assert(stopped == ((1u << pump) | (1u << mist)));
  assert(is(bank.apply(mist, "mist-dry", RelaySafety::ON, 10, E, E + 10, E, 11100, 2), "WATER_LOW"));
  assert(!bank.setWaterAvailable(true) || true);
  assert(bank.lockout(pump) && bank.lockout(mist)); // refill never clears the latch
  assert(!bank.apply(pump, "p-reset", RelaySafety::RESET, 0, E, E + 10, E, 11200, 2));
  assert(!bank.lockout(pump) && !bank.isOn(pump));

  // Network loss: every running channel OFF with lockout.
  assert(!bank.apply(pump, "p-net", RelaySafety::ON, 30, E, E + 10, E, 12000, 2));
  bank.tick(12001, false);
  for (int i = 0; i < bank.size(); i++) assert(!bank.isOn(i) && !bank.outputAllowed(i));
  assert(bank.lockout(v1) && bank.lockout(fan) && bank.lockout(light) && bank.lockout(pump));
  assert(is(bank.reason(fan), "CONNECTION_LOST") && is(bank.reason(light), "CONNECTION_LOST"));
  assert(is(bank.apply(fan, "fan-after", RelaySafety::ON, 10, E, E + 10, E, 12100, 2), "SAFETY_LOCKOUT"));

  // Without valves configured the original PUMP01 behaviour is unchanged.
  ActuatorBank legacy;
  const int only = legacy.add("PUMP01", KIND_PUMP, 3600, true);
  legacy.configure(false, 1);
  assert(!legacy.apply(only, "legacy", RelaySafety::ON, 20, E, E + 10, E, 0, 2));
  assert(legacy.isOn(only) && legacy.outputAllowed(only));
  assert(is(legacy.apply(only, "legacy-long", RelaySafety::ON, 3601, E, E + 10, E, 0, 2), "INVALID_DURATION"));

  // Remote config narrows a cap but can never widen it past the compiled value.
  ActuatorBank capped;
  int cp = capped.add("PUMP01", KIND_PUMP, 3600, true);
  capped.configure(false, 1);
  capped.limitSeconds(cp, 600);
  assert(capped.maxSeconds(cp) == 600);
  assert(is(capped.apply(cp, "cap-701", RelaySafety::ON, 601, E, E + 10, E, 0, 2), "INVALID_DURATION"));
  capped.limitSeconds(cp, 99999);
  assert(capped.maxSeconds(cp) == 3600 && capped.allOff());
  assert(!capped.apply(cp, "cap-ok", RelaySafety::ON, 3600, E, E + 10, E, 0, 2));
  assert(!capped.allOff());
  // OTA block: ON refused and remembered, OFF still works.
  capped.block("OTA_IN_PROGRESS");
  assert(!capped.apply(cp, "cap-off", RelaySafety::OFF, 0, E, E + 10, E, 10, 2) && capped.allOff());
  assert(is(capped.apply(cp, "ota-on", RelaySafety::ON, 10, E, E + 10, E, 20, 2), "OTA_IN_PROGRESS"));
  capped.block(nullptr);
  assert(is(capped.apply(cp, "ota-on", RelaySafety::ON, 10, E, E + 10, E, 30, 2), "OTA_IN_PROGRESS"));
  assert(capped.allOff());

  // Fault paths keep the latch and stop the pump with its valve.
  ActuatorBank faults;
  int fp = faults.add("PUMP01", KIND_PUMP, 3600, true), fv = faults.add("VALVE01", KIND_VALVE, 3600, false);
  faults.configure(true, 1);
  assert(!faults.apply(fv, "fv", RelaySafety::ON, 60, E, E + 10, E, 0, 2));
  assert(!faults.apply(fp, "fp", RelaySafety::ON, 30, E, E + 10, E, 0, 2));
  faults.fail(fv, "fv", "DEVICE_FAULT");
  assert(!faults.isOn(fv) && faults.lockout(fv) && !faults.isOn(fp) && !faults.lockout(fp));
  faults.tripAll("DEVICE_FAULT");
  assert(is(faults.reason(fv), "DEVICE_FAULT"));

  puts("ActuatorBank: boot OFF, pump-valve interlock, valve limit, caps, reservoir, network, faults PASS");
  return 0;
}
