# MQTT contract v4 — remote configuration and OTA for ENV01

| Topic (`smartfarm/FARM001/ENV01/…`) | Direction | Schema |
|---|---|---|
| `config` | backend → device | `config.schema.json` |
| `config-ack` | device → backend | `config-ack.schema.json` |
| `config-state` | device → backend, on connect and after every config | `config-state.schema.json` |
| `ota` | backend → device | `ota.schema.json` |
| `ota-status` | device → backend | `ota-status.schema.json` |

QoS1, retain=false (retained messages are refused as `RETAINED_COMMAND`). Lifetime ≤ 60 s.

## Configuration

- Settings are applied **whole or not at all**, only if `revision` is strictly greater than the
  applied one (`STALE_REVISION`), then persisted to NVS (revision written last).
- The same `configId` always gets the same ACK (safe retry); a new request needs a new revision.
- Bounds (device = backend = UI): telemetry 5–10 s (backend freshness 15 s), heartbeat 5–20 s
  (offline after 30 s), soil ADC 0–4095 with ≥ 200 between wet and dry, pump cap 1–3600 s.
  The pump cap can only narrow the compiled cap; the contract v1 limit stays 3600 s.

## OTA

1. Build, then sign: `python tools/ota/sign_firmware.py .pio/build/esp32dev/firmware.bin --version 1.4.0`
   (key from `tools/ota/ota_keys.py`, private half only under `.local/ota`).
2. Upload the image (e.g. S3), register `version/size/sha256/signature/url` with
   `POST /api/v1/devices/ENV01/ota/releases`; the backend verifies the signature with
   `SMARTFARM_OTA_PUBLIC_KEY` and only accepts `https://` URLs on `SMARTFARM_OTA_HOST_SUFFIX`.
3. `POST /api/v1/devices/ENV01/ota/jobs {"version":"1.4.0"}` — refused unless the device reports
   config-state, runs a different version, PUMP01 and all actuators are OFF, no zone sequence
   and no watering rule.

Device side: refuses unless every output is OFF (`ACTUATORS_ACTIVE`); blocks every ON command
while writing (`OTA_IN_PROGRESS`); streams into the inactive partition while hashing; the boot
partition changes **only after** SHA-256 and the ECDSA P-256 signature (compiled-in public key)
both match; then reboots into a **trial**. The trial is confirmed when MQTT is connected and
config-state was published; otherwise, after 120 s or on the 4th boot (crash loop), the device
returns to the previous partition and later reports `ROLLED_BACK`.

Stages: `RECEIVED → DOWNLOADING(25/50/75/100) → REBOOTING → CONFIRMED | ROLLED_BACK`, or
`REJECTED` / `FAILED` with an error code (`HASH_MISMATCH`, `BAD_SIGNATURE`, `URL_NOT_ALLOWED`,
`SIZE_MISMATCH`, `DOWNLOAD_TIMEOUT`, `CONNECTION_LOST`, `OTA_DISABLED`, …).

IAM is additive (`tools/aws/provision_devmgmt.py`, policy `SmartFarmMvpENV01DevMgmt`).
