#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <DHTesp.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <esp_system.h>
#include <time.h>
#include <esp_timer.h>
#include "RelaySafety.h"
#ifndef FARM_CONTROL_ENABLED
#define FARM_CONTROL_ENABLED 0
#endif

#if __has_include("config.local.h")
#include "config.local.h"
#else
#include "config.example.h"
#endif

// Only ENV01 may control PUMP01 in this Wokwi MVP. Default disabled.
static DHTesp dht;
static esp_mqtt_client_handle_t client = nullptr;
static volatile bool connected = false;
static String ca, certificate, privateKey, uri, telemetryTopic, statusTopic;
static char bootId[37];
static RelaySafety relay;
static bool controlEnabled = false;
static String commandTopic, pumpStatusTopic, ackTopic, activeCommand;
struct CommandPacket { char payload[769]; bool retained; };
static QueueHandle_t commandQueue;
static esp_timer_handle_t relayTimer;
static portMUX_TYPE relayMux = portMUX_INITIALIZER_UNLOCKED;
static volatile bool forcedOff = false, controlFault = false;

static void forceRelayOff(void*) {
  portENTER_CRITICAL(&relayMux);
  forcedOff = true;
  digitalWrite(FARM_RELAY_PIN, FARM_RELAY_OFF_LEVEL);
  portEXIT_CRITICAL(&relayMux);
}
static void applyRelayOutput() {
  portENTER_CRITICAL(&relayMux);
  digitalWrite(FARM_RELAY_PIN, controlEnabled && connected && !forcedOff && relay.isOn()
    ? !FARM_RELAY_OFF_LEVEL : FARM_RELAY_OFF_LEVEL);
  portEXIT_CRITICAL(&relayMux);
}
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

static void publishPumpStatus() {
  if (!controlEnabled || !connected) return;
  JsonDocument doc;
  base(doc); doc["deviceId"] = "PUMP01";
  doc["connection"] = "ONLINE";
  doc["reportedState"] = relay.isOn() && !forcedOff ? "ON" : "OFF";
  doc["safetyLockout"] = relay.lockout();
  if (activeCommand.length()) doc["activeCommandId"] = activeCommand; else doc["activeCommandId"] = nullptr;
  String payload; serializeJson(doc, payload);
  esp_mqtt_client_publish(client, pumpStatusTopic.c_str(), payload.c_str(), 0, 1, 0);
}
static bool validUuid(const char* value) {
  if (!value || strlen(value) != 36) return false;
  for (int i=0; i<36; i++) {
    if (i==8 || i==13 || i==18 || i==23) { if (value[i]!='-') return false; }
    else if (!isxdigit((unsigned char)value[i])) return false;
  }
  return true;
}
static int64_t parseUtc(const char* value) {
  if (!value || strlen(value)!=20) return 0;
  struct tm tm = {};
  const char* end = strptime(value, "%Y-%m-%dT%H:%M:%SZ", &tm);
  return end && !*end ? (int64_t)mktime(&tm) : 0;
}
static void handleCommand(const CommandPacket &packet) {
  JsonDocument doc;
  if (deserializeJson(doc, packet.payload)) { Serial.println("Command rejected: JSON"); return; }
  const char* id = doc["commandId"] | "";
  if (!validUuid(id)) { Serial.println("Command rejected: ID"); return; }
  const char* action = doc["action"] | "";
  const bool on = strcmp(action,"ON")==0;
  const bool off = strcmp(action,"OFF")==0;
  const bool reset = strcmp(action,"RESET_LOCKOUT")==0;
  const char* error = nullptr;
  bool wasOn = relay.isOn();
  if (packet.retained) error = "RETAINED_COMMAND";
  else if (!doc.is<JsonObject>() || doc.size() != (on ? 7 : 6)
    || !doc["schemaVersion"].is<int>() || doc["schemaVersion"].as<int>() != 1
    || strcmp(doc["deviceId"] | "", "PUMP01") != 0 || (!on && !off && !reset)
    || (on && !doc["durationSeconds"].is<unsigned>())
    || (!on && doc.as<JsonObject>().containsKey("durationSeconds"))
    || !doc["issuedAt"].is<const char*>() || !doc["expiresAt"].is<const char*>()) error = "INVALID_COMMAND";
  else error = relay.apply(id, on ? RelaySafety::ON : off ? RelaySafety::OFF : RelaySafety::RESET,
    on ? doc["durationSeconds"].as<unsigned>() : 0,
    parseUtc(doc["issuedAt"]), parseUtc(doc["expiresAt"]), time(nullptr), millis());
  if (!error && relay.isOn() && !wasOn) {
    esp_timer_stop(relayTimer);
    // Arm independent cutoff before energizing; never renew it on duplicate ON.
    if (esp_timer_start_once(relayTimer, uint64_t(doc["durationSeconds"].as<unsigned>()) * 1000000) != ESP_OK) {
      relay.fail(id,"DEVICE_FAULT"); error = "DEVICE_FAULT";
    } else {
      portENTER_CRITICAL(&relayMux);
      if (connected) forcedOff = false;
      portEXIT_CRITICAL(&relayMux);
      activeCommand = id;
    }
  }
  if (!relay.isOn()) { esp_timer_stop(relayTimer); activeCommand = ""; }
  if (!connected) { relay.fail(id,"CONNECTION_LOST"); error = "CONNECTION_LOST"; }
  if (!relay.isOn()) activeCommand = "";
  applyRelayOutput();
  JsonDocument ack;
  base(ack); ack["deviceId"] = "PUMP01"; ack["commandId"] = id;
  ack["stage"] = "EXECUTED"; ack["status"] = error ? "FAILED" : "SUCCESS";
  ack["reportedState"] = relay.isOn() && !forcedOff ? "ON" : "OFF";
  ack["safetyLockout"] = relay.lockout();
  if (error) ack["errorCode"] = error; else ack["errorCode"] = nullptr;
  String payload; serializeJson(ack,payload);
  esp_mqtt_client_publish(client, ackTopic.c_str(), payload.c_str(), 0, 1, 0);
  Serial.printf("COMMAND_EXECUTED action=%s state=%s result=%s\n",(on ? "ON" : off ? "OFF" : reset ? "RESET_LOCKOUT" : "INVALID"),relay.isOn() && !forcedOff ? "ON":"OFF",error ? error:"SUCCESS");
  publishPumpStatus();
}

