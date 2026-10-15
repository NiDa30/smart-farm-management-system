# IRRIGATION01 / VALVE01 LED prototype

Standalone ESP32 GPIO26 →330Ω→blue LED→GND, not the ENV01 board. Only a
single timer-controlled GPIO. V25 adds optional independent simulated end stops;
no pump, physical valve verification or coordinator.
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

## Optional position feedback (V25)

Set IRRIGATION_POSITION_FEEDBACK_ENABLED=1 in the ignored controller config;
old configs without the macro default to0. New diagram adds closedStop GPIO32
(center2 to GPIO, contact1 GND) and openStop GPIO33 (center2 to GPIO, contact3
GND), INPUT_PULLUP/active LOW. Inputs are independent of GPIO26: only closed
active=CLOSED, only open=OPEN, neither=UNKNOWN, both=CONFLICT.
Debounce100ms; travel timeout3s; conflict/position-loss/timeout force GPIO LOW
and latch a fault. Stable CLOSED plus a newly accepted CLOSE clears it; no
auto resume. Repeated bouncing cannot extend the loss deadline indefinitely.
Update backend first, then build app/FS/merge and restart Wokwi. Set backend
SMARTFARM_IRRIGATION_POSITION_FEEDBACK_REQUIRED=true to reject old GPIO-only
status as an OPEN precondition. Backend default false preserves LED-only demo.
No IAM/topic/certificate change. See [chapter37](../../docs/book/CHAPTER_37_VALVE_POSITION_FEEDBACK.md)
for six unrun live cases and limits; feedback is SIMULATOR, not physical
mechanical/water-delivery acceptance. Never infer position from command ACK.


## Optional separate monitor board (V27)

Set IRRIGATION_MONITOR_ONLY1, DEMO_ENABLED0 and own CONTROLLER_ID/VALVE_ID02–99,
CIRCUIT_ID/CIRCUIT_REVISION, ZONE_ID/ZONE_REVISION matching a current simulator
circuit. Position feedback remains an explicit opt-in. One valve per board;
simultaneously running boards need distinct controller/client IDs and their
own certificate/status-only policy. No command subscribe or ACK publish, GPIO26
stays LOW; monitor+demo-enabled is a compile error. Legacy01 profile defaults
unchanged when new macros are absent. No physical-valve mode.

Backend flag SMARTFARM_IRRIGATION_MONITOR_ENABLED=true plus appropriate exact
status Subscribe/Receive policy is needed. Restart backend after adding a new
valve/topic. Circuit revision changes require updated firmware config and a
new boot; monitor faults need corrected inputs and reboot, no CLOSE/reset
command is provided.
[Vietnamese chapter39](../../docs/book/CHAPTER_39_CIRCUIT_VALVE_MONITOR.md) lists
configuration, policy rendering and Windows/Wokwi cases still unrun.
