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
