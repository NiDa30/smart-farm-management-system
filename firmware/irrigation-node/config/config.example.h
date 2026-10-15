#pragma once
#define IRRIGATION_AWS_ENDPOINT ""
#define IRRIGATION_WIFI_SSID "Wokwi-GUEST"
#define IRRIGATION_WIFI_PASSWORD ""
#define IRRIGATION_ZONE_ID "ZONE01"
// LED simulation only. Never connect a pump or a real valve to this prototype.
#define IRRIGATION_DEMO_ENABLED 0
#define IRRIGATION_SIMULATOR 1
// Optional two end-stop switches: GPIO32=CLOSED, GPIO33=OPEN, active LOW.
// Independent inputs; no automatic movement of switches by the LED command.
#ifndef IRRIGATION_POSITION_FEEDBACK_ENABLED
#define IRRIGATION_POSITION_FEEDBACK_ENABLED 0
#endif
// Separate monitor board: IDs 02..99, no command subscription, GPIO26 always LOW.
#ifndef IRRIGATION_MONITOR_ONLY
#define IRRIGATION_MONITOR_ONLY 0
#endif
#ifndef IRRIGATION_CONTROLLER_ID
#define IRRIGATION_CONTROLLER_ID "IRRIGATION01"
#endif
#ifndef IRRIGATION_VALVE_ID
#define IRRIGATION_VALVE_ID "VALVE01"
#endif
#ifndef IRRIGATION_CIRCUIT_ID
#define IRRIGATION_CIRCUIT_ID "CIRCUIT01"
#endif
#ifndef IRRIGATION_CIRCUIT_REVISION
#define IRRIGATION_CIRCUIT_REVISION 1
#endif
#ifndef IRRIGATION_ZONE_REVISION
#define IRRIGATION_ZONE_REVISION 1
#endif
