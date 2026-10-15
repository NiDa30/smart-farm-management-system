# IRRIGATION01 / VALVE01 LED prototype

Standalone ESP32 GPIO26 →330Ω→blue LED→GND, not the ENV01 board. Only a
single timer-controlled GPIO; no pump, mechanical feedback or coordinator.
Default output CLOSED and demo disabled. Physical hardware use is unsupported.
See [chapter32](../../docs/book/CHAPTER_32_IRRIGATION_VALVE_DEMO.md) for Windows,
AWS certificate/policy, private config, filesystem and Wokwi instructions.

`config/config.example.h` is public and blank. Create ignored config.local.h
with endpoint, correct zone ID, demo opt-in1, SIMULATOR1. Put that controller's
own active cert/private key and AmazonRootCA1.pem in ignored data/. Never
reuse ENV/WATER/SOIL keys, commit data, flash image or upload to public Wokwi.
Render narrow policies with tools/aws/render_irrigation_policies.py; no --apply
or provisioning implementation exists for this controller in that helper.

From repo (Python environment with PlatformIO):

```bash
python -m platformio run --project-dir firmware/irrigation-node
python -m platformio run --project-dir firmware/irrigation-node -t buildfs
python tools/wokwi/merge_flash.py --project-dir firmware/irrigation-node
```

Use the same PlatformIO core directory for compile and merge (--core-dir when
needed). Open diagram.json through the existing licensed VS Code Wokwi setup;
wokwi.toml points at .pio/build/esp32dev/wokwi-private/flash.bin. Public cloud
checks used a separate /tmp build with empty FS, never private keys/live AWS.

Native ValveModel/ValvePacket tests cover deadline, wrap, boot binding,
ordinal/dedup, network stop, decoding and source/feedback labels. ESP timer
adapter, MQTT reconnection and physical GPIO still need Wokwi/live acceptance.
