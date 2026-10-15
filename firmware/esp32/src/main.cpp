#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <DHTesp.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <esp_system.h>
#include <time.h>
#include <esp_timer.h>
#include <esp_sntp.h>
#include "RelaySafety.h"
#include "FlowInterlock.h"
#include "PumpStatusPacket.h"
#include "PumpCommandFence.h"
#include "FencedPumpPacket.h"
#include "ValveProofInterlock.h"

#if __has_include("config.local.h")
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

// Backward-compatible opt-in for existing private configurations.
#ifndef FARM_FLOW_INTERLOCK_ENABLED
#define FARM_FLOW_INTERLOCK_ENABLED 0
#endif
#ifndef FARM_FLOW_PIN
#define FARM_FLOW_PIN 25
#endif
#ifndef FARM_FLOW_SIMULATOR
#define FARM_FLOW_SIMULATOR 1
#endif
#ifndef FARM_FLOW_PULSES_PER_LITRE
#define FARM_FLOW_PULSES_PER_LITRE 450.0
#endif
#ifndef FARM_FLOW_MINIMUM_LPM
#define FARM_FLOW_MINIMUM_LPM 1.0
#endif
#ifndef FARM_FLOW_MAXIMUM_HZ
#define FARM_FLOW_MAXIMUM_HZ 2000.0
#endif
#ifndef FARM_FLOW_GRACE_MS
#define FARM_FLOW_GRACE_MS 5000
#endif
#ifndef FARM_FLOW_CALIBRATION_VERSION
#define FARM_FLOW_CALIBRATION_VERSION ""
#endif
static_assert(FARM_FLOW_INTERLOCK_ENABLED==0||FARM_FLOW_INTERLOCK_ENABLED==1,"Flow opt-in must be 0 or 1");
static_assert(FARM_FLOW_SIMULATOR==0||FARM_FLOW_SIMULATOR==1,"Flow source must be 0 or 1");
static_assert(!FARM_FLOW_INTERLOCK_ENABLED||FARM_WATER_INTERLOCK_ENABLED,"Flow guard requires reservoir interlock too");
static_assert(!FARM_FLOW_INTERLOCK_ENABLED||FARM_FLOW_PIN==25,"This adapter supports dedicated GPIO25 only");
static_assert(!FARM_FLOW_INTERLOCK_ENABLED||(FARM_FLOW_PIN!=FARM_RELAY_PIN&&FARM_FLOW_PIN!=FARM_DHT_PIN
  &&FARM_FLOW_PIN!=FARM_SOIL_PIN&&FARM_FLOW_PIN!=FARM_WATER_LEVEL_PIN),"Flow must have a separate GPIO");

#ifndef FARM_WOKWI_CLOCK_TOLERANCE_SECONDS
#define FARM_WOKWI_CLOCK_TOLERANCE_SECONDS 2
#endif
static_assert(FARM_WOKWI_CLOCK_TOLERANCE_SECONDS >= 0 && FARM_WOKWI_CLOCK_TOLERANCE_SECONDS <= 10,
  "Wokwi clock tolerance must be between 0 and 10 seconds");


#ifndef FARM_PUMP_FENCING_ENABLED
#define FARM_PUMP_FENCING_ENABLED 0
#endif
static_assert(FARM_PUMP_FENCING_ENABLED==0||FARM_PUMP_FENCING_ENABLED==1,"Pump fence opt-in must be 0 or 1");

