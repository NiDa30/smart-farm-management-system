#pragma once
#define WEATHER_WIFI_SSID "Wokwi-GUEST"
#define WEATHER_WIFI_PASSWORD ""
#define WEATHER_AWS_ENDPOINT ""
#define WEATHER_FARM_ID "FARM001"
#define WEATHER_NODE_ID "WEATHER01"
#define WEATHER_SIMULATOR 1
// Simulator switch grounded = rain detected. Open input = no rain, not wire diagnosis.
#define WEATHER_RAIN_PIN 27
// ADC1 dial sets simulated 0..200,000 lux; it is not an LDR calibration formula.
#define WEATHER_LIGHT_PIN 34
// Independent switches grounded = SENSOR_FAULT/null, never dry/zero fallback.
#define WEATHER_RAIN_FAULT_PIN 14
#define WEATHER_LIGHT_FAULT_PIN 25
