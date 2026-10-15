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
#define IRRIGATION_POSITION_FEEDBACK_ENABLED 0
