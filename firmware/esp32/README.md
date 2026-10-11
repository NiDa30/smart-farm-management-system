# ESP32 Day 1 AWS TLS spike

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

For a physical board later: `pio run -t upload`, `pio run -t uploadfs`, `pio device monitor`. Wokwi needs a **private local VS Code project** and a supported filesystem-image provisioning path; check simulator version/account capabilities before copying keys. Do not upload private keys or filesystem images to public Wokwi projects. This cloud session cannot directly operate your Wokwi simulator or confirm its private filesystem support.

The existing root `wokwi/sketch.ino` remains the legacy HiveMQ example, and is not the AWS demo firmware. Build/run the authoritative `firmware/esp32` output instead; do not report legacy sketch results as AWS gate success. For Wokwi use the private diagram below plus the extension's supported ESP32 flash/filesystem image procedure. If LittleFS is unavailable/missing credentials, firmware fails closed (relay OFF). Configure endpoint; wait for time sync and MQTT TLS. Serial must show AWS MQTT connected and QoS1 PUBACK; Test Client must show actual schema packets.

Day1 limitations: reconnection uses fixed10s Wi-Fi and SDK5s MQTT retries; bounded backoff/jitter and command handler/timer safety are Day2/5 work. No ACK/actuator/PUMP01 status yet. Board pin/electrical calibration, Wokwi filesystem support and live AWS connection are unverified until hardware/simulator tests. Firmware compilation is also unverified while PlatformIO registry access is blocked in the cloud.
