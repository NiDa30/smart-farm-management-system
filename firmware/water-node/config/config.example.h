#pragma once
// No certificates or private endpoint in tracked files. Prepare per-node project
// with tools/water/prepare_local_node.py after registering/provisioning the node.
#define WATER_WIFI_SSID "Wokwi-GUEST"
#define WATER_WIFI_PASSWORD ""
#define WATER_AWS_ENDPOINT ""
#define WATER_FARM_ID "FARM001"
#define WATER_NODE_ID "WATER01"
#define WATER_LOW_PIN 27
#define WATER_HIGH_PIN 14
#define WATER_FLOW_PIN 25
#define WATER_FAULT_LED_PIN 2
// Float input closed to GND = water present at that sensor's height.
#define WATER_SIMULATOR 1
// 45 Hz / 450 pulses per litre = approximately 6 L/min simulated flow.
// This is a simulator setting, not calibration of a physical flow meter.
#define WATER_PULSES_PER_LITRE 450.0
#define WATER_MAX_PULSE_HZ 2000.0
// Empty string serializes as null; must match channel FLOW in local registry.
#define WATER_FLOW_CALIBRATION_VERSION ""
