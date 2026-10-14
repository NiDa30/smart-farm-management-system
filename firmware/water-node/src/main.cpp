#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <mqtt_client.h>
#include <esp_system.h>
#include <esp_timer.h>
#include <esp_sntp.h>
#include <time.h>
#include "WaterMeasurements.h"
#include "WaterPacket.h"
#if __has_include("config.local.h")
#include "config.local.h"
#else
#include "config.example.h"
#endif
static_assert(WATER_SIMULATOR == 0 || WATER_SIMULATOR == 1, "Invalid data source");
static_assert(WATER_LOW_PIN != WATER_HIGH_PIN && WATER_LOW_PIN != WATER_FLOW_PIN &&
  WATER_HIGH_PIN != WATER_FLOW_PIN && WATER_FAULT_LED_PIN != WATER_LOW_PIN &&
  WATER_FAULT_LED_PIN != WATER_HIGH_PIN && WATER_FAULT_LED_PIN != WATER_FLOW_PIN,
  "Water inputs and fault indicator must use separate GPIOs");

static water::Floats floats;
static water::Flow flow = {false,0,"WARMING_UP"};
static portMUX_TYPE pulseMux = portMUX_INITIALIZER_UNLOCKED;
static volatile uint32_t pulseCount = 0;
static volatile bool pulseOverflow = false;
static volatile bool connected = false;
static esp_mqtt_client_handle_t client = nullptr;
static String ca, certificate, privateKey, uri, topic;
static char bootId[37];
static uint64_t sequence = 0;
static uint32_t lastSample = 0, lastWifi = 0, lastMqtt = 0, lastDiagnostic = 0;

