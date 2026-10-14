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

// Local flow protection, opt-in. GPIO25 clock/gate in Wokwi is simulated, not water.
#define FARM_FLOW_INTERLOCK_ENABLED 0
#define FARM_FLOW_PIN 25
#define FARM_FLOW_SIMULATOR 1
#define FARM_FLOW_PULSES_PER_LITRE 450.0
#define FARM_FLOW_MINIMUM_LPM 1.0
#define FARM_FLOW_MAXIMUM_HZ 2000.0
#define FARM_FLOW_GRACE_MS 5000
// PHYSICAL mode (SIMULATOR=0) requires a declared calibration version and field validation.
#define FARM_FLOW_CALIBRATION_VERSION ""
