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
