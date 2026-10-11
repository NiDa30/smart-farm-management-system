import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  ArrowRight,
  Boxes,
  DollarSign,
  ChevronRight,
  Eye,
  X,
  CreditCard,
  QrCode,
  TreePine,
  Check,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { SalesOrder, OrderStatus, PaymentStatus } from '../../../types';

export const OrderManager: React.FC = () => {
  const {
    salesOrders,
    customers,
    commercialProducts,
    finishedGoodsLots,
    allocateOrderLots,
    autoAllocateOrder,
    createDeliveryFromOrder,
    recordSalesPayment,
    createSalesOrder,
    deliveries,
    salesPayments,
    navigate,
  } = useApp();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Detail Drawer / View
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(salesOrders[0]?.id || null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'ITEMS' | 'ALLOCATION' | 'DELIVERIES' | 'PAYMENTS' | 'TIMELINE' | 'TRACE'>('OVERVIEW');

  // Create Order Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [newOrderItems, setNewOrderItems] = useState([
    { productId: commercialProducts[0]?.id || 'PROD-COC-A', quantity: 500, unitPrice: 15000 },
  ]);

  // Delivery Dialog Modal
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [delVehicle, setDelVehicle] = useState('Xe tải lạnh Isuzu 1.9T - Biển số 51D-892.44');
  const [delDriver, setDelDriver] = useState('Trần Văn Nam');
  const [delDriverPhone, setDelDriverPhone] = useState('0912334455');
  const [delPlannedDate, setDelPlannedDate] = useState(
    new Date().toISOString().replace('T', ' ').slice(0, 16)
  );

  // Payment Dialog Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');

  const selectedOrder = useMemo(() => {
    return salesOrders.find((o) => o.id === selectedOrderId) || null;
  }, [salesOrders, selectedOrderId]);

  const filteredOrders = useMemo(() => {
    return salesOrders.filter((order) => {
      const matchSearch =
        order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const matchPayment = paymentFilter === 'ALL' || order.paymentStatus === paymentFilter;
      return matchSearch && matchStatus && matchPayment;
    });
  }, [salesOrders, searchTerm, statusFilter, paymentFilter]);

  const statusColors: Record<OrderStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    ALLOCATED: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold',
    PREPARING: 'bg-amber-50 text-amber-700 border-amber-200',
    SHIPPING: 'bg-purple-50 text-purple-700 border-purple-200',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusLabels: Record<OrderStatus, string> = {
    DRAFT: 'Nháp',
    CONFIRMED: 'Đã xác nhận',
    ALLOCATED: 'Đã giữ hàng',
    PREPARING: 'Đang chuẩn bị',
    SHIPPING: 'Đang giao',
    DELIVERED: 'Đã giao',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy',
  };

  const handleOpenDeliveryModal = () => {
    if (!selectedOrder) return;
    setIsDeliveryModalOpen(true);
  };

  const handleConfirmCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    createDeliveryFromOrder(selectedOrder.id, {
      vehicle: delVehicle,
      driverName: delDriver,
      driverPhone: delDriverPhone,
      plannedDate: delPlannedDate,
    });
    setIsDeliveryModalOpen(false);
  };

  const handleOpenPaymentModal = () => {
    if (!selectedOrder) return;
    setPayAmount(selectedOrder.outstandingAmountVnd);
    setPayRef(`VCB-${Date.now().toString().slice(-6)}`);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || payAmount <= 0) return;
    recordSalesPayment({
      orderId: selectedOrder.id,
      orderCode: selectedOrder.code,
      customerId: selectedOrder.customerId,
      customerName: selectedOrder.customerName,
      amountVnd: Number(payAmount),
      paymentDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      paymentMethod: payMethod,
      transactionReference: payRef,
      recordedBy: 'Kế toán bán hàng',
    });
    setIsPaymentModalOpen(false);
  };

  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustId);
    if (!cust) return;

    const sub = newOrderItems.reduce((acc, curr) => acc + curr.quantity * curr.unitPrice, 0);

    createSalesOrder({
      customerId: cust.id,
      customerCode: cust.code,
      customerName: cust.name,
      customerType: cust.typeLabel,
      customerPhone: cust.phone,
      deliveryAddress: cust.deliveryAddress,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: orderDeliveryDate,
      items: newOrderItems.map((item) => {
        const prod = commercialProducts.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productSku: prod?.sku || 'SKU-GEN',
          productName: prod?.name || 'Sản phẩm',
          unit: prod?.salesUnit || 'trái',
          quantityOrdered: Number(item.quantity),
          quantityAllocated: 0,
          quantityDelivered: 0,
          unitPriceVnd: Number(item.unitPrice),
          discountVnd: 0,
          subtotalVnd: Number(item.quantity) * Number(item.unitPrice),
          allocatedLots: [],
        };
      }),
      subtotalVnd: sub,
      discountVnd: 0,
      taxVnd: 0,
      shippingFeeVnd: 250000,
      totalAmountVnd: sub + 250000,
      createdBy: 'Nguyễn Văn Hùng',
    });

    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Đơn hàng & Giữ hàng
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 13 & 14</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Quản lý Đơn Hàng & Phân Bổ Hàng (Allocation)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến trình từ Đặt hàng → Giữ hàng lô (Reserved) → Soạn hàng → Giao nhận & Thu tiền
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo đơn hàng</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn / Khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
            <option value="ALLOCATED">Đã giữ hàng (ALLOCATED)</option>
            <option value="PREPARING">Đang chuẩn bị (PREPARING)</option>
            <option value="SHIPPING">Đang giao (SHIPPING)</option>
            <option value="DELIVERED">Đã giao (DELIVERED)</option>
            <option value="COMPLETED">Hoàn tất (COMPLETED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả thanh toán</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Thanh toán 1 phần</option>
            <option value="PAID">Đã thanh toán đủ</option>
          </select>
        </div>
      </div>

      {/* Main Order Layout: 2-column or list with detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orders List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-500 px-1">
            Hiển thị {filteredOrders.length} đơn hàng
          </div>

          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const isSelected = order.id === selectedOrderId;
              const isAllocated = order.items.every((i) => i.quantityAllocated >= i.quantityOrdered);

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 hover:border-emerald-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800">
                          {order.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] border ${
                            statusColors[order.status]
                          }`}
                        >
                          {statusLabels[order.status] || order.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-xs mt-1">
                        {order.customerName}
                      </h3>
                      <div className="text-[11px] text-slate-400">
                        {order.customerType} • Đặt: {order.orderDate}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-800 text-xs">
                        {order.totalAmountVnd.toLocaleString('vi-VN')}đ
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.paymentStatus === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {order.paymentStatus === 'PAID'
                          ? 'Đã trả'
                          : order.paymentStatus === 'PARTIALLY_PAID'
                          ? 'Trả 1 phần'
                          : 'Chưa trả'}
                      </span>
                    </div>
                  </div>

                  {/* Summary progress bar */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Giao dự kiến: <strong className="text-slate-700">{order.deliveryDate}</strong>
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        isAllocated ? 'text-emerald-700' : 'text-amber-600'
                      }`}
                    >
                      {isAllocated ? '✓ Đã giữ đủ hàng' : '⚠️ Chưa giữ đủ hàng'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Order Detail (7 Cols - Screen 14) */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 sticky top-4">
              {/* Detail Header & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-lg">
                      {selectedOrder.code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        statusColors[selectedOrder.status]
                      }`}
                    >
                      ● {statusLabels[selectedOrder.status] || selectedOrder.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 mt-1">
                    {selectedOrder.customerName}
                  </h2>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Action 1: Giữ hàng / Allocation */}
                  {selectedOrder.items.some((i) => i.quantityAllocated < i.quantityOrdered) && (
                    <button
                      onClick={() => autoAllocateOrder(selectedOrder.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                      title="Tự động giữ hàng FIFO theo ngày thu hoạch sớm nhất"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Giữ hàng (Auto FIFO)</span>
                    </button>
                  )}

                  {/* Action 2: Tạo giao hàng */}
                  {selectedOrder.status === 'ALLOCATED' && (
                    <button
                      onClick={handleOpenDeliveryModal}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Tạo giao hàng</span>
                    </button>
                  )}

                  {/* Action 3: Ghi nhận thanh toán */}
                  {selectedOrder.outstandingAmountVnd > 0 && (
                    <button
                      onClick={handleOpenPaymentModal}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Thanh toán</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Order Status Stepper (Section 29) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <div className="flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã đặt</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <div
                    className={`flex items-center gap-1 ${
                      ['ALLOCATED', 'PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(
                        selectedOrder.status
                      )
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>Giữ hàng</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <div
                    className={`flex items-center gap-1 ${
                      ['PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(
                        selectedOrder.status
                      )
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>Chuẩn bị</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <div
                    className={`flex items-center gap-1 ${
                      ['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(selectedOrder.status)
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>Đang giao</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  <div
                    className={`flex items-center gap-1 ${
                      ['DELIVERED', 'COMPLETED'].includes(selectedOrder.status)
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    <span>Hoàn tất</span>
                  </div>
                </div>
              </div>

              {/* Credit Exceeded Warning Banner if applicable (Section 45) */}
              {selectedOrder.creditExceededWarning && (
                <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-red-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      <strong>Cảnh báo hạn mức công nợ:</strong> Giá trị đơn hàng này sẽ làm khách
                      hàng vượt hạn mức tín dụng cho phép.
                    </span>
                  </div>
                  <span className="font-bold underline text-[11px]">Đã duyệt ngoại lệ</span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
                {[
                  { id: 'OVERVIEW', label: 'Tổng quan' },
                  { id: 'ITEMS', label: 'Sản phẩm & Lô giữ' },
                  { id: 'ALLOCATION', label: 'Phân bổ hàng (Allocation)' },
                  { id: 'DELIVERIES', label: 'Giao hàng' },
                  { id: 'PAYMENTS', label: 'Thanh toán' },
                  { id: 'TIMELINE', label: 'Lịch sử' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors ${
                      detailTab === tab.id
                        ? 'border-emerald-600 text-emerald-700 font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab 1: Tổng quan */}
              {detailTab === 'OVERVIEW' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-slate-400 text-[10px]">Ngày đặt hàng:</div>
                      <div className="font-semibold text-slate-800">{selectedOrder.orderDate}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Ngày hẹn giao hàng:</div>
                      <div className="font-semibold text-emerald-800">
                        {selectedOrder.deliveryDate}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Số điện thoại liên hệ:</div>
                      <div className="font-semibold text-slate-800">
                        {selectedOrder.customerPhone}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-[10px]">Người tạo đơn:</div>
                      <div className="font-semibold text-slate-800">{selectedOrder.createdBy}</div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200">
                      <div className="text-slate-400 text-[10px]">Địa chỉ giao nhận:</div>
                      <div className="font-semibold text-slate-800">
                        {selectedOrder.deliveryAddress}
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Tạm tính tiền hàng:</span>
                      <span>{selectedOrder.subtotalVnd.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Phí vận chuyển:</span>
                      <span>{selectedOrder.shippingFeeVnd.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200 text-sm">
                      <span>Tổng giá trị đơn:</span>
                      <span className="text-emerald-800">
                        {selectedOrder.totalAmountVnd.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 text-xs">
                      <span>Đã thanh toán:</span>
                      <span className="text-emerald-700 font-semibold">
                        {selectedOrder.paidAmountVnd.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-xs">
                      <span>Còn nợ chưa trả:</span>
                      <span className="text-amber-700 font-bold">
                        {selectedOrder.outstandingAmountVnd.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Sản phẩm & Lô phân bổ */}
              {detailTab === 'ITEMS' && (
                <div className="space-y-3 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Vật tư / Sản phẩm</th>
                        <th className="py-2.5 px-3 text-right">Đặt</th>
                        <th className="py-2.5 px-3 text-right">Đã giữ</th>
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-800">{item.productName}</div>
                            <div className="text-[10px] text-slate-400">{item.productSku}</div>
                            {item.allocatedLots.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.allocatedLots.map((lot, lIdx) => (
                                  <span
                                    key={lIdx}
                                    className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-mono"
                                  >
                                    Lô {lot.lotCode}: {lot.qty} {item.unit}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">
                            {item.quantityOrdered} {item.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-indigo-700">
                            {item.quantityAllocated} {item.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-600">
                            {item.unitPriceVnd.toLocaleString('vi-VN')}đ
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-800">
                            {item.subtotalVnd.toLocaleString('vi-VN')}đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Phân bổ hàng (Allocation Engine - Section 31-33) */}
              {detailTab === 'ALLOCATION' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-indigo-900">
                    <div className="font-bold text-xs">
                      Cơ chế phân bổ hàng hóa (Stock Allocation):
                    </div>
                    <p className="text-[11px] mt-0.5">
                      Gán các lô thành phẩm cụ thể vào đơn hàng để giữ tồn (Reserved), đảm bảo hàng
                      không bị bán trùng cho khách khác trước ngày xuất kho.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => {
                      const prod = commercialProducts.find((p) => p.id === item.productId);
                      const shortage = Math.max(0, item.quantityOrdered - item.quantityAllocated);

                      return (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-800">{item.productName}</h4>
                              <span className="text-[11px] text-slate-500">
                                Nhu cầu đơn: <strong>{item.quantityOrdered} {item.unit}</strong>
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500">Đã giữ: </span>
                              <strong className="text-indigo-700 font-bold">
                                {item.quantityAllocated} / {item.quantityOrdered}
                              </strong>
                            </div>
                          </div>

                          {/* Inventory status of product */}
                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-white p-2 rounded-lg border border-slate-200">
                            <div>
                              <div className="text-slate-400">Vật lý (On Hand)</div>
                              <div className="font-bold text-slate-700">{prod?.onHand}</div>
                            </div>
                            <div>
                              <div className="text-amber-700">Đã giữ (Reserved)</div>
                              <div className="font-bold text-amber-700">{prod?.reserved}</div>
                            </div>
                            <div>
                              <div className="text-emerald-700">Khả dụng (Available)</div>
                              <div className="font-bold text-emerald-800 text-xs">
                                {prod?.available}
                              </div>
                            </div>
                          </div>

                          {shortage > 0 && (
                            <div className="flex items-center justify-between p-2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              <span>Thiếu hàng cần phân bổ thêm: <strong>{shortage} {item.unit}</strong></span>
                              <button
                                onClick={() => autoAllocateOrder(selectedOrder.id)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px]"
                              >
                                Auto Allocate FIFO
                              </button>
                            </div>
                          )}

                          {/* Available lots list for manual selection */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-200">
                            <div className="font-semibold text-slate-700 text-[11px]">
                              Các lô có sẵn trong kho:
                            </div>
                            {finishedGoodsLots
                              .filter((l) => l.productId === item.productId)
                              .map((lot) => (
                                <div
                                  key={lot.id}
                                  className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-[11px]"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-emerald-800">
                                      {lot.lotCode}
                                    </span>
                                    <span className="text-slate-500 ml-2">
                                      Hái: {lot.harvestDate}
                                    </span>
                                  </div>
                                  <div>
                                    Tồn khả dụng:{' '}
                                    <strong className="text-emerald-800">
                                      {lot.availableQty} {lot.unit}
                                    </strong>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 4: Giao hàng */}
              {detailTab === 'DELIVERIES' && (
                <div className="space-y-3 text-xs">
                  {deliveries.filter((d) => d.orderId === selectedOrder.id).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      Chưa có phiếu giao hàng nào cho đơn này.
                    </div>
                  ) : (
                    deliveries
                      .filter((d) => d.orderId === selectedOrder.id)
                      .map((del) => (
                        <div
                          key={del.id}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-emerald-800">{del.code}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              {del.status}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Phương tiện: <strong>{del.vehicle}</strong> • Tài xế:{' '}
                            <strong>{del.driverName}</strong> ({del.driverPhone})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Ngày hẹn: {del.plannedDate}
                          </div>
                          <button
                            onClick={() => navigate('/sales/deliveries')}
                            className="text-xs text-emerald-700 hover:underline font-semibold"
                          >
                            Xem chi tiết hành trình vận tải →
                          </button>
                        </div>
                      ))
                  )}
                </div>
              )}

              {/* Tab 5: Thanh toán */}
              {detailTab === 'PAYMENTS' && (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span>Đã thanh toán: </span>
                      <strong className="text-emerald-700">
                        {selectedOrder.paidAmountVnd.toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                    <div>
                      <span>Còn lại: </span>
                      <strong className="text-amber-700">
                        {selectedOrder.outstandingAmountVnd.toLocaleString('vi-VN')}đ
                      </strong>
                    </div>
                  </div>

                  {salesPayments
                    .filter((p) => p.orderId === selectedOrder.id)
                    .map((pay) => (
                      <div
                        key={pay.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-emerald-800">{pay.code}</div>
                          <div className="text-[11px] text-slate-500">
                            {pay.paymentDate} • {pay.paymentMethod}
                          </div>
                        </div>
                        <div className="text-right font-bold text-emerald-700">
                          +{pay.amountVnd.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 6: Timeline */}
              {detailTab === 'TIMELINE' && (
                <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-2 text-xs">
                  {selectedOrder.timeline.map((item, idx) => (
                    <div key={idx} className="relative pb-3">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                      <div className="text-[10px] text-slate-400 font-mono">{item.timestamp}</div>
                      <div className="font-bold text-slate-800 mt-0.5">{item.stage}</div>
                      <div className="text-slate-600 text-[11px]">{item.note}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Bởi: {item.actor}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Chọn đơn hàng để xem chi tiết
            </div>
          )}
        </div>
      </div>

      {/* Modal Tạo đơn hàng mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Tạo Đơn Hàng Mới</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Khách hàng *</label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-semibold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.typeLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ngày giao dự kiến *</label>
                  <input
                    type="date"
                    required
                    value={orderDeliveryDate}
                    onChange={(e) => setOrderDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="font-bold text-slate-700">Sản phẩm đặt mua</div>
                <div className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="col-span-6">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Sản phẩm</label>
                    <select
                      value={newOrderItems[0].productId}
                      onChange={(e) =>
                        setNewOrderItems([{ ...newOrderItems[0], productId: e.target.value }])
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                    >
                      {commercialProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Có thể bán: {p.available})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Số lượng</label>
                    <input
                      type="number"
                      min={1}
                      value={newOrderItems[0].quantity}
                      onChange={(e) =>
                        setNewOrderItems([
                          { ...newOrderItems[0], quantity: Number(e.target.value) },
                        ])
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-right font-bold"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-400 block mb-0.5">Đơn giá (VNĐ)</label>
                    <input
                      type="number"
                      step={500}
                      value={newOrderItems[0].unitPrice}
                      onChange={(e) =>
                        setNewOrderItems([
                          { ...newOrderItems[0], unitPrice: Number(e.target.value) },
                        ])
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-right font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold shadow-sm"
                >
                  Tạo đơn hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lập phiếu giao hàng từ đơn */}
      {isDeliveryModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">
                Lập Phiếu Giao Hàng từ {selectedOrder.code}
              </h3>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateDelivery} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Phương tiện vận chuyển *</label>
                <input
                  type="text"
                  required
                  value={delVehicle}
                  onChange={(e) => setDelVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tài xế giao hàng *</label>
                  <input
                    type="text"
                    required
                    value={delDriver}
                    onChange={(e) => setDelDriver(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số điện thoại tài xế</label>
                  <input
                    type="text"
                    required
                    value={delDriverPhone}
                    onChange={(e) => setDelDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Thời gian xuất phát dự kiến</label>
                <input
                  type="text"
                  value={delPlannedDate}
                  onChange={(e) => setDelPlannedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
                >
                  Xác nhận điều phối xe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận thanh toán */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">
                Ghi nhận thanh toán: {selectedOrder.code}
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Số tiền thanh toán (VNĐ) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-emerald-800 text-base"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Phương thức thanh toán</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                >
                  <option value="BANK_TRANSFER">Chuyển khoản ngân hàng (Vietcombank)</option>
                  <option value="CASH">Tiền mặt tại kho / lúc giao</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mã tham chiếu / Ủy nhiệm chi</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
                >
                  Lưu thanh toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
