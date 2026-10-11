import React from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  Truck,
  Wrench,
  Cpu,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  Zap,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { KpiCard } from '../../../components/common/KpiCard';
import { StatusBadge } from '../../../components/common/StatusBadge';

export const ResourceDashboard: React.FC = () => {
  const {
    materials,
    purchaseOrders,
    resourceAlerts,
    maintenanceRecords,
    farmExpenses,
    navigate,
    showToast,
  } = useApp();

  // Metrics calculation
  const totalInventoryValue = 182500000;
  const lowStockCount = 8;
  const expiringCount = 5;
  const shippingPOCount = 4;
  const totalAssetsCount = 126;
  const totalIoTAssetsCount = 48;
  const pendingMaintenanceCount = 7;
  const monthExpense = 42300000;

  // Alerts preview
  const urgentAlerts = resourceAlerts.slice(0, 4);

  // Critical stock items
  const criticalStock = materials.slice(0, 5);

  // Recent POs
  const recentPOs = purchaseOrders.slice(0, 3);

  // Upcoming maintenance
  const upcomingMaints = maintenanceRecords.slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Tổng quan Vật tư & Tài nguyên Nông nghiệp
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              PHÂN HỆ 3
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị chuỗi cung ứng vật tư, kho vận, thiết bị tài sản, máy móc IoT và kiểm soát chi phí thực địa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/resources/purchases/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo đơn mua (PO)</span>
          </button>
          <button
            onClick={() => navigate('/resources/purchases')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Mua nhanh trực tiếp</span>
          </button>
          <button
            onClick={() => navigate('/resources/inventory/issue')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Package className="w-3.5 h-3.5 text-blue-500" />
            <span>Xuất kho sử dụng</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (8 metrics exactly as prompt) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {/* KPI 1 */}
        <div
          onClick={() => navigate('/resources/inventory')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-slate-500 font-medium block truncate">Giá trị tồn kho</span>
          <span className="text-base font-bold font-mono text-slate-900 mt-1 block">182.5 tr</span>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="w-3 h-3" /> +4.2% tháng
          </span>
        </div>

        {/* KPI 2 */}
        <div
          onClick={() => navigate('/resources/materials')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-amber-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-amber-700 font-medium block truncate">Vật tư sắp hết</span>
          <span className="text-lg font-bold font-mono text-amber-800 mt-1 block">{lowStockCount}</span>
          <span className="text-[10px] text-amber-600 block">&lt; mức tối thiểu</span>
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => navigate('/resources/inventory')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-rose-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-rose-700 font-medium block truncate">Sắp hết hạn</span>
          <span className="text-lg font-bold font-mono text-rose-800 mt-1 block">{expiringCount}</span>
          <span className="text-[10px] text-rose-600 block">Ưu tiên FEFO</span>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => navigate('/resources/purchases')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-blue-700 font-medium block truncate">Đơn mua đang giao</span>
          <span className="text-lg font-bold font-mono text-blue-800 mt-1 block">{shippingPOCount}</span>
          <span className="text-[10px] text-blue-600 block">Chờ nhận hàng</span>
        </div>

        {/* KPI 5 */}
        <div
          onClick={() => navigate('/resources/assets')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-slate-500 font-medium block truncate">Thiết bị cơ giới</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">{totalAssetsCount}</span>
          <span className="text-[10px] text-emerald-600 block">122 đang chạy</span>
        </div>

        {/* KPI 6 */}
        <div
          onClick={() => navigate('/resources/iot-devices')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-purple-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-purple-700 font-medium block truncate">Thiết bị IoT</span>
          <span className="text-lg font-bold font-mono text-purple-800 mt-1 block">{totalIoTAssetsCount}</span>
          <span className="text-[10px] text-purple-600 block">45 online, 3 kho</span>
        </div>

        {/* KPI 7 */}
        <div
          onClick={() => navigate('/resources/maintenance')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-orange-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-orange-700 font-medium block truncate">Cần bảo trì</span>
          <span className="text-lg font-bold font-mono text-orange-800 mt-1 block">{pendingMaintenanceCount}</span>
          <span className="text-[10px] text-orange-600 block">Đến chu kỳ</span>
        </div>

        {/* KPI 8 */}
        <div
          onClick={() => navigate('/resources/expenses')}
          className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs"
        >
          <span className="text-[11px] text-slate-500 font-medium block truncate">Chi phí tháng</span>
          <span className="text-base font-bold font-mono text-slate-900 mt-1 block">42.3 tr</span>
          <span className="text-[10px] text-slate-400 block">Tháng 10/2026</span>
        </div>
      </div>

      {/* Main Grid 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Tồn kho quan trọng & Đơn mua gần đây */}
        <div className="space-y-6">
          {/* Tồn kho quan trọng */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Tồn kho vật tư quan trọng</h2>
                <p className="text-xs text-slate-500">Mức tồn khả dụng so với định mức an toàn tối thiểu</p>
              </div>
              <button
                onClick={() => navigate('/resources/inventory')}
                className="text-xs text-emerald-700 hover:underline font-medium inline-flex items-center gap-0.5"
              >
                Xem kho &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {criticalStock.map((mat) => {
                const stockRatio = Math.min(Math.round((mat.currentStock / (mat.minStock * 2)) * 100), 100);
                const isLow = mat.currentStock <= mat.minStock;
                return (
                  <div
                    key={mat.id}
                    onClick={() => navigate('/resources/materials')}
                    className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="truncate pr-2">
                        <span className="font-semibold text-slate-900">{mat.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">({mat.code})</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-bold ${isLow ? 'text-amber-700' : 'text-slate-900'}`}>
                          {mat.currentStock} {mat.unit}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">/ min {mat.minStock}</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          isLow ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${stockRatio}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Đơn mua gần đây */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Đơn mua hàng gần đây (PO)</h2>
                <p className="text-xs text-slate-500">Tiến độ giao nhận từ nhà cung cấp và tăng tồn tự động</p>
              </div>
              <button
                onClick={() => navigate('/resources/purchases')}
                className="text-xs text-emerald-700 hover:underline font-medium inline-flex items-center gap-0.5"
              >
                Tất cả đơn &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {recentPOs.map((po) => (
                <div
                  key={po.id}
                  onClick={() => navigate('/resources/purchases')}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">{po.code}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          po.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : po.status === 'PARTIALLY_RECEIVED'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {po.status === 'COMPLETED'
                          ? 'Đã nhận đủ'
                          : po.status === 'PARTIALLY_RECEIVED'
                          ? 'Nhận 1 phần'
                          : 'Đang giao'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">{po.supplierName}</div>
                    <div className="text-[10px] text-slate-400">
                      Đặt: {po.orderDate} • Dự kiến: {po.expectedDeliveryDate}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900 text-xs">
                      {po.totalAmount.toLocaleString('vi-VN')} đ
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/resources/purchases');
                      }}
                      className="mt-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                    >
                      Nhận hàng &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Cảnh báo & Bảo trì & Xu hướng chi phí */}
        <div className="space-y-6">
          {/* Cảnh báo Inbox */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Cảnh báo vật tư & thiết bị ({resourceAlerts.length})</h2>
              </div>
              <button
                onClick={() => navigate('/resources/alerts')}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Hộp thư cảnh báo &rarr;
              </button>
            </div>

            <div className="space-y-2">
              {urgentAlerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                    al.severity === 'CRITICAL'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          al.severity === 'CRITICAL' ? 'bg-rose-600' : 'bg-amber-500'
                        }`}
                      ></span>
                      <span>{al.categoryLabel}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{al.message}</p>
                  </div>
                  <button
                    onClick={() => navigate(al.actionRoute)}
                    className="shrink-0 px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-semibold rounded border border-slate-200 shadow-2xs"
                  >
                    {al.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Lịch bảo trì sắp tới */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bảo trì máy móc & thiết bị sắp tới</h2>
                <p className="text-xs text-slate-500">Kế hoạch bảo dưỡng định kỳ và sửa chữa thay thế linh kiện</p>
              </div>
              <button
                onClick={() => navigate('/resources/maintenance')}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                Xem lịch &rarr;
              </button>
            </div>

            <div className="space-y-2">
              {upcomingMaints.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate('/resources/maintenance')}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{m.assetName}</div>
                    <div className="text-[10px] text-slate-500">
                      Loại: {m.typeLabel} • Người phụ trách: {m.assigneeName}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-semibold text-slate-800 block">
                      {m.scheduledDate}
                    </span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      {m.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Xu hướng phân bổ chi phí tháng */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900">Cơ cấu Chi phí Nông trại (Tháng 10/2026)</h2>
              <span className="font-mono font-bold text-emerald-800 text-sm">42.300.000 đ</span>
            </div>

            {/* Distribution bars */}
            <div className="space-y-1.5 text-xs pt-1">
              {[
                { label: 'Vật tư phân bón & BVTV', amount: '18.2 tr', percent: 43, color: 'bg-emerald-600' },
                { label: 'Điện nước bơm tưới 3 pha', amount: '9.4 tr', percent: 22, color: 'bg-blue-600' },
                { label: 'Bảo trì sửa chữa máy bơm & máy cắt', amount: '7.5 tr', percent: 18, color: 'bg-amber-500' },
                { label: 'Chi phí nông vụ & phụ tùng khác', amount: '7.2 tr', percent: 17, color: 'bg-purple-600' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {item.amount} ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.percent}%` }}></div>
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
