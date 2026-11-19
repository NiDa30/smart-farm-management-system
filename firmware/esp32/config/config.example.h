#pragma once
// Copy to config.local.h (ignored). Never put certificates or passwords in Git.
#define FARM_WIFI_SSID "Wokwi-GUEST"
#define FARM_WIFI_PASSWORD ""
#define FARM_AWS_ENDPOINT ""
#define FARM_ID "FARM001"
#define FARM_DEVICE_ID "ENV01"
#define FARM_DHT_PIN 15
#define FARM_SOIL_PIN 34
#define FARM_RELAY_PIN 26
#define FARM_RELAY_OFF_LEVEL LOW
// Calibrate for the actual sensor. Wokwi potentiometer: low=wet, high=dry.
#define FARM_SOIL_WET_ADC 0
#define FARM_SOIL_DRY_ADC 4095

// Set 1 only for the private ENV01 Wokwi relay demo.
#define FARM_CONTROL_ENABLED 0

// Wokwi float switch: GPIO27 -> switch common (2), terminal 1 -> GND.
// Closed to GND = water present; open/disconnected = dry. Never wire 5V to GPIO.
// Existing config.local.h files must explicitly opt in to this new interlock.
#define FARM_WATER_INTERLOCK_ENABLED 1
#define FARM_WATER_LEVEL_PIN 27

// Wokwi-only future issuedAt tolerance; production/default remains 2 seconds.
#define FARM_WOKWI_CLOCK_TOLERANCE_SECONDS 2

// Extra actuators on ENV01 (contract v3, see contracts/iot/v3). 0 keeps PUMP01 only.
// Wokwi loads are LEDs on the GPIO; real hardware needs relay modules and its own
// electrical interlocks. Use -1 to leave a channel out.
#define FARM_ACTUATORS_ENABLED 0
#define FARM_VALVE_PINS {25, 33, 32, 13}   // VALVE01..VALVE04, one per zone
#define FARM_FAN_PIN 18
#define FARM_LIGHT_PIN 19
#define FARM_MIST_PIN 21
// One shared pump: refuse PUMP01 ON without an open valve; closing the last valve stops it.
#define FARM_PUMP_REQUIRES_VALVE 1
#define FARM_MAX_OPEN_VALVES 1
// Hard caps per ON command (seconds). PUMP01 stays at 3600.
#define FARM_VALVE_MAX_SECONDS 3600
#define FARM_FAN_MAX_SECONDS 14400
#define FARM_LIGHT_MAX_SECONDS 14400
#define FARM_MIST_MAX_SECONDS 600
// Misting draws from the same reservoir: dry float trips it with lockout, like the pump.
#define FARM_MIST_USES_RESERVOIR 1