static void mqttEvent(void *, esp_event_base_t, int32_t id, void *eventData) {
  auto event = static_cast<esp_mqtt_event_handle_t>(eventData);
  if (id == MQTT_EVENT_CONNECTED) {
    portENTER_CRITICAL(&relayMux);
    connected = true;
    portEXIT_CRITICAL(&relayMux);
    if (controlEnabled) esp_mqtt_client_subscribe(client, commandTopic.c_str(), 1);
    Serial.println("AWS MQTT connected (TLS verified)");
  } else if (id == MQTT_EVENT_DISCONNECTED || id == MQTT_EVENT_ERROR) {
    portENTER_CRITICAL(&relayMux);
    connected = false;
    forcedOff = true;
    digitalWrite(FARM_RELAY_PIN, FARM_RELAY_OFF_LEVEL);
    portEXIT_CRITICAL(&relayMux);
    Serial.println("AWS MQTT unavailable; check endpoint/cert/policy/network");
  } else if (id == MQTT_EVENT_DATA && controlEnabled) {
    if (event->current_data_offset == 0 && event->data_len == event->total_data_len
        && event->data_len > 0 && event->data_len <= 768
        && event->topic_len == (int)commandTopic.length()
        && strncmp(event->topic, commandTopic.c_str(), event->topic_len)==0) {
      CommandPacket packet = {};
      memcpy(packet.payload,event->data,event->data_len); packet.retained = event->retain;
      if (xQueueSend(commandQueue,&packet,0)!=pdTRUE) {
        portENTER_CRITICAL(&relayMux); controlFault=true; portEXIT_CRITICAL(&relayMux);
        forceRelayOff(nullptr);
      }
    }
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
  Serial.println("SmartFarm starting; relay OFF");
  setenv("TZ","UTC0",1); tzset();
  commandQueue = xQueueCreate(8,sizeof(CommandPacket));
  esp_timer_create_args_t timerArgs = {};
  timerArgs.callback = forceRelayOff; timerArgs.name = "relay_cutoff";
  bool timerReady = esp_timer_create(&timerArgs,&relayTimer)==ESP_OK;
  controlEnabled = FARM_CONTROL_ENABLED == 1 && strcmp(FARM_DEVICE_ID,"ENV01")==0 && strcmp(FARM_ID,"FARM001")==0 && commandQueue && timerReady;
  commandTopic = String("smartfarm/") + FARM_ID + "/PUMP01/command";
  ackTopic = String("smartfarm/") + FARM_ID + "/PUMP01/ack";
  pumpStatusTopic = String("smartfarm/") + FARM_ID + "/PUMP01/status";
  Serial.println(controlEnabled ? "Wokwi relay control enabled" : "Relay control disabled");
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
  const uint32_t now = millis();
  bool link = connected && WiFi.status() == WL_CONNECTED;
  bool fault;
  portENTER_CRITICAL(&relayMux); fault=controlFault; controlFault=false; portEXIT_CRITICAL(&relayMux);
  if (fault) { relay.trip(); activeCommand=""; esp_timer_stop(relayTimer); }
  bool stopped = relay.tickSafety(now, link);
  if (forcedOff && relay.isOn()) stopped = relay.tickSafety(now,false) || stopped;
  applyRelayOutput();
  if (stopped) { activeCommand = ""; esp_timer_stop(relayTimer); publishPumpStatus(); Serial.println("RELAY_AUTO_OFF"); }
  static uint32_t lastPumpStatus = 0;
  if (controlEnabled && link && now-lastPumpStatus>=5000) { lastPumpStatus=now; publishPumpStatus(); }
  if (controlEnabled && link) {
    CommandPacket packet;
    if (xQueueReceive(commandQueue,&packet,0)==pdTRUE) handleCommand(packet);
  }
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
