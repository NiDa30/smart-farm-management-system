import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  TreePine,
  Wheat,
  DollarSign,
  AlertTriangle,
  Droplets,
  Zap,
  Activity,
  ShoppingBag,
  CreditCard,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsKpiCard } from '../components/AnalyticsKpiCard';
import { GlobalFilterState, AreaHealthScore } from '../../../types/analytics';

export const ExecutiveDashboard: React.FC = () => {
  const { activeFarm, navigate, showToast } = useApp();

  const [filters, setFilters] = useState<GlobalFilterState>({
    farmId: activeFarm.id,
    zoneId: 'ALL',
    cropId: 'ALL',
    varietyId: 'ALL',
    timeRange: 'THIS_MONTH',
    comparisonType: 'PREVIOUS_PERIOD',
  });

  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Area health scores
  const areaScores: AreaHealthScore[] = [
    {
      id: 'zone-north',
      code: 'KB',
      name: 'Khu Bắc (Vườn 01, 02)',
      areaHa: 4.5,
      totalPlants: 520,
      healthyPlants: 503,
      watchPlants: 14,
      sickPlants: 3,
      healthPercent: 96.7,
      healthStatus: 'NORMAL',
      currentYieldKgPerHa: 12400,
      waterUsagePerKg: 18.2,
      activeDiseaseCases: 2,
      openAlertsCount: 1,
    },
    {
      id: 'zone-center',
      code: 'KT',
      name: 'Khu Trung (Vườn 03)',
      areaHa: 3.8,
      totalPlants: 410,
      healthyPlants: 374,
      watchPlants: 28,
      sickPlants: 8,
      healthPercent: 91.2,
      healthStatus: 'WARNING',
      currentYieldKgPerHa: 11200,
      waterUsagePerKg: 22.4,
      activeDiseaseCases: 8,
      openAlertsCount: 4,
      anomalyFlag: true,
      anomalyNote: 'Xuất hiện bọ dừa hại đọt tăng +25% so với tháng trước',
    },
    {
      id: 'zone-south',
      code: 'KN',
      name: 'Khu Nam (Vườn 04, 05)',
      areaHa: 3.7,
      totalPlants: 320,
      healthyPlants: 296,
      watchPlants: 10,
      sickPlants: 14,
      healthPercent: 88.5,
      healthStatus: 'CRITICAL',
      currentYieldKgPerHa: 10800,
      waterUsagePerKg: 27.5,
      activeDiseaseCases: 11,
      openAlertsCount: 6,
      anomalyFlag: true,
      anomalyNote: 'Nước tiêu thụ cao hơn mức bình quân 35% & rò rỉ van Vùng 04',
    },
  ];

  return (
    <div className="space-y-5 pb-16 text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Báo cáo Điều hành & Tổng quan Nông trại (Executive BI)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              PHÂN HỆ 6
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Trung tâm phân tích hợp nhất: Sản xuất, Cây trồng, IoT, Kho vật tư, Doanh thu và Biên lợi nhuận
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/analytics/anomalies')}
            className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-md hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>3 Bất thường phát hiện</span>
          </button>
          <button
            onClick={() => navigate('/analytics/benchmark')}
            className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Đối sánh đa chiều (Benchmark)</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={() => {}}
      />

      {/* PRIMARY EXECUTIVE KPIS STRIP (8 Core Metrics) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Chỉ số Điều hành Chiến lược (Core Executive KPIs)
          </span>
          <span className="text-slate-400 text-[10px]">
            Nguồn: IoT Realtime + ERP Kho + Kế toán quản trị
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <AnalyticsKpiCard
            label="Tổng cây"
            value="1.250"
            unit="cây"
            comparisonBaseline="100% định danh"
            formulaTooltip="Tổng số cá thể cây dừa đang được quản lý định danh QR thực tế"
            dataSource="IOT_SENSOR"
            onDrilldown={() => navigate('/analytics/production')}
          />
          <AnalyticsKpiCard
            label="Cây khỏe"
            value="1.173"
            unit="cây"
            changePercent={2.4}
            isPositiveChange={true}
            comparisonBaseline="93.8% đạt chuẩn"
            dataSource="IOT_SENSOR"
            onDrilldown={() => navigate('/analytics/production')}
          />
          <AnalyticsKpiCard
            label="Cần theo dõi"
            value="52"
            unit="cây"
            changePercent={-6.2}
            isPositiveChange={true}
            comparisonBaseline="Giảm 3 cây"
            dataSource="IOT_SENSOR"
            statusColor="amber"
            onDrilldown={() => navigate('/analytics/production')}
          />
          <AnalyticsKpiCard
            label="Đang bệnh"
            value="25"
            unit="cây"
            changePercent={-14.0}
            isPositiveChange={true}
            comparisonBaseline="2 ca mở"
            dataSource="IOT_SENSOR"
            statusColor="rose"
            onDrilldown={() => navigate('/analytics/disease')}
          />
          <AnalyticsKpiCard
            label="Sản lượng tháng"
            value="3.2"
            unit="tấn"
            changePercent={8.5}
            isPositiveChange={true}
            comparisonBaseline="so với T09"
            formulaTooltip="Tổng sản lượng dừa thu hoạch đã phân loại chuẩn Loại 1 & 2"
            dataSource="HARVEST_LOG"
            onDrilldown={() => navigate('/analytics/yield')}
          />
          <AnalyticsKpiCard
            label="Doanh thu"
            value="325"
            unit="triệu"
            changePercent={14.2}
            isPositiveChange={true}
            comparisonBaseline="so với T09"
            dataSource="SALES_ORDER"
            onDrilldown={() => navigate('/analytics/sales')}
          />
          <AnalyticsKpiCard
            label="Chi phí"
            value="184"
            unit="triệu"
            changePercent={5.1}
            isPositiveChange={false}
            comparisonBaseline="so với T09"
            dataSource="FINANCIAL_LEDGER"
            onDrilldown={() => navigate('/analytics/cost')}
          />
          <AnalyticsKpiCard
            label="Lợi nhuận gộp"
            value="141"
            unit="triệu"
            changePercent={28.4}
            isPositiveChange={true}
            comparisonBaseline="Biên: 43.4%"
            dataSource="FINANCIAL_LEDGER"
            statusColor="emerald"
            onDrilldown={() => navigate('/analytics/profitability')}
          />
        </div>
      </div>

      {/* SECONDARY OPERATIONAL KPIS STRIP (6 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <AnalyticsKpiCard
          label="Nước tiêu thụ"
          value="324"
          unit="m³"
          changePercent={-4.5}
          isPositiveChange={true}
          comparisonBaseline="18.4 L/gốc/ngày"
          dataSource="IOT_SENSOR"
          onDrilldown={() => navigate('/analytics/water')}
        />
        <AnalyticsKpiCard
          label="Điện năng tiêu thụ"
          value="1.240"
          unit="kWh"
          changePercent={1.2}
          isPositiveChange={false}
          comparisonBaseline="Vận hành bơm IoT"
          dataSource="IOT_SENSOR"
          onDrilldown={() => navigate('/analytics/energy')}
        />
        <AnalyticsKpiCard
          label="IoT Online"
          value="95.8"
          unit="%"
          changePercent={0.5}
          isPositiveChange={true}
          comparisonBaseline="46/48 thiết bị"
          dataSource="IOT_SENSOR"
          onDrilldown={() => navigate('/analytics/iot-devices')}
        />
        <AnalyticsKpiCard
          label="Đơn hàng xử lý"
          value="28"
          unit="đơn"
          changePercent={12.0}
          isPositiveChange={true}
          comparisonBaseline="Đạt 94% tiến độ"
          dataSource="SALES_ORDER"
          onDrilldown={() => navigate('/analytics/sales')}
        />
        <AnalyticsKpiCard
          label="Công nợ phải thu"
          value="82"
          unit="triệu"
          changePercent={-8.5}
          isPositiveChange={true}
          comparisonBaseline="Quá hạn: 21 tr"
          dataSource="FINANCIAL_LEDGER"
          onDrilldown={() => navigate('/analytics/receivables')}
        />
        <AnalyticsKpiCard
          label="Vật tư cảnh báo"
          value="13"
          unit="loại"
          changePercent={2}
          isPositiveChange={false}
          comparisonBaseline="NPK sắp hết"
          dataSource="INVENTORY_TX"
          statusColor="amber"
          onDrilldown={() => navigate('/analytics/inventory')}
        />
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE: Farm Health Map & Financial Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Farm Health Map & Area Drill-down (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Bản đồ Sức khỏe Trang trại & Hiệu năng Phân khu (Farm Health Map)
              </h2>
              <p className="text-[11px] text-slate-500">
                Tổng hợp đa thông số: Sức khỏe cây, năng suất, tiêu thụ nước và rủi ro sâu bệnh theo khu
              </p>
            </div>
            <button
              onClick={() => navigate('/analytics/benchmark')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] inline-flex items-center gap-1"
            >
              <span>So sánh phân khu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Area Cards Grid */}
          <div className="space-y-3">
            {areaScores.map((area) => {
              const isCrit = area.healthStatus === 'CRITICAL';
              const isWarn = area.healthStatus === 'WARNING';
              const borderCls = isCrit
                ? 'border-rose-300 bg-rose-50/20'
                : isWarn
                ? 'border-amber-300 bg-amber-50/20'
                : 'border-slate-200 bg-slate-50/40';

              const badgeCls = isCrit
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : isWarn
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300';

              return (
                <div
                  key={area.id}
                  onClick={() => setSelectedArea(area.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer hover:shadow-xs ${borderCls}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-900">
                        {area.code}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{area.name}</span>
                      <span className="text-slate-400">· {area.areaHa} ha</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeCls}`}>
                        {isCrit ? '🔴 Nguy cấp (Critical)' : isWarn ? '🟡 Cần lưu ý' : '🟢 Bình thường (Ổn định)'}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Tỷ lệ cây khỏe</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {area.healthPercent}% ({area.healthyPlants}/{area.totalPlants} cây)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Năng suất bình quân</span>
                      <span className="font-mono font-bold text-emerald-800 text-xs">
                        {(area.currentYieldKgPerHa / 1000).toFixed(1)} tấn/ha
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Định mức nước</span>
                      <span className={`font-mono font-bold text-xs ${area.waterUsagePerKg > 25 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {area.waterUsagePerKg} L/kg
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Ca bệnh & Cảnh báo</span>
                      <span className={`font-mono font-bold text-xs ${area.activeDiseaseCases > 5 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {area.activeDiseaseCases} ca bệnh · {area.openAlertsCount} cảnh báo
                      </span>
                    </div>
                  </div>

                  {/* Anomaly note if detected */}
                  {area.anomalyFlag && (
                    <div className="mt-2.5 p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Bất thường quan sát:</strong> {area.anomalyNote}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/analytics/anomalies');
                        }}
                        className="text-amber-800 hover:underline font-bold shrink-0 ml-2"
                      >
                        Điều tra →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Financial Breakdown & Resource Efficiency (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Revenue & Profit Multi-month Trend */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hiệu quả Kinh doanh & Dòng tiền (Revenue & Profit)
                </h3>
                <p className="text-[11px] text-slate-500">6 tháng gần nhất (Triệu VNĐ)</p>
              </div>
              <button
                onClick={() => navigate('/analytics/profitability')}
                className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px]"
              >
                Chi tiết →
              </button>
            </div>

            <div className="h-44 flex items-end justify-between gap-3 pt-3 px-1">
              {[
                { month: 'T05', rev: 240, cost: 160, prof: 80 },
                { month: 'T06', rev: 265, cost: 165, prof: 100 },
                { month: 'T07', rev: 280, cost: 172, prof: 108 },
                { month: 'T08', rev: 310, cost: 178, prof: 132 },
                { month: 'T09', rev: 295, cost: 175, prof: 120 },
                { month: 'T10', rev: 325, cost: 184, prof: 141 },
              ].map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-mono text-emerald-800 font-bold">{m.prof}tr</span>
                  <div className="w-full flex items-end gap-0.5 h-28">
                    {/* Revenue Bar */}
                    <div
                      className="flex-1 bg-slate-200 rounded-t"
                      style={{ height: `${(m.rev / 350) * 100}%` }}
                      title={`Doanh thu ${m.month}: ${m.rev} tr`}
                    />
                    {/* Profit Bar */}
                    <div
                      className="flex-1 bg-emerald-600 rounded-t"
                      style={{ height: `${(m.prof / 350) * 100}%` }}
                      title={`Lợi nhuận ${m.month}: ${m.prof} tr`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{m.month}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-300"></span>
                <span>Doanh thu</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
                <span className="font-bold text-slate-800">Lợi nhuận gộp</span>
              </span>
            </div>
          </div>

          {/* Critical Resource Efficiency Box */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hiệu suất Tài nguyên (Resource Efficiency Index)
                </h3>
                <p className="text-[11px] text-slate-500">Định mức tiêu hao trên 1 kg nông sản đầu ra</p>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                Đạt chuẩn VietGAP
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span>Suất tiêu thụ nước tưới:</span>
                  <span className="font-mono font-bold text-slate-900">22.4 L/kg quả</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: '62%' }} />
                </div>
                <span className="text-[10px] text-slate-500">Mục tiêu tối ưu: ≤ 20.0 L/kg (Khu Bắc đạt 18.2 L/kg)</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span>Chi phí phân bón / gốc cây:</span>
                  <span className="font-mono font-bold text-slate-900">147.200 đ / cây / năm</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '54%' }} />
                </div>
                <span className="text-[10px] text-slate-500">Tiết kiệm 8.4% nhờ bón phân chính xác theo nhu cầu lá</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
