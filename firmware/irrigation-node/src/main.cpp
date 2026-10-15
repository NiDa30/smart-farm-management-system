#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>
#include <mqtt_client.h>
#include <esp_timer.h>
#include <esp_system.h>
#include <time.h>
#include <esp_sntp.h>
#include "ValveModel.h"
#include "ValvePacket.h"
#if __has_include("config.local.h")
#include "config.local.h"
#else
#include "config.example.h"
#endif
#ifndef IRRIGATION_POSITION_FEEDBACK_ENABLED
#define IRRIGATION_POSITION_FEEDBACK_ENABLED 0
#endif
static_assert(IRRIGATION_POSITION_FEEDBACK_ENABLED==0||IRRIGATION_POSITION_FEEDBACK_ENABLED==1,"Feedback opt-in must be 0 or 1");
static_assert(IRRIGATION_SIMULATOR==1,"LED simulator only; physical valve not supported");
static_assert(IRRIGATION_DEMO_ENABLED==0||IRRIGATION_DEMO_ENABLED==1,"Demo opt-in must be 0 or 1");
static ValveFeedback position(IRRIGATION_POSITION_FEEDBACK_ENABLED==1);static bool feedbackChanged=false;
static ValveModel model;static portMUX_TYPE mux=portMUX_INITIALIZER_UNLOCKED;
static volatile bool connected=false,subscribed=false,fault=false;static bool allowed=false;
static esp_timer_handle_t timer;static esp_mqtt_client_handle_t client=nullptr;
static String ca,cert,key,uri;static char boot[37];static uint64_t sequence=0;
struct Message {char text[1024];};static QueueHandle_t queue;
static uint32_t lastStatus=0,lastWifi=0,lastMqtt=0;
static const char* statusTopic="smartfarm/FARM001/VALVE01/status";static const char* ackTopic="smartfarm/FARM001/VALVE01/ack";
static void safety(void*){portENTER_CRITICAL(&mux);if(fault)model.close("DEVICE_FAULT");else model.tick(millis(),connected&&subscribed);
 const char* before=position.state();const char* error=position.fault();position.sample(millis(),digitalRead(32)==LOW,digitalRead(33)==LOW,model.isOpen());
 if(strcmp(before,position.state())||error!=position.fault())feedbackChanged=true;
 if(position.fault())model.close("POSITION_FAULT");
 digitalWrite(26,allowed&&connected&&subscribed&&!fault&&model.isOpen()?HIGH:LOW);portEXIT_CRITICAL(&mux);}
