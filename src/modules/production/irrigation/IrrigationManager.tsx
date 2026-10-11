import React from 'react';
import { Droplets, Activity, Clock, Sliders, AlertTriangle, Play, Square, CheckCircle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { KpiCard } from '../../../components/common/KpiCard';
import { StatusBadge } from '../../../components/common/StatusBadge';

export const IrrigationManager: React.FC = () => {
  const { irrigationZones, showToast } = useApp();

  return (
    <div className="space-y-6 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Nước & Tưới tiêu thông minh (Smart Irrigation)
          </h1>
          <p className="text-slate-500 mt-0.5">
            Giám sát độ ẩm đất theo luống cây, điều khiển van Solenoid và kịch bản tưới tự động qua LoRaWAN
          </p>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={<Droplets className="w-4 h-4 text-sky-600" />}
          label="Vùng tưới"
          value={irrigationZones.length}
          caption="Van Solenoid độc lập"
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 text-emerald-600" />}
          label="Nước tưới hôm nay"
          value="12.4 m³"
          caption="Định mức 35L/gốc"
        />
        <KpiCard
          icon={<Play className="w-4 h-4 text-blue-600" />}
          label="Đang tưới"
          value={irrigationZones.filter((z) => z.status === 'IRRIGATING').length || 1}
          caption="Vùng tưới 04 đang mở"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          label="Cảnh báo ẩm thấp"
          value={irrigationZones.filter((z) => z.status === 'ALERT').length}
          caption="Vùng tưới 01 (Hàng A)"
        />
      </div>

      {/* Zone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {irrigationZones.map((zone) => {
          const isAlert = zone.status === 'ALERT';
          const isIrrigating = zone.status === 'IRRIGATING';

          return (
            <div
              key={zone.id}
              className={`bg-white rounded-lg border p-4 shadow-2xs space-y-3 transition-colors ${
                isAlert
                  ? 'border-amber-300 ring-1 ring-amber-400/30'
                  : isIrrigating
                  ? 'border-sky-300 ring-1 ring-sky-400/30'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{zone.name}</h3>
                  <span className="font-mono text-slate-500 text-[11px]">
                    Dãy cây: {zone.plantCodeRange}
                  </span>
                </div>
                <StatusBadge
                  status={zone.status}
                  customLabel={
                    isIrrigating ? 'Đang tưới' : isAlert ? 'Độ ẩm thấp' : 'Chờ tưới'
                  }
                  size="sm"
                />
              </div>

              {/* Moisture indicator bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Độ ẩm đất hiện thời:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {zone.currentSoilMoisture}% / Mục tiêu {zone.targetMoisture}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isAlert ? 'bg-amber-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${(zone.currentSoilMoisture / 60) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <div>Lần tưới gần nhất: <strong>{zone.lastWatered}</strong></div>
                <div>Lượng nước: <strong className="font-mono">{zone.lastWaterVolumeLiters} Lít</strong></div>
                <div>Chế độ: <strong className="text-emerald-700">{zone.mode} (Tự động)</strong></div>
                <div>Kịch bản IoT: <strong className="font-mono text-slate-700">{zone.iotRuleId || 'RULE-AUTO-45'}</strong></div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() =>
                    showToast(
                      `Đã gửi lệnh kích hoạt tưới thủ công 15 phút cho ${zone.name}`,
                      'info'
                    )
                  }
                  className="px-3 py-1 bg-sky-600 text-white rounded font-semibold hover:bg-sky-700 transition-colors inline-flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  <span>Kích hoạt tưới ngay</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
