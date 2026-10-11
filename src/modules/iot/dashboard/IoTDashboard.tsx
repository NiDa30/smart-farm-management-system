import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Battery,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Droplets,
  ExternalLink,
  Layers,
  Power,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const IoTDashboard: React.FC = () => {
  const {
    iotDevices,
    realtimeMetrics,
    automationRules,
    iotAlerts,
    controlActuator,
    navigate,
    showToast,
  } = useApp();

  // Zone drawer state
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Active pump & valve states
  const pumpP01 = iotDevices.find((d) => d.id === 'PUMP-P01');
  const valveV01 = iotDevices.find((d) => d.id === 'VALVE-V01');
  const pumpIsOn = pumpP01?.actuatorState?.state === 'ON';
  const valveIsOpen = valveV01?.actuatorState?.state === 'OPEN';

  // Metrics
  const totalDevices = iotDevices.length;
  const onlineCount = iotDevices.filter((d) => d.status === 'ONLINE').length;
  const offlineCount = iotDevices.filter((d) => d.status === 'OFFLINE').length;
  const warningCount = iotDevices.filter((d) => d.status === 'WARNING' || d.status === 'DEGRADED').length;
  const criticalAlerts = iotAlerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED');
  const activeAutomations = automationRules.filter((r) => r.status === 'ACTIVE').length;

  const handleQuickTogglePump = async () => {
    const cmd = pumpIsOn ? 'STOP' : 'START';
    await controlActuator('PUMP-P01', cmd, 15, 'Thao tác nhanh từ Dashboard');
  };

  const handleQuickToggleValve = async () => {
    const cmd = valveIsOpen ? 'CLOSE' : 'OPEN';
    await controlActuator('VALVE-V01', cmd, 15, 'Thao tác nhanh từ Dashboard');
  };

  const zonesData = [
    {
      id: 'zone-north',
      name: 'Khu A (Bắc)',
      desc: 'Dừa Xiêm Xanh Lùn Bến Tre (A001–A100)',
      status: 'WARNING',
      devicesCount: 8,
      onlineCount: 8,
      soilMoisture: '28.4%',
      temp: '31.4°C',
      activeRules: 2,
      alertsCount: 1,
      color: 'border-amber-400 bg-amber-500/10 text-amber-300',
    },
    {
      id: 'zone-south',
      name: 'Khu B (Nam)',
      desc: 'Bưởi Da Xanh & Dừa Dứa (B001–B080)',
      status: 'NORMAL',
      devicesCount: 5,
      onlineCount: 4,
      soilMoisture: '43.5%',
      temp: '31.2°C',
      activeRules: 1,
      alertsCount: 1,
      color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300',
    },
    {
      id: 'zone-nur',
      name: 'Vườn Ươm & Cây Non',
      desc: 'Khu nhân giống cây con nhà màng',
      status: 'CRITICAL',
      devicesCount: 2,
      onlineCount: 1,
      soilMoisture: '22.0%',
      temp: '32.1°C',
      activeRules: 1,
      alertsCount: 1,
      color: 'border-rose-500 bg-rose-500/10 text-rose-300',
    },
    {
      id: 'zone-pump',
      name: 'Trạm Bơm & Hồ Ngầm',
      desc: 'Trạm bơm trung tâm 5.5HP, Hồ 500m³',
      status: 'WARNING',
      devicesCount: 4,
      onlineCount: 4,
      soilMoisture: 'N/A',
      temp: '30.5°C',
      activeRules: 2,
      alertsCount: 1,
      color: 'border-cyan-500 bg-cyan-500/10 text-cyan-300',
    },
  ];

  const currentZoneData = zonesData.find((z) => z.id === selectedZone);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              <span>Phân hệ 4: IoT & Tự động hóa</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              MQTT Live (Broker: 12ms)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Trung tâm quan trắc cảm biến thực địa, điều khiển máy bơm, van tưới tự động và hệ thống Fail-safe
          </p>
        </div>

        {/* Quick Nav / Control shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/iot/control')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Trung tâm Điều khiển</span>
          </button>
          <button
            onClick={() => navigate('/iot/automation')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quy tắc Automation ({activeAutomations})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Thiết bị IoT</span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{totalDevices}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">{onlineCount}</span> online ·
            <span className="text-rose-500 font-semibold">{offlineCount}</span> off
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Online Rate</span>
            <Wifi className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            {((onlineCount / totalDevices) * 100).toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {warningCount > 0 ? `${warningCount} thiết bị cảnh báo` : 'Tất cả ổn định'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Cảnh báo Khẩn</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono">
            {criticalAlerts.length}
          </div>
          <div className="text-[11px] text-rose-500 font-medium mt-1">
            Cần xử lý ngay lập tức
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Automation</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 font-mono">
            {activeAutomations}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Rule đang kích hoạt</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Nước hôm nay</span>
            <Droplets className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">12.4 <span className="text-xs font-normal text-slate-500">m³</span></div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">↓ 5.3% so với hôm qua</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Điện tiêu thụ</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">42.5 <span className="text-xs font-normal text-slate-500">kWh</span></div>
          <div className="text-[11px] text-slate-500 mt-1">Ước tính: 128.000 đ</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Mực hồ ngầm</span>
            <Layers className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">68.5%</div>
          <div className="text-[11px] text-cyan-700 font-medium mt-1">~342 m³ dự trữ</div>
        </div>
      </div>

      {/* Main Grid: Farm IoT Map vs Critical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Farm IoT Map & Zone Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Sơ đồ Phân khu IoT Thực địa (Farm IoT Map)
                </h2>
              </div>
              <span className="text-xs text-slate-500">Nhấp vào từng phân khu để mở Drawer kiểm tra</span>
            </div>

            {/* Zone Map Grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {zonesData.map((zone) => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone.id)}
                  className="cursor-pointer p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/80 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700">
                          {zone.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            zone.status === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-700'
                              : zone.status === 'WARNING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {zone.status === 'NORMAL'
                            ? '● Bình thường'
                            : zone.status === 'WARNING'
                            ? '▲ Chú ý'
                            : '✕ Sự cố'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{zone.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Node IoT</div>
                      <div className="font-semibold text-slate-800 font-mono">
                        {zone.onlineCount}/{zone.devicesCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Độ ẩm đất</div>
                      <div
                        className={`font-semibold font-mono ${
                          zone.soilMoisture !== 'N/A' && parseFloat(zone.soilMoisture) < 30
                            ? 'text-rose-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {zone.soilMoisture}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Nhiệt độ</div>
                      <div className="font-semibold text-slate-800 font-mono">{zone.temp}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actuator Status Bar */}
            <div className="p-3.5 bg-slate-900 text-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Trạng thái vận hành tức thời:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      pumpIsOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>
                    Bơm P01:{' '}
                    <strong className={pumpIsOn ? 'text-emerald-400' : 'text-slate-400'}>
                      {pumpIsOn ? 'ĐANG CHẠY (342 L/min)' : 'DỪNG'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      valveIsOpen ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                  <span>
                    Van V01:{' '}
                    <strong className={valveIsOpen ? 'text-emerald-400' : 'text-slate-400'}>
                      {valveIsOpen ? 'MỞ (Zone 1)' : 'ĐÓNG'}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickTogglePump}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                    pumpIsOn
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {pumpIsOn ? 'Tắt Bơm P01' : 'Khởi động P01'}
                </button>
                <button
                  onClick={handleQuickToggleValve}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                    valveIsOpen
                      ? 'border-amber-500 text-amber-400 hover:bg-amber-500/20'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {valveIsOpen ? 'Đóng Van V01' : 'Mở Van V01'}
                </button>
              </div>
            </div>
          </div>

          {/* Environment Realtime Sensor Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Chỉ số môi trường & Thổ nhưỡng thời gian thực</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động đồng bộ từ mạng cảm biến LoRa/RS485 mỗi 10-30 giây
                </p>
              </div>
              <button
                onClick={() => navigate('/iot/realtime')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Xem tất cả cảm biến</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {realtimeMetrics.slice(0, 6).map((m) => {
                const isOutOfRange =
                  m.value < m.normalRange.min || m.value > m.normalRange.max;
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isOutOfRange
                        ? 'border-rose-300 bg-rose-50/40'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate" title={m.name}>
                        {m.name}
                      </span>
                      {isOutOfRange && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-700">
                          Vượt ngưỡng
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-2xl font-bold text-slate-900 font-mono">
                        {m.value}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{m.unit}</span>
                      <span
                        className={`ml-auto text-xs flex items-center font-mono font-medium ${
                          m.trend === 'UP'
                            ? 'text-emerald-600'
                            : m.trend === 'DOWN'
                            ? 'text-rose-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {m.trend === 'UP' ? (
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                        ) : m.trend === 'DOWN' ? (
                          <TrendingDown className="w-3 h-3 mr-0.5" />
                        ) : null}
                        {m.trendDelta !== 0 ? Math.abs(m.trendDelta) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                      <span>
                        Chuẩn: {m.normalRange.min}–{m.normalRange.max} {m.unit}
                      </span>
                      <span className="font-mono">
                        {m.updatedSecondsAgo}s trước
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Critical Alerts & Active Automation Activity */}
        <div className="space-y-6">
          {/* Critical Alerts Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-semibold text-rose-900">
                  Cảnh báo Sự cố Cần xử lý ({criticalAlerts.length})
                </h2>
              </div>
              <button
                onClick={() => navigate('/iot/alerts')}
                className="text-xs font-semibold text-rose-700 hover:underline"
              >
                Trung tâm Cảnh báo
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {criticalAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  Không có cảnh báo nguy cấp nào trong hệ thống!
                </div>
              ) : (
                criticalAlerts.map((alert) => (
                  <div key={alert.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
                        <span className="text-xs font-semibold text-slate-900">
                          {alert.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {alert.duration}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">
                        Thiết bị: <strong className="font-mono text-slate-700">{alert.deviceId}</strong>
                      </span>
                      <button
                        onClick={() => navigate('/iot/alerts')}
                        className="px-2 py-1 rounded bg-rose-100 text-rose-800 text-[11px] font-semibold hover:bg-rose-200 transition-colors"
                      >
                        Khắc phục ngay →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Device Health Overview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-600" />
                <span>Sức khỏe thiết bị (Device Health)</span>
              </h2>
              <button
                onClick={() => navigate('/iot/health')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Chi tiết
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">Điểm sức khỏe toàn mạng</span>
                  <span className="font-bold text-slate-900 font-mono">92 / 100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Pin yếu (&lt; 20%)</span>
                  <strong className="text-amber-600 font-mono text-sm">1 node</strong>
                  <span className="text-[10px] text-slate-400 block">SM-06 (4%)</span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Sóng yếu (&lt; -85dBm)</span>
                  <strong className="text-amber-600 font-mono text-sm">1 node</strong>
                  <span className="text-[10px] text-slate-400 block">SM-05 (-88dBm)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Rules Quick List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Quy tắc vận hành tự động</span>
              </h2>
              <button
                onClick={() => navigate('/iot/automation')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Quản lý
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {automationRules.slice(0, 3).map((rule) => (
                <div
                  key={rule.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-800 truncate" title={rule.name}>
                      {rule.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        rule.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {rule.status === 'ACTIVE' ? 'BẬT' : 'TẠM DỪNG'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Độ ưu tiên: {rule.priority}</span>
                    <span className="font-mono text-slate-400">{rule.lastRun}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Zone Detail Drawer */}
      <RightDrawer
        isOpen={Boolean(selectedZone)}
        onClose={() => setSelectedZone(null)}
        title={currentZoneData ? `Chi tiết IoT: ${currentZoneData.name}` : ''}
        subtitle={currentZoneData?.desc}
        width="w-full sm:w-[500px]"
      >
        {currentZoneData && (
          <div className="space-y-5">
            <div className="p-3 rounded-lg border bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-slate-900">{currentZoneData.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Node IoT hoạt động:</span>
                <span className="font-bold font-mono">
                  {currentZoneData.onlineCount} / {currentZoneData.devicesCount} online
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Độ ẩm đất trung bình:</span>
                <span className="font-bold font-mono text-emerald-700">
                  {currentZoneData.soilMoisture}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nhiệt độ môi trường:</span>
                <span className="font-bold font-mono">{currentZoneData.temp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quy tắc Automation liên quan:</span>
                <span className="font-bold font-mono">{currentZoneData.activeRules} rules</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2 uppercase tracking-wider">
                Danh sách thiết bị thuộc phân khu
              </h4>
              <div className="space-y-2">
                {iotDevices
                  .filter((d) => d.zoneId === currentZoneData.id)
                  .map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{d.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {d.id} · Gateway: {d.gatewayId}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.status === 'ONLINE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedZone(null);
                  navigate('/iot/devices');
                }}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors"
              >
                Mở Quản lý thiết bị phân khu
              </button>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
