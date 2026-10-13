#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <DHTesp.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <esp_system.h>
#include <time.h>

#if __has_include("config.local.h")
#include "config.local.h"
#else
#include "config.example.h"
#endif

// Day 1: transport/telemetry spike. No command handler; relay stays OFF.
static DHTesp dht;
static esp_mqtt_client_handle_t client = nullptr;
static volatile bool connected = false;
static String ca, certificate, privateKey, uri, telemetryTopic, statusTopic;
static char bootId[37];
static uint32_t sequence = 0, lastSample = 0, lastHeartbeat = 0, lastWifiAttempt = 0;

static String readPem(const char *path) {
  File f = LittleFS.open(path, "r");
  if (!f || f.size() > 8192) return String();
  return f.readString();
}

static String timestamp() {
  time_t now = time(nullptr);
  struct tm utc;
  gmtime_r(&now, &utc);
  char out[25];
  strftime(out, sizeof(out), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return String(out);
}

static void base(JsonDocument &doc) {
  doc["schemaVersion"] = 1;
  doc["deviceId"] = FARM_DEVICE_ID;
  doc["bootId"] = bootId;
  doc["sequence"] = sequence++;
  doc["timestamp"] = timestamp();
}

static void publishStatus() {
  JsonDocument doc;
  base(doc);
  doc["connection"] = "ONLINE";
  String payload;
  serializeJson(doc, payload);
  esp_mqtt_client_publish(client, statusTopic.c_str(), payload.c_str(), 0, 1, 1);
}

static void mqttEvent(void *, esp_event_base_t, int32_t id, void *) {
  if (id == MQTT_EVENT_CONNECTED) {
    connected = true;
    Serial.println("AWS MQTT connected (TLS verified)");
  } else if (id == MQTT_EVENT_DISCONNECTED || id == MQTT_EVENT_ERROR) {
    connected = false;
    Serial.println("AWS MQTT unavailable; check endpoint/cert/policy/network");
  } else if (id == MQTT_EVENT_PUBLISHED) {
    Serial.println("MQTT QoS1 PUBACK received");
  }
}

static bool startMqtt() {
  ca = readPem("/AmazonRootCA1.pem");
  certificate = readPem("/device.pem.crt");
  privateKey = readPem("/private.pem.key");
  if (ca.isEmpty() || certificate.isEmpty() || privateKey.isEmpty()) {
    Serial.println("Missing private LittleFS certificate provisioning; relay remains OFF");
    return false;
  }
  uri = String("mqtts://") + FARM_AWS_ENDPOINT + ":8883";
  telemetryTopic = String("smartfarm/") + FARM_ID + "/" + FARM_DEVICE_ID + "/telemetry";
  statusTopic = String("smartfarm/") + FARM_ID + "/" + FARM_DEVICE_ID + "/status";
  // One LWT per physical connection. Server uses arrival time, not boot-time timestamp.
  static String lwt;
  JsonDocument will;
  base(will);
  will["connection"] = "OFFLINE";
  will["reason"] = "CONNECTION_LOST";
  serializeJson(will, lwt);
  esp_mqtt_client_config_t cfg = {};
  cfg.uri = uri.c_str();
  cfg.client_id = FARM_DEVICE_ID;
  cfg.cert_pem = ca.c_str();
  cfg.client_cert_pem = certificate.c_str();
  cfg.client_key_pem = privateKey.c_str();
  cfg.keepalive = 30;
  cfg.network_timeout_ms = 8000;
  cfg.reconnect_timeout_ms = 5000;
  cfg.buffer_size = 2048;
  cfg.lwt_topic = statusTopic.c_str();
  cfg.lwt_msg = lwt.c_str();
  cfg.lwt_qos = 1;
  cfg.lwt_retain = 1;
  client = esp_mqtt_client_init(&cfg);
  if (!client) return false;
  esp_mqtt_client_register_event(client, MQTT_EVENT_ANY, mqttEvent, nullptr);
  return esp_mqtt_client_start(client) == ESP_OK;
}

void setup() {
  // Set latch before changing pin mode to prevent an active-low boot glitch.
  digitalWrite(FARM_RELAY_PIN, FARM_RELAY_OFF_LEVEL);
  pinMode(FARM_RELAY_PIN, OUTPUT);
  Serial.begin(115200);
  Serial.println("SmartFarm Day1 starting; relay OFF");
  uint8_t id[16];
  esp_fill_random(id, sizeof(id));
  id[6] = (id[6] & 0x0f) | 0x40;
  id[8] = (id[8] & 0x3f) | 0x80;
  snprintf(bootId, sizeof(bootId),
    "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
    id[0], id[1], id[2], id[3], id[4], id[5], id[6], id[7],
    id[8], id[9], id[10], id[11], id[12], id[13], id[14], id[15]);
  dht.setup(FARM_DHT_PIN, DHTesp::DHT22);
  analogReadResolution(12);
  if (!LittleFS.begin(false)) {
    Serial.println("LittleFS unavailable; upload private filesystem image first");
  } else {
    Serial.println("LittleFS mounted");
  }
  Serial.println(strlen(FARM_AWS_ENDPOINT) > 0 ? "AWS endpoint configured" : "AWS endpoint missing: edit config.local.h and rebuild");
  WiFi.mode(WIFI_STA);
  WiFi.begin(FARM_WIFI_SSID, FARM_WIFI_PASSWORD);
  Serial.println("Wi-Fi connecting");
  configTime(0, 0, "pool.ntp.org", "time.google.com");
}

void loop() {
  digitalWrite(FARM_RELAY_PIN, FARM_RELAY_OFF_LEVEL);
  const uint32_t now = millis();
  static uint32_t lastDiagnostic = 0;
  if (!client && now - lastDiagnostic >= 10000) {
    lastDiagnostic = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Waiting for Wi-Fi; check Wokwi network settings");
    } else if (time(nullptr) <= 1700000000) {
      Serial.println("Wi-Fi connected; waiting for NTP time sync");
    } else if (strlen(FARM_AWS_ENDPOINT) == 0) {
      Serial.println("AWS endpoint missing: edit config.local.h and rebuild");
    } else {
      Serial.println("Wi-Fi and time ready; starting AWS MQTT TLS");
    }
  }
  if (WiFi.status() != WL_CONNECTED) {
    connected = false;
    if (now - lastWifiAttempt >= 10000) {
      lastWifiAttempt = now;
      WiFi.reconnect();
    }
    delay(10);
    return;
  }
  if (!client && time(nullptr) > 1700000000 && strlen(FARM_AWS_ENDPOINT) > 0
      && now - lastWifiAttempt >= 10000) {
    lastWifiAttempt = now;
    startMqtt();
  }
  if (connected && now - lastHeartbeat >= 10000) {
    lastHeartbeat = now;
    publishStatus();
  }
  if (connected && now - lastSample >= 5000) {
    lastSample = now;
    TempAndHumidity values = dht.getTempAndHumidity();
    if (isfinite(values.temperature) && isfinite(values.humidity)
        && values.temperature >= -40 && values.temperature <= 80
        && values.humidity >= 0 && values.humidity <= 100
        && FARM_SOIL_DRY_ADC != FARM_SOIL_WET_ADC) {
      JsonDocument doc;
      base(doc);
      doc["temperature"] = values.temperature;
      doc["humidity"] = values.humidity;
      float soil = 100.0f * (FARM_SOIL_DRY_ADC - analogRead(FARM_SOIL_PIN))
        / (FARM_SOIL_DRY_ADC - FARM_SOIL_WET_ADC);
      doc["soilMoisture"] = constrain(soil, 0.0f, 100.0f);
      doc["uptimeMs"] = now;
      String payload;
      serializeJson(doc, payload);
      if (esp_mqtt_client_publish(client, telemetryTopic.c_str(), payload.c_str(), 0, 1, 0) >= 0)
        Serial.println("Telemetry queued; wait for PUBACK");
    } else Serial.println("Invalid sensor reading; no fabricated telemetry published");
  }
  delay(10);
}
