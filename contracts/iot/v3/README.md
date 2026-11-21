# MQTT contract v3 — actuators on ENV01

Zone valves, fan, grow light and misting controlled by the same ESP32 as PUMP01 (`ENV01`).
**PUMP01 is unchanged and stays on [contract v1](../v1/README.md).** v3 only adds devices.

| Topic | Publisher | Consumer |
|---|---|---|
| `smartfarm/FARM001/{ID}/command` | backend | ENV01 |
| `smartfarm/FARM001/{ID}/ack` | ENV01 | backend |
| `smartfarm/FARM001/{ID}/status` | ENV01 (every 5 s and on change) | backend |

`{ID}` ∈ `VALVE01`–`VALVE04`, `FAN01`, `LIGHT01`, `MIST01`. QoS1, retain=false for all three.

Same rules as v1: `schemaVersion` 3, `commandId` UUID, lifetime ≤ 10 s, future skew ≤ 2 s (10 s in
the Wokwi demo), ON needs `durationSeconds`, OFF/RESET_LOCKOUT must not carry it, duplicates
never extend a run, a rejected command stays rejected for its lifetime.

| Actuator | Hard cap per ON | Reservoir interlock |
|---|---|---|
| VALVE01–04 | 3600 s | no |
| FAN01, LIGHT01 | 14400 s | no |
| MIST01 | 600 s | yes (dry float → OFF + lockout) |

Cross-actuator rules enforced by the firmware (`ActuatorBank.h`), regardless of the backend:

- PUMP01 ON is refused with `NO_VALVE_OPEN` unless a zone valve is running
  (`FARM_PUMP_REQUIRES_VALVE`, on when valves exist).
- When the last running valve stops for any reason, PUMP01 stops in the same pass with
  `stateReason=VALVE_CLOSED` (no lockout). This value is new in the v1 status enum.
- At most `FARM_MAX_OPEN_VALVES` (default 1) valves run at once; more → `VALVE_LIMIT`.
- Network loss turns every output OFF and latches a lockout per actuator (fan and light too).
- Boot: every output is latched OFF before `pinMode`.

New ACK error codes: `NO_VALVE_OPEN`, `VALVE_LIMIT` (plus all v1 codes).

IAM is additive: `tools/aws/provision_actuators.py` renders/attaches a second device policy
(`SmartFarmMvpENV01Actuators`) and a separate backend IAM statement set; the original ENV01
policy is not modified.
