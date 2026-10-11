import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Droplets,
  Layers,
  Power,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const WaterEnergyMonitor: React.FC = () => {
  const { iotDevices, navigate } = useApp();

  const [activeTab, setActiveTab] = useState<'WATER' | 'ENERGY'>('WATER');

  // Water data
  const todayWaterM3 = 12.4;
  const yesterdayWaterM3 = 13.1;
  const monthWaterM3 = 324.5;
  const monthWaterCost = 2430000;

  // Energy data
  const todayEnergyKwh = 42.5;
  const todayEnergyCost = 128000;
  const monthEnergyKwh = 1140;
  const monthEnergyCost = 3420000;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Droplets className="w-5 h-5 text-sky-600" />
            <span>Giám sát Tiêu thụ Nước & Điện năng (Water & Energy Monitoring)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đo đếm lưu lượng nước ngầm, điện năng máy bơm và phát hiện rò rỉ bất thường theo chuẩn nông nghiệp chính xác
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('WATER')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'WATER'
                ? 'bg-white text-sky-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Giám sát Nước</span>
          </button>
          <button
            onClick={() => setActiveTab('ENERGY')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'ENERGY'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Giám sát Điện</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: WATER MONITORING (Screen 16 & 47, 48) */}
      {/* ==================================================== */}
      {activeTab === 'WATER' && (
        <div className="space-y-6">
          {/* Water Anomaly Alert Card (Screen 48) */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-sm">
                  Cảnh báo Tiêu thụ Nước Bất thường tại Zone B (+38%)
                </span>
                <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  Phát hiện 45 phút trước
                </span>
              </div>
              <p className="text-amber-800 mt-1 leading-relaxed">
                Lượng nước đo được tại Zone B vượt 38% so với trung bình 7 ngày qua trong cùng khung giờ tưới. Nguy cơ rò rỉ vỡ ống PVC hoặc bung đầu béc nhỏ giọt tại Hàng C.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  onClick={() => navigate('/iot/control')}
                  className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold hover:bg-amber-700"
                >
                  Kiểm tra Van V02 →
                </button>
              </div>
            </div>
          </div>

          {/* Water KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Hôm nay</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {todayWaterM3} <span className="text-xs text-slate-500 font-normal">m³</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">↓ 5.3% so với hôm qua</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Hôm qua</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {yesterdayWaterM3} <span className="text-xs text-slate-500 font-normal">m³</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">13,100 Lít</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Lũy kế tháng này</span>
              <div className="text-2xl font-bold font-mono text-sky-700 mt-1">
                {monthWaterM3} <span className="text-xs text-slate-500 font-normal">m³</span>
              </div>
              <span className="text-[11px] text-slate-500">Chi phí: {monthWaterCost.toLocaleString()} đ</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Định mức Lít / cây / ngày</span>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                41.3 <span className="text-xs text-slate-500 font-normal">L/cây</span>
              </div>
              <span className="text-[11px] text-emerald-600">Đạt chuẩn tưới nhỏ giọt</span>
            </div>
          </div>

          {/* Water Consumption by Area Table & Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">
              Phân bổ Nước theo Phân khu Canh tác (Water by Zone)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-xs text-slate-500 block">Khu A (Bắc - Dừa Xiêm)</span>
                <div className="text-2xl font-bold font-mono text-slate-900 my-1">4.2 m³</div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-sky-500" style={{ width: '34%' }} />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">34% tổng lượng nước</span>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-xs text-slate-500 block">Khu B (Nam - Bưởi Da Xanh)</span>
                <div className="text-2xl font-bold font-mono text-slate-900 my-1">5.3 m³</div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: '43%' }} />
                </div>
                <span className="text-[10px] text-amber-600 font-bold block mt-1">43% (Vượt định mức)</span>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-center">
                <span className="text-xs text-slate-500 block">Vườn Ươm & Khu Dịch vụ</span>
                <div className="text-2xl font-bold font-mono text-slate-900 my-1">2.9 m³</div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '23%' }} />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">23% tổng lượng nước</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: ENERGY MONITORING (Screen 17 & 49) */}
      {/* ==================================================== */}
      {activeTab === 'ENERGY' && (
        <div className="space-y-6">
          {/* Energy KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Điện tiêu thụ hôm nay</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {todayEnergyKwh} <span className="text-xs text-slate-500 font-normal">kWh</span>
              </div>
              <span className="text-[11px] text-slate-500">Chi phí: {todayEnergyCost.toLocaleString()} đ</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Lũy kế tháng này</span>
              <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                {monthEnergyKwh} <span className="text-xs text-slate-500 font-normal">kWh</span>
              </div>
              <span className="text-[11px] text-slate-500">~{monthEnergyCost.toLocaleString()} đ</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Thiết bị dùng điện lớn nhất</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                Máy bơm P01 (5.5HP)
              </div>
              <span className="text-[11px] text-amber-600 font-medium">Chiếm 68% tổng điện</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 block">Hiệu suất bơm (kWh / m³)</span>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                0.27 <span className="text-xs text-slate-500 font-normal">kWh/m³</span>
              </div>
              <span className="text-[11px] text-emerald-600">Động cơ đạt chuẩn IE3</span>
            </div>
          </div>

          {/* Actuator Energy Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden text-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <h3 className="font-semibold text-slate-900">
                Thống kê Điện năng & Chi phí theo Từng Thiết bị Chấp hành
              </h3>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Thiết bị</th>
                  <th className="py-3 px-4">Vị trí</th>
                  <th className="py-3 px-4">Thời gian chạy</th>
                  <th className="py-3 px-4">Điện năng tiêu thụ</th>
                  <th className="py-3 px-4">Chi phí ước tính</th>
                  <th className="py-3 px-4">Hiệu suất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    Máy bơm ly tâm P01 (5.5HP)
                  </td>
                  <td className="py-3 px-4 text-slate-600">Trạm bơm Khu Bắc</td>
                  <td className="py-3 px-4 font-mono">135 phút</td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-700">7.4 kWh</td>
                  <td className="py-3 px-4 font-mono text-slate-800">22,200 đ</td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-700 font-semibold">Tối ưu (94%)</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    Máy bơm tăng áp hòa phân P02 (3HP)
                  </td>
                  <td className="py-3 px-4 text-slate-600">Trạm châm phân Khu Nam</td>
                  <td className="py-3 px-4 font-mono">45 phút</td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-700">2.1 kWh</td>
                  <td className="py-3 px-4 font-mono text-slate-800">6,300 đ</td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-700 font-semibold">Bình thường (91%)</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    Hệ thống phun sương MIST-01
                  </td>
                  <td className="py-3 px-4 text-slate-600">Nhà ươm giống</td>
                  <td className="py-3 px-4 font-mono">30 phút</td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-700">1.2 kWh</td>
                  <td className="py-3 px-4 font-mono text-slate-800">3,600 đ</td>
                  <td className="py-3 px-4">
                    <span className="text-slate-600">Bình thường</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
