#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <DHTesp.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <esp_system.h>
#include <time.h>
#include <sys/time.h>
#include <esp_timer.h>
#include <esp_sntp.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Update.h>
#include <esp_ota_ops.h>
#include "RelaySafety.h"
#include "ActuatorBank.h"
#include "DeviceConfig.h"
#include "OtaGuard.h"
#include "OtaVerify.h"
#include "testvectors/OtaTestVector.h"

#if defined(FARM_WOKWI_SELFTEST) && FARM_WOKWI_SELFTEST
#include "config.selftest.h"   // tracked, no secrets: Wokwi CI self-test only
#elif __has_include("config.local.h")
#include "config.local.h"
#else
#include "config.example.h"
#endif

#ifndef FARM_CONTROL_ENABLED
#define FARM_CONTROL_ENABLED 0
#endif

#ifndef FARM_WATER_INTERLOCK_ENABLED
#define FARM_WATER_INTERLOCK_ENABLED 0
#endif
#ifndef FARM_WATER_LEVEL_PIN
#define FARM_WATER_LEVEL_PIN 27
#endif
static_assert(FARM_WATER_INTERLOCK_ENABLED == 0 || FARM_WATER_INTERLOCK_ENABLED == 1,
  "Water interlock must be 0 or 1");
static_assert(!FARM_WATER_INTERLOCK_ENABLED ||
  (FARM_WATER_LEVEL_PIN != FARM_RELAY_PIN && FARM_WATER_LEVEL_PIN != FARM_DHT_PIN && FARM_WATER_LEVEL_PIN != FARM_SOIL_PIN),
  "Water switch must use a separate GPIO");

#ifndef FARM_WOKWI_CLOCK_TOLERANCE_SECONDS
#define FARM_WOKWI_CLOCK_TOLERANCE_SECONDS 2
#endif
static_assert(FARM_WOKWI_CLOCK_TOLERANCE_SECONDS >= 0 && FARM_WOKWI_CLOCK_TOLERANCE_SECONDS <= 10,
  "Wokwi clock tolerance must be between 0 and 10 seconds");

// Extra actuators (contract v3). Missing flag keeps the original PUMP01-only firmware.
#ifndef FARM_ACTUATORS_ENABLED
#define FARM_ACTUATORS_ENABLED 0
#endif
#ifndef FARM_VALVE_PINS
#define FARM_VALVE_PINS {25, 33, 32, 13}
#endif
#ifndef FARM_FAN_PIN
#define FARM_FAN_PIN 18
#endif
#ifndef FARM_LIGHT_PIN
#define FARM_LIGHT_PIN 19
#endif
#ifndef FARM_MIST_PIN
#define FARM_MIST_PIN 21
#endif
#ifndef FARM_PUMP_REQUIRES_VALVE
#define FARM_PUMP_REQUIRES_VALVE 1
#endif
#ifndef FARM_MAX_OPEN_VALVES
#define FARM_MAX_OPEN_VALVES 1
#endif
#ifndef FARM_VALVE_MAX_SECONDS
#define FARM_VALVE_MAX_SECONDS 3600
#endif
#ifndef FARM_FAN_MAX_SECONDS
#define FARM_FAN_MAX_SECONDS 14400
#endif
#ifndef FARM_LIGHT_MAX_SECONDS
#define FARM_LIGHT_MAX_SECONDS 14400
#endif
#ifndef FARM_MIST_MAX_SECONDS
#define FARM_MIST_MAX_SECONDS 600
#endif
#ifndef FARM_MIST_USES_RESERVOIR
#define FARM_MIST_USES_RESERVOIR 1
#endif
#ifndef FARM_WOKWI_SELFTEST
#define FARM_WOKWI_SELFTEST 0
#endif
// Remote configuration + OTA (contract v4). Missing flag keeps the previous behaviour.
#ifndef FARM_DEVMGMT_ENABLED
#define FARM_DEVMGMT_ENABLED 0
#endif
#ifndef FARM_FIRMWARE_VERSION
#define FARM_FIRMWARE_VERSION "1.3.0"
#endif
#ifndef FARM_OTA_HOST_SUFFIX
#define FARM_OTA_HOST_SUFFIX ".amazonaws.com"
#endif
// PEM of the release-signing public key. Empty = OTA refused (OTA_DISABLED).
#ifndef FARM_OTA_PUBLIC_KEY_PEM
#define FARM_OTA_PUBLIC_KEY_PEM ""
#endif
static_assert(FARM_DEVMGMT_ENABLED == 0 || FARM_DEVMGMT_ENABLED == 1, "Device management flag must be 0 or 1");
static_assert(FARM_ACTUATORS_ENABLED == 0 || FARM_ACTUATORS_ENABLED == 1, "Actuators flag must be 0 or 1");
static_assert(FARM_MAX_OPEN_VALVES >= 1 && FARM_MAX_OPEN_VALVES <= 4, "1..4 open valves");
static_assert(FARM_VALVE_MAX_SECONDS >= 1 && FARM_VALVE_MAX_SECONDS <= 3600, "Valve cap 1..3600 s");
static_assert(FARM_FAN_MAX_SECONDS >= 1 && FARM_FAN_MAX_SECONDS <= 14400, "Fan cap 1..14400 s");
static_assert(FARM_LIGHT_MAX_SECONDS >= 1 && FARM_LIGHT_MAX_SECONDS <= 14400, "Light cap 1..14400 s");
static_assert(FARM_MIST_MAX_SECONDS >= 1 && FARM_MIST_MAX_SECONDS <= 3600, "Mist cap 1..3600 s");
static_assert(FARM_WOKWI_SELFTEST == 0 || FARM_CONTROL_ENABLED == 1, "Self-test needs control enabled");

static DHTesp dht;
static esp_mqtt_client_handle_t client = nullptr;
static volatile bool connected = false;
static String ca, certificate, privateKey, uri, telemetryTopic, statusTopic;
static char bootId[37];
static ActuatorBank bank;
static bool controlEnabled = false;

// One entry per actuator; index 0 is always PUMP01 (contract v1, unchanged topics).
struct ChannelIo {
  int8_t pin = -1;
  esp_timer_handle_t timer = nullptr;
  String commandTopic, ackTopic, statusTopic, activeCommand;
};
static ChannelIo io[ActuatorBank::MAX];
enum OffCause { NO_CAUSE, TIMER_CAUSE, NETWORK_CAUSE };
// Written by the MQTT task and esp_timer callbacks under relayMux; read by the loop.
static volatile OffCause offCause[ActuatorBank::MAX];
static volatile bool forcedOff[ActuatorBank::MAX];
// Last level written to each output (true = energized); digitalRead on an OUTPUT pin is not relied on.
static volatile bool outputOn[ActuatorBank::MAX];
static volatile bool controlFault = false;
struct CommandPacket { char payload[769]; bool retained; uint8_t channel; };
static QueueHandle_t commandQueue;
enum MgmtKind : uint8_t { MGMT_CONFIG, MGMT_OTA };
struct MgmtPacket { char payload[1537]; bool retained; MgmtKind kind; };
static QueueHandle_t mgmtQueue;
static DeviceConfig deviceConfig;
static OtaRecord otaRecord;
static String configTopic, configAckTopic, configStateTopic, otaTopic, otaStatusTopic;
static volatile bool configStateReported = false;
static bool otaInProgress = false;
static portMUX_TYPE relayMux = portMUX_INITIALIZER_UNLOCKED;
static const uint8_t OFF_LEVEL = FARM_RELAY_OFF_LEVEL;

