import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  CreditCard,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  PieChart,
  BarChart3,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsKpiCard } from '../components/AnalyticsKpiCard';
import { GlobalFilterState } from '../../../types/analytics';

export const SalesFinanceAnalytics: React.FC = () => {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'revenue' | 'receivables' | 'cost' | 'profit'>('revenue');

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
              Phân tích Thương mại, Chi phí & Biên Lợi nhuận (Sales & Financial BI)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              COMMERCIAL & PROFITABILITY
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Báo cáo đa chiều: Doanh thu theo kênh, phân tích tuổi nợ khách hàng, bóc tách chi phí và tính toán lãi gộp trên từng cá thể cây
          </p>
        </div>

        <button
          onClick={() => navigate('/sales')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-slate-600" />
          <span>Mở Sàn Kinh doanh</span>
        </button>
      </div>

      {/* Global Filter */}
      <AnalyticsFilterBar filters={filters} onFilterChange={setFilters} />

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <AnalyticsKpiCard
          label="Tổng doanh thu"
          value="325"
          unit="triệu"
          changePercent={14.2}
          isPositiveChange={true}
          comparisonBaseline="Vượt 8% chỉ tiêu"
          dataSource="SALES_ORDER"
        />
        <AnalyticsKpiCard
          label="Đơn hàng thành công"
          value="128"
          unit="đơn"
          changePercent={9.4}
          isPositiveChange={true}
          comparisonBaseline="AOV: 2.54 tr/đơn"
          dataSource="SALES_ORDER"
        />
        <AnalyticsKpiCard
          label="Công nợ phải thu"
          value="82"
          unit="triệu"
          comparisonBaseline="21 tr quá hạn"
          dataSource="FINANCIAL_LEDGER"
          statusColor="amber"
          onDrilldown={() => setActiveTab('receivables')}
        />
        <AnalyticsKpiCard
          label="Chi phí sản xuất"
          value="184"
          unit="triệu"
          changePercent={5.1}
          isPositiveChange={false}
          comparisonBaseline="72 tr tiền vật tư"
          dataSource="FINANCIAL_LEDGER"
          onDrilldown={() => setActiveTab('cost')}
        />
        <AnalyticsKpiCard
          label="Lợi nhuận gộp"
          value="141"
          unit="triệu"
          changePercent={28.4}
          isPositiveChange={true}
          comparisonBaseline="Biên lãi 43.4%"
          dataSource="FINANCIAL_LEDGER"
          statusColor="emerald"
          onDrilldown={() => setActiveTab('profit')}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg">
        <nav className="flex space-x-6 font-medium">
          {[
            { id: 'revenue', label: '1. Doanh thu & Sản phẩm (Revenue)', icon: DollarSign },
            { id: 'receivables', label: '2. Công nợ & Tuổi nợ (Receivables Aging)', icon: CreditCard },
            { id: 'cost', label: '3. Cơ cấu Chi phí & Suất đầu tư (Cost)', icon: BarChart3 },
            { id: 'profit', label: '4. Lợi nhuận & Lãi trên Cá thể Cây (Profitability)', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: REVENUE & PRODUCT PERFORMANCE */}
      {activeTab === 'revenue' && (
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">
              Doanh Thu theo Danh mục Sản phẩm & Tỷ trọng
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">18.420 quả đã bán</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Sản phẩm thương phẩm</th>
                  <th className="py-2.5 px-3">Số lượng bán</th>
                  <th className="py-2.5 px-3">Đơn giá bình quân</th>
                  <th className="py-2.5 px-3">Doanh thu (VNĐ)</th>
                  <th className="py-2.5 px-3">Tỷ lệ đổi trả</th>
                  <th className="py-2.5 px-3 text-right">Biên lãi gộp ước tính</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Dừa Xiêm Xanh Lùn Loại 1 (Xuất khẩu)</td>
                  <td className="py-2 px-3 font-mono">12.400 quả</td>
                  <td className="py-2 px-3 font-mono">18.500 đ</td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-800">229.400.000 đ</td>
                  <td className="py-2 px-3 font-mono text-emerald-700">0.2%</td>
                  <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">48.2%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Dừa Dứa Thái Lan Thơm</td>
                  <td className="py-2 px-3 font-mono">3.800 quả</td>
                  <td className="py-2 px-3 font-mono">22.000 đ</td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-800">83.600.000 đ</td>
                  <td className="py-2 px-3 font-mono text-emerald-700">0.5%</td>
                  <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">51.0%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Dừa Xiêm Loại 2 (Chế biến nước đóng chai)</td>
                  <td className="py-2 px-3 font-mono">2.220 quả</td>
                  <td className="py-2 px-3 font-mono">5.400 đ</td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">11.988.000 đ</td>
                  <td className="py-2 px-3 font-mono text-slate-500">0.0%</td>
                  <td className="py-2 px-3 font-mono text-right font-bold text-slate-900">18.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVABLES AGING */}
      {activeTab === 'receivables' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Báo Cáo Phân Tích Tuổi Nợ Khách Hàng (Receivables Aging Analysis)
              </h3>
              <p className="text-[11px] text-slate-500">Tổng công nợ phải thu: 82.000.000 đ</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Trong hạn (Current)', val: '47 tr', pct: 57.3, color: 'text-emerald-700', bg: 'bg-emerald-500' },
              { label: 'Quá hạn 1 – 30 ngày', val: '14 tr', pct: 17.0, color: 'text-sky-700', bg: 'bg-sky-500' },
              { label: 'Quá hạn 31 – 60 ngày', val: '12 tr', pct: 14.6, color: 'text-amber-700', bg: 'bg-amber-500' },
              { label: 'Quá hạn 61 – 90 ngày', val: '6 tr', pct: 7.3, color: 'text-orange-700', bg: 'bg-orange-500' },
              { label: 'Quá hạn > 90 ngày (Rủi ro)', val: '3 tr', pct: 3.8, color: 'text-rose-700', bg: 'bg-rose-500' },
            ].map((bucket, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium block truncate">{bucket.label}</span>
                <span className={`text-lg font-bold font-mono ${bucket.color} block`}>{bucket.val}</span>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${bucket.bg}`} style={{ width: `${bucket.pct}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{bucket.pct}% tổng nợ</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COST ALLOCATION & PER TREE COST */}
      {activeTab === 'cost' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              Cơ Cấu Chi Phí Sản Xuất Tháng 10/2026 (184 Triệu VNĐ)
            </h3>
            <div className="space-y-2 pt-1 text-slate-700">
              {[
                { name: 'Vật tư phân bón & Chế phẩm BVTV sinh học', cost: '72 triệu', pct: 39.1 },
                { name: 'Nước tưới & Điện năng vận hành bơm IoT', cost: '35 triệu', pct: 19.0 },
                { name: 'Bảo trì máy móc, van tưới & cảm biến LoRaWAN', cost: '18 triệu', pct: 9.8 },
                { name: 'Nhân công chăm sóc, cắt tỉa & thu hái quả', cost: '45 triệu', pct: 24.5 },
                { name: 'Bao bì, tem nhãn QR truy xuất & chi phí khác', cost: '14 triệu', pct: 7.6 },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">{item.name}:</span>
                  <span className="font-mono font-bold text-slate-900">{item.cost} ({item.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              Mẫu Phân Bổ Chi Phí Trên Cá Thể Cây (Cây A023)
            </h3>
            <div className="space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Phân bón NPK & Hữu cơ vi sinh:</span>
                <span className="font-mono font-bold">250.000 đ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Thuốc BVTV & Nấm đối kháng:</span>
                <span className="font-mono font-bold">70.000 đ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Nước tưới phân bổ (5.4 m³/năm):</span>
                <span className="font-mono font-bold">80.000 đ</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span>Bảo trì van tưới phân bổ:</span>
                <span className="font-mono font-bold">30.000 đ</span>
              </div>
              <div className="flex justify-between py-2 border-t border-slate-200 font-bold text-emerald-950 bg-emerald-50/60 px-2 rounded">
                <span>Tổng chi phí trực tiếp trên cây A023:</span>
                <span className="font-mono text-emerald-800 text-sm">430.000 đ / năm</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROFITABILITY PER TREE */}
      {activeTab === 'profit' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Tính Toán Lợi Nhuận Trực Tiếp Trên Cá Thể Cây (Direct Tree Profit)
              </h3>
              <p className="text-[11px] text-slate-500">
                * Ghi chú: Số liệu "Lợi nhuận trực tiếp" (Direct Profit) chưa bao gồm phân bổ chi phí quản lý doanh nghiệp chung
              </p>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-sm text-slate-900">CÁ THỂ CÂY: A023 (Dừa Xiêm Xanh Lùn Bến Tre)</span>
                <p className="text-slate-500 text-[11px]">Vị trí: Khu Bắc · Vườn 01 · Hàng A</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Lợi nhuận trực tiếp</span>
                <span className="text-2xl font-bold font-mono text-emerald-800">+1.410.000 đ / năm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-200/60 text-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">Doanh thu từ quả thu hoạch:</span>
                <strong className="font-mono text-base text-slate-900">1.840.000 đ</strong>
                <span className="text-[10px] text-slate-400 block font-mono">92 quả x 20.000 đ</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Chi phí trực tiếp tiêu hao:</span>
                <strong className="font-mono text-base text-rose-600">-430.000 đ</strong>
                <span className="text-[10px] text-slate-400 block">Vật tư + Nước + Điện</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Tỷ suất sinh lời trực tiếp (ROI):</span>
                <strong className="font-mono text-base text-emerald-700">327.9%</strong>
                <span className="text-[10px] text-slate-400 block font-semibold text-emerald-800">Hiệu quả kinh tế rất cao</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
