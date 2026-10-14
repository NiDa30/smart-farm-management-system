# MQTT contract v1 — Day 1 freeze

Farm `FARM001`; physical AWS Thing/client `ENV01`; logical actuator `PUMP01` controlled by ENV01. MQTT3 QoS1, command/telemetry/ACK/event retain=false, status retain=true. AWS supports QoS0/1, not QoS2.

| Topic | Publisher | Consumer |
|---|---|---|
| smartfarm/FARM001/ENV01/telemetry | ESP32 | backend |
| smartfarm/FARM001/ENV01/status | ESP32/LWT | backend |
| smartfarm/FARM001/PUMP01/command | backend | ESP32 |
| smartfarm/FARM001/PUMP01/ack | ESP32 | backend |
| smartfarm/FARM001/PUMP01/status | ESP32 | backend |
| smartfarm/FARM001/PUMP01/event | ESP32 | backend |
| smartfarm/FARM001/backend/probe | backend diagnostic | same backend |

The diagnostic topic belongs only to the backend, carries a random echo token and cannot control GPIO. Remove its IAM permissions after connectivity validation if no longer needed.

JSON Schemas and examples in this directory define wire structure, not business execution. Consumers must enable `date-time`/UUID format checking and reject non-finite numbers and packets >8KB. Additional runtime validation: timestamp UTC, future skew≤10s, device/farm from topic matches registered ownership, expiresAt>issuedAt, ON not expired, bootId+sequence dedupe/order, only trusted fresh data can trigger rules. No command from browser directly to MQTT.

Telemetry every5s, freshness15s, heartbeat10s, offline30s, command timeout10s. Low soil30%, clear/stop35%, normal duration20s, Wokwi manual control hard cap3600s (60 minutes; automatic watering should retain its own shorter limit), cooldown60s. Durations are **seconds**. OFF/RESET_LOCKOUT must not contain durationSeconds.

Command lifecycle: PENDING(DB accepted) → SENT(broker PUBACK) → ACKNOWLEDGED(matching device ACK) → SUCCESS(EXECUTED SUCCESS). FAILED/TIMEOUT are terminal. PUBACK is not execution proof; late ACK gets its own event and reported-state reconciliation. Duplicate ON cannot extend timer. RESET_LOCKOUT only resets in confirmed OFF state and requires device execution ACK; no implicit ON.

Schema limitations: structure does not prove source identity, freshness, safety, actual pump operation or authorization. Day1 firmware has telemetry/status only and holds relay OFF. PUMP command/ACK/status/event behavior belongs to later tasks.

From repository root:

```bash
python -m venv .local/day1-venv
.local/day1-venv/bin/pip install -r tools/requirements-day1.txt
.local/day1-venv/bin/python -m unittest discover -s tools/tests -v
```


## Additive local flow trip reasons (15 October 2026, Vietnam time)

PUMP01 status accepts stateReason FLOW_LOW or FLOW_SENSOR_FAULT only with
reportedState OFF and safetyLockout true. Main firmware and native tests use
the shared PumpStatusPacket encoder. No flow telemetry field/topic, capability
attestation or WATER01 binding is added. New reasons are device reports and do
not prove physical calibration or local guard enablement. Existing private
firmware configs default to flow guard disabled; see chapter26 in docs/book.