static bool waterPresent() {
  return !FARM_WATER_INTERLOCK_ENABLED || digitalRead(FARM_WATER_LEVEL_PIN) == LOW;
}
static bool pumpNeedsValve() { return FARM_PUMP_REQUIRES_VALVE && bank.hasValves(); }
static void setOutputLocked(int i, bool on) {
  outputOn[i] = on;
  digitalWrite(io[i].pin, on ? !OFF_LEVEL : OFF_LEVEL);
}

// Output decision for every channel at once, so the pump never sees a valve that is
// still "on" in the bank but already forced off at the pin. Caller holds relayMux.
static void writeOutputsLocked() {
  bool on[ActuatorBank::MAX] = {};
  bool valveOpen = false;
  const bool water = waterPresent();
  for (int i = 0; i < bank.size(); i++) {
    on[i] = controlEnabled && connected && !forcedOff[i] && bank.isOn(i) && (!bank.usesReservoir(i) || water);
    if (bank.kind(i) == KIND_VALVE && on[i]) valveOpen = true;
  }
  if (pumpNeedsValve() && !valveOpen) on[bank.pump()] = false;
  for (int i = 0; i < bank.size(); i++) setOutputLocked(i, on[i]);
}
static void applyRelayOutput() {
  portENTER_CRITICAL(&relayMux);
  writeOutputsLocked();
  portEXIT_CRITICAL(&relayMux);
}
static void allOutputsOffLocked(OffCause cause) {
  for (int i = 0; i < bank.size(); i++) {
    if (cause != NO_CAUSE && outputOn[i]) offCause[i] = cause;
    forcedOff[i] = true;
    setOutputLocked(i, false);
  }
}

