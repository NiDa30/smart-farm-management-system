# ESP32 Day 1 AWS TLS spike

Control update: a Wokwi-only GPIO26/LED demo is now implemented but disabled by
default. Follow [chapter 10](../../docs/book/CHAPTER_10_WOKWI_RELAY_CONTROL.md)
to enable it, update backend IAM and verify runtime. Earlier Day 1 limitations
below are historical. Compile/native tests are not live relay evidence.

Current demo: one ESP32 (`ENV01`) reads DHT22 and calibrated soil ADC,
publishes QoS1 telemetry over AWS MQTT/TLS, and controls `PUMP01` through GPIO26
when explicitly enabled. Boot output is OFF. Commands have ACK/status,
deduplication, expiry and an independent cutoff (manual 1–3600 seconds;
automatic backend rule 1–30 seconds). Network loss while ON forces OFF/lockout.
No physical pump or water flow has been verified.

The agricultural diagram now includes a relay module, LED load through its NO
contact, and a reservoir float switch represented by a slide switch:

| Component | GPIO | Operation |
|---|---|---|
| DHT22 | 15 | Temperature and air humidity |
| Soil potentiometer | 34 | Low ADC = wet, high ADC = dry |
| PUMP01 relay input | 26 | Diagram uses `transistor=pnp`; verify HIGH closes COM–NO in Wokwi |
| Reservoir switch common (2) | 27 | Terminal 1 to GND: left=water, right/open=dry |

Use **`firmware/esp32/diagram.json`**, not the legacy root `wokwi/diagram.json`.
See [chapter 21](../../docs/book/CHAPTER_21_RESERVOIR_INTERLOCK.md) for the Windows
update/build instructions and unrun live test matrix. Existing private
`config.local.h` is preserved: add `FARM_WATER_INTERLOCK_ENABLED 1` and
`FARM_WATER_LEVEL_PIN 27` there to enable this new input. Missing flag defaults
to disabled for existing installations; the new example opts in. Keep control
disabled unless testing the private Wokwi demo. Do not overwrite your local
endpoint/certificates to update these flags.

An enabled open/disconnected switch trips OFF/lockout even at boot while idle.
Restoring water does not resume ON or clear lockout. RESET is rejected with
`WATER_LOW` while dry; OFF remains allowed. Backend stores the device reason,
and Control / Safety / Event Log display it. This is a binary input, not a water
percentage/flow measurement. Checking is in the Arduino loop and immediately
before command output; there is no certified physical dry-run protection or
persistent NVS lockout. Real hardware requires its own electrical interlocks.

For new installations only (do not overwrite existing private config):

```bash
cd firmware/esp32
cp config/config.example.h config/config.local.h
# Edit endpoint from AWS Data-ATS output and Wi-Fi settings privately.
pio run -j 2
pio run -t buildfs
```

Put AmazonRootCA1.pem, device.pem.crt and private.pem.key in ignored `data/`, then buildfs. Root CA comes from the official TLS-verified source `https://www.amazontrust.com/repository/AmazonRootCA1.pem`; do not disable TLS to obtain it. Provisioning script writes the client files to `.local/aws/`; copy privately, not into tracked code. Use directory700/key600. Firmware filesystem image contains the key and must remain private/ignored.

After both firmware and LittleFS builds, from the repository root run:

```bash
python tools/wokwi/merge_flash.py
```

The helper reads partition offsets from the built table, validates segment sizes
and overlap, and merges bootloader, partition table, OTA initialization, app and
LittleFS into a private 4 MiB flash image. It uses the default PlatformIO core
directory (or PLATFORMIO_CORE_DIR / --core-dir). Wokwi config points to this
ignored image; regenerate it after firmware or certificate/filesystem changes.
On Windows use `.local/day1-venv/Scripts/python.exe`. A successful merge proves image assembly only. Prior user-provided TLS/PUBACK
evidence remains separate from acceptance of the new relay/float wiring.

For MQTT connection diagnosis, stop the simulator and run from repository root:
`python tools/aws/check_device_connection.py`. It checks the same local PEM pair,
endpoint/client ID and MQTT CONNECT, without publishing or a Last Will. A pass
does not verify firmware LWT/publish authorization or simulator networking.
If Windows connects but the simulator does not, test the official
[Wokwi private gateway](https://github.com/wokwi/wokwigw): run `wokwigw.exe`,
keep it running, and add `[net]` with `gateway="ws://localhost:9011"` to the
local Wokwi config. No bridge mode or TAP driver is required for this test.
This gateway comparison is diagnostic, not a confirmed fix until serial evidence
shows MQTT connected and PUBACK.

For a physical board later: `pio run -t upload`, `pio run -t uploadfs`, `pio device monitor`. Wokwi needs a **private local VS Code project** and a supported filesystem-image provisioning path; check simulator version/account capabilities before copying keys. Do not upload private keys or filesystem images to public Wokwi projects. This cloud session cannot directly operate your Wokwi simulator or confirm its private filesystem support.

The existing root `wokwi/sketch.ino` remains the legacy HiveMQ example, and is not the AWS demo firmware. Build/run the authoritative `firmware/esp32` output instead; do not report legacy sketch results as AWS gate success. For Wokwi use the private diagram below plus the extension's supported ESP32 flash/filesystem image procedure. If LittleFS is unavailable/missing credentials, firmware fails closed (relay OFF). Configure endpoint; wait for time sync and MQTT TLS. Serial must show AWS MQTT connected and QoS1 PUBACK; Test Client must show actual schema packets.

Remaining limitations: fixed10s Wi-Fi / SDK5s MQTT retry, no durable NVS state
or event replay, and no automatic ON recovery. Existing AWS telemetry/manual
control have user-provided evidence; the new relay-contact/float-switch demo
still needs the Windows/Wokwi tests in chapter 21. Cloud firmware compilation,
native safety tests, SQL ingestion and browser fixtures do not prove live GPIO.


## Local flow guard (opt-in)

See [chapter26](../../docs/book/CHAPTER_26_LOCAL_FLOW_GUARD.md). Dedicated GPIO25
clock/gate was added to this diagram, independently of WATER01 monitoring.
Existing private configs default disabled if new macros are absent. Enable
flow only alongside the reservoir interlock, rebuild and merge locally.
No cloud status capability proves enablement/calibration; live acceptance is
pending. This prototype forces GPIO OFF, not proof of physical pump/water state.

## Opt-in PUMP01 MQTT boot/ordinal fence

New config FARM_PUMP_FENCING_ENABLED defaults0, including existing private
configs without the define. Enable1 together with backend
SMARTFARM_PUMP_FENCING_ENABLED=true/controltrue, rebuild app/FS/merge and
reboot. Same ENV01 cert/client/topic, no new wiring. ON/RESET require target
boot and increasing ordinal; duplicate/stale commands publish status only.
Legacy OFF remains accepted but closes/locks until device reboot. This is
not HTTP intent ordering, pump ownership, NVS or multi-zone actuation.
[Chapter34](../../docs/book/CHAPTER_34_PUMP_COMMAND_FENCING.md) includes Windows
steps and six live cases still unrun. Do not reuse public test flash as a
credentialed device; no key/endpoint was copied during cloud verification.
