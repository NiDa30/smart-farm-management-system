#pragma once
#define SOIL_WIFI_SSID "Wokwi-GUEST"
#define SOIL_WIFI_PASSWORD ""
#define SOIL_AWS_ENDPOINT ""
#define SOIL_FARM_ID "FARM001"
#define SOIL_NODE_ID "SOIL01"
#define SOIL_SIMULATOR 1
// ADC1 pins continue to work while ESP32 Wi-Fi is active.
#define SOIL_1_PIN 34
#define SOIL_2_PIN 35
#define SOIL_3_PIN 32
// Simulator-only fault injection: switch to ground reports SENSOR_FAULT/null.
#define SOIL_1_FAULT_PIN 27
#define SOIL_2_FAULT_PIN 14
#define SOIL_3_FAULT_PIN 25
// Demo range: raw 0 = dry, 4095 = wet. Physical probes need individual calibration.
#define SOIL_1_DRY 0
#define SOIL_1_WET 4095
#define SOIL_2_DRY 0
#define SOIL_2_WET 4095
#define SOIL_3_DRY 0
#define SOIL_3_WET 4095
#define SOIL_1_CALIBRATION_VERSION "SIM_LINEAR_V1"
#define SOIL_2_CALIBRATION_VERSION "SIM_LINEAR_V1"
#define SOIL_3_CALIBRATION_VERSION "SIM_LINEAR_V1"
