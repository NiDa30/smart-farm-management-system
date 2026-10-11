import React, { useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  Download,
  Filter,
  History,
  Info,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const HistoricalData: React.FC = () => {
  const { iotDevices, automationExecutions } = useApp();

  // Multi-sensor selection (e.g. SM-01, SM-02, SM-03)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([
    'SM-01',
    'SM-02',
    'SM-03',
  ]);
  const [selectedMetric, setSelectedMetric] = useState<'SOIL_MOISTURE' | 'SOIL_PH' | 'TEMP'>('SOIL_MOISTURE');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const availableSensors = iotDevices.filter((d) => d.type === 'SENSOR');

  const toggleSensor = (id: string) => {
    if (selectedDeviceIds.includes(id)) {
      if (selectedDeviceIds.length > 1) {
        setSelectedDeviceIds(selectedDeviceIds.filter((d) => d !== id));
      }
    } else {
      setSelectedDeviceIds([...selectedDeviceIds, id]);
    }
  };

  // Mock historical data points for the 3 sensors over 24h
  const timeLabels = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  const sensorDatasets: { [key: string]: { name: string; color: string; values: number[] } } = {
    'SM-01': {
      name: 'SM-01 (Khu A Lô 1)',
      color: '#10B981', // emerald
      values: [42, 41, 40, 39, 37, 36, 44, 41],
    },
    'SM-02': {
      name: 'SM-02 (Khu A Lô 2)',
      color: '#06B6D4', // cyan
      values: [36, 35, 34, 33, 31, 30, 41, 38],
    },
    'SM-03': {
      name: 'SM-03 (Khu A Lô 3)',
      color: '#F59E0B', // amber
      values: [33, 32, 31, 29, 28, 27, 43, 39],
    },
    'SM-04': {
      name: 'SM-04 (Khu Nam)',
      color: '#8B5CF6', // purple
      values: [48, 47, 46, 45, 44, 43, 46, 45],
    },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Phân tích Lịch sử Dữ liệu & So sánh Đa Sensor</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đối chiếu biến thiên chỉ số theo thời gian, phát hiện sensor bị trôi dạt (drift) và kiểm chứng hiệu quả tưới
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {(['1h', '24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded font-mono ${
                  timeRange === r
                    ? 'bg-white shadow-2xs font-bold text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={() => alert('Xuất file CSV dữ liệu lịch sử')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Sensor Selection Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Chọn Sensors so sánh:</span>
            <div className="flex flex-wrap items-center gap-2">
              {['SM-01', 'SM-02', 'SM-03', 'SM-04'].map((sId) => {
                const isSelected = selectedDeviceIds.includes(sId);
                const info = sensorDatasets[sId];
                return (
                  <button
                    key={sId}
                    onClick={() => toggleSensor(sId)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'border-transparent text-white shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                    style={{ backgroundColor: isSelected ? info.color : undefined }}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{info.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Chỉ số:</span>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-2 py-1 rounded border border-slate-200 bg-white font-medium"
            >
              <option value="SOIL_MOISTURE">Độ ẩm đất (%)</option>
              <option value="SOIL_PH">Độ chua đất (pH)</option>
              <option value="TEMP">Nhiệt độ (°C)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Historical Compare Chart Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Biểu đồ So sánh Độ ẩm đất đa điểm ({timeRange})
            </h2>
            <p className="text-xs text-slate-500">
              Đường kẻ ngang đỏ: Ngưỡng kích hoạt tưới nhỏ giọt tự động (&lt; 30%)
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            {selectedDeviceIds.map((id) => (
              <div key={id} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: sensorDatasets[id]?.color }}
                />
                <span className="font-mono text-slate-700">{id}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-rose-500 border border-dashed border-rose-500" />
              <span className="text-rose-600 font-semibold text-[11px]">Ngưỡng 30%</span>
            </div>
          </div>
        </div>

        {/* Visual Chart Canvas Representation */}
        <div className="relative pt-6 pb-2 bg-slate-950 rounded-xl p-4 text-white font-mono">
          {/* Threshold Line at 30% */}
          <div
            className="absolute left-10 right-4 border-b border-dashed border-rose-500/70 pointer-events-none flex items-center justify-end"
            style={{ bottom: `${(30 / 60) * 100}%` }}
          >
            <span className="text-[10px] text-rose-400 font-bold bg-slate-900 px-1 -translate-y-2">
              Ngưỡng tưới: 30%
            </span>
          </div>

          {/* Automation Event Marker at 16:30 */}
          <div
            className="absolute top-2 bottom-10 w-0.5 bg-indigo-500/80 border-l border-indigo-400 pointer-events-none"
            style={{ left: '76%' }}
          >
            <div className="bg-indigo-600 text-[10px] px-1.5 py-0.5 rounded text-white font-sans font-semibold whitespace-nowrap absolute -top-1 -translate-x-1/2">
              ⚡ 16:30 Tưới Khu A (12m)
            </div>
          </div>

          {/* Grid lines and curves */}
          <div className="h-64 flex items-end justify-between px-6 pt-10">
            {timeLabels.map((lbl, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center gap-1.5 h-48">
                  {selectedDeviceIds.map((sId) => {
                    const val = sensorDatasets[sId]?.values[idx] || 35;
                    const heightPercent = (val / 60) * 100;
                    return (
                      <div
                        key={sId}
                        title={`${sensorDatasets[sId].name}: ${val}% lúc ${lbl}`}
                        className="w-3 rounded-t transition-all hover:brightness-125 cursor-pointer"
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: sensorDatasets[sId].color,
                        }}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Statistical Insights Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-400 block text-[10px]">Cảm biến SM-03 (Lô A3)</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">
              Tụt nhanh nhất (-6% trong 6h)
            </div>
            <p className="text-slate-500 mt-1 text-[11px]">
              Vùng rễ đất cát pha thoát nước nhanh, cần bổ sung vật liệu giữ ẩm xơ dừa.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-400 block text-[10px]">Độ đồng đều độ ẩm (Consistency)</span>
            <div className="font-bold text-emerald-700 text-sm mt-0.5">
              Độ lệch chuẩn: ±3.4% (Tốt)
            </div>
            <p className="text-slate-500 mt-1 text-[11px]">
              Các van nhỏ giọt bù áp hoạt động đồng bộ, không phát hiện nghẽn đầu béc.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-400 block text-[10px]">Hiệu quả tưới chu kỳ 16:30</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">
              Độ ẩm phục hồi +14% sau 25 phút
            </div>
            <p className="text-slate-500 mt-1 text-[11px]">
              Nước ngấm đều xuống tầng rễ 30cm, lượng nước tiêu hao 4.05 m³.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
