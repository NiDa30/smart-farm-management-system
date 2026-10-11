import React, { useEffect, useState, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  History,
  Info,
  Layers,
  Play,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  Thermometer,
  Droplets,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface TelemetryPoint {
  id: string;
  time: string;
  timestamp: Date;
  temperature: number;
  humidity: number;
  rawPayload: string;
}

const DEFAULT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const DEFAULT_TOPIC = 'smartfarm/dien/FARM001/ENV01/telemetry';
const DEVICE_ID = 'ENV01';

export const SensorRealtime: React.FC = () => {
  const { showToast, navigate } = useApp();

  // MQTT Connection & Telemetry State
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [status, setStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR'>('CONNECTING');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [packetCount, setPacketCount] = useState<number>(0);
  const [historyPoints, setHistoryPoints] = useState<TelemetryPoint[]>([]);
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  const [isReceivingPulse, setIsReceivingPulse] = useState(false);

  // Configuration Modal & Code Modal States
  const [brokerUrl, setBrokerUrl] = useState(DEFAULT_BROKER_URL);
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [showConfig, setShowConfig] = useState(false);
  const [showWokwiGuide, setShowWokwiGuide] = useState(false);

  // Simulation test state
  const [simTemp, setSimTemp] = useState(31.5);
  const [simHum, setSimHum] = useState(72);

  const clientRef = useRef<MqttClient | null>(null);

  // Initialize MQTT Connection
  useEffect(() => {
    const clientId = `smartfarm-web-${Math.random().toString(16).substring(2, 10)}`;
    console.log(`[MQTT] Connecting to ${brokerUrl} with clientId: ${clientId}`);
    setStatus('CONNECTING');

    const client = mqtt.connect(brokerUrl, {
      clientId,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('[MQTT] Connected to HiveMQ Broker!');
      setStatus('ONLINE');
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (!err) {
          console.log(`[MQTT] Subscribed to topic: ${topic}`);
          showToast(`Đã kết nối MQTT Broker và lắng nghe topic: ${topic}`, 'success');
        } else {
          console.error('[MQTT] Subscription error:', err);
        }
      });
    });

    client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        try {
          const rawStr = message.toString();
          const data = JSON.parse(rawStr);
          const now = new Date();
          const timeStr = now.toLocaleTimeString('vi-VN');

          if (typeof data.temperature === 'number') {
            setTemperature(Number(data.temperature.toFixed(1)));
          }
          if (typeof data.humidity === 'number') {
            setHumidity(Number(data.humidity.toFixed(1)));
          }

          setLastUpdate(now);
          setPacketCount((prev) => prev + 1);

          // Pulse animation trigger
          setIsReceivingPulse(true);
          setTimeout(() => setIsReceivingPulse(false), 800);

          // Update point history (keep last 15 points)
          setHistoryPoints((prev) => [
            ...prev.slice(-14),
            {
              id: `${Date.now()}`,
              time: timeStr,
              timestamp: now,
              temperature: Number(data.temperature),
              humidity: Number(data.humidity),
              rawPayload: rawStr,
            },
          ]);

          // Terminal Raw Log (keep last 10)
          setRawLogs((prev) => [`[${timeStr}] ${rawStr}`, ...prev.slice(0, 9)]);
        } catch (err) {
          console.error('[MQTT] Error parsing payload:', err);
        }
      }
    });

    client.on('error', (err) => {
      console.error('[MQTT] Client error:', err);
      setStatus('ERROR');
    });

    client.on('offline', () => {
      console.warn('[MQTT] Client offline');
      setStatus('OFFLINE');
    });

    client.on('reconnect', () => {
      console.log('[MQTT] Reconnecting...');
      setStatus('CONNECTING');
    });

    return () => {
      console.log('[MQTT] Cleaning up connection');
      if (client) {
        client.end(true);
      }
    };
  }, [brokerUrl, topic]);

  // Publish a test MQTT packet directly from browser
  const handlePublishTestPacket = (tVal: number, hVal: number) => {
    if (!clientRef.current || !clientRef.current.connected) {
      showToast('Client chưa kết nối MQTT Broker!', 'warning');
      return;
    }

    const payload = JSON.stringify({
      deviceId: DEVICE_ID,
      temperature: Number(tVal.toFixed(1)),
      humidity: Number(hVal.toFixed(1)),
    });

    clientRef.current.publish(topic, payload, { qos: 0 }, (err) => {
      if (!err) {
        showToast(`Đã gửi gói tin test MQTT: ${tVal}°C, ${hVal}%`, 'info');
      } else {
        showToast('Lỗi gửi gói tin test', 'warning');
      }
    });
  };

  // Rule Evaluation
  const temperatureStatus =
    temperature === null
      ? 'WAITING'
      : temperature > 35
      ? 'CRITICAL'
      : temperature > 30
      ? 'WARNING'
      : temperature < 18
      ? 'LOW'
      : 'NORMAL';

  const humidityStatus =
    humidity === null
      ? 'WAITING'
      : humidity < 50
      ? 'DRY'
      : humidity > 85
      ? 'HIGH'
      : 'NORMAL';

  const copyWokwiCode = () => {
    const code = `#include <WiFi.h>
#include <PubSubClient.h>
#include <DHTesp.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;

const char* TOPIC = "${topic}";

const int DHT_PIN = 15;

DHTesp dht;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting MQTT...");
    String clientId = "smartfarm-device-" + String(random(10000, 99999));
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.println("failed");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.setup(DHT_PIN, DHTesp::DHT22);
  connectWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  TempAndHumidity data = dht.getTempAndHumidity();

  String payload =
    "{\\"deviceId\\":\\"${DEVICE_ID}\\",\\"temperature\\":" + String(data.temperature, 1) +
    ",\\"humidity\\":" + String(data.humidity, 1) + "}";

  mqttClient.publish(TOPIC, payload.c_str());
  Serial.println(payload);

  delay(3000);
}`;
    navigator.clipboard.writeText(code);
    showToast('Đã sao chép mã nguồn C++ Wokwi ESP32 vào bộ nhớ tạm!', 'success');
  };

  return (
    <div className="space-y-5 pb-16 text-xs max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>Cảm Biến Thời Gian Thực (Sensor Realtime IoT)</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 uppercase font-mono">
              Live MQTT Stream
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Dữ liệu cảm biến vi khí hậu thực tế kết nối trực tiếp từ Wokwi ESP32 + DHT22 qua giao thức WebSocket MQTT
          </p>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWokwiGuide(true)}
            className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-md hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mã Wokwi ESP32</span>
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Radio className="w-3.5 h-3.5 text-slate-500" />
            <span>Cấu hình MQTT Broker</span>
          </button>
        </div>
      </div>

      {/* Connection Info Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Trạng thái kết nối:</span>
            {status === 'ONLINE' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>🟢 Online (Đã kết nối)</span>
              </span>
            ) : status === 'CONNECTING' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-300">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                <span>🟡 Đang kết nối HiveMQ...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 font-bold border border-rose-300">
                <WifiOff className="w-3 h-3 text-rose-600" />
                <span>🔴 Mất kết nối (Offline)</span>
              </span>
            )}
          </div>

          {/* Device ID */}
          <div className="flex items-center gap-1 text-slate-700">
            <span className="text-slate-400">Thiết bị:</span>
            <span className="font-mono font-bold text-slate-900 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
              {DEVICE_ID}
            </span>
          </div>

          {/* Topic */}
          <div className="flex items-center gap-1 text-slate-700 truncate max-w-xs">
            <span className="text-slate-400">Topic:</span>
            <span className="font-mono font-semibold text-emerald-800 truncate" title={topic}>
              {topic}
            </span>
          </div>
        </div>

        {/* Packet Counter & Pulse */}
        <div className="flex items-center gap-3 text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Gói tin nhận:</span>
            <span
              className={`font-mono font-bold text-sm px-2 py-0.5 rounded transition-colors ${
                isReceivingPulse ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {packetCount}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>
              Cập nhật: {lastUpdate ? lastUpdate.toLocaleTimeString('vi-VN') : 'Đang đợi gói tin đầu tiên...'}
            </span>
          </div>
        </div>
      </div>

      {/* Config Popover / Accordion */}
      {showConfig && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="font-bold text-slate-800">Cấu hình kết nối MQTT WebSocket</span>
            <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">WebSocket Broker URL:</label>
              <input
                type="text"
                value={brokerUrl}
                onChange={(e) => setBrokerUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">MQTT Topic:</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* CORE TELEMETRY METRICS: 2 HERO SENSOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: TEMPERATURE */}
        <div
          className={`bg-white rounded-xl border p-5 shadow-2xs transition-all relative overflow-hidden ${
            temperatureStatus === 'CRITICAL'
              ? 'border-rose-400 ring-2 ring-rose-200'
              : temperatureStatus === 'WARNING'
              ? 'border-amber-400 ring-2 ring-amber-200'
              : 'border-slate-200'
          }`}
        >
          {/* Top Title & Status Tag */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  temperatureStatus === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-700'
                    : temperatureStatus === 'WARNING'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Nhiệt Độ Không Khí (Temperature)</h3>
                <span className="text-[11px] text-slate-400 font-mono">Cảm biến DHT22 · Chân GPIO 15</span>
              </div>
            </div>

            {/* Threshold Tag */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                temperatureStatus === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : temperatureStatus === 'WARNING'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : temperatureStatus === 'LOW'
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : temperatureStatus === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {temperatureStatus === 'CRITICAL'
                ? '🔴 Nhiệt độ nguy hiểm (>35°C)'
                : temperatureStatus === 'WARNING'
                ? '🟡 Nhiệt độ cao (>30°C)'
                : temperatureStatus === 'LOW'
                ? '🟡 Nhiệt độ thấp (<18°C)'
                : temperatureStatus === 'NORMAL'
                ? '🟢 Bình thường (Đạt chuẩn)'
                : 'Đang đợi dữ liệu...'}
            </span>
          </div>

          {/* Main Display Value */}
          <div className="py-6 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-5xl font-black font-mono tracking-tight transition-transform ${
                  isReceivingPulse ? 'scale-105 text-emerald-700' : 'text-slate-900'
                }`}
              >
                {temperature !== null ? temperature : '--'}
              </span>
              <span className="text-2xl font-bold text-slate-400 font-sans">°C</span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-36 space-y-1 text-right">
              <span className="text-[11px] text-slate-400 block font-mono">Mục tiêu: 24.0° – 30.0°C</span>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    temperatureStatus === 'CRITICAL'
                      ? 'bg-rose-500'
                      : temperatureStatus === 'WARNING'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(((temperature || 20) / 45) * 100, 5), 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer Rule Hint */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Quy tắc tự động: <strong>Bật phun sương làm mát</strong> khi nhiệt độ &gt; 33.0°C
            </span>
            <span className="font-mono text-slate-400">Rule: AUTO-MIST-01</span>
          </div>
        </div>

        {/* CARD 2: HUMIDITY */}
        <div
          className={`bg-white rounded-xl border p-5 shadow-2xs transition-all relative overflow-hidden ${
            humidityStatus === 'HIGH'
              ? 'border-rose-400 ring-2 ring-rose-200'
              : humidityStatus === 'DRY'
              ? 'border-amber-400 ring-2 ring-amber-200'
              : 'border-slate-200'
          }`}
        >
          {/* Top Title & Status Tag */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  humidityStatus === 'HIGH'
                    ? 'bg-rose-100 text-rose-700'
                    : humidityStatus === 'DRY'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-sky-100 text-sky-700'
                }`}
              >
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Độ Ẩm Không Khí (Relative Humidity)</h3>
                <span className="text-[11px] text-slate-400 font-mono">Cảm biến DHT22 · Chân GPIO 15</span>
              </div>
            </div>

            {/* Threshold Tag */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                humidityStatus === 'HIGH'
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : humidityStatus === 'DRY'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : humidityStatus === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {humidityStatus === 'HIGH'
                ? '🔴 Độ ẩm quá cao (>85%)'
                : humidityStatus === 'DRY'
                ? '🟡 Độ ẩm thấp (<50%)'
                : humidityStatus === 'NORMAL'
                ? '🟢 Bình thường (50% – 85%)'
                : 'Đang đợi dữ liệu...'}
            </span>
          </div>

          {/* Main Display Value */}
          <div className="py-6 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-5xl font-black font-mono tracking-tight transition-transform ${
                  isReceivingPulse ? 'scale-105 text-sky-700' : 'text-slate-900'
                }`}
              >
                {humidity !== null ? humidity : '--'}
              </span>
              <span className="text-2xl font-bold text-slate-400 font-sans">%</span>
            </div>

            {/* Visual Gauge Bar */}
            <div className="w-36 space-y-1 text-right">
              <span className="text-[11px] text-slate-400 block font-mono">Dải chuẩn: 60% – 80%</span>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    humidityStatus === 'HIGH'
                      ? 'bg-rose-500'
                      : humidityStatus === 'DRY'
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                  }`}
                  style={{ width: `${Math.min(Math.max(humidity || 40, 5), 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer Rule Hint */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Cảnh báo dịch hại: Độ ẩm &gt; 85% kéo dài tăng nguy cơ <strong>nấm thối nõn dừa</strong>
            </span>
            <span className="font-mono text-slate-400">IPM Risk Level</span>
          </div>
        </div>
      </div>

      {/* REALTIME STREAM CHARTS & TERMINAL CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Telemetry Sparkline Chart (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Biểu Đồ Dữ Liệu Thời Gian Thực (Live Telemetry Stream)
              </h3>
              <p className="text-[11px] text-slate-500">15 gói tin gần nhất nhận được từ MQTT Broker</p>
            </div>
            <span className="font-mono text-emerald-800 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Chu kỳ gửi: ~3 giây / lần
            </span>
          </div>

          {/* Bar / Stream visualization */}
          <div className="h-44 w-full bg-slate-50/60 rounded-lg p-3 border border-slate-200 flex flex-col justify-between">
            {historyPoints.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                <Radio className="w-6 h-6 animate-pulse text-slate-300" />
                <span>Đang lắng nghe dữ liệu từ Wokwi ESP32...</span>
                <span className="text-[10px] text-slate-400 font-mono">Topic: {topic}</span>
              </div>
            ) : (
              <div className="h-32 flex items-end justify-between gap-2 px-1 pt-2">
                {historyPoints.map((pt, idx) => (
                  <div key={pt.id || idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[9px] font-mono text-slate-600 font-bold">{pt.temperature}°</span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        pt.temperature > 30 ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ height: `${Math.min((pt.temperature / 45) * 100, 100)}%` }}
                      title={`Thời gian: ${pt.time} | Nhiệt độ: ${pt.temperature}°C | Độ ẩm: ${pt.humidity}%`}
                    />
                    <span className="text-[8px] text-slate-400 font-mono truncate max-w-[28px]">
                      {pt.time.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
                <span>Nhiệt độ đo được (°C)</span>
              </span>
              <span className="font-mono text-slate-400">
                Tổng gói nhận: <strong>{packetCount}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: MQTT Raw Payload Console & Test Trigger (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Terminal Box */}
          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 shadow-md space-y-2.5 font-mono text-[11px] border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-white">MQTT Live Terminal</span>
              </div>
              <span className="text-[10px] text-slate-500">JSON Payload</span>
            </div>

            <div className="h-32 overflow-y-auto space-y-1 text-slate-400 text-[10px] scrollbar-thin">
              {rawLogs.length === 0 ? (
                <div className="text-slate-600 italic py-4 text-center">
                  Chưa có gói tin nào. Hãy chạy sketch trên Wokwi hoặc bấm "Gửi gói tin test".
                </div>
              ) : (
                rawLogs.map((log, i) => (
                  <div key={i} className="hover:text-emerald-300 transition-colors">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Simulation / Test Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Thử nghiệm nhanh (Simulator):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Bơm tin vào Broker</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 block">Nhiệt độ test (°C):</label>
                <input
                  type="number"
                  step="0.5"
                  value={simTemp}
                  onChange={(e) => setSimTemp(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-slate-200 rounded font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block">Độ ẩm test (%):</label>
                <input
                  type="number"
                  step="1"
                  value={simHum}
                  onChange={(e) => setSimHum(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-slate-200 rounded font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handlePublishTestPacket(simTemp, simHum)}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-colors shadow-2xs"
              >
                Gửi Gói Tin Test ({simTemp}°C / {simHum}%)
              </button>
              <button
                onClick={() => handlePublishTestPacket(36.5, 88)}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold transition-colors"
                title="Gửi gói tin giả lập vượt ngưỡng cảnh báo (36.5°C, 88%)"
              >
                Test Nguy hiểm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WOKWI GUIDE DRAWER / MODAL */}
      {showWokwiGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Hướng Dẫn Nối Thiết Bị Wokwi ESP32 + DHT22</h3>
                  <span className="text-[11px] text-slate-500 font-mono">broker.hivemq.com:1883</span>
                </div>
              </div>
              <button
                onClick={() => setShowWokwiGuide(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1 text-emerald-950">
                <span className="font-bold block">1. Sơ đồ đấu nối chân trên Wokwi:</span>
                <div className="font-mono text-[11px] space-y-0.5">
                  <div>• DHT22 <strong>VCC</strong> → ESP32 <strong>3V3</strong></div>
                  <div>• DHT22 <strong>SDA</strong> → ESP32 <strong>GPIO 15</strong></div>
                  <div>• DHT22 <strong>GND</strong> → ESP32 <strong>GND</strong></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">2. Thêm thư viện vào tab Library Manager:</span>
                <div className="font-mono text-slate-700">
                  <div>1. <strong>DHTesp</strong></div>
                  <div>2. <strong>PubSubClient</strong></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">3. Mã nguồn C++ cho sketch.ino:</span>
                  <button
                    onClick={copyWokwiCode}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Sao chép mã C++</span>
                  </button>
                </div>

                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-52 leading-relaxed">
{`#include <WiFi.h>
#include <PubSubClient.h>
#include <DHTesp.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";
const char* MQTT_SERVER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* TOPIC = "${topic}";
const int DHT_PIN = 15;

DHTesp dht;
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
// ... xem chi tiết khi copy`}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowWokwiGuide(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-xs"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
