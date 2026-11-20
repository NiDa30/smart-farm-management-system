#pragma once
// Wokwi CI self-test only (env:wokwi_selftest). No Wi-Fi, no AWS, no secrets:
// commands are scripted in firmware and MQTT output is printed to Serial.
#define FARM_WIFI_SSID "Wokwi-GUEST"
#define FARM_WIFI_PASSWORD ""
#define FARM_AWS_ENDPOINT ""
#define FARM_ID "FARM001"
#define FARM_DEVICE_ID "ENV01"
#define FARM_DHT_PIN 15
#define FARM_SOIL_PIN 34
#define FARM_RELAY_PIN 26
#define FARM_RELAY_OFF_LEVEL LOW
#define FARM_SOIL_WET_ADC 0
#define FARM_SOIL_DRY_ADC 4095
#define FARM_CONTROL_ENABLED 1
#define FARM_WATER_INTERLOCK_ENABLED 1
#define FARM_WATER_LEVEL_PIN 27
#define FARM_WOKWI_CLOCK_TOLERANCE_SECONDS 2
#define FARM_ACTUATORS_ENABLED 1
#define FARM_VALVE_PINS {25, 33, 32, 13}
#define FARM_FAN_PIN 18
#define FARM_LIGHT_PIN 19
#define FARM_MIST_PIN 21
#define FARM_PUMP_REQUIRES_VALVE 1
#define FARM_MAX_OPEN_VALVES 1
#define FARM_VALVE_MAX_SECONDS 3600
#define FARM_FAN_MAX_SECONDS 14400
#define FARM_LIGHT_MAX_SECONDS 14400
#define FARM_MIST_MAX_SECONDS 600
#define FARM_MIST_USES_RESERVOIR 1
#define FARM_DEVMGMT_ENABLED 1
#define FARM_FIRMWARE_VERSION "1.4.0-selftest"
// Throwaway test key from include/testvectors/OtaTestVector.h; never a release key.
#define FARM_OTA_PUBLIC_KEY_PEM ota_test::kPublicKey
