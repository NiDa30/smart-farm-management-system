import React, { useState } from 'react';
import {
  Sprout,
  Droplets,
  Thermometer,
  Sun,
  CloudRain,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Compass,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge } from '../../../components/common/StatusBadge';

export const EnvironmentMonitoring: React.FC = () => {
  const { envMetrics, iotDevices, navigate, showToast } = useApp();
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredMetrics =
    selectedZone === 'ALL'
      ? envMetrics
      : envMetrics.filter((m) => m.zoneId === selectedZone);

  // Environmental summary metrics
  const avgPh = (
    filteredMetrics.reduce((sum, m) => sum + m.ph, 0) / (filteredMetrics.length || 1)
  ).toFixed(1);
  const avgEc = (
    filteredMetrics.reduce((sum, m) => sum + m.ec, 0) / (filteredMetrics.length || 1)
  ).toFixed(2);
  const avgMoisture = Math.round(
    filteredMetrics.reduce((sum, m) => sum + m.soilMoisture, 0) /
      (filteredMetrics.length || 1)
  );
  const avgTemp = (
    filteredMetrics.reduce((sum, m) => sum + m.airTemp, 0) /
    (filteredMetrics.length || 1)
  ).toFixed(1);
  const avgHumidity = Math.round(
    filteredMetrics.reduce((sum, m) => sum + m.humidity, 0) /
      (filteredMetrics.length || 1)
  );
  const totalRain = filteredMetrics.reduce((sum, m) => sum + m.rainMm, 0).toFixed(1);

  const soilSensors = iotDevices.filter(
    (d) => d.type === 'SOIL_SENSOR' || d.type === 'WEATHER_STATION'
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Đã đồng bộ dữ liệu cảm biến IoT thời gian thực', 'success');
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Đất & Vi khí hậu môi trường
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              IoT Sensor Network
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát độ ẩm đất, độ dẫn điện EC, pH và vi khí hậu vi mô theo từng phân khu và lô vườn
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Zone Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs">
            <span className="px-2 font-medium text-slate-500">Phân khu:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer pr-2"
            >
              <option value="ALL">Toàn trang trại (3 khu)</option>
              <option value="zone-north">Khu Bắc (Vườn 01, 02)</option>
              <option value="zone-center">Khu Trung (Vườn 03)</option>
              <option value="zone-south">Khu Nam (Vườn 04, 05)</option>
            </select>
          </div>

          {/* Time range */}
          <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-medium">
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  timeRange === r
                    ? 'bg-white text-emerald-800 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === '24h' ? '24 Giờ' : r === '7d' ? '7 Ngày' : '30 Ngày'}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Đồng bộ</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Soil Moisture */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Độ ẩm đất</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{avgMoisture}%</span>
            <span className="text-[10px] text-emerald-600 font-medium">Lý tưởng</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${
                avgMoisture < 30 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(avgMoisture, 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Khoảng tối ưu: 35% - 60%</span>
        </div>

        {/* Soil pH */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Độ chua pH</span>
            <Sprout className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{avgPh}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Trung tính</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-emerald-600 h-1.5 rounded-full"
              style={{ width: `${(parseFloat(avgPh) / 14) * 100}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Khoảng tối ưu: 5.5 - 6.8</span>
        </div>

        {/* Soil EC */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">EC (Độ mặn/Dinh dưỡng)</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{avgEc}</span>
            <span className="text-[10px] text-slate-500 font-mono">dS/m</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${
                parseFloat(avgEc) > 1.8 ? 'bg-amber-500' : 'bg-purple-600'
              }`}
              style={{ width: `${Math.min((parseFloat(avgEc) / 3) * 100, 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">An toàn: &lt; 1.5 dS/m</span>
        </div>

        {/* Air Temperature */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Nhiệt độ khí</span>
            <Thermometer className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{avgTemp}°C</span>
            <span className="text-[10px] text-amber-600 font-medium">Ấm áp</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-amber-500 h-1.5 rounded-full"
              style={{ width: `${(parseFloat(avgTemp) / 45) * 100}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Rễ cây: 27.4°C</span>
        </div>

        {/* Air Humidity */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Độ ẩm không khí</span>
            <Sun className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{avgHumidity}%</span>
            <span className="text-[10px] text-sky-600 font-medium">Thích hợp</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-sky-500 h-1.5 rounded-full"
              style={{ width: `${avgHumidity}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Điểm sương: 24.8°C</span>
        </div>

        {/* Rainfall */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span className="font-medium">Lượng mưa</span>
            <CloudRain className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalRain}</span>
            <span className="text-[10px] text-slate-500 font-mono">mm</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-indigo-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(parseFloat(totalRain) * 4, 100)}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Mưa rào nhẹ rải rác</span>
        </div>
      </div>

      {/* Main Grid: Telemetry Trends & Smart Soil Advisories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Zone Telemetry Heatmap & Hourly Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sub-zone metrics comparison card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Chỉ số vi khí hậu thời gian thực theo Phân khu
                </h2>
                <p className="text-xs text-slate-500">
                  Dữ liệu được cập nhật tự động từ trạm quan trắc IoT không dây LoRaWAN
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Live Polling: 30s
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Phân khu / Trạm</th>
                    <th className="py-2.5 px-3">Độ ẩm đất</th>
                    <th className="py-2.5 px-3">pH đất</th>
                    <th className="py-2.5 px-3">EC (dS/m)</th>
                    <th className="py-2.5 px-3">Nhiệt độ</th>
                    <th className="py-2.5 px-3">Nguồn</th>
                    <th className="py-2.5 px-3">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {envMetrics.map((metric, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        {metric.zoneName}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-semibold ${
                              metric.soilMoisture < 35
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {metric.soilMoisture}%
                          </span>
                          {metric.soilMoisture < 35 && (
                            <span className="text-[10px] text-amber-600 font-sans">
                              (Cần tưới)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {metric.ph.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`${
                            metric.ec > 1.8 ? 'text-rose-600 font-bold' : 'text-slate-800'
                          }`}
                        >
                          {metric.ec.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        {metric.airTemp}°C / {metric.humidity}%
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200">
                          {metric.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {metric.soilMoisture >= 35 && metric.ec < 1.5 ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Chuẩn
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Lưu ý
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 24-Hour Soil Moisture & EC Curve Visualizer */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Biểu đồ diễn biến Độ ẩm đất & Nhiệt độ (24 Giờ qua)
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi chu kỳ bốc thoát hơi nước và hiệu quả các ca tưới phun sương
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Độ ẩm (%)
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Nhiệt độ (°C)
                </span>
              </div>
            </div>

            {/* Visual SVG Timeline Bar/Chart */}
            <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-200">
              {[
                { time: '00:00', moist: 48, temp: 24.5 },
                { time: '02:00', moist: 47, temp: 24.0 },
                { time: '04:00', moist: 46, temp: 23.8 },
                { time: '06:00', moist: 45, temp: 24.2 },
                { time: '08:00', moist: 55, temp: 27.5 }, // After 06:30 watering
                { time: '10:00', moist: 50, temp: 30.1 },
                { time: '12:00', moist: 42, temp: 32.8 },
                { time: '14:00', moist: 38, temp: 33.2 },
                { time: '16:00', moist: 36, temp: 31.0 },
                { time: '18:00', moist: 44, temp: 28.5 }, // After afternoon misting
                { time: '20:00', moist: 43, temp: 27.0 },
                { time: '22:00', moist: 42, temp: 25.8 },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-20 shadow-md">
                    {item.time}: {item.moist}% ẩm | {item.temp}°C
                  </div>
                  {/* Bars */}
                  <div className="w-full flex items-end justify-center gap-1 h-32">
                    <div
                      className="w-2.5 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                      style={{ height: `${(item.moist / 60) * 100}%` }}
                    ></div>
                    <div
                      className="w-2.5 bg-amber-400 rounded-t hover:bg-amber-500 transition-colors"
                      style={{ height: `${(item.temp / 40) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-mono">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-mono">
              <span>Độ ẩm thấp nhất: 36% (16:00)</span>
              <span>Độ ẩm đỉnh sau tưới: 55% (08:00)</span>
              <span>Nhiệt độ đỉnh: 33.2°C (14:00)</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Soil Health Diagnostic & Active Alerts */}
        <div className="space-y-6">
          {/* Smart Agronomy Recommendation Box */}
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <div className="flex items-center gap-2 mb-2 text-emerald-900 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Khuyến nghị Nông học Tự động</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed mb-3">
              Khu Bắc (Vườn 01, Hàng A & B) có độ ẩm đất dao động 33% - 42%, khuyến nghị duy trì chu kỳ tưới nhỏ giọt 25 lít/cây vào buổi sáng sớm. Chỉ số pH 6.2 rất thuận lợi cho hấp thu kali và photpho của dừa xiêm.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  navigate('/production/tasks');
                  showToast('Đang chuyển sang tạo công việc tưới tiêu bổ sung', 'info');
                }}
                className="w-full text-xs font-semibold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Tạo công việc chăm sóc đất
              </button>
              <button
                onClick={() => navigate('/production/irrigation')}
                className="w-full text-xs font-medium px-3 py-1.5 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Droplets className="w-3.5 h-3.5" /> Điều khiển van tưới tự động
              </button>
            </div>
          </div>

          {/* Active Sensor Nodes Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Trạm cảm biến vi khí hậu ({soilSensors.length})
              </h3>
              <button
                onClick={() => navigate('/iot')}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Quản lý IoT
              </button>
            </div>

            <div className="space-y-2.5">
              {soilSensors.map((sensor) => (
                <div
                  key={sensor.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-mono text-[10px]">
                      {sensor.type === 'WEATHER_STATION' ? 'WTR' : 'SOIL'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {sensor.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Pin: {sensor.batteryPercent}% | Sóng: {sensor.signalDbm} dBm
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <StatusBadge
                      status={sensor.status}
                      customLabel={
                        sensor.status === 'ONLINE'
                          ? 'Đang hoạt động'
                          : sensor.status === 'WARNING'
                          ? 'Pin yếu'
                          : 'Mất sóng'
                      }
                    />
                    <div className="text-[10px] text-slate-400 mt-1">
                      {sensor.lastPing}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
