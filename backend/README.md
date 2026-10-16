# Day 1 backend bootstrap

## Windows Git Bash: next live gate

The user has reported the Wokwi/Test Client test complete. Backend live reception
is a separate gate. Install a full JDK 21 and reopen Git Bash: both `java -version`
and `javac -version` must identify version 21. Maven is supplied by the wrapper;
do not install a separate global Maven just for this workflow.

The provisioning user's management IAM policy is not MQTT runtime authorization.
Attach the rendered `.local/aws/backend-iam-policy.json` as a **separate inline
IAM policy**, e.g. `SmartFarmBackendRuntime`, on the principal used by the local
backend profile. In the current local MVP this is `smartfarm-dev`; production
should use a separate runtime role. Do not replace `SmartFarmDay1Provisioning`,
and do not attach this document as an IoT certificate policy. It allows the
backend client, farm-scoped subscribe/receive, pump command and diagnostic echo;
the current probe publishes only echo and never controls the actuator.

From repository root, with Wokwi running and no second backend probe:

```bash
# First quick connectivity check (not the five-minute acceptance gate):
PROBE_SECONDS=30 bash tools/backend/run_probe_windows.sh
# After it succeeds, run the observation gate:
bash tools/backend/run_probe_windows.sh
```

The helper checks JDK and AWS account, reads the local endpoint, builds/tests the
backend, then observes live telemetry via WSS/SigV4. Expected output includes
`WSS_PUBACK_ECHO_PASS` and `TELEMETRY_PACKETS=...`; at least 58 packets are needed
for the default 300-second check. The user must supply the live output: no cloud
credentials or Windows run success are assumed. Packet count does not validate
schema, uniqueness or changing sensor values; use Test Client evidence too.

Java **JDK21**, Spring Boot3.5.16, Maven3.9.11 wrapper and AWS IoT Device SDK Java v2 1.34.0. PostgreSQL/Flyway ingestion and read-only telemetry API are now available locally; no control endpoints yet. Follow [local telemetry setup](../docs/implementation/LOCAL_TELEMETRY_BACKEND.md) for the continuous application. The probe below remains a separate connectivity check. Use `JAVA_HOME` pointing to a full JDK, not a JRE; cloud audit machine initially had only a Java runtime.

```bash
cd backend
./mvnw -B verify
./mvnw -B exec:java \
  -Dexec.mainClass=vn.smartfarm.iot.mqtt.MqttConnectivityProbe \
  -Dexec.args=--self-test
```

Self-test loads AWS CRT native libraries and builds WSS settings without connecting to AWS. It does not validate credentials, network or device telemetry.

Live gate, with an existing authenticated AWS profile/role and attached backend IAM policy rendered by `tools/aws/provision_day1.py`:

```bash
export AWS_REGION=ap-southeast-1
export AWS_IOT_ENDPOINT=YOUR_DATA_ATS_HOSTNAME
export PROBE_SECONDS=300
./mvnw -B exec:java -Dexec.mainClass=vn.smartfarm.iot.mqtt.MqttConnectivityProbe
```

Probe subscribes ENV01 telemetry and its own backend echo, publishes only an echo, waits for broker PUBACK/echo and counts telemetry over5 minutes. At least58 packets expected; packet count alone is not full schema validation or proof of sensor values. AWS Test Client + firmware serial/actual input changes are additional evidence. Do not run two backend probes with the same client ID. AWS default provider chain uses existing local credentials; never paste keys into source or terminal logs.

Behind a cloud egress proxy, Java/Maven do not automatically consume HTTPS_PROXY. Use a private Maven settings.xml with the environment's existing proxy and trusted CA store. On this cloud machine validation uses:

```bash
JAVA_HOME=YOUR_FULL_JDK21_PATH \
MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
./mvnw -B -s /workspace/toolchains/maven-settings.xml \
  -Dmaven.repo.local=/workspace/.m2/repository verify
```

