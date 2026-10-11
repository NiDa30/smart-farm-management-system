import React from 'react';
import { Cpu, Wifi, WifiOff, Activity, Sliders, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const IotPreview: React.FC = () => {
  const { iotDevices, navigate } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Phân hệ 4 — IoT & Tự động hóa Tưới tiêu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát viễn thám cảm biến đất, điều khiển van Solenoid, trạm thời tiết và kịch bản tự động hóa Rule Engine
          </p>
        </div>

        <button
          onClick={() => navigate('/system/map')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
        >
          <span>Sơ đồ bố trí IoT trên bản đồ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* IoT Topology & Rules Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Kịch bản tự động hóa tưới thông minh (Active Rule):</h3>
          <div className="p-3.5 rounded bg-emerald-950 text-emerald-200 font-mono text-[11px] leading-relaxed space-y-1">
            <div className="text-emerald-400 font-bold">IF soil_moisture &lt; 30%</div>
            <div>AND water_tank_level &gt; 20%</div>
            <div>AND rain_sensor == FALSE</div>
            <div className="text-amber-300 font-bold pt-1">THEN:</div>
            <div>  - Open Solenoid Valve Hàng A (Khu Bắc)</div>
            <div>  - Start Booster Pump Bắc 01</div>
            <div>  - Run irrigation cycle 10 minutes</div>
          </div>
          <span className="text-slate-500 text-[11px] block">
            Cơ chế Fail-safe: Tự động ngắt van khi áp lực nước tụt đột ngột hoặc mất tín hiệu LoRa quá 15 phút.
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Danh sách thiết bị kết nối trực tiếp:</h3>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {iotDevices.map((dev) => (
              <div key={dev.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{dev.name}</span>
                    <span className="font-mono text-slate-400 text-[10px]">({dev.code})</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Pin: {dev.batteryPercent}% · Sóng: {dev.signalDbm} dBm
                  </span>
                </div>
                <StatusBadge status={dev.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