#ifndef FARM_VALVE_PROOF_ENABLED
#define FARM_VALVE_PROOF_ENABLED 0
#endif
#ifndef FARM_VALVE_PROOF_SIMULATOR
#define FARM_VALVE_PROOF_SIMULATOR 1
#endif
static_assert(FARM_VALVE_PROOF_ENABLED==0||FARM_VALVE_PROOF_ENABLED==1,"Valve proof opt-in must be 0 or 1");
static_assert(!FARM_VALVE_PROOF_ENABLED||FARM_VALVE_PROOF_SIMULATOR==1,"Local valve proof is a Wokwi prototype only");
static_assert(!FARM_VALVE_PROOF_ENABLED||FARM_WATER_INTERLOCK_ENABLED,"Valve proof requires reservoir interlock");
static_assert(!FARM_VALVE_PROOF_ENABLED||(FARM_RELAY_PIN!=32&&FARM_RELAY_PIN!=33&&FARM_DHT_PIN!=32&&FARM_DHT_PIN!=33&&FARM_SOIL_PIN!=32&&FARM_SOIL_PIN!=33&&FARM_WATER_LEVEL_PIN!=32&&FARM_WATER_LEVEL_PIN!=33&&(!FARM_FLOW_INTERLOCK_ENABLED||(FARM_FLOW_PIN!=32&&FARM_FLOW_PIN!=33))),"Valve proof contacts require separate GPIO32/33");

// Only ENV01 may control PUMP01 in this Wokwi MVP. Default disabled.
static DHTesp dht;
static esp_mqtt_client_handle_t client = nullptr;
static volatile bool connected = false;
static String ca, certificate, privateKey, uri, telemetryTopic, statusTopic;
static char bootId[37];
static RelaySafety relay;
static PumpCommandFence pumpOrder;
static bool controlEnabled = false;
static String commandTopic, pumpStatusTopic, ackTopic, activeCommand;
struct CommandPacket { char payload[769]; bool retained; size_t size; };
static QueueHandle_t commandQueue;
static esp_timer_handle_t relayTimer, flowTimer,valveProofTimer;
static ValveProofInterlock valveProof(FARM_VALVE_PROOF_ENABLED==1);
static volatile ValveProofInterlock::Fault pendingValveFault=ValveProofInterlock::NONE;
static FlowInterlock flowGuard({FARM_FLOW_INTERLOCK_ENABLED==1,
  FARM_FLOW_SIMULATOR==1||strspn(FARM_FLOW_CALIBRATION_VERSION," \t\r\n")<strlen(FARM_FLOW_CALIBRATION_VERSION),
  FARM_FLOW_PULSES_PER_LITRE,FARM_FLOW_MINIMUM_LPM,FARM_FLOW_MAXIMUM_HZ,FARM_FLOW_GRACE_MS});
static volatile uint32_t flowPulses=0;
static volatile bool flowOverflow=false;
static volatile FlowInterlock::Fault pendingFlowFault=FlowInterlock::NONE;
static portMUX_TYPE relayMux = portMUX_INITIALIZER_UNLOCKED;
enum OffCause { NO_CAUSE, TIMER_CAUSE, NETWORK_CAUSE };
static volatile OffCause offCause = NO_CAUSE;
static const char* stateReason = "BOOT";
static volatile bool forcedOff = false, controlFault = false;