The settings file is machine-local, outside Git; TLS validation stays enabled. CRT runtime WSS proxy support is a separate live prerequisite: the probe accepts `AWS_IOT_PROXY_HOST` and `AWS_IOT_PROXY_PORT` for an HTTP CONNECT tunnel using supported CRT HttpProxyOptions. It does not automatically consume HTTPS_PROXY or embed proxy credentials. Use a supported tunnel or an authenticated laptop/network with outbound WSS443. Native self-test does not establish that live network path or SigV4 authentication works.


## Versioned watering settings

GET/PUT `/api/v1/automation/watering/settings` reads/saves integer dry/wet
thresholds, automatic duration, cooldown and revision. Saves require a disabled
rule, no unresolved run and the current revision. V11 keeps defaults 30/35/20/60;
new runs store a settings snapshot, older runs keep null metadata. Saving settings
never dispatches MQTT or enables watering. See [chapter 17](../docs/book/CHAPTER_17_WATERING_SETTINGS.md)
and the [handoff](../docs/implementation/WATERING_SETTINGS_REPORT.md) for bounds,
Windows restart and verification. Alert thresholds remain independent.


## Read-only safety observations

GET `/api/v1/safety` reads MQTT/control observations, ENV01 sensor/PUMP01 status,
rule/settings, unresolved command totals, ten recent problem commands and fifty
relay changes. It must not expire commands, retry publish or pause rules.
DB reads use a read-only REPEATABLE_READ snapshot; MQTT lifecycle is separate.
See [chapter 18](../docs/book/CHAPTER_18_SAFETY_OVERVIEW.md) and the
[handoff](../docs/implementation/SAFETY_OVERVIEW_REPORT.md). This does not verify
firmware, physical interlocks or gateway/OTA health. No new IAM or migration.


## Alert acknowledgement (V12)

GET `/api/v1/alerts/{id}` reads an incident beyond the latest100 list.
PUT `/api/v1/alerts/{id}/acknowledgement` accepts optional text note (<=500),
locks the incident and preserves the first acknowledgement. Identical retries
are idempotent; different note or initial acknowledgement after clear returns409.
It does not clear conditions, change automation/control or send MQTT/email.
Event Log records ALERT_ACKNOWLEDGED at backend time with no device correlation.
No authenticated actor is claimed. See [chapter19](../docs/book/CHAPTER_19_ALERT_ACKNOWLEDGEMENT.md)
and the [handoff](../docs/implementation/ALERT_ACKNOWLEDGEMENT_REPORT.md).


## Agricultural irrigation calendar (V13)

GET/PUT `/api/v1/automation/watering/calendar` returns settings and current/next
window view. ANY_TIME keeps existing moisture-rule behavior; TIME_WINDOWS uses
up to8 weekly non-overlapping windows in Asia/Ho_Chi_Minh, including overnight.
Save requires current revision, disabled rule and no active run; never enables
or publishes. WateringRule checks both current/source time and requests OFF
outside windows. Runs snapshot calendar metadata before dispatch; legacy null.
Backend must run and restart still pauses the rule. See [chapter20](../docs/book/CHAPTER_20_AGRICULTURAL_IRRIGATION_CALENDAR.md)
and the [handoff](../docs/implementation/IRRIGATION_CALENDAR_REPORT.md).


## Irrigation circuit planning (V26)

GET/POST `/api/v1/irrigation-circuits`, GET/PUT `/{id}` configure zone revision,
planned controller/valve, PUMP01, WATER level/flow channels and expected source.
One circuit per zone/valve, shared controller/water station allowed. PUT uses
optimistic revision. This is CONFIGURATION_ONLY, dispatchAvailable=false; IDs
are not provisioned/reserved in inventory. Later collisions invalidate health.

Preview queue captures immutable circuit_snapshot; mapped zones require the
reviewed circuitId/circuitRevision pair. Changes interrupt/invalidate rather
than retarget requests. Legacy rows remain null. See
[chapter38](../docs/book/CHAPTER_38_IRRIGATION_CIRCUITS.md) and
[handoff](../docs/implementation/LOCAL_IRRIGATION_CIRCUITS_REPORT.md).


