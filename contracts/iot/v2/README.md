# Water node telemetry v2

v1 ENV01/PUMP01 remains unchanged. v2 accepts WATER nodes declared in
`iot_node` with named sensor channels; v2 is not a new pump command format.

Topic: `smartfarm/FARM001/{nodeId}/telemetry`; payload deviceId must match the
registered physical node. No new subscription or public HTTP ingestion route.
AWS node certificate/policy/firmware are still separate provisioning steps.

See [schema](water-telemetry.schema.json) and [example](examples/water-telemetry.json).
Every reading includes channelId, metric, unit, quality, value and
calibrationVersion. Metric/unit/calibration must exactly match the declared
channel. Packet may contain any nonempty subset (max8) of channels; omitted
channels keep their own prior reading/age, never become zero or fresh.

Metrics: WATER_PRESENT/boolean, FLOW_RATE/L/min (>=0), WATER_TEMPERATURE/°C
(-55..125), WATER_PRESSURE/kPa (>=0). Flow/pressure bounds are parser rules,
not calibrated sensor ranges. VALID is the device's quality report, not
independent proof of metrology. calibrationVersion=null explicitly means no
calibration version declared. A version string does not prove calibration.

SENSOR_FAULT requires value=null; VALID requires a correctly typed finite
value. false, zero, missing channel and fault/null have separate meanings.
LOW/HIGH WATER_PRESENT is true when that switch senses water at its position;
no derived tank percentage, safety permission or impossible-float detection
is implemented from these measurements yet.

Strict envelope/reading keys, duplicate JSON keys, UUID, nonnegative safe-JS
sequence/uptime, unique channelId and timestamp <= serverNow+2s are enforced
in Java. JSON Schema alone cannot enforce channelId uniqueness by property,
clock bounds or registry lookups. Historical packets remain accepted; UI
shows source+receipt freshness and newest fault without fallback to good data.

(nodeId, bootId, sequence) is the idempotency key, whole packet is transactional.
Duplicate delivery keeps first persisted contents; it does not update receipt
or refresh the channel. Latest channel is ordered by observedAt, sequence, id;
a reboot/timestamp tie is not proof of live physical presence. Retained or
old packets are historical data, not authority to start a pump.

No automatic watering, alerts or PUMP01 status is generated from v2 yet.
Existing GPIO27 local interlock remains the control safety source. See the
[implementation report](../../../docs/implementation/NODE_CHANNELS_REPORT.md).