void IRAM_ATTR countPulse() {
  portENTER_CRITICAL_ISR(&pulseMux);
  if (pulseCount == UINT32_MAX) pulseOverflow = true; else pulseCount++;
  portEXIT_CRITICAL_ISR(&pulseMux);
}
static String readPem(const char* path) {
  File file = LittleFS.open(path,"r");
  return !file || file.size()>8192 ? String() : file.readString();
}
static String timestamp() {
  time_t epoch=time(nullptr);struct tm utc;gmtime_r(&epoch,&utc);
  char out[25];strftime(out,sizeof(out),"%Y-%m-%dT%H:%M:%SZ",&utc);return String(out);
}
static bool validIdentity(const char* value) {
  size_t n=strlen(value);if(n<2||n>32||value[0]<'A'||value[0]>'Z')return false;
  for(size_t i=1;i<n;i++)if(!((value[i]>='A'&&value[i]<='Z')||(value[i]>='0'&&value[i]<='9')||value[i]=='_'||value[i]=='-'))return false;
  return strcmp(value,"ENV01")!=0 && strcmp(value,"PUMP01")!=0;
}
static void mqttEvent(void*,esp_event_base_t,int32_t id,void* data) {
  if(id==MQTT_EVENT_CONNECTED){connected=true;Serial.println("WATER AWS MQTT connected (TLS verified)");}
  else if(id==MQTT_EVENT_DISCONNECTED||id==MQTT_EVENT_ERROR){connected=false;Serial.println("WATER MQTT unavailable; sampling continues locally");}
  else if(id==MQTT_EVENT_PUBLISHED){auto event=static_cast<esp_mqtt_event_handle_t>(data);Serial.printf("WATER MQTT QoS1 PUBACK id=%d\n",event->msg_id);}
}
static bool startMqtt() {
  if(!validIdentity(WATER_NODE_ID)||strcmp(WATER_FARM_ID,"FARM001")!=0)return false;
  ca=readPem("/AmazonRootCA1.pem");certificate=readPem("/device.pem.crt");privateKey=readPem("/private.pem.key");
  if(ca.isEmpty()||certificate.isEmpty()||privateKey.isEmpty()){Serial.println("WATER private certificate files missing; MQTT disabled");return false;}
  uri=String("mqtts://")+WATER_AWS_ENDPOINT+":8883";
  topic=String("smartfarm/")+WATER_FARM_ID+"/"+WATER_NODE_ID+"/telemetry";
  esp_mqtt_client_config_t cfg={};cfg.uri=uri.c_str();cfg.client_id=WATER_NODE_ID;
  cfg.cert_pem=ca.c_str();cfg.client_cert_pem=certificate.c_str();cfg.client_key_pem=privateKey.c_str();
  cfg.keepalive=30;cfg.network_timeout_ms=8000;cfg.reconnect_timeout_ms=5000;cfg.buffer_size=2048;
  // Monitor-only node: no command subscription, no retained telemetry or LWT.
  client=esp_mqtt_client_init(&cfg);if(!client)return false;
  esp_mqtt_client_register_event(client,MQTT_EVENT_ANY,mqttEvent,nullptr);
  if(esp_mqtt_client_start(client)==ESP_OK)return true;
  esp_mqtt_client_destroy(client);client=nullptr;return false;
}
static void sample(uint32_t now) {
  uint32_t count;bool overflow;
  portENTER_CRITICAL(&pulseMux);now=millis();count=pulseCount;overflow=pulseOverflow;pulseCount=0;pulseOverflow=false;portEXIT_CRITICAL(&pulseMux);
  uint32_t elapsed=now-lastSample;lastSample=now;
  flow=water::measureFlow(count,elapsed,WATER_PULSES_PER_LITRE,WATER_MAX_PULSE_HZ,overflow,
    WATER_SIMULATOR || strlen(WATER_FLOW_CALIBRATION_VERSION)>0);
  water::Tank tank=floats.state(now);
  bool floatsValid=tank!=water::Tank::WARMING_UP && tank!=water::Tank::INCONSISTENT;
  digitalWrite(WATER_FAULT_LED_PIN,(!floatsValid||!flow.valid)?HIGH:LOW);
  Serial.printf("WATER_SAMPLE tank=%s flow=%s pulses=%lu intervalMs=%lu source=%s\n",
    water::tankName(tank),flow.reason,(unsigned long)count,(unsigned long)elapsed,WATER_SIMULATOR?"SIMULATOR":"PHYSICAL_DECLARED");
  // Always advance sampling offline. No replay of an old window as a fresh value.
  if(!connected || time(nullptr)<1700000000)return;
  JsonDocument doc;
  String utc=timestamp();
  water::packet(doc,WATER_NODE_ID,bootId,sequence++,utc.c_str(),uint64_t(esp_timer_get_time()/1000),
    WATER_SIMULATOR,floatsValid,floats.lowWet(),floats.highWet(),flow,WATER_FLOW_CALIBRATION_VERSION);
  String payload;serializeJson(doc,payload);
  if(esp_mqtt_client_publish(client,topic.c_str(),payload.c_str(),0,1,0)>=0)Serial.println("WATER telemetry queued; wait for PUBACK");
}
void setup() {
  Serial.begin(115200);Serial.printf("Water monitor starting: %s; no pump output\n",WATER_NODE_ID);
  pinMode(WATER_LOW_PIN,INPUT_PULLUP);pinMode(WATER_HIGH_PIN,INPUT_PULLUP);pinMode(WATER_FLOW_PIN,INPUT_PULLDOWN);
  digitalWrite(WATER_FAULT_LED_PIN,HIGH);pinMode(WATER_FAULT_LED_PIN,OUTPUT);
  lastSample=millis();attachInterrupt(digitalPinToInterrupt(WATER_FLOW_PIN),countPulse,RISING);
  setenv("TZ","UTC0",1);tzset();
  uint8_t id[16];esp_fill_random(id,sizeof(id));id[6]=(id[6]&0x0f)|0x40;id[8]=(id[8]&0x3f)|0x80;
  snprintf(bootId,sizeof(bootId),"%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",id[0],id[1],id[2],id[3],id[4],id[5],id[6],id[7],id[8],id[9],id[10],id[11],id[12],id[13],id[14],id[15]);
  Serial.println(LittleFS.begin(false)?"WATER LittleFS mounted":"WATER LittleFS unavailable; build private filesystem image");
  WiFi.mode(WIFI_STA);WiFi.begin(WATER_WIFI_SSID,WATER_WIFI_PASSWORD);
  configTime(0,0,"pool.ntp.org","time.google.com");sntp_set_sync_interval(15000);
}
void loop() {
  uint32_t now=millis();floats.update(digitalRead(WATER_LOW_PIN)==LOW,digitalRead(WATER_HIGH_PIN)==LOW,now);
  if(now-lastSample>=5000)sample(now);
  // Indicator follows invalid float input between published windows too.
  auto tank=floats.state(now);digitalWrite(WATER_FAULT_LED_PIN,
    tank==water::Tank::WARMING_UP||tank==water::Tank::INCONSISTENT||!flow.valid?HIGH:LOW);
  if(WiFi.status()!=WL_CONNECTED){connected=false;if(now-lastWifi>=10000){lastWifi=now;WiFi.reconnect();}}
  else if(!client && strlen(WATER_AWS_ENDPOINT)>0 && time(nullptr)>=1700000000 && now-lastMqtt>=10000){lastMqtt=now;startMqtt();}
  if(!connected && now-lastDiagnostic>=10000){lastDiagnostic=now;
    Serial.println(strlen(WATER_AWS_ENDPOINT)==0?"WATER endpoint missing: prepare local node project":
      WiFi.status()!=WL_CONNECTED?"WATER waiting for Wi-Fi/gateway":time(nullptr)<1700000000?"WATER waiting for NTP":"WATER waiting for MQTT/certificate/policy");}
  delay(10);
}