## Per-circuit valve observations (V27)

SMARTFARM_IRRIGATION_MONITOR_ENABLED defaults false. With MQTT enabled, subscribe
exact status topics from current SIMULATOR circuits at startup/reconnect; new
topics after startup require restart. Separate bounded writer protects pump
ACK/status processing. Controller/valve02–99 monitor packets must match current
circuit/zone revisions; retained, controlled or physical-source packets reject.
Per-valve latest/retired boots persist, duplicate packets do not renew receipt.
No new HTTP receive/command endpoint. Circuits GET adds valveMonitorEnabled and
valveObservation. Queue remains preview-only.
[Chapter39](../docs/book/CHAPTER_39_CIRCUIT_VALVE_MONITOR.md),
[handoff](../docs/implementation/LOCAL_CIRCUIT_VALVE_MONITOR_REPORT.md).

## Circuit valve fault episodes (V28)

Accepted new V27 monitor packets update status and POSITION_FAULT/DEVICE_FAULT
episodes atomically. Recovery needs two consecutive fresh healthy packets in
one boot, sequence+1, strictly increasing source time and <=15s source/receipt
gaps; position faults require independent CLOSED feedback. Restart resets only
partial recovery proof. Configuration snapshots and opening evidence remain
immutable; changed mappings cannot clear older revisions. No stale/offline
episode scheduler, backfill, command transport or new firmware/IAM requirement.

GET `/api/v1/valve-alerts`, GET `/{id}` and PUT `/{id}/acknowledgement` with
exact body `{"note":null}` or string <=500 store the first human note. Same-note
retries are idempotent; conflicting notes or first ACK after recovery return409.
This does not resolve a fault or reset hardware. Event Log exposes three
VALVE_ALERT_* types with separate source/recorded times, no command/run link.
See [chapter40](../docs/book/CHAPTER_40_VALVE_ALERTS.md) and
[handoff](../docs/implementation/LOCAL_VALVE_ALERTS_REPORT.md).

## Circuit valve packet history (V29)

Accepted new monitor packets append to circuit_valve_history atomically with
latest/retired boots/episodes, with the original circuit config and observation.
Duplicate/rejected packets never append. No backfill from older latest rows.
History ID allocation is serialized until commit to give pagination a stable
committed prefix across writers. No new command transport or firmware change.

GET `/api/v1/valve-history?from=...&to=...` filters by receipt time [from,to),
range <=31days, optional circuitId/valveId(02–99), condition ALL/FAULT/UNKNOWN/
OPEN/CLOSED/CONFLICT, limit1–200(default50), and opaque cursor. Cursor is scoped
to filters/range; ceilingId excludes later appends, ordered receipt/id DESC.
Snapshot stays historical after config edits; disabled monitor may still read
stored rows. Web CSV exports loaded rows only. No automatic retention yet;
monitor heartbeats grow local PostgreSQL storage. Legacy demo01 is separate.
See [chapter41](../docs/book/CHAPTER_41_VALVE_HISTORY.md) and
[handoff](../docs/implementation/LOCAL_VALVE_HISTORY_REPORT.md).

## Device-reported local valve interlock (V30)

PUMP01 status optionally adds valveInterlock {version:1,enabled:true,
dataSource:SIMULATOR,state:UNKNOWN|CLOSED|OPEN|CONFLICT,fault:null|VALVE_*}.
Validate exact shape, source, locked OFF for fault and OPEN/no fault for ON.
Capability cannot disappear within a boot; a fault clears only on reported
LOCKOUT_RESET with healthy OPEN, unlocked OFF. New boot may have no capability,
which becomes unknown rather than borrowing previous proof. ACK shape unchanged.

