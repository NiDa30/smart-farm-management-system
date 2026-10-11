# Day 1 execution evidence — 11/10/2026

## Subsequent local execution update

The report below records the original cloud baseline, not the latest overall
project state. Branch `feat/day1-iot-foundation` was subsequently committed/pushed.
The user supplied successful AWS provisioning output from their Windows machine:
`AWS Thing/certificate/policy provisioned. Private files and endpoint saved to ...`.
Windows DACL and direct botocore dependency fixes were pushed; cloud checks passed
8 tests, while the user's Windows run passed 7 with 1 POSIX-only skip.
AWS authentication/provisioning is therefore confirmed by user-provided output on
their local host, not by execution in this cloud runtime. Firmware build, private
Wokwi filesystem support, live telemetry and backend MQTT connection remain
unverified. See the maintained [build journal](../book/BUILD_JOURNAL.md) and
[troubleshooting record](../book/TROUBLESHOOTING.md) for current state.

## Original cloud baseline (historical)

Baseline HEAD: `5848a623d73390f914f423e8147f91147474c690`, changes currently in shared working tree; no commit/push performed. User confirmed AWS account with IoT permissions and Wokwi (no physical ESP32). Singapore is default region for demo latency; no claim of cheapest current price.

## Implemented

- Fix invalid toast error type; Node24.19.0 pin, existing package lock unchanged.
- JSON Schemas/examples for telemetry, command, ACK, status, safety event; frozen topics/seconds/freshness and backend diagnostic echo.
- Scoped device and backend policies renderer; authenticated provisioning script with account check/private output/recovery manifest and protection for conflicting existing resources. Only offline render tested, not AWS apply.
- Spring Boot3.5.16/Java21/Maven3.9.11 bootstrap; AWS IoT SDK1.34.0 WSS/SigV4/CRT probe. Probe publishes backend-owned echo only, not pump command. Optional explicit HTTP CONNECT proxy configuration.
- ESP32 Arduino/ESP-MQTT TLS/QoS1 firmware baseline, private LittleFS provisioning, DHT/soil input and safe OFF output; private Wokwi diagram/config. This source is not yet compiled or live verified.
- Ignore local configs/cert/filesystem/binaries/build outputs; AWS and firmware/backend runbooks.

## Verified in this instance

| Check | Outcome | Scope |
|---|---|---|
| `npm run lint` | PASS | Previously failing toast now typechecks |
| `npm run build` | PASS | Existing bundle/config-loader warnings remain nonblocking |
| Python unittest contracts/policy | PASS,6 tests | Valid examples, invalid IDs/ranges/time, bounded ON duration, OFF/reset duration prohibition, failed ACK error and device policy scope |
| Python provisioning syntax/help/render | PASS | Rendered dummy-account policy offline only; no AWS resources created |
| Maven wrapper `verify` | PASS,1 test,0 skipped | Full JDK21 compile and executable package |
| Spring Boot executable startup | PASS | Application context starts successfully; no web/database service yet |
| MQTT probe `--self-test` | CRT_NATIVE_BUILD_PASS | Native CRT load/WSS builder only, **no AWS connect** |
| Maven/JDK acquisition | Verified official checksums | Maven archive SHA512, wrapper SHA256 pinned; JDK official SHA256; Java trust restored using supplied system CA store, verification not disabled |
| Git ignore paths/diff whitespace | PASS | Key/config/bin/target local outputs ignored; no credential files provisioned |

Detailed build logs for this instance: `/tmp/day1-backend-build.log`, `/tmp/day1-firmware-build.log`. Temporary files do not substitute persistent live-test evidence.

## Unresolved gates

1. **AWS identity:** read-only `aws sts get-caller-identity` failed because runtime's AWS profile is not configured. AWS_CONFIG/credentials files are present but empty; access-key/session/web-identity/container bindings absent. User has permissions in their account but no usable identity was injected into this machine. No Thing/cert/policy created, no live WSS/PUBACK/telemetry verification.
2. **Firmware build:** PlatformIO registry proxy CONNECT403; platform/toolchain not installed. Compile is BLOCKED/UNRUN, not PASS. Platform version6.12.0 exists upstream; private network domain additions saved in environment draft but not applied to running instance.
3. **Wokwi:** no simulator/hardware connected here. Private filesystem image/CA/key loading and MQTT TLS still require a supported private simulator workflow on user's side. Source and guide do not prove Wokwi accepts private LittleFS images.
4. **TC-IOT-015/G1:** real policy-deny/certificate tests and5-minute firmware→AWS→backend observation not run.

Saved custom network additions: `api.registry.platformio.org`, `dl.registry.platformio.org`, `dl.espressif.com`, `www.amazontrust.com`; package-manager presets preserved. No secret values saved. User must review/save relevant settings to apply networking; draft save is not runtime change/publication.

Next: follow [AWS_SETUP.md](./AWS_SETUP.md), supply an authenticated AWS runtime or run provisioning/probe on an authenticated local host, apply required network access then compile firmware, run private Wokwi and collect live G1 evidence. Day1 is **partially implemented, not complete**. Day2/3 services/control are not claimed ready.
