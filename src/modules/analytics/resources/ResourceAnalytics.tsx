import React, { useState } from 'react';
import {
  Package,
  Wrench,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsKpiCard } from '../components/AnalyticsKpiCard';
import { GlobalFilterState } from '../../../types/analytics';

export const ResourceAnalytics: React.FC = () => {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'inventory' | 'assets'>('inventory');

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
              Phân tích Vật tư, Kho Vận & Tài sản Thiết bị (Resource & Asset BI)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
              SUPPLY CHAIN & ASSETS
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Theo dõi tốc độ tiêu hao vật tư, dự báo số ngày còn lại đến kỳ đặt hàng và phân tích chi phí sửa chữa máy móc
          </p>
        </div>

        <button
          onClick={() => navigate('/resources')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Package className="w-3.5 h-3.5 text-slate-600" />
          <span>Mở Kho Vật tư</span>
        </button>
      </div>

      {/* Global Filter */}
      <AnalyticsFilterBar filters={filters} onFilterChange={setFilters} />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnalyticsKpiCard
          label="Giá trị tồn kho"
          value="182"
          unit="triệu"
          changePercent={-3.2}
          isPositiveChange={true}
          comparisonBaseline="Vòng quay kho 42 ngày"
          dataSource="INVENTORY_TX"
        />
        <AnalyticsKpiCard
          label="Vật tư dưới mức tối thiểu"
          value="8"
          unit="mặt hàng"
          changePercent={2}
          isPositiveChange={false}
          comparisonBaseline="Cần đặt hàng ngay"
          dataSource="INVENTORY_TX"
          statusColor="amber"
        />
        <AnalyticsKpiCard
          label="Tổng giá trị máy móc tài sản"
          value="820"
          unit="triệu"
          comparisonBaseline="126 thiết bị"
          dataSource="FINANCIAL_LEDGER"
        />
        <AnalyticsKpiCard
          label="Thiết bị đang bảo trì / lỗi"
          value="16"
          unit="máy"
          changePercent={-2}
          isPositiveChange={true}
          comparisonBaseline="9 bảo trì · 7 lỗi"
          dataSource="IOT_SENSOR"
          statusColor="rose"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg">
        <nav className="flex space-x-6 font-medium">
          {[
            { id: 'inventory', label: '1. Tồn kho & Dự báo Tiêu hao (Inventory Forecast)', icon: Package },
            { id: 'assets', label: '2. Máy móc & Phân tích Sửa chữa (Asset Repair vs Replace)', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'border-amber-600 text-amber-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: INVENTORY FORECAST */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Material Consumption Balance Table */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Cân Đối Nhập – Xuất – Tồn Mặt Hàng Chủ Lực
              </h3>
              <span className="text-[11px] text-slate-400">Tháng 10/2026</span>
            </div>

            <div className="space-y-2 text-slate-700">
              {[
                { name: 'Phân bón NPK 16-16-8 Hữu cơ', open: 500, inQty: 300, outQty: 420, close: 380, unit: 'kg' },
                { name: 'Chế phẩm Trichoderma vi sinh', open: 80, inQty: 50, outQty: 65, close: 65, unit: 'kg' },
                { name: 'Bẫy Pheromone bọ cánh cứng', open: 120, inQty: 100, outQty: 140, close: 80, unit: 'bộ' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{item.name}</span>
                    <span className="font-mono text-emerald-800">Tồn: {item.close} {item.unit}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1">
                    <div>Đầu kỳ: <strong className="text-slate-700 font-mono">{item.open}</strong></div>
                    <div>Đã nhập: <strong className="text-emerald-700 font-mono">+{item.inQty}</strong></div>
                    <div>Đã dùng: <strong className="text-rose-600 font-mono">-{item.outQty}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Predictive Reorder Alert Box */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Dự Báo Số Ngày Còn Lại Trước Khi Hết Hàng
                </h3>
                <p className="text-[11px] text-slate-500">Mô hình tính toán dựa trên tốc độ tiêu thụ 30 ngày qua</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950">Phân NPK 16-16-8 Hữu cơ</span>
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                    ⚠️ Cần đặt hàng trong 7 ngày tới (Reorder Soon)
                  </span>
                </div>
                <div className="text-slate-700 text-xs space-y-1">
                  <div>Tồn kho khả dụng: <strong className="font-mono">350 kg</strong></div>
                  <div>Tốc độ tiêu thụ trung bình: <strong className="font-mono">20 kg / ngày</strong></div>
                  <div>Dự kiến cạn kho sau: <strong className="font-mono text-amber-800 text-sm">17.5 ngày</strong></div>
                </div>
                <button
                  onClick={() => navigate('/resources/purchases')}
                  className="w-full mt-1 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded font-semibold text-xs transition-colors"
                >
                  Tạo Đề xuất Mua hàng NPK ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSET REPAIR VS REPLACE INSIGHT */}
      {activeTab === 'assets' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Phân Tích Chi Phí Sửa Chữa Lũy Kế vs Mua Mới (Repair vs Replace)
              </h3>
              <p className="text-[11px] text-slate-500">
                Hỗ trợ ra quyết định thay mới thiết bị có chi phí vận hành quá cao
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
              Quyết định dựa trên TCO
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm block">Máy Bơm Nước Áp Lực Cao P01 (Khu Nam)</span>
                <span className="text-[11px] text-slate-500 font-mono">MÃ TS: AST-PUMP-001 · Đưa vào sử dụng: 2023</span>
              </div>
              <span className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs">
                Chi phí sửa chữa đã chiếm 40% giá trị mua mới
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-slate-700 pt-2 border-t border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Giá trị đầu tư mua mới:</span>
                <strong className="text-slate-900 font-mono">8.000.000 đ</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Chi phí sửa chữa 12 tháng qua:</span>
                <strong className="text-rose-600 font-mono">3.200.000 đ (4 lần hỏng)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Thời gian gián đoạn tưới:</span>
                <strong className="text-amber-800 font-mono">82 giờ chết (Downtime)</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Đề xuất hỗ trợ quyết định:</span>
                <span className="text-xs font-semibold text-slate-800">Cân nhắc thay thế trong Q1/2027</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