V30 adds nullable pump_status.valve_interlock without backfill or enablement.
GET /api/v1/safety exposes relay.valveInterlock; no command dispatch is added.
Metadata is a device report, not a cloud ON permission or remote valve identity.
Firmware checks local contacts; legacy requests can still be refused at edge.
[Chapter42](../docs/book/CHAPTER_42_LOCAL_VALVE_PUMP_INTERLOCK.md),
[handoff](../docs/implementation/LOCAL_PUMP_VALVE_INTERLOCK_REPORT.md).

## Optional durable pump safety report (V31)

Status may add durableSafety {version:1,enabled:true,storage:NVS,state:READY|ARMED|LOCKED|STORAGE_FAULT};
fence metadata is required. RESTART_LOCKOUT/STORAGE_FAULT reasons require
corresponding locked OFF reports (storage reason code SAFETY_STORAGE_FAULT).
Same boot cannot drop capability or clear a journal lock without a valid
LOCKOUT_RESET/READY/OFF/unlocked report. New boot without capability becomes
unknown. ARMED may be OFF while the device settles an independent cutoff.
V31 adds nullable JSONB without backfill/enablement. Safety exposes a device
report only, never flash attestation or an ON dispatch permission. ACK unchanged.
[Chapter43](../docs/book/CHAPTER_43_DURABLE_PUMP_SAFETY.md),
[handoff](../docs/implementation/LOCAL_DURABLE_PUMP_SAFETY_REPORT.md).

## Per-circuit public Wokwi monitor package (schema remains V31)

GET /api/v1/irrigation-circuits/{id}/monitor-package?accountId=ACCOUNT_ID&expectedRevision=N&expectedZoneRevision=N
returns application/zip with no-store attachment and reviewed identity/revision
headers. Requires current SIMULATOR mapping, distinct controller/client and
controller/valve02–99. Region fixed ap-southeast-1. Read-only repeatable-read
snapshot; no credential lookup, SDK, provisioning or dispatch.

Maven embeds exactly9 explicit public firmware assets; never private config,
PEM/data/.pio. ZIP15files adds per-circuit monitor config, status-only device
policy/backend IAM addition,14file SHA-256 manifest and Vietnamese runbook.
JSON map keys are sorted to keep policy bytes stable across JVM restarts;
generation timestamps intentionally change. Full-app two downloads/native
receiver/build/restart checked. [Chapter44](../docs/book/CHAPTER_44_CIRCUIT_MONITOR_PACKAGE.md),
[handoff](../docs/implementation/LOCAL_CIRCUIT_MONITOR_PACKAGE_REPORT.md).

The optional local tools/aws/provision_circuit_monitor.py can plan/apply a
dedicated monitor identity from an extracted package. It is outside the JAR
and never runs on download; no credentials are sent to this backend. The
backend IAM addition still needs an authorized administrator to apply it
separately. [Chapter45](../docs/book/CHAPTER_45_CIRCUIT_MONITOR_PROVISIONING.md)
documents offline validation, local recovery and unrun AWS acceptance.

## V32 opt-in circuit LED control (simulator only)

SMARTFARM_IRRIGATION_CIRCUIT_DEMO_ENABLED defaults false. Separate boards
02..99 use CIRCUIT_LED_DEMO and exact VALVE##/demo/command,status,ack.
GET /api/v1/irrigation-circuits/{id}/control; POST .../commands with requestId,
action, durationSeconds (OPEN1..30/CLOSE null), expectedBootId, expectedRevision,
expectedZoneRevision, requestedAt; GET .../commands/{UUID} for reconciliation.
Stores before publish, no retry/replay, ACK never updates latest. OPEN requires
fresh CLOSED position and caught-up status; CLOSE fences older intents.
Circuit and zone edits share the tracking gate and need confirmed CLOSED.
Separate worker cannot block pump ACK storage. No shared-pump coordinator,
real valve, queue dispatch or monitor capability upgrade.
[Chapter46](../docs/book/CHAPTER_46_CIRCUIT_VALVE_LED_CONTROL.md).

## V33 static circuit route at the simulator pump

