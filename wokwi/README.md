# Legacy HiveMQ example

This folder is the earlier demonstration, not the current AWS agricultural
simulator. Open [firmware/esp32/diagram.json](../firmware/esp32/diagram.json)
and use [its Wokwi configuration](../firmware/esp32/wokwi.toml).

Follow [chapter 21](../docs/book/CHAPTER_21_RESERVOIR_INTERLOCK.md) to rebuild
the private firmware image and enable the reservoir switch. The flash image
contains private certificates and must not be uploaded to a public project.

For the standalone WATER monitor, follow [chapter23](../docs/book/CHAPTER_23_WATER_NODE_MONITOR.md)
and create a private .local/water-nodes/NODE_ID project from
[firmware/water-node](../firmware/water-node/README.md). It has its own client
and certificates; the legacy diagram in this folder does not include it.