static const char* flowReason(FlowInterlock::Fault fault) {
  return fault==FlowInterlock::LOW_FLOW?"FLOW_LOW":"FLOW_SENSOR_FAULT";
}
static void IRAM_ATTR flowPulse() {
  portENTER_CRITICAL_ISR(&relayMux);
  if(flowPulses==UINT32_MAX)flowOverflow=true;else ++flowPulses;
  portEXIT_CRITICAL_ISR(&relayMux);
}
// Independent ESP timer task: no network, allocations or Serial in this callback.
static void sampleFlow(void*) {
  portENTER_CRITICAL(&relayMux);
  uint32_t pulses=flowPulses;bool overflow=flowOverflow;flowPulses=0;flowOverflow=false;
  if(forcedOff)flowGuard.stop();
  auto fault=flowGuard.sample(millis(),pulses,overflow);
  if(fault!=FlowInterlock::NONE) {
    pendingFlowFault=fault;forcedOff=true;valveProof.stop();
    digitalWrite(FARM_RELAY_PIN,FARM_RELAY_OFF_LEVEL);
  }
  portEXIT_CRITICAL(&relayMux);
}
static void stopFlow() {
  portENTER_CRITICAL(&relayMux);flowGuard.stop();portEXIT_CRITICAL(&relayMux);
}
// relayMux held. Independent timer task also calls this while Arduino loop is blocked.
static void sampleValveProofLocked(){
  if(!FARM_VALVE_PROOF_ENABLED)return;
  auto before=valveProof.fault();
  valveProof.sample(millis(),digitalRead(33)==LOW,digitalRead(32)==LOW);
  if(valveProof.fault()!=ValveProofInterlock::NONE&&before==ValveProofInterlock::NONE){pendingValveFault=valveProof.fault();forcedOff=true;digitalWrite(FARM_RELAY_PIN,FARM_RELAY_OFF_LEVEL);}
}
static void sampleValveProof(void*){portENTER_CRITICAL(&relayMux);sampleValveProofLocked();portEXIT_CRITICAL(&relayMux);}
static void stopValveProof(){portENTER_CRITICAL(&relayMux);valveProof.stop();portEXIT_CRITICAL(&relayMux);}
static bool settleValveFault(){
  portENTER_CRITICAL(&relayMux);auto fault=pendingValveFault;pendingValveFault=ValveProofInterlock::NONE;portEXIT_CRITICAL(&relayMux);
  if(fault==ValveProofInterlock::NONE)return false;
  relay.fail(activeCommand.c_str(),ValveProofInterlock::faultName(fault));stateReason=ValveProofInterlock::faultName(fault);activeCommand="";stopFlow();esp_timer_stop(relayTimer);return true;
}
// RelaySafety stays loop-owned. The callback has already forced the GPIO OFF.
static bool settleFlowFault() {
  portENTER_CRITICAL(&relayMux);auto fault=pendingFlowFault;pendingFlowFault=FlowInterlock::NONE;portEXIT_CRITICAL(&relayMux);
  if(fault==FlowInterlock::NONE)return false;
  relay.fail(activeCommand.c_str(),flowReason(fault));stateReason=flowReason(fault);activeCommand="";
  esp_timer_stop(relayTimer);return true;
}

static bool waterPresent() {
  return !FARM_WATER_INTERLOCK_ENABLED || digitalRead(FARM_WATER_LEVEL_PIN) == LOW;
}

// Loop-owned state; runs before commands and network/sample work. An open wire
// has the same safe effect as an empty reservoir. No automatic recovery to ON.
static bool checkWaterSupply() {
  if (!controlEnabled || !FARM_WATER_INTERLOCK_ENABLED) return false;
  const bool present = waterPresent();
  const bool changed = relay.setWaterAvailable(present);
  if (!present) {
    portENTER_CRITICAL(&relayMux);
    forcedOff = true;
    valveProof.stop();
    digitalWrite(FARM_RELAY_PIN, FARM_RELAY_OFF_LEVEL);
    portEXIT_CRITICAL(&relayMux);
    stateReason = "WATER_LOW";
    activeCommand = "";
    esp_timer_stop(relayTimer);
  }
  if (changed) Serial.println(present ? "WATER_RESTORED; reset lockout required" : "WATER_LOW; relay OFF and locked");
  return changed;
}