SMARTFARM_PUMP_CIRCUIT_ROUTE_REQUIRED defaults false. With pump fencing and
circuit-demo control enabled, GET /api/v1/irrigation-circuits/{id}/pump-proof
provides read-only preflight. Manual pump HttpIntent includes optional route
(circuitId/circuitRevision/zoneId/zoneRevision/controllerId/valveId); ON/RESET
must match the route reported in valveInterlock by the pump. Bound ON is
1..30s and expiry is capped by the acknowledged OPEN valve's time window.
Other configured branches must report fresh independent CLOSED positions.
Generic/ENV01 automatic ON cannot target a reported route. Emergency OFF has
no route. V33 adds nullable pump_command.circuit_route without backfill.
Circuit gate serializes proof/reservation versus valve movement/config edits;
confirm pump OFF covering every command before moving valves. No coordinator,
queue dispatch or actual water-path attestation. All new flags default off.
[Chapter47](../docs/book/CHAPTER_47_PUMP_CIRCUIT_ROUTE.md).

## V34 pump circuit history (read only)

GET /api/v1/pump-circuit-history accepts from/to (half-open receivedAt,
max31days), optional circuitId, condition ALL/ON/OFF/LOCKED, limit1..200 and
scoped cursor. V34 records new accepted route-bound pump_status rows in the
same DB transaction; no latest backfill or legacy route assignment. Samples
keep original route/boot/sequence/source/receipt/proof/NVS and known ordinal's
commandId. Singleton row locking orders ID allocation through commit.
GET /api/v1/pump-circuit-history/commands uses issuedAt and returns bounded
current ledger/ACK snapshots of route-bearing commands, with hasMore. It does
not expire commands or infer status. Emergency OFF is route-free and may be
linked by a reported sample's ordinal, not invented as a route-selected intent.
No new MQTT topic/firmware/flags, no retention policy or coordinator.
[Chapter48](../docs/book/CHAPTER_48_PUMP_CIRCUIT_HISTORY.md).

## V35 operator-confirmed irrigation sessions

SMARTFARM_IRRIGATION_SESSION_ENABLED defaults false. Mode OPERATOR_STEPS,
not an automatic scheduler. /api/v1/irrigation-circuits/{id}/session provides
GET snapshot, POST start, GET /{UUID}, POST /{UUID}/actions and GET /actions/{UUID}.
Start reserves one global unfinished session without sending; each explicit
OPEN/ON/OFF/CLOSE/FINISH action commits its identity/payload before dispatch.
Existing route/fence/ownership/proof gates remain authoritative. Outside ON/
reset/valve movements/config edits are blocked while active; emergency OFF
interrupts the session without being blocked. Late returns cannot overwrite
interruption. Startup moves all unfinished sessions to RECOVERY_REQUIRED and
never publishes/replays; completed sessions remain unchanged. CLOSE recovery
may target a fresh new valve boot; ON never resumes on another boot.
No new wire protocol, credentials, firmware or IAM. See
[chapter49](../docs/book/CHAPTER_49_OPERATOR_IRRIGATION_SESSION.md).

## V36 irrigation session history (read only)

GET /api/v1/irrigation-session-history accepts from/to (half-open creation
range, at most 31 days), optional circuitId, ALL/UNFINISHED/CLOSED/RECOVERY,
limit 1–100 and a filter-scoped cursor. GET /{circuitId}/{sessionId}/steps
lists all stored actions with session-scoped pagination and matching current
command ledger. Each response is read-only/repeatable-read; pages are not a
cross-request snapshot. Saved dispatch results remain distinct from later
ACK evidence. FINISH never has a command. Valve ACK sequence does not invent
an ACK timestamp or GPIO state; route-free OFF may be ACKed by a newer boot.
V36 adds pagination identities/indexes without changing V35 content. No
control flag, transport, firmware or IAM change; historical views work with
control disabled and without a current registry entry. See
[chapter 50](../docs/book/CHAPTER_50_IRRIGATION_SESSION_HISTORY.md).