// esp_timer task: independent hard cutoff for one channel. A valve cutoff also drops the
// pump pin when no other valve output is still energized.
static void forceRelayOff(void* arg) {
  const int i = (int)(intptr_t)arg;
  portENTER_CRITICAL(&relayMux);
  forcedOff[i] = true;
  offCause[i] = TIMER_CAUSE;
  setOutputLocked(i, false);
  if (bank.kind(i) == KIND_VALVE && pumpNeedsValve()) {
    bool other = false;
    for (int j = 0; j < bank.size(); j++)
      if (j != i && bank.kind(j) == KIND_VALVE && outputOn[j]) other = true;
    if (!other) setOutputLocked(bank.pump(), false);
  }
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

// Self-test prints instead of publishing; everything else is the production path.
static void publish(const String& topic, const String& payload, int retain) {
#if FARM_WOKWI_SELFTEST
  (void)retain;
  Serial.printf("MQTT_OUT %s %s\n", topic.c_str(), payload.c_str());
#else
  esp_mqtt_client_publish(client, topic.c_str(), payload.c_str(), 0, 1, retain);
#endif
}

static void publishStatus() {
  JsonDocument doc;
  base(doc);
  doc["connection"] = "ONLINE";
  String payload;
  serializeJson(doc, payload);
  publish(statusTopic, payload, 1);
}

static bool actuatorOutputOn(int i) { return bank.isOn(i) && !forcedOff[i]; }

static void publishActuatorStatus(int i) {
  if (!controlEnabled || !connected) return;
  JsonDocument doc;
  base(doc);
  doc["schemaVersion"] = i == bank.pump() ? 1 : 3;
  doc["deviceId"] = bank.id(i);
  doc["connection"] = "ONLINE";
  doc["reportedState"] = actuatorOutputOn(i) ? "ON" : "OFF";
  doc["safetyLockout"] = bank.lockout(i);
  doc["stateReason"] = bank.reason(i);
  if (io[i].activeCommand.length()) doc["activeCommandId"] = io[i].activeCommand; else doc["activeCommandId"] = nullptr;
  String payload; serializeJson(doc, payload);
  publish(io[i].statusTopic, payload, 0);
}

// Channels that stopped since the last pass: cancel their cutoff and report the new state.
static void reportStopped() {
  uint32_t stopped = bank.takeStopped();
  for (int i = 0; i < bank.size(); i++) {
    if (!(stopped & (uint32_t(1) << i))) continue;
    esp_timer_stop(io[i].timer);
    io[i].activeCommand = "";
    publishActuatorStatus(i);
    Serial.printf("RELAY_OFF id=%s reason=%s\n", bank.id(i), bank.reason(i));
  }
}

// Loop-owned. An open wire has the same safe effect as an empty reservoir.
// No automatic recovery to ON: every reservoir user stays latched until RESET_LOCKOUT.
static bool checkWaterSupply() {
  if (!controlEnabled || !FARM_WATER_INTERLOCK_ENABLED) return false;
  const bool present = waterPresent();
  const bool changed = bank.setWaterAvailable(present);
  if (!present) {
    portENTER_CRITICAL(&relayMux);
    for (int i = 0; i < bank.size(); i++) if (bank.usesReservoir(i)) { forcedOff[i] = true; setOutputLocked(i, false); }
    writeOutputsLocked();
    portEXIT_CRITICAL(&relayMux);
    for (int i = 0; i < bank.size(); i++) if (bank.usesReservoir(i)) { io[i].activeCommand = ""; esp_timer_stop(io[i].timer); }
  }
  if (changed) Serial.println(present ? "WATER_RESTORED; reset lockout required" : "WATER_LOW; reservoir actuators OFF and locked");
  return changed;
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
  const int c = packet.channel;
  if (c >= bank.size()) return;
  JsonDocument doc;
  if (deserializeJson(doc, packet.payload)) { Serial.println("Command rejected: JSON"); return; }
  const char* id = doc["commandId"] | "";
  if (!validUuid(id)) { Serial.println("Command rejected: ID"); return; }
  const char* action = doc["action"] | "";
  const bool on = strcmp(action,"ON")==0;
  const bool off = strcmp(action,"OFF")==0;
  const bool reset = strcmp(action,"RESET_LOCKOUT")==0;
  // PUMP01 keeps contract v1; every other actuator speaks v3 and names itself.
  const int expectedVersion = c == bank.pump() ? 1 : 3;
  const char* error = nullptr;
  checkWaterSupply();
  reportStopped();
  bool wasOn = bank.isOn(c);
  if (packet.retained) error = "RETAINED_COMMAND";
  else if (!doc.is<JsonObject>() || doc.size() != (on ? 7 : 6)
    || !doc["schemaVersion"].is<int>() || doc["schemaVersion"].as<int>() != expectedVersion
    || strcmp(doc["deviceId"] | "", bank.id(c)) != 0 || (!on && !off && !reset)
    || (on && !doc["durationSeconds"].is<unsigned>())
    || (!on && !doc["durationSeconds"].isUnbound())
    || !doc["issuedAt"].is<const char*>() || !doc["expiresAt"].is<const char*>()) error = "INVALID_COMMAND";
  else error = bank.apply(c, id, on ? RelaySafety::ON : off ? RelaySafety::OFF : RelaySafety::RESET,
    on ? doc["durationSeconds"].as<unsigned>() : 0,
    parseUtc(doc["issuedAt"]), parseUtc(doc["expiresAt"]), time(nullptr), millis(),
    (FARM_WOKWI_SELFTEST || strcmp(FARM_WIFI_SSID, "Wokwi-GUEST") == 0) ? FARM_WOKWI_CLOCK_TOLERANCE_SECONDS : 2);
  if (!error && bank.isOn(c) && !wasOn) {
    esp_timer_stop(io[c].timer);
    // Arm independent cutoff before energizing; never renew it on duplicate ON.
    if (esp_timer_start_once(io[c].timer, uint64_t(doc["durationSeconds"].as<unsigned>()) * 1000000) != ESP_OK) {
      bank.fail(c, id, "DEVICE_FAULT"); error = "DEVICE_FAULT";
    } else {
      portENTER_CRITICAL(&relayMux);
      if (connected) { forcedOff[c] = false; offCause[c] = NO_CAUSE; }
      portEXIT_CRITICAL(&relayMux);
      io[c].activeCommand = id;
    }
  }
  if (!bank.isOn(c)) { esp_timer_stop(io[c].timer); io[c].activeCommand = ""; }
  if (!connected) { bank.fail(c, id, "CONNECTION_LOST"); error = "CONNECTION_LOST"; }
  // Recheck after parsing/arming so a switch change cannot energize the output.
  checkWaterSupply();
  if (bank.usesReservoir(c) && !waterPresent() && (on || reset)) { bank.fail(c, id, "WATER_LOW"); error = "WATER_LOW"; }
  if (!bank.isOn(c)) io[c].activeCommand = "";
  applyRelayOutput();
  if (error && (strcmp(error,"EXPIRED")==0 || strcmp(error,"CLOCK_SKEW")==0 || strcmp(error,"INVALID_LIFETIME")==0 || strcmp(error,"CLOCK_NOT_READY")==0)) {
    int64_t epoch=time(nullptr), issued=parseUtc(doc["issuedAt"] | ""), expires=parseUtc(doc["expiresAt"] | "");
    Serial.printf("COMMAND_TIME now=%lld issued=%lld expires=%lld age=%lld remaining=%lld\n",
      (long long)epoch,(long long)issued,(long long)expires,(long long)(epoch-issued),(long long)(expires-epoch));
  }
  JsonDocument ack;
  base(ack); ack["schemaVersion"] = expectedVersion; ack["deviceId"] = bank.id(c); ack["commandId"] = id;
  ack["stage"] = "EXECUTED"; ack["status"] = error ? "FAILED" : "SUCCESS";
  ack["reportedState"] = actuatorOutputOn(c) ? "ON" : "OFF";
  ack["safetyLockout"] = bank.lockout(c);
  if (error) ack["errorCode"] = error; else ack["errorCode"] = nullptr;
  String payload; serializeJson(ack,payload);
  publish(io[c].ackTopic, payload, 0);
  Serial.printf("COMMAND_EXECUTED id=%s action=%s state=%s result=%s\n", bank.id(c),
    (on ? "ON" : off ? "OFF" : reset ? "RESET_LOCKOUT" : "INVALID"), actuatorOutputOn(c) ? "ON":"OFF", error ? error:"SUCCESS");
  // A closed last valve also stops the pump: report every channel that changed.
  bank.takeStopped();
  for (int i = 0; i < bank.size(); i++) {
    if (i != c && !bank.isOn(i) && io[i].activeCommand.length()) {
      esp_timer_stop(io[i].timer); io[i].activeCommand = "";
      Serial.printf("RELAY_OFF id=%s reason=%s\n", bank.id(i), bank.reason(i));
      publishActuatorStatus(i);
    }
  }
  publishActuatorStatus(c);
}

static void mqttEvent(void *, esp_event_base_t, int32_t id, void *eventData) {
  auto event = static_cast<esp_mqtt_event_handle_t>(eventData);
  if (id == MQTT_EVENT_CONNECTED) {
    portENTER_CRITICAL(&relayMux);
    connected = true;
    portEXIT_CRITICAL(&relayMux);
    if (controlEnabled) for (int i = 0; i < bank.size(); i++) esp_mqtt_client_subscribe(client, io[i].commandTopic.c_str(), 1);
    if (FARM_DEVMGMT_ENABLED) { esp_mqtt_client_subscribe(client, configTopic.c_str(), 1); esp_mqtt_client_subscribe(client, otaTopic.c_str(), 1); }
    Serial.println("AWS MQTT connected (TLS verified)");
  } else if (id == MQTT_EVENT_DISCONNECTED || id == MQTT_EVENT_ERROR) {
    portENTER_CRITICAL(&relayMux);
    connected = false;
    configStateReported = false;
    allOutputsOffLocked(NETWORK_CAUSE);
    portEXIT_CRITICAL(&relayMux);
    Serial.println("AWS MQTT unavailable; check endpoint/cert/policy/network");
  } else if (id == MQTT_EVENT_DATA && FARM_DEVMGMT_ENABLED && event->current_data_offset == 0
      && event->data_len == event->total_data_len && event->data_len > 0 && event->data_len <= 1536
      && ((event->topic_len == (int)configTopic.length() && strncmp(event->topic, configTopic.c_str(), event->topic_len) == 0)
       || (event->topic_len == (int)otaTopic.length() && strncmp(event->topic, otaTopic.c_str(), event->topic_len) == 0))) {
    MgmtPacket packet = {};
    memcpy(packet.payload, event->data, event->data_len); packet.retained = event->retain;
    packet.kind = event->topic_len == (int)configTopic.length() && strncmp(event->topic, configTopic.c_str(), event->topic_len) == 0 ? MGMT_CONFIG : MGMT_OTA;
    xQueueSend(mgmtQueue, &packet, 0);  // full queue: dropped, the backend times out and may resend
  } else if (id == MQTT_EVENT_DATA && controlEnabled) {
    if (event->current_data_offset != 0 || event->data_len != event->total_data_len
        || event->data_len <= 0 || event->data_len > 768) return;
    for (int i = 0; i < bank.size(); i++) {
      if (event->topic_len != (int)io[i].commandTopic.length()
          || strncmp(event->topic, io[i].commandTopic.c_str(), event->topic_len) != 0) continue;
      CommandPacket packet = {};
      memcpy(packet.payload,event->data,event->data_len); packet.retained = event->retain; packet.channel = i;
      if (xQueueSend(commandQueue,&packet,0)!=pdTRUE) {
        portENTER_CRITICAL(&relayMux); controlFault=true; allOutputsOffLocked(NO_CAUSE); portEXIT_CRITICAL(&relayMux);
      }
      break;
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

static void addChannel(const char* id, ActuatorKind kind, int pin, unsigned maxSeconds, bool reservoir) {
  if (pin < 0) return;
  const int i = bank.add(id, kind, maxSeconds, reservoir);
  if (i < 0) { Serial.printf("Actuator %s not added (configuration)\n", id); return; }
  io[i].pin = pin;
  // Set latch before changing pin mode to prevent an active-low boot glitch.
  digitalWrite(pin, OFF_LEVEL);
  pinMode(pin, OUTPUT);
  const String root = String("smartfarm/") + FARM_ID + "/" + id;
  io[i].commandTopic = root + "/command";
  io[i].ackTopic = root + "/ack";
  io[i].statusTopic = root + "/status";
}

static bool setupActuators() {
  addChannel("PUMP01", KIND_PUMP, FARM_RELAY_PIN, 3600, true);
#if FARM_ACTUATORS_ENABLED
  const int valves[] = FARM_VALVE_PINS;
  static const char* const valveIds[] = {"VALVE01", "VALVE02", "VALVE03", "VALVE04"};
  static_assert(sizeof(valves) / sizeof(valves[0]) <= 4, "At most 4 zone valves");
  for (size_t v = 0; v < sizeof(valves) / sizeof(valves[0]); v++) addChannel(valveIds[v], KIND_VALVE, valves[v], FARM_VALVE_MAX_SECONDS, false);
  addChannel("FAN01", KIND_FAN, FARM_FAN_PIN, FARM_FAN_MAX_SECONDS, false);
  addChannel("LIGHT01", KIND_LIGHT, FARM_LIGHT_PIN, FARM_LIGHT_MAX_SECONDS, false);
  addChannel("MIST01", KIND_MIST, FARM_MIST_PIN, FARM_MIST_MAX_SECONDS, FARM_MIST_USES_RESERVOIR);
#endif
  bank.configure(FARM_PUMP_REQUIRES_VALVE, FARM_MAX_OPEN_VALVES);
  // Every output pin distinct and away from the sensors / float input.
  for (int i = 0; i < bank.size(); i++) {
    if (io[i].pin == FARM_DHT_PIN || io[i].pin == FARM_SOIL_PIN || (FARM_WATER_INTERLOCK_ENABLED && io[i].pin == FARM_WATER_LEVEL_PIN)) return false;
    for (int j = i + 1; j < bank.size(); j++) if (io[i].pin == io[j].pin) return false;
  }
  for (int i = 0; i < bank.size(); i++) {
    esp_timer_create_args_t timerArgs = {};
    timerArgs.callback = forceRelayOff; timerArgs.arg = (void*)(intptr_t)i; timerArgs.name = "relay_cutoff";
    if (esp_timer_create(&timerArgs, &io[i].timer) != ESP_OK) return false;
  }
  return bank.pump() == 0;
}

// ---- Remote configuration + OTA (contract v4) ----
static Preferences prefs;

static void applyConfigToActuators() {
  if (bank.pump() >= 0) bank.limitSeconds(bank.pump(), deviceConfig.settings().pumpMaxSeconds);
}
static void loadConfig() {
  DeviceSettings defaults;
  defaults.soilWetAdc = FARM_SOIL_WET_ADC; defaults.soilDryAdc = FARM_SOIL_DRY_ADC;
  deviceConfig.restore(0, defaults);
  if (prefs.begin("farmcfg", true)) {
    if (prefs.isKey("rev")) {
      DeviceSettings stored;
      stored.telemetrySeconds = prefs.getUShort("tel", 5); stored.heartbeatSeconds = prefs.getUShort("hb", 10);
      stored.soilWetAdc = prefs.getUShort("wet", 0); stored.soilDryAdc = prefs.getUShort("dry", 4095);
      stored.pumpMaxSeconds = prefs.getUShort("pcap", 3600);
      deviceConfig.restore(prefs.getUInt("rev", 0), stored);
    }
    prefs.end();
  }
  applyConfigToActuators();
}
static bool saveConfig() {
  if (!prefs.begin("farmcfg", false)) return false;
  const DeviceSettings& s = deviceConfig.settings();
  bool ok = prefs.putUShort("tel", s.telemetrySeconds) && prefs.putUShort("hb", s.heartbeatSeconds)
    && prefs.putUShort("wet", s.soilWetAdc) && prefs.putUShort("dry", s.soilDryAdc) && prefs.putUShort("pcap", s.pumpMaxSeconds);
  ok = ok && prefs.putUInt("rev", deviceConfig.revision());  // revision last: a torn write keeps the old revision
  prefs.end();
  return ok;
}
static void loadOta() {
  if (prefs.begin("farmota", true)) {
    if (prefs.getBytesLength("rec") == sizeof(OtaRecord)) prefs.getBytes("rec", &otaRecord, sizeof(OtaRecord));
    prefs.end();
  }
  otaRecord.otaId[36] = 0; otaRecord.previous[16] = 0; otaRecord.version[23] = 0;
}
static void saveOta() {
  if (prefs.begin("farmota", false)) { prefs.putBytes("rec", &otaRecord, sizeof(OtaRecord)); prefs.end(); }
}
static const char* runningPartition() {
  const esp_partition_t* running = esp_ota_get_running_partition();
  return running ? running->label : "unknown";
}

static void publishConfigState() {
  JsonDocument doc;
  base(doc);
  doc["revision"] = deviceConfig.revision();
  JsonObject settings = doc["settings"].to<JsonObject>();
  const DeviceSettings& s = deviceConfig.settings();
  settings["telemetrySeconds"] = s.telemetrySeconds; settings["heartbeatSeconds"] = s.heartbeatSeconds;
  settings["soilWetAdc"] = s.soilWetAdc; settings["soilDryAdc"] = s.soilDryAdc; settings["pumpMaxSeconds"] = s.pumpMaxSeconds;
  doc["firmwareVersion"] = FARM_FIRMWARE_VERSION;
  doc["partition"] = runningPartition();
  doc["otaTrial"] = otaRecord.pending;
  String payload; serializeJson(doc, payload);
#if FARM_WOKWI_SELFTEST
  publish(configStateTopic, payload, 0);
  configStateReported = true;
#else
  if (client && esp_mqtt_client_publish(client, configStateTopic.c_str(), payload.c_str(), 0, 1, 0) >= 0) configStateReported = true;
#endif
}

static void publishOtaStatus(const char* otaId, const char* version, const char* stage, const char* error, int progress) {
  JsonDocument doc;
  base(doc);
  doc["otaId"] = otaId; doc["version"] = version; doc["stage"] = stage;
  if (error) doc["errorCode"] = error; else doc["errorCode"] = nullptr;
  if (progress >= 0) doc["progress"] = progress; else doc["progress"] = nullptr;
  doc["firmwareVersion"] = FARM_FIRMWARE_VERSION;
  String payload; serializeJson(doc, payload);
  publish(otaStatusTopic, payload, 0);
  Serial.printf("OTA_STATUS stage=%s error=%s\n", stage, error ? error : "none");
}

static void handleConfig(const MgmtPacket& packet) {
  JsonDocument doc;
  const char* error = nullptr;
  const char* id = "";
  if (deserializeJson(doc, packet.payload)) { Serial.println("Config rejected: JSON"); return; }
  id = doc["configId"] | "";
  if (!validUuid(id)) { Serial.println("Config rejected: ID"); return; }
  JsonObject in = doc["settings"];
  DeviceSettings next;
  const char* keys[] = {"telemetrySeconds", "heartbeatSeconds", "soilWetAdc", "soilDryAdc", "pumpMaxSeconds"};
  bool shape = !packet.retained && doc.is<JsonObject>() && doc.size() == 7 && doc["schemaVersion"].is<int>() && doc["schemaVersion"].as<int>() == 1
    && strcmp(doc["deviceId"] | "", FARM_DEVICE_ID) == 0 && doc["revision"].is<uint32_t>() && !in.isNull() && in.size() == 5
    && doc["issuedAt"].is<const char*>() && doc["expiresAt"].is<const char*>();
  for (const char* key : keys) shape = shape && in[key].is<uint16_t>();
  if (packet.retained) error = "RETAINED_COMMAND";
  else if (!shape) error = "INVALID_CONFIG";
  else {
    next.telemetrySeconds = in["telemetrySeconds"]; next.heartbeatSeconds = in["heartbeatSeconds"];
    next.soilWetAdc = in["soilWetAdc"]; next.soilDryAdc = in["soilDryAdc"]; next.pumpMaxSeconds = in["pumpMaxSeconds"];
    const uint32_t before = deviceConfig.revision();
    error = deviceConfig.apply(id, doc["revision"].as<uint32_t>(), next, parseUtc(doc["issuedAt"]), parseUtc(doc["expiresAt"]), time(nullptr));
    if (!error && deviceConfig.revision() != before) {
      if (!saveConfig()) Serial.println("Config applied but NVS write failed; it will not survive a reboot");
      applyConfigToActuators();
    }
  }
  JsonDocument ack;
  base(ack); ack["configId"] = id; ack["status"] = error ? "REJECTED" : "APPLIED";
  if (error) ack["errorCode"] = error; else ack["errorCode"] = nullptr;
  ack["revision"] = deviceConfig.revision();
  String payload; serializeJson(ack, payload);
  publish(configAckTopic, payload, 0);
  Serial.printf("CONFIG_RESULT revision=%lu status=%s\n", (unsigned long)deviceConfig.revision(), error ? error : "APPLIED");
  publishConfigState();
}

// Streams the image into the inactive OTA partition while hashing it; the boot partition only
// changes (Update.end) after the SHA-256 matches and the ECDSA signature verifies.
static const char* downloadImage(const char* otaId, const char* version, const char* url, uint32_t size, const char* sha256, const char* signature) {
  WiFiClientSecure tls;
  tls.setCACert(ca.c_str());        // the device's pinned Amazon Root CA
  HTTPClient http;
  http.setTimeout(15000);
  http.setFollowRedirects(HTTPC_DISABLE_FOLLOW_REDIRECTS);
  if (!http.begin(tls, url)) return "DOWNLOAD_FAILED";
  if (http.GET() != 200) { http.end(); return "DOWNLOAD_FAILED"; }
  if (http.getSize() != (int)size) { http.end(); return "SIZE_MISMATCH"; }
  if (!Update.begin(size, U_FLASH)) { http.end(); return "UPDATE_BEGIN_FAILED"; }
  FirmwareHash hash;
  const char* error = hash.begin() ? nullptr : "HASH_FAILED";
  WiFiClient* stream = http.getStreamPtr();
  static uint8_t buffer[1024];
  uint32_t done = 0, lastData = millis();
  int reported = -1;
  while (!error && done < size) {
    if (!connected || WiFi.status() != WL_CONNECTED) { error = "CONNECTION_LOST"; break; }
    const size_t available = stream->available();
    if (!available) {
      if (millis() - lastData > 15000) error = "DOWNLOAD_TIMEOUT";
      delay(5);
      continue;
    }
    size_t want = size - done;
    if (want > sizeof(buffer)) want = sizeof(buffer);
    if (want > available) want = available;
    const int n = stream->readBytes(buffer, want);
    if (n <= 0) continue;
    if (!hash.update(buffer, n)) error = "HASH_FAILED";
    else if (Update.write(buffer, n) != (size_t)n) error = "FLASH_WRITE_FAILED";
    done += n; lastData = millis();
    const int percent = int(uint64_t(done) * 100 / size);
    if (percent / 25 != reported / 25) { reported = percent; publishOtaStatus(otaId, version, "DOWNLOADING", nullptr, percent); }
  }
  http.end();
  if (!error) {
    uint8_t digest[32];
    error = hash.finish(digest) ? OtaVerify::check(digest, sha256, signature, FARM_OTA_PUBLIC_KEY_PEM) : "HASH_FAILED";
  }
  if (error) { Update.abort(); return error; }
  if (!Update.end()) return "UPDATE_END_FAILED";
  return nullptr;
}

static void handleOta(const MgmtPacket& packet) {
  JsonDocument doc;
  if (deserializeJson(doc, packet.payload)) { Serial.println("OTA rejected: JSON"); return; }
  const char* id = doc["otaId"] | "";
  if (!validUuid(id)) { Serial.println("OTA rejected: ID"); return; }
  const char* version = doc["version"] | "";
  const char* error = nullptr;
  const esp_partition_t* target = esp_ota_get_next_update_partition(nullptr);
  if (packet.retained) error = "RETAINED_COMMAND";
  else if (!doc.is<JsonObject>() || doc.size() != 10 || !doc["schemaVersion"].is<int>() || doc["schemaVersion"].as<int>() != 1
      || strcmp(doc["deviceId"] | "", FARM_DEVICE_ID) != 0 || !doc["size"].is<uint32_t>()) error = "INVALID_OTA";
  else if (strlen(FARM_OTA_PUBLIC_KEY_PEM) == 0) error = "OTA_DISABLED";
  else if (otaInProgress || otaRecord.pending) error = "OTA_BUSY";
  else if (!connected) error = "NOT_CONNECTED";
  else if (!target) error = "NO_OTA_PARTITION";
  else error = OtaGuard::request(id, version, doc["url"] | "", doc["size"].as<uint32_t>(), doc["sha256"] | "", doc["signature"] | "",
    parseUtc(doc["issuedAt"] | ""), parseUtc(doc["expiresAt"] | ""), time(nullptr), target->size, FARM_OTA_HOST_SUFFIX, bank.allOff());
  if (error) { publishOtaStatus(id, version, "REJECTED", error, -1); return; }
  // No actuator may start while the image is written; OFF and lockout handling stay active.
  otaInProgress = true;
  bank.block("OTA_IN_PROGRESS");
  publishOtaStatus(id, version, "RECEIVED", nullptr, 0);
  error = downloadImage(id, version, doc["url"], doc["size"].as<uint32_t>(), doc["sha256"], doc["signature"]);
  if (error) {
    otaInProgress = false;
    bank.block(nullptr);
    publishOtaStatus(id, version, "FAILED", error, -1);
    return;
  }
  OtaRecord next;
  next.pending = true; next.attempts = 0;
  strncpy(next.otaId, id, 36); strncpy(next.previous, runningPartition(), 16); strncpy(next.version, version, 23);
  otaRecord = next;
  saveOta();
  publishOtaStatus(id, version, "REBOOTING", nullptr, 100);
  portENTER_CRITICAL(&relayMux); allOutputsOffLocked(NO_CAUSE); portEXIT_CRITICAL(&relayMux);
  delay(1500);  // let QoS1 status leave
  ESP.restart();
}

// Back to the image that installed this one. Prefers the bootloader rollback when the image is
// still in ESP_OTA_IMG_PENDING_VERIFY; otherwise switches the boot partition by label.
static void rollback(const char* why) {
  Serial.printf("OTA_ROLLBACK reason=%s previous=%s\n", why, otaRecord.previous);
  portENTER_CRITICAL(&relayMux); allOutputsOffLocked(NO_CAUSE); portEXIT_CRITICAL(&relayMux);
  OtaGuard::finish(otaRecord, false);
  saveOta();
  esp_ota_img_states_t state;
  const esp_partition_t* running = esp_ota_get_running_partition();
  if (running && esp_ota_get_state_partition(running, &state) == ESP_OK && state == ESP_OTA_IMG_PENDING_VERIFY)
    esp_ota_mark_app_invalid_rollback_and_reboot();  // does not return on success
  const esp_partition_t* previous = esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_ANY, otaRecord.previous);
  if (previous && previous != running && esp_ota_set_boot_partition(previous) == ESP_OK) { delay(100); ESP.restart(); }
  Serial.println("OTA_ROLLBACK_FAILED; staying on the current image");
}

static void otaTick(uint32_t now) {
  if (!FARM_DEVMGMT_ENABLED) return;
  if (connected && !configStateReported && client) publishConfigState();
  switch (OtaGuard::onTick(otaRecord, now, connected && configStateReported)) {
    case OtaGuard::TRIAL_CONFIRM:
      esp_ota_mark_app_valid_cancel_rollback();
      OtaGuard::finish(otaRecord, true);
      otaRecord.outcome = 0;  // reported right now
      saveOta();
      publishOtaStatus(otaRecord.otaId, otaRecord.version, "CONFIRMED", nullptr, 100);
      break;
    case OtaGuard::TRIAL_ROLLBACK: rollback("NO_HEALTHY_SESSION"); break;
    default: break;
  }
  // An image that came back from a failed trial reports it once.
  if (connected && configStateReported && otaRecord.outcome == 2) {
    publishOtaStatus(otaRecord.otaId, otaRecord.version, "ROLLED_BACK", "TRIAL_FAILED", -1);
    otaRecord.outcome = 0; saveOta();
  }
  if (connected) {
    static MgmtPacket packet;  // 1.5 KB: keep it off the loop stack
    if (xQueueReceive(mgmtQueue, &packet, 0) == pdTRUE) { if (packet.kind == MGMT_CONFIG) handleConfig(packet); else handleOta(packet); }
  }
}

// Keep the bootloader's pending-verify state until our own health check decides.
extern "C" bool verifyRollbackLater() { return FARM_DEVMGMT_ENABLED == 1; }

// ---- Wokwi CI self-test: scripted commands, no Wi-Fi/AWS. Build env wokwi_selftest only. ----
#if FARM_WOKWI_SELFTEST
static void selftestCommand(const char* device, const char* action, unsigned seconds) {
  const int c = bank.find(device);
  if (c < 0) { Serial.printf("SELFTEST_FAIL unknown %s\n", device); return; }
  static uint32_t counter = 0;
  char id[37];
  snprintf(id, sizeof(id), "00000000-0000-4000-8000-%012lu", (unsigned long)(++counter));
  const time_t now = time(nullptr);
  char issued[21], expires[21];
  struct tm utc;
  gmtime_r(&now, &utc); strftime(issued, sizeof(issued), "%Y-%m-%dT%H:%M:%SZ", &utc);
  const time_t later = now + 10;
  gmtime_r(&later, &utc); strftime(expires, sizeof(expires), "%Y-%m-%dT%H:%M:%SZ", &utc);
  JsonDocument doc;
  doc["schemaVersion"] = c == bank.pump() ? 1 : 3;
  doc["commandId"] = id; doc["deviceId"] = device; doc["action"] = action;
  if (strcmp(action, "ON") == 0) doc["durationSeconds"] = seconds;
  doc["issuedAt"] = issued; doc["expiresAt"] = expires;
  CommandPacket packet = {};
  serializeJson(doc, packet.payload, sizeof(packet.payload));
  packet.channel = c;
  handleCommand(packet);
}
#if FARM_DEVMGMT_ENABLED
static void selftestConfig(const char* id, uint32_t revision, unsigned telemetry, unsigned pumpMax) {
  static MgmtPacket packet = {};
  const time_t now = time(nullptr), later = now + 30;
  char issued[21], expires[21]; struct tm utc;
  gmtime_r(&now, &utc); strftime(issued, sizeof(issued), "%Y-%m-%dT%H:%M:%SZ", &utc);
  gmtime_r(&later, &utc); strftime(expires, sizeof(expires), "%Y-%m-%dT%H:%M:%SZ", &utc);
  packet.kind = MGMT_CONFIG;
  snprintf(packet.payload, sizeof(packet.payload),
    "{\"schemaVersion\":1,\"configId\":\"%s\",\"deviceId\":\"ENV01\",\"revision\":%lu,\"issuedAt\":\"%s\",\"expiresAt\":\"%s\","
    "\"settings\":{\"telemetrySeconds\":%u,\"heartbeatSeconds\":15,\"soilWetAdc\":900,\"soilDryAdc\":3100,\"pumpMaxSeconds\":%u}}",
    id, (unsigned long)revision, issued, expires, telemetry, pumpMax);
  handleConfig(packet);
}
#endif
// Each step waits for its time (ms since the first water-present reading) and prints a
// marker; the scenario checks GPIO levels after each marker.
static void selftestLoop(uint32_t now) {
  static int step = 0;
  static uint32_t start = 0;
  if (step == 0) {
    if (!waterPresent()) return;
    start = now; step = 1;
  }
  const uint32_t t = now - start;
  switch (step) {
    case 1: if (t < 500) return;
      selftestCommand("PUMP01", "RESET_LOCKOUT", 0); selftestCommand("MIST01", "RESET_LOCKOUT", 0);
      Serial.println("SELFTEST_CHECK 1 boot-dry-latch-reset"); break;
    case 2: if (t < 1000) return;
      selftestCommand("PUMP01", "ON", 20);
      Serial.println("SELFTEST_CHECK 2 pump-without-valve"); break;
    case 3: if (t < 2000) return;
      selftestCommand("VALVE01", "ON", 30); selftestCommand("VALVE02", "ON", 30);
      Serial.println("SELFTEST_CHECK 3 one-zone-at-a-time"); break;
    case 4: if (t < 3000) return;
      selftestCommand("PUMP01", "ON", 3);
      Serial.println("SELFTEST_CHECK 4 pump-with-valve"); break;
    case 5: if (t < 7000) return;
      Serial.println("SELFTEST_CHECK 5 pump-hard-cap"); break;
    case 6: if (t < 8000) return;
      selftestCommand("PUMP01", "ON", 20);
      Serial.println("SELFTEST_CHECK 6 pump-again"); break;
    case 7: if (t < 9000) return;
      selftestCommand("VALVE01", "OFF", 0);
      Serial.println("SELFTEST_CHECK 7 last-valve-closed-stops-pump"); break;
    case 8: if (t < 10000) return;
      selftestCommand("FAN01", "ON", 60); selftestCommand("LIGHT01", "ON", 60);
      selftestCommand("MIST01", "ON", 30); selftestCommand("VALVE03", "ON", 30); selftestCommand("PUMP01", "ON", 30);
      Serial.println("SELFTEST_CHECK 8 all-on"); break;
    case 9: // scenario releases the float button (dry) after marker 8
      if (waterPresent()) return;
      if (t < 11000) return;
      Serial.println("SELFTEST_CHECK 9 dry-trips-reservoir-users"); break;
    case 10: if (t < 13000) return;
      portENTER_CRITICAL(&relayMux); connected = false; allOutputsOffLocked(NETWORK_CAUSE); portEXIT_CRITICAL(&relayMux);
      Serial.println("SELFTEST_CHECK 10 network-loss-all-off"); break;
    case 11: if (t < 14000) return;
      Serial.printf("SELFTEST_DONE lockouts pump=%d valve3=%d fan=%d light=%d\n",
        bank.lockout(bank.pump()), bank.lockout(bank.find("VALVE03")), bank.lockout(bank.find("FAN01")), bank.lockout(bank.find("LIGHT01")));
      break;
#if FARM_DEVMGMT_ENABLED
    case 12: if (t < 15000) return;
      selftestConfig("c0000000-0000-4000-8000-000000000001", 5, 8, 600);
      selftestConfig("c0000000-0000-4000-8000-000000000001", 5, 8, 600);   // duplicate: same answer
      selftestConfig("c0000000-0000-4000-8000-000000000002", 5, 8, 600);   // same revision: stale
      selftestConfig("c0000000-0000-4000-8000-000000000003", 6, 30, 600);  // interval out of range
      loadConfig();                                                         // read back from NVS
      Serial.printf("SELFTEST_CONFIG_NVS revision=%lu telemetry=%u pumpMax=%u\n", (unsigned long)deviceConfig.revision(),
        deviceConfig.settings().telemetrySeconds, bank.maxSeconds(bank.pump()));
      break;
    case 13: if (t < 16000) return; {
      FirmwareHash hash; uint8_t chunk[200]; uint8_t digest[32];
      hash.begin();
      for (uint32_t done = 0; done < ota_test::kImageSize;) {
        uint32_t n = 0;
        while (n < sizeof(chunk) && done + n < ota_test::kImageSize) { chunk[n] = ota_test::imageByte(done + n); n++; }
        hash.update(chunk, n); done += n;
      }
      hash.finish(digest);
      const char* good = OtaVerify::check(digest, ota_test::kSha256, ota_test::kSignature, FARM_OTA_PUBLIC_KEY_PEM);
      const char* other = OtaVerify::check(digest, ota_test::kSha256, ota_test::kSignature, ota_test::kOtherPublicKey);
      digest[0] ^= 1;
      const char* tampered = OtaVerify::check(digest, ota_test::kSha256, ota_test::kSignature, FARM_OTA_PUBLIC_KEY_PEM);
      Serial.printf("SELFTEST_OTA_VERIFY good=%s otherKey=%s tampered=%s\n", good ? good : "OK", other ? other : "OK", tampered ? tampered : "OK");
    } break;
    case 14: if (t < 17000) return; {
      static MgmtPacket packet = {};
      packet.kind = MGMT_OTA;
      snprintf(packet.payload, sizeof(packet.payload),
        "{\"schemaVersion\":1,\"otaId\":\"0a000000-0000-4000-8000-000000000001\",\"deviceId\":\"ENV01\",\"version\":\"1.4.0\","
        "\"url\":\"https://fw.s3.amazonaws.com/a.bin\",\"size\":4096,\"sha256\":\"%s\",\"signature\":\"%s\","
        "\"issuedAt\":\"2027-01-15T08:00:00Z\",\"expiresAt\":\"2027-01-15T08:00:30Z\"}", ota_test::kSha256, ota_test::kSignature);
      handleOta(packet);  // link is down in this step: REJECTED NOT_CONNECTED, nothing written
      OtaRecord crash; crash.pending = true; int boots = 0;
      while (OtaGuard::onBoot(crash) == OtaGuard::BOOT_TRIAL) boots++;
      Serial.printf("SELFTEST_OTA_GUARD trialsBeforeRollback=%d pending=%d\n", boots, otaRecord.pending ? 1 : 0);
      Serial.println("SELFTEST_DEVMGMT_DONE");
    } break;
#endif
    default: return;
  }
  step++;
}
#endif

void setup() {
  // Latch every output OFF before anything else (each pin: level first, then pinMode).
  for (int i = 0; i < ActuatorBank::MAX; i++) { offCause[i] = NO_CAUSE; forcedOff[i] = false; outputOn[i] = false; }
  const bool actuatorsReady = setupActuators();
  Serial.begin(115200);
  Serial.printf("Firmware %s on partition %s\n", FARM_FIRMWARE_VERSION, runningPartition());
  if (FARM_DEVMGMT_ENABLED) {
    // Trial-boot bookkeeping first: a crash loop must reach the rollback before anything else.
    loadOta();
    const OtaGuard::Boot boot = OtaGuard::onBoot(otaRecord);
    saveOta();
    if (boot == OtaGuard::BOOT_ROLLBACK) rollback("BOOT_ATTEMPTS");
    else if (boot == OtaGuard::BOOT_TRIAL) Serial.printf("OTA_TRIAL attempt=%u version=%s\n", otaRecord.attempts, otaRecord.version);
  }
  Serial.println("SmartFarm starting; relays OFF");
  setenv("TZ","UTC0",1); tzset();
  commandQueue = xQueueCreate(8,sizeof(CommandPacket));
  mgmtQueue = xQueueCreate(2, sizeof(MgmtPacket));
  loadConfig();
  controlEnabled = FARM_CONTROL_ENABLED == 1 && strcmp(FARM_DEVICE_ID,"ENV01")==0 && strcmp(FARM_ID,"FARM001")==0 && commandQueue && actuatorsReady;
  Serial.println(controlEnabled ? "Wokwi relay control enabled" : "Relay control disabled");
  Serial.printf("Actuators: %d (pump requires valve=%d, max open valves=%d)\n", bank.size(), pumpNeedsValve() ? 1 : 0, FARM_MAX_OPEN_VALVES);
  if (FARM_WATER_INTERLOCK_ENABLED) pinMode(FARM_WATER_LEVEL_PIN, INPUT_PULLUP);
  if (FARM_WATER_INTERLOCK_ENABLED) Serial.printf("Water interlock enabled: GPIO%d closed=water, open=dry\n", FARM_WATER_LEVEL_PIN);
  else Serial.println("Water interlock disabled: set FARM_WATER_INTERLOCK_ENABLED=1 and rebuild");
  checkWaterSupply();
  uint8_t id[16];
  esp_fill_random(id, sizeof(id));
  id[6] = (id[6] & 0x0f) | 0x40;
  id[8] = (id[8] & 0x3f) | 0x80;
  snprintf(bootId, sizeof(bootId),
    "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
    id[0], id[1], id[2], id[3], id[4], id[5], id[6], id[7],
    id[8], id[9], id[10], id[11], id[12], id[13], id[14], id[15]);
  telemetryTopic = String("smartfarm/") + FARM_ID + "/" + FARM_DEVICE_ID + "/telemetry";
  statusTopic = String("smartfarm/") + FARM_ID + "/" + FARM_DEVICE_ID + "/status";
  const String device = String("smartfarm/") + FARM_ID + "/" + FARM_DEVICE_ID;
  configTopic = device + "/config"; configAckTopic = device + "/config-ack"; configStateTopic = device + "/config-state";
  otaTopic = device + "/ota"; otaStatusTopic = device + "/ota-status";
#if FARM_WOKWI_SELFTEST
  // Fixed wall clock and a simulated live link; no network is used.
  struct timeval tv = {1800000000, 0};
  settimeofday(&tv, nullptr);
  connected = true;
  Serial.println("SELFTEST_READY");
  return;
#endif
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
  // Refresh simulated wall time frequently; relay cutoff uses an independent timer.
  sntp_set_sync_interval(15000);
}

// Safety pass shared by production and self-test: faults, cutoffs, link loss, float.
static void safetyPass(uint32_t now, bool link) {
  bool fault;
  OffCause causes[ActuatorBank::MAX];
  bool forced[ActuatorBank::MAX];
  portENTER_CRITICAL(&relayMux);
  fault = controlFault; controlFault = false;
  for (int i = 0; i < bank.size(); i++) { causes[i] = offCause[i]; offCause[i] = NO_CAUSE; forced[i] = forcedOff[i]; }
  portEXIT_CRITICAL(&relayMux);
  if (fault) bank.tripAll("DEVICE_FAULT");
  // Timer cutoffs first: a closing valve stops the pump without lockout (VALVE_CLOSED).
  for (int i = 0; i < bank.size(); i++) if (bank.isOn(i) && causes[i] == TIMER_CAUSE) bank.stopByTimer(i);
  for (int i = 0; i < bank.size(); i++)
    if (bank.isOn(i) && (causes[i] == NETWORK_CAUSE || !link || forced[i])) bank.trip(i, "CONNECTION_LOST");
  bank.tick(now, link);
  const bool waterChanged = checkWaterSupply();
  applyRelayOutput();
  reportStopped();
  if (waterChanged) for (int i = 0; i < bank.size(); i++) if (bank.usesReservoir(i)) publishActuatorStatus(i);
}

void loop() {
  const uint32_t now = millis();
#if FARM_WOKWI_SELFTEST
  safetyPass(now, connected);
  static uint32_t lastStatus = 0;
  if (connected && now - lastStatus >= 5000) { lastStatus = now; for (int i = 0; i < bank.size(); i++) publishActuatorStatus(i); }
  selftestLoop(now);
  delay(10);
  return;
#endif
  const bool link = connected && WiFi.status() == WL_CONNECTED;
  safetyPass(now, link);
  static uint32_t lastActuatorStatus = 0;
  if (controlEnabled && link && now-lastActuatorStatus>=5000) {
    lastActuatorStatus=now;
    for (int i = 0; i < bank.size(); i++) publishActuatorStatus(i);
  }
  if (controlEnabled && link) {
    CommandPacket packet;
    if (xQueueReceive(commandQueue,&packet,0)==pdTRUE) handleCommand(packet);
  }
  otaTick(now);
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
  if (connected && now - lastHeartbeat >= deviceConfig.settings().heartbeatSeconds * 1000u) {
    lastHeartbeat = now;
    publishStatus();
  }
  if (connected && now - lastSample >= deviceConfig.settings().telemetrySeconds * 1000u) {
    lastSample = now;
    TempAndHumidity values = dht.getTempAndHumidity();
    if (isfinite(values.temperature) && isfinite(values.humidity)
        && values.temperature >= -40 && values.temperature <= 80
        && values.humidity >= 0 && values.humidity <= 100
        && deviceConfig.settings().soilDryAdc != deviceConfig.settings().soilWetAdc) {
      JsonDocument doc;
      base(doc);
      doc["temperature"] = values.temperature;
      doc["humidity"] = values.humidity;
      const float dry = deviceConfig.settings().soilDryAdc, wet = deviceConfig.settings().soilWetAdc;
      float soil = 100.0f * (dry - analogRead(FARM_SOIL_PIN)) / (dry - wet);
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