static void forceRelayOff(void*) {
  portENTER_CRITICAL(&relayMux);
  forcedOff = true;
  valveProof.stop();
  offCause = TIMER_CAUSE;
  digitalWrite(FARM_RELAY_PIN, FARM_RELAY_OFF_LEVEL);
  portEXIT_CRITICAL(&relayMux);
}
static void applyRelayOutput() {
  portENTER_CRITICAL(&relayMux);
  if(!relay.isOn())valveProof.stop();
  sampleValveProofLocked();
  if(relay.isOn()&&connected&&!forcedOff){auto fault=valveProof.outputCheck();if(fault!=ValveProofInterlock::NONE){pendingValveFault=fault;forcedOff=true;}}
  digitalWrite(FARM_RELAY_PIN, controlEnabled && connected && !forcedOff && valveProof.ready() && flowGuard.fault()==FlowInterlock::NONE && waterPresent() && relay.isOn()
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
  settleValveFault();
  JsonDocument doc;
  base(doc);
  portENTER_CRITICAL(&relayMux);ValveProofInterlock proof=valveProof;bool cut=forcedOff;portEXIT_CRITICAL(&relayMux);
  const char* reason=proof.fault()!=ValveProofInterlock::NONE&&strcmp(stateReason,"WATER_LOW")?ValveProofInterlock::faultName(proof.fault()):stateReason;
  fillPumpStatus(doc,relay.isOn() && !cut?"ON":"OFF",relay.lockout()||proof.fault()!=ValveProofInterlock::NONE,reason,
    activeCommand.length()?activeCommand.c_str():nullptr);
  if(FARM_VALVE_PROOF_ENABLED)fillValveProof(doc,proof);
  if(FARM_PUMP_FENCING_ENABLED)pumpFence::status(doc,pumpOrder.lastOrdinal(),pumpOrder.restartRequired());
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
  if(strlen(packet.payload)!=packet.size){Serial.println("Command rejected: embedded NUL");return;}
  JsonDocument doc;
  if (deserializeJson(doc, packet.payload)) { Serial.println("Command rejected: JSON"); return; }
  const char* id = doc["commandId"] | "";
  if (!validUuid(id)) { Serial.println("Command rejected: ID"); return; }
  const char* action = doc["action"] | "";
  const bool on = strcmp(action,"ON")==0;
  const bool off = strcmp(action,"OFF")==0;
  const bool reset = strcmp(action,"RESET_LOCKOUT")==0;
  const char* error = nullptr;
  settleFlowFault();
  settleValveFault();
  checkWaterSupply();
  bool wasOn = relay.isOn();
  pumpFence::Command fencedCommand;bool hasFence=false;
  if (packet.retained) error = "RETAINED_COMMAND";
  else if(FARM_PUMP_FENCING_ENABLED){
    if(!pumpFence::decode(packet.payload,fencedCommand))error="INVALID_COMMAND";
    else {
      hasFence=!fencedCommand.legacyOff;
      if(hasFence){
        error=pumpOrder.accept(fencedCommand.ordinal,fencedCommand.target,bootId,off);
        if(error&&strcmp(error,"STALE_ORDINAL")==0){publishPumpStatus();return;}
      }
      if(!error)error=relay.apply(id,on?RelaySafety::ON:off?RelaySafety::OFF:RelaySafety::RESET,fencedCommand.seconds,
        fencedCommand.issued,fencedCommand.expires,time(nullptr),millis(),strcmp(FARM_WIFI_SSID,"Wokwi-GUEST")==0?FARM_WOKWI_CLOCK_TOLERANCE_SECONDS:2);
      if(!error&&fencedCommand.legacyOff){relay.trip();pumpOrder.legacyEmergencyStop();}
    }
  }
  else if (!doc.is<JsonObject>() || doc.size() != (on ? 7 : 6)
    || !doc["schemaVersion"].is<int>() || doc["schemaVersion"].as<int>() != 1
    || strcmp(doc["deviceId"] | "", "PUMP01") != 0 || (!on && !off && !reset)
    || (on && !doc["durationSeconds"].is<unsigned>())
    || (!on && !doc["durationSeconds"].isUnbound())
    || !doc["issuedAt"].is<const char*>() || !doc["expiresAt"].is<const char*>()) error = "INVALID_COMMAND";
  else error = relay.apply(id, on ? RelaySafety::ON : off ? RelaySafety::OFF : RelaySafety::RESET,
    on ? doc["durationSeconds"].as<unsigned>() : 0,
    parseUtc(doc["issuedAt"]), parseUtc(doc["expiresAt"]), time(nullptr), millis(),
    strcmp(FARM_WIFI_SSID, "Wokwi-GUEST") == 0 ? FARM_WOKWI_CLOCK_TOLERANCE_SECONDS : 2);
  if (!error && relay.isOn() && !wasOn) {
    portENTER_CRITICAL(&relayMux);sampleValveProofLocked();auto proofError=valveProof.start();portEXIT_CRITICAL(&relayMux);
    if(proofError!=ValveProofInterlock::NONE){error=ValveProofInterlock::faultName(proofError);relay.fail(id,error);stateReason=error;}
  }
  if (!error && relay.isOn() && !wasOn) {
    esp_timer_stop(relayTimer);
    // Arm independent cutoff before energizing; never renew it on duplicate ON.
    if (esp_timer_start_once(relayTimer, uint64_t(doc["durationSeconds"].as<unsigned>()) * 1000000) != ESP_OK) {
      relay.fail(id,"DEVICE_FAULT"); error = "DEVICE_FAULT";
    } else {
      portENTER_CRITICAL(&relayMux);
      auto flowError=flowGuard.start(millis());flowPulses=0;flowOverflow=false;
      if(flowError!=FlowInterlock::NONE){pendingFlowFault=flowError;error=flowReason(flowError);}
      else if (connected) { forcedOff = false; offCause = NO_CAUSE; }
      portEXIT_CRITICAL(&relayMux);
      activeCommand = id;
    }
  }
  if(!error&&reset&&!relay.lockout()) {
    portENTER_CRITICAL(&relayMux);auto flowError=flowGuard.reset();
    if(flowError!=FlowInterlock::NONE){pendingFlowFault=flowError;error=flowReason(flowError);}portEXIT_CRITICAL(&relayMux);
  }
  if(!error&&reset&&!relay.lockout()){
    portENTER_CRITICAL(&relayMux);sampleValveProofLocked();auto proofError=valveProof.reset();portEXIT_CRITICAL(&relayMux);
    if(proofError!=ValveProofInterlock::NONE){error=ValveProofInterlock::faultName(proofError);relay.fail(id,error);stateReason=error;}
  }
  settleFlowFault();
  settleValveFault();
  if (!relay.isOn()) { stopFlow();stopValveProof();esp_timer_stop(relayTimer); activeCommand = ""; }
  if (!connected) { relay.fail(id,"CONNECTION_LOST"); error = "CONNECTION_LOST"; }
  // Recheck after parsing/arming so a switch change cannot energize the output.
  checkWaterSupply();
  sampleValveProof(nullptr);settleValveFault();
  if((on||reset)&&FARM_VALVE_PROOF_ENABLED){portENTER_CRITICAL(&relayMux);auto proofError=valveProof.fault();portEXIT_CRITICAL(&relayMux);if(proofError!=ValveProofInterlock::NONE){relay.fail(id,ValveProofInterlock::faultName(proofError));error=ValveProofInterlock::faultName(proofError);}}
  if (!waterPresent() && (on || reset)) { relay.fail(id,"WATER_LOW"); error = "WATER_LOW"; }
  if (!relay.isOn()) activeCommand = "";
  if (!error) {
    if (on && relay.isOn() && !wasOn) stateReason = "COMMAND_ON";
    else if (off) stateReason = "COMMAND_OFF";
    else if (reset) stateReason = "LOCKOUT_RESET";
  } else if (strcmp(error,"DEVICE_FAULT")==0) stateReason = "DEVICE_FAULT";
  else if (strcmp(error,"CONNECTION_LOST")==0) stateReason = "CONNECTION_LOST";
  portENTER_CRITICAL(&relayMux);auto latchedFlow=flowGuard.fault();portEXIT_CRITICAL(&relayMux);
  if(latchedFlow!=FlowInterlock::NONE&&relay.lockout())stateReason=flowReason(latchedFlow);
  portENTER_CRITICAL(&relayMux);auto latchedValve=valveProof.fault();portEXIT_CRITICAL(&relayMux);
  if(latchedValve!=ValveProofInterlock::NONE)stateReason=ValveProofInterlock::faultName(latchedValve);
  if (!waterPresent()) stateReason = "WATER_LOW";
  applyRelayOutput();
  if(settleValveFault()&&(on||reset)){portENTER_CRITICAL(&relayMux);error=ValveProofInterlock::faultName(valveProof.fault());portEXIT_CRITICAL(&relayMux);}
  if (error && (strcmp(error,"EXPIRED")==0 || strcmp(error,"CLOCK_SKEW")==0 || strcmp(error,"INVALID_LIFETIME")==0 || strcmp(error,"CLOCK_NOT_READY")==0)) {
    int64_t epoch=time(nullptr), issued=parseUtc(doc["issuedAt"] | ""), expires=parseUtc(doc["expiresAt"] | "");
    Serial.printf("COMMAND_TIME now=%lld issued=%lld expires=%lld age=%lld remaining=%lld\n",
      (long long)epoch,(long long)issued,(long long)expires,(long long)(epoch-issued),(long long)(expires-epoch));
  }
  JsonDocument ack;
  base(ack); ack["deviceId"] = "PUMP01"; ack["commandId"] = id;
  ack["stage"] = "EXECUTED"; ack["status"] = error ? "FAILED" : "SUCCESS";
  ack["reportedState"] = relay.isOn() && !forcedOff ? "ON" : "OFF";
  ack["safetyLockout"] = relay.lockout();
  if (error) ack["errorCode"] = error; else ack["errorCode"] = nullptr;
  if(hasFence)pumpFence::ack(ack,fencedCommand.ordinal);
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
    if (digitalRead(FARM_RELAY_PIN) != FARM_RELAY_OFF_LEVEL) offCause = NETWORK_CAUSE;
    forcedOff = true;
    valveProof.stop();
    digitalWrite(FARM_RELAY_PIN, FARM_RELAY_OFF_LEVEL);
    portEXIT_CRITICAL(&relayMux);
    Serial.println("AWS MQTT unavailable; check endpoint/cert/policy/network");
  } else if (id == MQTT_EVENT_DATA && controlEnabled) {
    if (event->current_data_offset == 0 && event->data_len == event->total_data_len
        && event->data_len > 0 && event->data_len <= 768
        && event->topic_len == (int)commandTopic.length()
        && strncmp(event->topic, commandTopic.c_str(), event->topic_len)==0) {
      CommandPacket packet = {};
      memcpy(packet.payload,event->data,event->data_len); packet.retained = event->retain; packet.size=event->data_len;
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
  if(FARM_FLOW_INTERLOCK_ENABLED){
    pinMode(FARM_FLOW_PIN,INPUT_PULLDOWN);attachInterrupt(digitalPinToInterrupt(FARM_FLOW_PIN),flowPulse,RISING);
    esp_timer_create_args_t flowArgs={};flowArgs.callback=sampleFlow;flowArgs.name="flow_guard";
    timerReady=timerReady&&esp_timer_create(&flowArgs,&flowTimer)==ESP_OK;
    timerReady=timerReady&&esp_timer_start_periodic(flowTimer,250000)==ESP_OK;
  }
  if(FARM_VALVE_PROOF_ENABLED){
    pinMode(32,INPUT_PULLUP);pinMode(33,INPUT_PULLUP);
    esp_timer_create_args_t proofArgs={};proofArgs.callback=sampleValveProof;proofArgs.name="valve_proof";
    timerReady=timerReady&&esp_timer_create(&proofArgs,&valveProofTimer)==ESP_OK;
    timerReady=timerReady&&esp_timer_start_periodic(valveProofTimer,25000)==ESP_OK;
    Serial.println("VALVE_PROOF simulator enabled: GPIO32 CLOSED / GPIO33 OPEN; independent active LOW contacts");
  }
  controlEnabled = FARM_CONTROL_ENABLED == 1 && strcmp(FARM_DEVICE_ID,"ENV01")==0 && strcmp(FARM_ID,"FARM001")==0 && commandQueue && timerReady;
  commandTopic = String("smartfarm/") + FARM_ID + "/PUMP01/command";
  ackTopic = String("smartfarm/") + FARM_ID + "/PUMP01/ack";
  pumpStatusTopic = String("smartfarm/") + FARM_ID + "/PUMP01/status";
  Serial.println(controlEnabled ? "Wokwi relay control enabled" : "Relay control disabled");
  if (FARM_WATER_INTERLOCK_ENABLED) pinMode(FARM_WATER_LEVEL_PIN, INPUT_PULLUP);
  if (FARM_WATER_INTERLOCK_ENABLED) Serial.printf("Water interlock enabled: GPIO%d closed=water, open=dry\n", FARM_WATER_LEVEL_PIN);
  else Serial.println("Water interlock disabled: set FARM_WATER_INTERLOCK_ENABLED=1 and rebuild");
  checkWaterSupply();
  if(FARM_FLOW_INTERLOCK_ENABLED){
    Serial.printf("FLOW_GUARD enabled source=%s GPIO%d graceMs=%u minLpm=%.3f\n",FARM_FLOW_SIMULATOR?"SIMULATOR":"PHYSICAL_DECLARED",FARM_FLOW_PIN,unsigned(FARM_FLOW_GRACE_MS),double(FARM_FLOW_MINIMUM_LPM));
    if(!flowGuard.validConfig()){relay.trip();forcedOff=true;stateReason="FLOW_SENSOR_FAULT";Serial.println("FLOW_GUARD invalid configuration; relay locked OFF");}
  }else Serial.println("FLOW_GUARD disabled; opt in and rebuild for local flow protection");
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
  // Refresh simulated wall time frequently; relay cutoff uses an independent timer.
  sntp_set_sync_interval(15000);
}

void loop() {
  const uint32_t now = millis();
  bool link = connected && WiFi.status() == WL_CONNECTED;
  bool fault;
  portENTER_CRITICAL(&relayMux); fault=controlFault; controlFault=false; portEXIT_CRITICAL(&relayMux);
  if (fault) { relay.trip(); stateReason="DEVICE_FAULT"; activeCommand=""; esp_timer_stop(relayTimer); }
  bool wasRunning = relay.isOn();
  bool flowStopped=settleFlowFault();
  sampleValveProof(nullptr);bool valveStopped=settleValveFault();
  OffCause cause;
  portENTER_CRITICAL(&relayMux); cause=offCause; offCause=NO_CAUSE; portEXIT_CRITICAL(&relayMux);
  if (!flowStopped && !valveStopped && wasRunning && cause == TIMER_CAUSE) { relay.stop(); stateReason="TIMER_EXPIRED"; }
  else if (!flowStopped && !valveStopped && wasRunning && (cause == NETWORK_CAUSE || !link || forcedOff)) { relay.trip(); stateReason="CONNECTION_LOST"; }
  bool stopped = relay.tickSafety(now, link);
  if (stopped && wasRunning) stateReason="TIMER_EXPIRED";
  stopped = stopped || (wasRunning && !relay.isOn());
  bool waterChanged = checkWaterSupply();
  stopped = stopped || (wasRunning && !relay.isOn());
  applyRelayOutput();
  if (!relay.isOn())stopValveProof();
  if (stopped||flowStopped||valveStopped) { stopFlow();activeCommand = ""; esp_timer_stop(relayTimer); publishPumpStatus(); Serial.printf("RELAY_OFF reason=%s\n",stateReason); }
  else if (waterChanged) publishPumpStatus();
  static uint32_t lastFlowDiagnostic=0;
  if(FARM_FLOW_INTERLOCK_ENABLED&&now-lastFlowDiagnostic>=1000){
    lastFlowDiagnostic=now;portENTER_CRITICAL(&relayMux);bool measured=flowGuard.measured();double rate=flowGuard.lpm();auto fault=flowGuard.fault();bool watching=flowGuard.running();portEXIT_CRITICAL(&relayMux);
    Serial.printf("FLOW_GUARD source=%s watching=%d sampled=%d lpm=%.3f fault=%s\n",FARM_FLOW_SIMULATOR?"SIMULATOR":"PHYSICAL_DECLARED",watching,measured,rate,fault==FlowInterlock::NONE?"NONE":flowReason(fault));
  }
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