## WEATHER monitor V37

POST /api/v1/nodes/weather declares independent WEATHER/v2 nodes. The
shared telemetry router accepts RAIN_DETECTED/boolean and LIGHT_ILLUMINANCE/lux
0..200000 with strict source/quality/unit/calibration identity. Weather
faults do not enter WATER/SOIL alert evaluators or irrigation dispatch.
GET inventory and existing node/channel history keep false/zero/null
separate; no node/device/sample is seeded by V37. Existing ENV/v1/WATER/SOIL
contracts remain. The frontend does not label stale/fault rain as dry.
[Chapter51](../docs/book/CHAPTER_51_WEATHER_NODE.md) covers the separate
simulator board and private local project helpers. No weather decision gate in V37; V38/V39 below add opt-in behavior.

## Per-zone rain admission V38 and operator weather stop V39

GET/PUT /api/v1/irrigation-zones/{id}/weather configure an opt-in WEATHER/v2
RAIN_DETECTED gate, same area/source/calibration, optimistic revisions. Both
sample clocks must be fresh under30s. Fenced ON rechecks and captures evidence;
OFF is independent. V39 adds stopOnRain=false by default, requiring the gate,
operator session profile and SMARTFARM_IRRIGATION_RAIN_STOP_ENABLED=true.
Worker polls active operator sessions after ON reservation and records one
OFF request/evidence/session before IO when rain/unknown blocks the gate.
No auto ON/CLOSE/resume or replay after uncertain IO/restart. Does not supervise
direct pump ON or the legacy ENV01 rule. Network/backend downtime still needs
device timers/interlocks. GET /{id}/weather/stops lists20 decision records with
operation and command states separately; neither proves current physical OFF.
[Chapter53](../docs/book/CHAPTER_53_SESSION_WEATHER_STOP.md) covers Windows flags,
limits and six live AWS/Wokwi cases that remain unrun.

## Circuit water admission V40

GET/PUT /api/v1/irrigation-circuits/{id}/water-gate use the circuit's bound
waterNodeId/lowChannelId and expectedSource. Opt-in policy captures circuit
revision and declared LOW calibration; existing circuits remain unconfigured.
Only VALID true with matching source/calibration and both sample clocks
under30s admits a new start. Missing/fault/stale/skew/empty/config drift blocks.
Partial FLOW, duplicate or another station cannot refresh LOW. Session create/
OPEN/proof and fenced ON reservation recheck; command water_gate evidence is
immutable on duplicate reconciliation. OFF/RESET remain independent. Generic/
legacy route-free ON cannot bypass any enabled water policy. Policy edits
require idle pump/no active session and current revisions. UI supports explicit
calibration review and GET-only uncertain-save readback. No new global flag,
MQTT topic/IAM/firmware or continuous water stop. Weather stop V39 does not
supervise LOW. See [chapter54](../docs/book/CHAPTER_54_CIRCUIT_WATER_ADMISSION.md).

## Operator LOW supervision V41

Policy stopOnUnavailable and SMARTFARM_IRRIGATION_WATER_STOP_ENABLED both
default false; require admission/session/profile enabled to opt in. Worker
checks DISPATCHING_ON/WAIT_ON operator sessions, requests OFF once for false/
unknown/fault/stale/mismatched LOW, records immutable evidence before IO.
Weather and water evaluators share the session stop latch/dispatch gate,
so only one condition claims an automatic OFF. Manual OFF, late callbacks,
uncertain IO and restart never replay/resume or overwrite a newer stop.
GET /api/v1/irrigation-circuits/{id}/water-gate/stops lists20 decision records
with operation/command states separately; neither proves physical OFF. No
direct ON/legacy-rule supervision, flow proof or automatic CLOSE/FINISH.
Device timers/interlocks still protect when backend/network is unavailable.
[Chapter55](../docs/book/CHAPTER_55_SESSION_WATER_STOP.md).
