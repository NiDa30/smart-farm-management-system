# Fixed single-valve LED demo v1

Controller IRRIGATION01, actuator VALVE01, farm FARM001. Separate ESP32/client
and certificate, not an alias of ENV01/PUMP01. SIMULATOR only; no pump output,
no physical valve position verification. Optional V25 simulated end stops
are specified below; legacy defaults remain UNKNOWN. Main node/channel inventory excludes this
fixed controller; reserved IDs cannot be registered as ENV/WATER/SOIL sensors.

Topics: `smartfarm/FARM001/VALVE01/{command,ack,status}`, QoS1, retain=false.
Controller subscribes only command, publishes only ack/status. Retained or
fragmented commands are discarded. Backend drops retained ACK/status.

Command JSON exact fields:
schemaVersion=1, controllerId=IRRIGATION01, actuatorId=VALVE01, zoneId,
commandId(UUID), bootId(UUID), ordinal(integer1..9007199254740991),
action OPEN/CLOSE, issuedAt/expiresAt(canonical UTC seconds). OPEN additionally
requires durationSeconds(integer1..30); CLOSE omits durationSeconds entirely.
TTL positive≤15s, backend uses10s; issuedAt≤deviceNow+2s, expiresAt>deviceNow.
OPEN targets the observed boot UUID. CLOSE may close across a boot change.
Zone must match private firmware configuration for either action.

Strict ASCII JSON: duplicate/unknown keys, escaped keys/strings, wrong types,
invalid IDs/time/duration are rejected. Ordinals never decrease within a boot;
stale/duplicate commands publish status only and never renew a timer. A newer
CLOSE fences any delayed older MQTT OPEN. New OPEN while already open is
rejected BUSY and never changes the original deadline. Boot always CLOSED;
reconnect does not resume. Independent ESP timer checks output every25ms;
closing on lost network occurs after loss is detected, not at an assured
instant of Internet outage. This is a software prototype, not a hardware
watchdog or certified valve safety mechanism. No NVS latch/ordinal recovery.

Status exact fields: schemaVersion/controllerId/actuatorId/zoneId/bootId,
sequence(integer0..9007199254740991), timestamp(UTC), dataSource=SIMULATOR,
feedbackState=UNKNOWN, gpioState OPEN/CLOSED, reason,
demoEnabled(boolean), lastOrdinal(integer0..9007199254740991).
Reasons BOOT/COMMAND_OPEN/COMMAND_CLOSE/TIMER_EXPIRED/CONNECTION_LOST/DEVICE_FAULT.
BOOT/timer/loss/fault/close require CLOSED. Disabled demo cannot report OPEN.
Backend requires source time within15s past/2s future. Same-boot seq/time and
ordinal cannot regress; old-boot status cannot replace a newer timestamp.
Nonzero lastOrdinal must refer to a command known in this zone.

ACK = all status fields plus commandId/ordinal/action/result/errorCode.
EXECUTED requires GPIO matching action, errorCode=null; REJECTED requires a
nonempty error code. The backend validates command ID/rank/action/zone and
OPEN boot, timestamp bounded by issue/expiry. First valid terminal verdict is
immutable. ACK changes the command ledger, never the current status row.
An ACK proves a firmware GPIO report, not a valve position or water delivery.

HTTP: GET `/api/v1/irrigation-demo`, GET `/commands/{uuid}` (independent of the
20-row preview), PUT `/binding`, POST `/commands` (202). Binding body
{zoneId,zoneRevision,revision}; source must be SIMULATOR, revisions current.
Initial binding is configuration-only, allowed with dispatch disabled. Changes
require fresh CLOSED/caught-up controller status. Changing zone revision blocks
new OPEN until binding confirmation; it does not cancel an already accepted
manual command, whose local timer still applies.

POST body exact fields requestId(UUID), action OPEN/CLOSE, durationSeconds
(OPEN1..30/CLOSE null), expectedBootId(OPEN observed UUID/CLOSE null),
bindingRevision, requestedAt(ISO instant). Request time must be within server
past10s/future2s. CLOSE atomically sets a server+2s request-time fence, so an
older delayed HTTP OPEN cannot arrive after CLOSE and receive a newer ordinal.
New OPEN waits for that fence and fresh matching CLOSED status caught up with
**all** commands in its boot, not only preview20. Record commits before publish;
timeout/error records PUBLISH_UNCERTAIN, never automatic resend. Reusing an ID
for the same action/duration/binding/OPEN boot only returns its stored record;
changed semantics409. After ambiguous HTTP response use GET ID, never retry
OPEN under a new ID.404 alone does not prove the original request cannot arrive.
CLOSE stays available while OPEN is uncertain. False/unknown/stale states never
mean physically closed. No command replay on backend startup.

Backend flag SMARTFARM_IRRIGATION_DEMO_ENABLED=false by default, independent
of SMARTFARM_CONTROL_ENABLED. Firmware IRRIGATION_DEMO_ENABLED=0 by default;
IRRIGATION_SIMULATOR must be1. IAM additions are rendered locally by
[helper](../../../tools/aws/render_irrigation_policies.py); it never provisions
or calls AWS. See [chapter32](../../../docs/book/CHAPTER_32_IRRIGATION_VALVE_DEMO.md).

## Optional position extension V25 (2026-10-15)

Command JSON is unchanged. Firmware opt-in IRRIGATION_POSITION_FEEDBACK_ENABLED=1
adds positionFeedback to status/ACK: exact {version:1,enabled:true,state,fault}.
state is UNKNOWN/OPEN/CLOSED/CONFLICT and must equal top-level feedbackState.
fault is null or SWITCH_CONFLICT/OPEN_TIMEOUT/CLOSE_TIMEOUT/POSITION_LOST.
CONFLICT requires SWITCH_CONFLICT. Non-null fault requires gpioState CLOSED
and reason POSITION_FAULT; POSITION_FAULT without fault is invalid. GPIO may
be CLOSED while independent position is OPEN, or OPEN while still traveling
from CLOSED; these facts must not be conflated. Source remains SIMULATOR.

Without the extension, feedbackState must be UNKNOWN and reason cannot be
POSITION_FAULT. Default firmware omits extension. Old backend strict parsers
reject opt-in extra fields; deploy backend before enabling new firmware.
V25 status storage adds nullable positionFeedback in HTTP latest (null for
legacy), plus snapshot.feedbackRequired. Backend policy
SMARTFARM_IRRIGATION_POSITION_FEEDBACK_REQUIRED defaults false. If policy is
true OR latest advertises feedback, OPEN and rebind require CLOSED position
with no fault, in addition to existing GPIO/freshness/revision/ordinal gates.
CLOSE stays available; its ACK still reports GPIO execution only.

Same-boot status cannot drop capability. Same-boot fault clearing requires a
new known CLOSE ordinal, not only a higher sequence. ACK does not overwrite
current position. Freshness remains15s source/receipt, future2s. New boot may
change capability, but required policy still refuses legacy OPEN.
Local debounce100ms/travel3s/sticky clear behavior and live limits:
[chapter37](../../../docs/book/CHAPTER_37_VALVE_POSITION_FEEDBACK.md).
No queue/pump coordination or water-delivery proof is introduced.
