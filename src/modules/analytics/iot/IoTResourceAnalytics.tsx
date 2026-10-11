import React, { useState } from 'react';
import {
  Droplets,
  Zap,
  Radio,
  Sparkles,
  Sprout,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsKpiCard } from '../components/AnalyticsKpiCard';
import { GlobalFilterState } from '../../../types/analytics';

export const IoTResourceAnalytics: React.FC = () => {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'water' | 'environment' | 'devices' | 'automation'>('water');

  const [filters, setFilters] = useState<GlobalFilterState>({
    farmId: 'farm-001',
    zoneId: 'ALL',
    cropId: 'ALL',
    varietyId: 'ALL',
    timeRange: 'THIS_MONTH',
    comparisonType: 'PREVIOUS_PERIOD',
  });

  return (
    <div className="space-y-5 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Phân tích IoT & Hiệu quả Tài nguyên (IoT & Resource Analytics)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 font-bold border border-cyan-200">
              SMART HARDWARE & UTILITY
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Giám sát lưu lượng nước, điện năng tiêu thụ, độ tin cậy trạm cảm biến và đo lường giá trị tiết kiệm từ tự động hóa
          </p>
        </div>

        <button
          onClick={() => navigate('/iot')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Radio className="w-3.5 h-3.5 text-slate-600" />
          <span>Mở IoT Control Center</span>
        </button>
      </div>

      {/* Global Filter */}
      <AnalyticsFilterBar filters={filters} onFilterChange={setFilters} />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnalyticsKpiCard
          label="Nước tưới tháng"
          value="324"
          unit="m³"
          changePercent={-4.5}
          isPositiveChange={true}
          comparisonBaseline="Tiết kiệm 15 m³"
          dataSource="IOT_SENSOR"
        />
        <AnalyticsKpiCard
          label="Định mức nước / kg quả"
          value="22.4"
          unit="L/kg"
          changePercent={-6.8}
          isPositiveChange={true}
          comparisonBaseline="Mục tiêu ≤ 20L"
          dataSource="IOT_SENSOR"
        />
        <AnalyticsKpiCard
          label="Uptime thiết bị IoT"
          value="98.2"
          unit="%"
          changePercent={0.4}
          isPositiveChange={true}
          comparisonBaseline="46/48 trạm tốt"
          dataSource="IOT_SENSOR"
        />
        <AnalyticsKpiCard
          label="Nước tiết kiệm nhờ Auto"
          value="60"
          unit="m³"
          isEstimated={true}
          comparisonBaseline="Ước tính thuật toán"
          formulaTooltip="Chênh lệch giữa kịch bản tưới thủ công định thời và thuật toán tưới biến thiên theo cảm biến ẩm đất"
          dataSource="AI_INFERENCE"
          statusColor="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg">
        <nav className="flex space-x-6 font-medium">
          {[
            { id: 'water', label: '1. Hiệu suất Tưới tiêu (Water Efficiency)', icon: Droplets },
            { id: 'environment', label: '2. Đất & Vi khí hậu (Environment)', icon: Sprout },
            { id: 'devices', label: '3. Độ tin cậy Thiết bị (IoT Reliability)', icon: Radio },
            { id: 'automation', label: '4. Lợi ích Tự động hóa (Automation Benefits)', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'border-cyan-600 text-cyan-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: WATER EFFICIENCY */}
      {activeTab === 'water' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Zone Comparison Highlight */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">
                  So sánh Suất Tiêu thụ Nước Giữa Các Khu
                </h3>
                <span className="text-[11px] text-slate-400">Đơn vị: Lít / kg nông sản</span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/60 rounded-md border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-950 block">Phân khu Bắc (Hàng A & B)</span>
                    <span className="text-[11px] text-emerald-800">Tưới nhỏ giọt bù áp tự động</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-emerald-800">18.2 L/kg</span>
                    <span className="text-[10px] text-emerald-700 block font-semibold">Tối ưu xuất sắc</span>
                  </div>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-md border border-rose-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-950 block">Phân khu Nam (Vườn 04, 05)</span>
                    <span className="text-[11px] text-rose-800">Van tưới cơ khí cũ</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-rose-700">27.5 L/kg</span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[10px] font-bold block mt-0.5">
                      Cao hơn 51% so với Khu Bắc
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[11px]">
                💡 <strong>Khuyến nghị vận hành:</strong> Khu Nam có lưu lượng thất thoát nghi do rò rỉ gioăng van điện từ Solenoid số 04. Đề xuất tạo task kiểm tra đường ống áp lực.
              </div>
            </div>

            {/* Daily Consumption Trend */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">
                  Lượng Nước Cấp Hàng Ngày trong Tuần
                </h3>
                <span className="text-[11px] font-mono text-slate-500">Bình quân 10.8 m³/ngày</span>
              </div>

              <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
                {[
                  { day: 'T2', val: 12.4 },
                  { day: 'T3', val: 9.8 },
                  { day: 'T4', val: 11.2 },
                  { day: 'T5', val: 6.5, rain: true },
                  { day: 'T6', val: 10.4 },
                  { day: 'T7', val: 13.0 },
                  { day: 'CN', val: 11.8 },
                ].map((item, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-mono text-slate-700 font-bold">{item.val}m³</span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        item.rain ? 'bg-sky-400' : 'bg-sky-600'
                      }`}
                      style={{ height: `${(item.val / 15) * 100}%` }}
                      title={`${item.day}: ${item.val} m³ ${item.rain ? '(Có mưa giảm tưới)' : ''}`}
                    />
                    <span className="text-[10px] text-slate-500 font-mono">{item.day}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 text-center">
                * Thứ 5 có mưa tự nhiên 24mm, hệ thống IoT tự động hủy 2 chu kỳ tưới giúp tiết kiệm 4.5 m³.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IOT DEVICE RELIABILITY RANKING */}
      {activeTab === 'devices' && (
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Xếp hạng Độ tin cậy Thiết bị IoT (Device Reliability Ranking)
              </h3>
              <p className="text-[11px] text-slate-500">Giúp phát hiện sớm các sensor bị trôi dạt dữ liệu hoặc pin yếu</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="font-bold text-emerald-800 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Top Thiết bị Ổn định Nhất (100% Uptime)</span>
              </span>
              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="font-mono">WS-01 (Trạm Khí tượng Bắc)</span>
                  <strong className="text-emerald-700">99.9% · 0 lỗi</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="font-mono">VALVE-01 (Van Solenoid Hàng A)</span>
                  <strong className="text-emerald-700">99.8% · 0 lỗi</strong>
                </div>
              </div>
            </div>

            <div className="p-3 bg-rose-50/40 rounded-lg border border-rose-200 space-y-2">
              <span className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Thiết bị Kém Ổn định Cần Bảo trì</span>
              </span>
              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between py-1 border-b border-rose-200/60">
                  <span className="font-mono text-rose-900 font-bold">SM-07 (Cảm biến ẩm Khu Nam)</span>
                  <strong className="text-rose-600">87.2% · 14 lần offline</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-200/60">
                  <span className="font-mono text-slate-900">VALVE-04 (Van Phân khu Nam)</span>
                  <strong className="text-amber-600">91.0% · Áp lực tụt</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATION BENEFITS */}
      {activeTab === 'automation' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Đánh giá Giá trị Kinh tế từ Tự động hóa IoT (Automation Value Created)
              </h3>
              <p className="text-[11px] text-slate-500">So sánh ước tính đối chứng theo định mức canh tác truyền thống</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Mô hình Ước lượng Heuristic
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px]">Nước tưới định mức thủ công:</span>
              <span className="text-xl font-bold font-mono text-slate-700 block">420 m³</span>
              <p className="text-[10px] text-slate-400">Theo lịch tưới cơ học 35L/cây/ngày cố định</p>
            </div>

            <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200 space-y-1">
              <span className="text-sky-800 text-[11px]">Thực tế tưới qua cảm biến IoT:</span>
              <span className="text-xl font-bold font-mono text-sky-900 block">360 m³</span>
              <p className="text-[10px] text-sky-700">Chỉ tưới khi độ ẩm đất thực đo &lt; 40%</p>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="text-emerald-800 text-[11px] font-bold">Lượng nước tiết kiệm:</span>
              <span className="text-2xl font-bold font-mono text-emerald-800 block">60 m³ (-14.3%)</span>
              <p className="text-[10px] text-emerald-700">Tương đương tiết kiệm 1.800.000 đ tiền điện bơm</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
