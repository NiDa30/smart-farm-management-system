# ESP32 Day 1 AWS TLS spike

Control update: a Wokwi-only GPIO26/LED demo is now implemented but disabled by
default. Follow [chapter 10](../../docs/book/CHAPTER_10_WOKWI_RELAY_CONTROL.md)
to enable it, update backend IAM and verify runtime. Earlier Day 1 limitations
below are historical. Compile/native tests are not live relay evidence.

This is a build/provisioning baseline, not completed remote control. Relay stays OFF. ESP-MQTT publishes real DHT22+ADC readings using QoS1 to AWS, with TLS CA/hostname/client certificate verification. No fabricated soil data. GPIO34 must be wired to a calibrated sensor or Wokwi potentiometer before accepting sample evidence.

Pins: DHT22 GPIO15 (existing diagram); potentiometer signal GPIO34, rails3V3/GND; relay GPIO26. Set `FARM_RELAY_OFF_LEVEL` for relay polarity; on real hardware use safe pull resistors/low-voltage loads. No actuator ON test in this Day1 firmware.

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
On Windows use `.local/day1-venv/Scripts/python.exe`. Runtime loading in Wokwi
still requires verification; a successful merge does not prove TLS connectivity.

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

Day1 limitations: reconnection uses fixed10s Wi-Fi and SDK5s MQTT retries; bounded backoff/jitter and command handler/timer safety are Day2/5 work. No ACK/actuator/PUMP01 status yet. Board pin/electrical calibration, Wokwi filesystem support and live AWS connection are unverified until hardware/simulator tests. Firmware compilation is also unverified while PlatformIO registry access is blocked in the cloud.
