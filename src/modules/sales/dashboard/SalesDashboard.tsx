import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertTriangle,
  Users,
  Boxes,
  ArrowUpRight,
  Truck,
  CheckCircle2,
  DollarSign,
  Calendar,
  ChevronRight,
  Eye,
  Plus,
  QrCode,
  FileText,
  Percent,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const SalesDashboard: React.FC = () => {
  const {
    customers,
    commercialProducts,
    salesOrders,
    deliveries,
    quotations,
    debtAging,
    customerClaims,
    navigate,
  } = useApp();

  const [timeRange, setTimeRange] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'QUARTER'>('THIS_MONTH');

  // KPI Calculations
  const totalRevenueMonth = 325000000;
  const totalOrdersMonth = salesOrders.length + 124; // Representative month total
  const pendingDeliveriesToday = deliveries.filter((d) => d.status === 'READY' || d.status === 'SHIPPING').length + 6;
  const totalReceivables = debtAging.reduce((acc, curr) => acc + curr.totalDebtVnd, 0);
  const overdueDebt = debtAging.reduce((acc, curr) => acc + curr.days1to30Vnd + curr.days31to60Vnd + curr.days61to90Vnd + curr.daysOver90Vnd, 0);
  const totalAvailableStock = commercialProducts.reduce((acc, curr) => acc + curr.available, 0);
  const totalOnHandStock = commercialProducts.reduce((acc, curr) => acc + curr.onHand, 0);
  const totalReservedStock = commercialProducts.reduce((acc, curr) => acc + curr.reserved, 0);

  // Pending Actions
  const ordersNeedingAllocation = salesOrders.filter((o) => o.status === 'CONFIRMED' && o.items.some((i) => i.quantityAllocated < i.quantityOrdered));
  const openClaimsCount = customerClaims.filter((c) => c.status === 'OPEN' || c.status === 'INVESTIGATING').length;

  return (
    <div className="space-y-6">
      {/* Header with Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Phân hệ 5
            </span>
            <span className="text-xs text-slate-500 font-mono">Farm-to-Customer Supply Chain</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Tổng quan Kinh doanh & Khách hàng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý từ Thu hoạch → Kho thành phẩm → Đơn hàng → Giao nhận → Công nợ & Truy xuất nguồn gốc
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/sales/orders')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo đơn hàng</span>
          </button>
          <button
            onClick={() => navigate('/sales/quotations')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Tạo báo giá</span>
          </button>
          <button
            onClick={() => navigate('/sales/classification')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Boxes className="w-4 h-4" />
            <span>Phân loại thu hoạch</span>
          </button>
          <button
            onClick={() => navigate('/sales/traceability')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Tra cứu QR</span>
          </button>
        </div>
      </div>

      {/* 6 Key KPIs defined in Section 8 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Doanh thu tháng */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Doanh thu tháng</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">
            {totalRevenueMonth.toLocaleString('vi-VN')}đ
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% so với T9</span>
          </div>
        </div>

        {/* KPI 2: Đơn hàng tháng */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Đơn hàng tháng</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">{totalOrdersMonth}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="text-blue-600 font-medium">96%</span> hoàn thành đúng hạn
          </div>
        </div>

        {/* KPI 3: Đơn cần giao hôm nay */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-colors cursor-pointer" onClick={() => navigate('/sales/deliveries')}>
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Giao hôm nay</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Truck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-amber-700">{pendingDeliveriesToday} đơn</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-0.5">
            <span>2 xe tải đang chạy</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* KPI 4: Công nợ phải thu */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-red-300 transition-colors cursor-pointer" onClick={() => navigate('/sales/payments')}>
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Công nợ phải thu</span>
            <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">
            {totalReceivables.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-[11px] text-red-600 font-medium mt-1">
            {overdueDebt.toLocaleString('vi-VN')}đ quá hạn
          </div>
        </div>

        {/* KPI 5: Khách hàng */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors cursor-pointer" onClick={() => navigate('/sales/customers')}>
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Khách hàng</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-slate-800">146 khách</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            +12 khách mới tháng này
          </div>
        </div>

        {/* KPI 6: Hàng có thể bán (Available) */}
        <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/30 shadow-sm hover:border-emerald-400 transition-colors cursor-pointer" onClick={() => navigate('/sales/inventory')}>
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1">
            <span className="font-semibold">Hàng có thể bán</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <Boxes className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-800">
            {totalAvailableStock.toLocaleString('vi-VN')}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">
            Tồn: {totalOnHandStock.toLocaleString('vi-VN')} | Giữ: {totalReservedStock.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Tồn kho thành phẩm & Nguyên tắc Không bán vượt tồn */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>Kho thành phẩm thương mại & Tồn khả dụng</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Áp dụng nghiêm ngặt công thức: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-700 font-semibold">Available = On Hand - Reserved</code> (Không bán vượt tồn)
                </p>
              </div>
              <button
                onClick={() => navigate('/sales/inventory')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Xem chi tiết lô</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-4">
              {commercialProducts.map((prod) => {
                const percentReserved = Math.round((prod.reserved / (prod.onHand || 1)) * 100);
                return (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                          {prod.sku}
                        </span>
                        <h3 className="text-xs font-bold text-slate-800 mt-1">
                          {prod.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {prod.cropSource} • Hạng {prod.grade}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700">
                          {prod.standardPriceVnd.toLocaleString('vi-VN')}đ
                        </span>
                        <div className="text-[10px] text-slate-400">/{prod.salesUnit}</div>
                      </div>
                    </div>

                    {/* Inventory bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-600">
                          Có thể bán:{' '}
                          <strong className="text-emerald-700 font-bold text-xs">
                            {prod.available.toLocaleString('vi-VN')} {prod.salesUnit}
                          </strong>
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          Giữ cho đơn: {prod.reserved.toLocaleString('vi-VN')} ({percentReserved}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-600"
                          style={{ width: `${100 - percentReserved}%` }}
                          title={`Có thể bán: ${prod.available}`}
                        />
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${percentReserved}%` }}
                          title={`Đã giữ: ${prod.reserved}`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>Tổng vật lý (On Hand): {prod.onHand.toLocaleString('vi-VN')}</span>
                        <span>Ngưỡng tối thiểu: {prod.minThreshold}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Đơn hàng cần xử lý (Pending Actions) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">
                  Đơn hàng gần đây & Cần xử lý
                </h2>
                {ordersNeedingAllocation.length > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {ordersNeedingAllocation.length} đơn cần giữ hàng
                  </span>
                )}
              </div>
              <button
                onClick={() => navigate('/sales/orders')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Xem tất cả đơn</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                    <th className="pb-2.5">Mã đơn</th>
                    <th className="pb-2.5">Khách hàng</th>
                    <th className="pb-2.5">Ngày giao</th>
                    <th className="pb-2.5">Sản phẩm / SL</th>
                    <th className="pb-2.5 text-right">Tổng tiền</th>
                    <th className="pb-2.5 text-center">Trạng thái</th>
                    <th className="pb-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesOrders.slice(0, 5).map((order) => {
                    const statusColors: Record<string, string> = {
                      DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
                      CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
                      ALLOCATED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                      PREPARING: 'bg-amber-50 text-amber-700 border-amber-200',
                      SHIPPING: 'bg-purple-50 text-purple-700 border-purple-200',
                      DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
                    };

                    const statusLabels: Record<string, string> = {
                      DRAFT: 'Nháp',
                      CONFIRMED: 'Đã xác nhận',
                      ALLOCATED: 'Đã giữ hàng',
                      PREPARING: 'Đang chuẩn bị',
                      SHIPPING: 'Đang giao',
                      DELIVERED: 'Đã giao',
                      COMPLETED: 'Hoàn tất',
                      CANCELLED: 'Đã hủy',
                    };

                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-semibold text-emerald-800 font-mono">
                          {order.code}
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-slate-800">{order.customerName}</div>
                          <div className="text-[10px] text-slate-400">{order.customerType}</div>
                        </td>
                        <td className="py-3 text-slate-600">
                          {order.deliveryDate}
                        </td>
                        <td className="py-3 text-slate-700">
                          {order.items.map((i) => `${i.productName}: ${i.quantityOrdered} ${i.unit}`).join(', ')}
                        </td>
                        <td className="py-3 text-right font-semibold text-slate-800">
                          {order.totalAmountVnd.toLocaleString('vi-VN')}đ
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              statusColors[order.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => navigate('/sales/orders')}
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded text-[11px] font-medium transition-colors"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col wide) */}
        <div className="space-y-6">
          {/* Top Khách hàng & Công nợ */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Khách hàng trọng điểm & Công nợ</span>
              </h2>
              <button
                onClick={() => navigate('/sales/customers')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {customers.slice(0, 4).map((cust) => {
                const percentCredit = Math.round((cust.currentDebtVnd / cust.creditLimitVnd) * 100);
                return (
                  <div key={cust.id} className="py-3 space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{cust.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {cust.typeLabel} • {cust.phone}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">
                          {cust.totalRevenueVnd.toLocaleString('vi-VN')}đ
                        </span>
                        <div className="text-[10px] text-slate-400">{cust.totalOrdersCount} đơn</div>
                      </div>
                    </div>

                    {/* Debt indicator */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">
                          Nợ hiện tại:{' '}
                          <strong className={cust.currentDebtVnd > 0 ? 'text-amber-700' : 'text-slate-700'}>
                            {cust.currentDebtVnd.toLocaleString('vi-VN')}đ
                          </strong>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Hạn mức: {cust.creditLimitVnd.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${
                            percentCredit > 80 ? 'bg-red-500' : percentCredit > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, percentCredit)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phân loại thu hoạch gần nhất (Nguyên tắc 1: Thu hoạch -> Kho thành phẩm) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Phân loại sau thu hoạch gần nhất</span>
              </h2>
              <button
                onClick={() => navigate('/sales/classification')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                + Phân loại mới
              </button>
            </div>

            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800">Đợt HARV-2026-1005</span>
                <span className="text-slate-500 text-[11px]">Khu Bắc (A001..A030)</span>
              </div>
              <div className="text-[11px] text-slate-600">
                Tổng thu hoạch: <strong>1.000 trái</strong> dừa xiêm xanh
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1 border-t border-slate-200">
                <div className="bg-emerald-100/60 text-emerald-800 p-1.5 rounded">
                  <div className="font-bold text-xs">750 (75%)</div>
                  <div>Loại A → Kho TP</div>
                </div>
                <div className="bg-blue-100/60 text-blue-800 p-1.5 rounded">
                  <div className="font-bold text-xs">200 (20%)</div>
                  <div>Loại B → Kho TP</div>
                </div>
                <div className="bg-slate-200 text-slate-700 p-1.5 rounded">
                  <div className="font-bold text-xs">50 (5%)</div>
                  <div>Reject (Ủ phân)</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1">
                ✓ Chỉ 950 trái đạt chuẩn được ghi nhận vào kho có thể bán. 50 trái lỗi bị loại bỏ hoàn toàn.
              </p>
            </div>
          </div>

          {/* Cảnh báo khiếu nại chất lượng (Nguyên tắc 4: Truy xuất nguồn gốc) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Khiếu nại & Truy xuất cây trồng</span>
              </h2>
              <button
                onClick={() => navigate('/sales/claims')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Xem chi tiết
              </button>
            </div>

            {customerClaims.slice(0, 1).map((claim) => (
              <div key={claim.id} className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900">{claim.code}</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-200 text-amber-900">
                    Đang điều tra
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-800">{claim.customerName}</div>
                <p className="text-[11px] text-slate-600 line-clamp-2">{claim.issueDescription}</p>

                {/* Root Cause Trace Tree Preview */}
                <div className="p-2 bg-white rounded border border-amber-100 text-[10px] text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-700">Truy xuất ngược nguồn gốc:</div>
                  <div className="font-mono text-emerald-800 truncate">
                    {claim.orderCode} → {claim.lotCode} → {claim.harvestBatchId} → Cây {claim.plantCodes.slice(0, 4).join(', ')}...
                  </div>
                </div>

                <button
                  onClick={() => navigate('/sales/claims')}
                  className="w-full mt-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors text-center"
                >
                  Điều tra nguyên nhân & Cây nguồn gốc
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
