import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Battery,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  Edit,
  ExternalLink,
  Filter,
  History,
  Info,
  Layers,
  Power,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { IoTDevice, IoTDeviceStatus } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const DeviceMonitor: React.FC = () => {
  const {
    iotDevices,
    automationRules,
    iotAlerts,
    iotEventLogs,
    controlActuator,
    updateDeviceConfig,
    triggerOTAUpdate,
    createMaintenanceFromIoT,
    navigate,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [gatewayFilter, setGatewayFilter] = useState<string>('ALL');

  // Selected Device Detail Drawer
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [detailTab, setDetailTab] = useState<
    | 'OVERVIEW'
    | 'REALTIME'
    | 'HISTORY'
    | 'CONNECTIVITY'
    | 'AUTOMATION'
    | 'ALERTS'
    | 'EVENTS'
    | 'HEALTH'
    | 'CONFIG'
  >('OVERVIEW');

  // Realtime Chart Window
  const [chartWindow, setChartWindow] = useState<'5m' | '30m' | '1h' | '6h' | '24h'>('30m');

  // Config Form State (for selected device)
  const [formSampling, setFormSampling] = useState<number>(30);
  const [formUpload, setFormUpload] = useState<number>(60);
  const [showConfigConfirm, setShowConfigConfirm] = useState(false);

  // Filtered devices list
  const filteredDevices = useMemo(() => {
    return iotDevices.filter((dev) => {
      const matchSearch =
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'ALL' || dev.type === typeFilter;
      const matchStatus = statusFilter === 'ALL' || dev.status === statusFilter;
      const matchGateway =
        gatewayFilter === 'ALL' || dev.gatewayId === gatewayFilter;
      return matchSearch && matchType && matchStatus && matchGateway;
    });
  }, [iotDevices, searchTerm, typeFilter, statusFilter, gatewayFilter]);

  const handleOpenDetail = (device: IoTDevice, tab: typeof detailTab = 'OVERVIEW') => {
    setSelectedDevice(device);
    setDetailTab(tab);
    setFormSampling(device.samplingIntervalSeconds);
    setFormUpload(device.uploadIntervalSeconds);
    setShowConfigConfirm(false);
  };

  const handleSaveConfig = () => {
    if (!selectedDevice) return;
    updateDeviceConfig(selectedDevice.id, formSampling, formUpload);
    setShowConfigConfirm(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-600" />
            <span>Theo dõi & Giám sát Thiết bị IoT (Device Monitor)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý trạng thái kết nối trực tuyến, bản tin dữ liệu, tín hiệu LoRa/4G và cấu hình từ xa cho {iotDevices.length} thiết bị
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/iot/realtime')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>Xem Grid Sensor Realtime</span>
          </button>
          <button
            onClick={() => navigate('/iot/control')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Điều khiển Actuator</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Device ID (SM-03, PUMP-P01), tên thiết bị, vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">Tất cả loại thiết bị</option>
          <option value="SENSOR">Sensor (Cảm biến)</option>
          <option value="ACTUATOR">Actuator (Máy bơm / Van / Rơ-le)</option>
          <option value="GATEWAY">Gateway (Trạm thu phát)</option>
          <option value="WEATHER_STATION">Weather Station (Trạm thời tiết)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ONLINE">● Online (Trực tuyến)</option>
          <option value="WARNING">▲ Warning (Cảnh báo sóng/pin)</option>
          <option value="DEGRADED">▼ Không ổn định (Degraded)</option>
          <option value="OFFLINE">✕ Offline (Mất tín hiệu)</option>
        </select>

        {/* Gateway Filter */}
        <select
          value={gatewayFilter}
          onChange={(e) => setGatewayFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ALL">Tất cả Gateway</option>
          <option value="GW-ESP32-01">GW-ESP32-01 (Khu Bắc)</option>
          <option value="GW-ESP32-02">GW-ESP32-02 (Khu Nam)</option>
          <option value="GW-ESP32-03">GW-ESP32-03 (Vườn Ươm)</option>
          <option value="GW-ESP32-04">GW-ESP32-04 (Khí tượng)</option>
        </select>
      </div>

      {/* Device Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Tên thiết bị</th>
                <th className="py-3 px-4">Phân loại</th>
                <th className="py-3 px-4">Vị trí lắp đặt</th>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Dữ liệu đo / Vận hành</th>
                <th className="py-3 px-4">Tín hiệu</th>
                <th className="py-3 px-4">Pin</th>
                <th className="py-3 px-4">Firmware</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDevices.map((dev) => {
                const isStale = dev.lastSeenSeconds > 900; // > 15 minutes
                return (
                  <tr
                    key={dev.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => handleOpenDetail(dev)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {dev.id}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 group-hover:text-emerald-700">
                        {dev.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        MQTT: {dev.mqttTopic}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {dev.type === 'SENSOR'
                          ? 'Sensor'
                          : dev.type === 'ACTUATOR'
                          ? 'Actuator'
                          : dev.type === 'GATEWAY'
                          ? 'Gateway'
                          : 'Weather'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div>{dev.location}</div>
                      {dev.plantRange && (
                        <div className="text-[10px] text-emerald-600 font-mono">
                          Phục vụ cây: {dev.plantRange}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      {dev.gatewayId}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            dev.status === 'ONLINE'
                              ? 'bg-emerald-500'
                              : dev.status === 'WARNING'
                              ? 'bg-amber-500'
                              : dev.status === 'DEGRADED'
                              ? 'bg-indigo-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            dev.status === 'ONLINE'
                              ? 'text-emerald-700'
                              : dev.status === 'WARNING'
                              ? 'text-amber-700'
                              : dev.status === 'DEGRADED'
                              ? 'text-indigo-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {dev.status === 'ONLINE'
                            ? 'Online'
                            : dev.status === 'WARNING'
                            ? 'Warning'
                            : dev.status === 'DEGRADED'
                            ? 'Không ổn định'
                            : 'Offline'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {isStale ? (
                          <span className="text-amber-600 font-bold">⚠ Stale Data</span>
                        ) : (
                          dev.lastSeenTimestamp
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {dev.type === 'SENSOR' && dev.currentValue !== undefined && (
                        <div className="font-mono font-bold text-slate-900">
                          {dev.currentValue} {dev.unit}
                          {dev.normalRange &&
                            typeof dev.currentValue === 'number' &&
                            (dev.currentValue < dev.normalRange.min ||
                              dev.currentValue > dev.normalRange.max) && (
                              <span className="ml-1 text-[10px] text-rose-600 font-sans font-semibold">
                                (Lệch)
                              </span>
                            )}
                        </div>
                      )}
                      {dev.type === 'ACTUATOR' && dev.actuatorState && (
                        <div className="font-mono text-xs">
                          <span
                            className={`font-bold ${
                              dev.actuatorState.state === 'ON' ||
                              dev.actuatorState.state === 'OPEN'
                                ? 'text-emerald-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {dev.actuatorState.state}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            ({dev.actuatorState.mode})
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <span
                        className={
                          dev.signalDbm < -85
                            ? 'text-rose-600 font-bold'
                            : dev.signalDbm < -75
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }
                      >
                        {dev.signalDbm} dBm
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="flex items-center gap-1">
                        <span
                          className={
                            dev.batteryPercent < 20
                              ? 'text-rose-600 font-bold'
                              : dev.batteryPercent < 50
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {dev.batteryPercent}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500">
                      {dev.firmwareVersion}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(dev, 'OVERVIEW')}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleOpenDetail(dev, 'CONFIG')}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                          title="Cấu hình thiết bị"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Detail Right Drawer (Screens 03 & 19) */}
      <RightDrawer
        isOpen={Boolean(selectedDevice)}
        onClose={() => setSelectedDevice(null)}
        title={selectedDevice ? `${selectedDevice.id} — ${selectedDevice.name}` : ''}
        subtitle={selectedDevice?.location}
        width="w-full sm:w-[620px]"
      >
        {selectedDevice && (
          <div className="space-y-4">
            {/* Drawer Header Badge Row */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedDevice.status === 'ONLINE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedDevice.status === 'WARNING'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  ● {selectedDevice.status}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedDevice.lastSeenTimestamp}
                </span>
              </div>

              {/* Link to Module 3 (Farm Asset) */}
              <button
                onClick={() => {
                  setSelectedDevice(null);
                  navigate('/resources/iot-devices');
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
              >
                <span>[Xem hồ sơ tài sản Phân hệ 3]</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Drawer Tab Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-1 scrollbar-none text-xs">
              {[
                { key: 'OVERVIEW', label: 'Tổng quan' },
                { key: 'REALTIME', label: 'Realtime' },
                { key: 'CONNECTIVITY', label: 'Mạng & Gateway' },
                { key: 'AUTOMATION', label: 'Automation' },
                { key: 'ALERTS', label: 'Cảnh báo' },
                { key: 'HEALTH', label: 'Sức khỏe' },
                { key: 'CONFIG', label: 'Cấu hình' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key as any)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    detailTab === tab.key
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW */}
            {detailTab === 'OVERVIEW' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Dữ liệu tức thời</span>
                    <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                      {selectedDevice.currentValue !== undefined
                        ? `${selectedDevice.currentValue} ${selectedDevice.unit}`
                        : selectedDevice.actuatorState?.state || 'N/A'}
                    </div>
                    {selectedDevice.normalRange && (
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Ngưỡng chuẩn: {selectedDevice.normalRange.min}–{selectedDevice.normalRange.max} {selectedDevice.unit}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Điểm sức khỏe phần cứng</span>
                    <div className="text-xl font-bold text-emerald-700 font-mono mt-0.5">
                      {selectedDevice.healthScore} / 100
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Đo đạc dựa trên sóng, pin và sai số
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                  <h4 className="font-semibold text-slate-800 pb-1 border-b border-slate-100">
                    Thông số lắp đặt & Phục vụ thực địa
                  </h4>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Khu vực / Lô vườn:</span>
                    <span className="font-medium text-slate-900">{selectedDevice.location}</span>
                  </div>
                  {selectedDevice.plantRange && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Cá thể cây liên kết:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {selectedDevice.plantRange}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Gateway phụ trách:</span>
                    <span className="font-mono font-medium text-slate-900">
                      {selectedDevice.gatewayId}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Chu kỳ đo (Sampling):</span>
                    <span className="font-mono text-slate-900">
                      {selectedDevice.samplingIntervalSeconds} giây
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Chu kỳ gửi tin (Upload):</span>
                    <span className="font-mono text-slate-900">
                      {selectedDevice.uploadIntervalSeconds} giây
                    </span>
                  </div>
                </div>

                {/* Quick Troubleshoot Button */}
                <div className="pt-2">
                  <button
                    onClick={() => createMaintenanceFromIoT(selectedDevice.id, 'Kiểm tra hiện trường')}
                    className="w-full py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tạo phiếu bảo trì kỹ thuật cho thiết bị này (Phân hệ 3)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: REALTIME CHART */}
            {detailTab === 'REALTIME' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Khung thời gian xem realtime:</span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    {(['5m', '30m', '1h', '6h', '24h'] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => setChartWindow(w)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          chartWindow === w
                            ? 'bg-white shadow-xs font-bold text-emerald-700'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Chart Box */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white font-mono">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>
                      BIỂU ĐỒ {selectedDevice.id} ({chartWindow})
                    </span>
                    <span className="text-emerald-400 animate-pulse">● Cập nhật 1s</span>
                  </div>

                  <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-slate-700">
                    {[38, 36, 35, 34, 32, 31, 30, 29, 28.4].map((val, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-slate-400">{val}</span>
                        <div
                          className="w-full bg-emerald-500/80 rounded-t hover:bg-emerald-400 transition-all"
                          style={{ height: `${(val / 50) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                    <span>10:00</span>
                    <span>10:30</span>
                    <span>11:00 (Hiện tại)</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONNECTIVITY */}
            {detailTab === 'CONNECTIVITY' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border bg-slate-50 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mạng kết nối:</span>
                    <span className="font-semibold text-slate-900">LoRaWAN 923 MHz (ChirpStack / AS923)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cường độ sóng (RSSI):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedDevice.signalDbm} dBm (Rất tốt)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tỉ lệ tín hiệu/nhiễu (SNR):</span>
                    <span className="font-mono text-slate-900">+8.5 dB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dung lượng pin còn lại:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {selectedDevice.batteryPercent}% (Khoảng 8 tháng nữa)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MQTT Topic telemetry:</span>
                    <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                      {selectedDevice.mqttTopic}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AUTOMATION */}
            {detailTab === 'AUTOMATION' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Các quy tắc Automation đang sử dụng thiết bị này làm điều kiện kích hoạt:
                </p>
                <div className="space-y-2">
                  {automationRules
                    .filter((r) =>
                      r.conditions.some((c) => c.deviceId === selectedDevice.id)
                    )
                    .map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{r.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {r.description}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                          ACTIVE
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 5: ALERTS */}
            {detailTab === 'ALERTS' && (
              <div className="space-y-3 text-xs">
                {iotAlerts
                  .filter((a) => a.deviceId === selectedDevice.id)
                  .map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-800">{a.title}</span>
                        <span className="font-mono text-[10px] text-slate-400">{a.startedAt}</span>
                      </div>
                      <p className="text-slate-600">{a.message}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* TAB 6: HEALTH */}
            {detailTab === 'HEALTH' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="text-xs text-slate-500 block">Health Score</span>
                  <div className="text-3xl font-extrabold text-emerald-600 font-mono my-1">
                    {selectedDevice.healthScore} / 100
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Tình trạng thiết bị ổn định. Lần hiệu chuẩn gần nhất: 15/09/2026
                  </span>
                </div>
              </div>
            )}

            {/* TAB 7: REMOTE CONFIG (Screen 19) */}
            {detailTab === 'CONFIG' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Lưu ý An toàn khi Thay đổi Cấu hình Từ xa</span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                    Tăng tần suất lấy mẫu hoặc gửi tin qua LoRaWAN sẽ làm tăng mức tiêu hao pin của thiết bị ngoài vườn.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">
                      Chu kỳ lấy mẫu cảm biến (Sampling Interval)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="3600"
                        value={formSampling}
                        onChange={(e) => setFormSampling(Number(e.target.value))}
                        className="w-32 px-3 py-1.5 rounded border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500">giây (Hiện tại: {selectedDevice.samplingIntervalSeconds}s)</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">
                      Chu kỳ gửi bản tin lên Gateway (Upload Interval)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="10"
                        max="7200"
                        value={formUpload}
                        onChange={(e) => setFormUpload(Number(e.target.value))}
                        className="w-32 px-3 py-1.5 rounded border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-slate-500">giây (Hiện tại: {selectedDevice.uploadIntervalSeconds}s)</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => triggerOTAUpdate(selectedDevice.id)}
                      className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cập nhật Firmware OTA ({selectedDevice.latestFirmware})</span>
                    </button>
                  </div>
                </div>

                {showConfigConfirm ? (
                  <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 space-y-2">
                    <p className="text-emerald-900 font-medium">
                      Xác nhận nạp cấu hình mới: Chu kỳ lấy mẫu {formSampling}s, gửi tin {formUpload}s?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveConfig}
                        className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold"
                      >
                        Xác nhận nạp
                      </button>
                      <button
                        onClick={() => setShowConfigConfirm(false)}
                        className="px-3 py-1 rounded bg-slate-200 text-slate-700"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowConfigConfirm(true)}
                      className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                    >
                      Lưu thay đổi cấu hình
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