static String pem(const char* path){File f=LittleFS.open(path,"r");return !f||f.size()>8192?String():f.readString();}
static String utc(){time_t epoch=time(nullptr);struct tm tm;gmtime_r(&epoch,&tm);char text[21];strftime(text,sizeof(text),"%Y-%m-%dT%H:%M:%SZ",&tm);return String(text);}
static void publish(const valve::Command* command=nullptr,const char* error=nullptr){
 if(!connected||time(nullptr)<1700000000||sequence>9007199254740991ULL)return;
 bool open;uint64_t rank;const char* reason;ValveFeedback observed;portENTER_CRITICAL(&mux);open=model.isOpen()&&!fault;rank=model.lastOrdinal();reason=model.reason();observed=position;portEXIT_CRITICAL(&mux);
 JsonDocument d;String at=utc();valve::packet(d,IRRIGATION_ZONE_ID,boot,sequence++,at.c_str(),open,reason,allowed&&!fault&&subscribed,rank,&observed);
 if(command){d["commandId"]=command->id;d["ordinal"]=command->ordinal;d["action"]=command->open?"OPEN":"CLOSE";d["result"]=error?"REJECTED":"EXECUTED";if(error)d["errorCode"]=error;else d["errorCode"]=nullptr;}
 String text;serializeJson(d,text);esp_mqtt_client_publish(client,command?ackTopic:statusTopic,text.c_str(),0,1,0);
}
static void mqtt(void*,esp_event_base_t,int32_t id,void* data){
 auto e=static_cast<esp_mqtt_event_handle_t>(data);
 if(id==MQTT_EVENT_CONNECTED){subscribed=false;connected=true;esp_mqtt_client_subscribe(client,"smartfarm/FARM001/VALVE01/command",1);}
 else if(id==MQTT_EVENT_SUBSCRIBED){subscribed=true;}
 else if(id==MQTT_EVENT_DISCONNECTED||id==MQTT_EVENT_ERROR){subscribed=false;connected=false;safety(nullptr);}
 else if(id==MQTT_EVENT_DATA){
  if(e->retain||e->current_data_offset||e->data_len!=e->total_data_len||e->data_len<=0||e->data_len>1023)return;
  const char* topic="smartfarm/FARM001/VALVE01/command";if(e->topic_len!=(int)strlen(topic)||strncmp(e->topic,topic,e->topic_len))return;
  Message m;memcpy(m.text,e->data,e->data_len);m.text[e->data_len]=0;if(!queue||xQueueSend(queue,&m,0)!=pdTRUE){fault=true;safety(nullptr);}
 }
}
static bool startMqtt(){
 if(!valve::code(IRRIGATION_ZONE_ID)||!strlen(IRRIGATION_AWS_ENDPOINT))return false;
 ca=pem("/AmazonRootCA1.pem");cert=pem("/device.pem.crt");key=pem("/private.pem.key");if(ca.isEmpty()||cert.isEmpty()||key.isEmpty())return false;
 uri=String("mqtts://")+IRRIGATION_AWS_ENDPOINT+":8883";esp_mqtt_client_config_t c={};c.uri=uri.c_str();c.client_id="IRRIGATION01";c.cert_pem=ca.c_str();c.client_cert_pem=cert.c_str();c.client_key_pem=key.c_str();c.keepalive=10;c.network_timeout_ms=5000;c.buffer_size=2048;c.reconnect_timeout_ms=5000;
 client=esp_mqtt_client_init(&c);if(!client)return false;esp_mqtt_client_register_event(client,MQTT_EVENT_ANY,mqtt,nullptr);if(esp_mqtt_client_start(client)==ESP_OK)return true;esp_mqtt_client_destroy(client);client=nullptr;return false;
}
void setup(){
 digitalWrite(26,LOW);pinMode(26,OUTPUT);Serial.begin(115200);Serial.println("IRRIGATION01 LED demo; CLOSED; physical feedback UNKNOWN; no pump");
 if(IRRIGATION_POSITION_FEEDBACK_ENABLED){pinMode(32,INPUT_PULLUP);pinMode(33,INPUT_PULLUP);Serial.println("Independent simulated end stops: CLOSED GPIO32, OPEN GPIO33; active LOW");}
 allowed=IRRIGATION_DEMO_ENABLED==1&&valve::code(IRRIGATION_ZONE_ID);queue=xQueueCreate(8,sizeof(Message));if(!queue){fault=true;allowed=false;}
 esp_timer_create_args_t args={};args.callback=safety;args.name="valve-safety";if(esp_timer_create(&args,&timer)!=ESP_OK||esp_timer_start_periodic(timer,25000)!=ESP_OK){fault=true;allowed=false;}
 uint8_t b[16];esp_fill_random(b,sizeof(b));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;snprintf(boot,sizeof(boot),"%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8],b[9],b[10],b[11],b[12],b[13],b[14],b[15]);
 setenv("TZ","UTC0",1);tzset();LittleFS.begin(false);WiFi.onEvent([](WiFiEvent_t event){if(event==ARDUINO_EVENT_WIFI_STA_DISCONNECTED)connected=false;});WiFi.mode(WIFI_STA);WiFi.begin(IRRIGATION_WIFI_SSID,IRRIGATION_WIFI_PASSWORD);configTime(0,0,"pool.ntp.org","time.google.com");sntp_set_sync_interval(15000);
}
void loop(){
 uint32_t now=millis();safety(nullptr);
 Message m;while(queue&&xQueueReceive(queue,&m,0)==pdTRUE){
  valve::Command c;if(!valve::decode(m.text,IRRIGATION_ZONE_ID,c)){Serial.println("VALVE command rejected: contract");continue;}
  const char* error;portENTER_CRITICAL(&mux);error=model.apply(c.ordinal,c.open,c.seconds,c.issued,c.expires,time(nullptr),millis(),strcmp(c.boot,boot)==0,allowed&&!fault&&subscribed,connected&&subscribed,position.canOpen());if(!error&&!c.open)position.acknowledgeClose();if(position.fault())model.close("POSITION_FAULT");digitalWrite(26,allowed&&connected&&subscribed&&!fault&&model.isOpen()?HIGH:LOW);portEXIT_CRITICAL(&mux);
  if(!error||strcmp(error,"STALE_COMMAND"))publish(&c,error);publish();Serial.printf("VALVE_COMMAND action=%s result=%s\n",c.open?"OPEN":"CLOSE",error?error:"EXECUTED");
 }
 if(WiFi.status()!=WL_CONNECTED){connected=false;if(now-lastWifi>=10000){lastWifi=now;WiFi.reconnect();}}
 else if(!client&&time(nullptr)>=1700000000&&now-lastMqtt>=10000){lastMqtt=now;startMqtt();}
 bool changed;portENTER_CRITICAL(&mux);changed=feedbackChanged;feedbackChanged=false;portEXIT_CRITICAL(&mux);
 if(changed||now-lastStatus>=5000){lastStatus=now;publish();}delay(10);
}
