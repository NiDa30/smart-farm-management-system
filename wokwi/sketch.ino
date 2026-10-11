#include <WiFi.h>
#include <PubSubClient.h>
#include <DHTesp.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* TOPIC = "smartfarm/dien/FARM001/ENV01/telemetry";

const int DHT_PIN = 15;

DHTesp dht;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting MQTT...");
    String clientId = "esp32-farm-" + String(random(10000, 99999));

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.setup(DHT_PIN, DHTesp::DHT22);
  delay(1500);
  connectWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  TempAndHumidity data = dht.getTempAndHumidity();

  if (isnan(data.temperature) || isnan(data.humidity)) {
    Serial.println("Cannot read DHT22");
  } else {
    String payload = "{\"deviceId\":\"ENV01\",\"temperature\":";
    payload += String(data.temperature, 1);
    payload += ",\"humidity\":";
    payload += String(data.humidity, 1);
    payload += "}";

    mqttClient.publish(TOPIC, payload.c_str());
    Serial.print("Published: ");
    Serial.println(payload);
  }

  delay(3000);
}
