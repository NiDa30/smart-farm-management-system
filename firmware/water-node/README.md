# Standalone WATER monitor (A2 monitoring slice)

ESP32 publishes LOW/HIGH float inputs and pulse-derived FLOW as telemetry v2.
No pump/valve output, command subscription, retained telemetry or Last Will.
The GPIO2 LED indicates warming up / invalid float pair / invalid flow sample.

- LOW GPIO27, HIGH GPIO14: INPUT_PULLUP, closed to GND=water present.
- FLOW GPIO25: count rising edges; INPUT_PULLDOWN. A zero count is not proof
  of sensor connectivity or pump failure.
- Wokwi clock 45 Hz / factor 450 pulses/L gives approximately6 L/min. Slide gate
  selects clock pulses or GND (zero). This is simulated input, not real water.
- Float pair must settle100 ms. LOW dry/HIGH wet is inconsistent; both values
  become SENSOR_FAULT/null. No percentage/volume is inferred.
- Flow uses actual elapsed sample window, calibrated factor and maximum pulse
  rate. Overflow/invalid window/calibration/excess rate -> fault/null, not zero.
- Default dataSource=SIMULATOR. PHYSICAL is only an operator/device declaration;
  hardware calibration and installation still require their own acceptance.

Use [chapter23](../../docs/book/CHAPTER_23_WATER_NODE_MONITOR.md), not manual
copying of ENV01 keys. Register the WATER node in the web; provision its own
certificate with tools/aws/provision_water_node.py, then prepare an isolated
`.local/water-nodes/WATER01` project using tools/water/prepare_local_node.py.
Build/run that private project's diagram; each node has its own config/data,
clientId, manifest and flash image. Never upload the image/PEMs to a public
project or commit them. The tracked template has no endpoint/certificates.

Firmware built in cloud, native model/packet and schema/SQL/UI tests passed.
Actual AWS/Wokwi circuit, TLS credentials and gateway still require local
acceptance. pH/EC/temp/pressure, pump no-flow shutdown, central water alerts,
NVS and offline job recovery are not implemented in this slice. Old ENV01
local GPIO27 pump interlock remains independent.
