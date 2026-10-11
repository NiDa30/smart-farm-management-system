import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  TrendingDown,
  X,
  FileText,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const PaymentAndDebtManager: React.FC = () => {
  const {
    debtAging,
    salesPayments,
    customers,
    salesOrders,
    recordSalesPayment,
    navigate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'DEBT_AGING' | 'PAYMENT_HISTORY'>('DEBT_AGING');
  const [searchTerm, setSearchTerm] = useState('');

  // Payment Recording Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [payAmount, setPayAmount] = useState(5000000);
  const [payDate, setPayDate] = useState(new Date().toISOString().replace('T', ' ').slice(0, 16));
  const [payMethod, setPayMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'E_WALLET' | 'CREDIT_NOTE'>('BANK_TRANSFER');
  const [payRef, setPayRef] = useState(`VCB-${Date.now().toString().slice(-6)}`);
  const [payNotes, setPayNotes] = useState('');

  // Totals for KPIs (Section 43)
  const totalReceivables = debtAging.reduce((acc, curr) => acc + curr.totalDebtVnd, 0); // ~82M
  const overdueDebt = debtAging.reduce((acc, curr) => acc + curr.days1to30Vnd + curr.days31to60Vnd + curr.days61to90Vnd + curr.daysOver90Vnd, 0); // ~21M
  const dueNext7Days = 14000000; // 14M

  const filteredAging = debtAging.filter((row) =>
    row.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.customerCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = salesPayments.filter((p) =>
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.orderCode && p.orderCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const customerOrdersWithOutstanding = salesOrders.filter(
    (o) => o.customerId === selectedCustomerId && o.outstandingAmountVnd > 0
  );

  const handleOpenPaymentModal = (custId?: string) => {
    if (custId) {
      setSelectedCustomerId(custId);
      const custOrders = salesOrders.filter((o) => o.customerId === custId && o.outstandingAmountVnd > 0);
      if (custOrders.length > 0) {
        setSelectedOrderId(custOrders[0].id);
        setPayAmount(custOrders[0].outstandingAmountVnd);
      }
    }
    setIsModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust || payAmount <= 0) return;

    const ord = salesOrders.find((o) => o.id === selectedOrderId);

    recordSalesPayment({
      customerId: cust.id,
      customerName: cust.name,
      orderId: ord?.id,
      orderCode: ord?.code,
      amountVnd: Number(payAmount),
      paymentDate: payDate,
      paymentMethod: payMethod,
      transactionReference: payRef,
      recordedBy: 'Phạm Thị Thảo (Kế toán)',
      notes: payNotes,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Tài chính & Quản lý Thu nợ
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 20 & 21</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Thanh Toán & Quản Lý Tuổi Nợ (Debt Aging)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi phân tích công nợ theo thời gian, kiểm soát hạn mức tín dụng và lịch sử thanh toán đối soát
          </p>
        </div>

        <button
          onClick={() => handleOpenPaymentModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Ghi nhận thanh toán</span>
        </button>
      </div>

      {/* 3 KPI Cards defined in Section 43 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Tổng phải thu */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium">Tổng công nợ phải thu</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {totalReceivables.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tổng cộng toàn bộ 146 khách hàng B2B/B2C
          </div>
        </div>

        {/* KPI 2: Quá hạn */}
        <div className="bg-white p-5 rounded-xl border border-red-200 bg-red-50/20 shadow-sm">
          <div className="text-red-800 text-xs font-bold flex items-center justify-between">
            <span>Công nợ quá hạn (&gt;30 ngày)</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            {overdueDebt.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-[11px] text-red-600 mt-1">
            Cần phòng kinh doanh gửi văn bản đôn đốc thanh toán
          </div>
        </div>

        {/* KPI 3: Đến hạn trong 7 ngày */}
        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-amber-800 text-xs font-medium flex items-center justify-between">
            <span>Đến hạn trong 7 ngày tới</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {dueNext7Days.toLocaleString('vi-VN')}đ
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            Dự kiến thu hồi từ Nhà hàng ABC và Siêu thị GreenMart
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('DEBT_AGING')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'DEBT_AGING'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Bảng phân tích tuổi nợ (Aging Table)</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENT_HISTORY')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'PAYMENT_HISTORY'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Lịch sử phiếu thu & Thanh toán ({salesPayments.length})</span>
        </button>
      </div>

      {/* Tab 1: Bảng tuổi nợ (Section 43) */}
      {activeTab === 'DEBT_AGING' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-800 text-xs">
              Sổ Theo Dõi Công Nợ Khách Hàng (Customer Debt Aging)
            </h3>
            <div className="text-[11px] text-slate-500">
              Chu kỳ thanh toán tiêu chuẩn: 15 – 30 ngày
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Khách hàng</th>
                  <th className="py-3 px-4 font-semibold text-right">Hạn mức tín dụng</th>
                  <th className="py-3 px-4 font-semibold text-right">Tổng nợ</th>
                  <th className="py-3 px-4 font-semibold text-right">Trong hạn (Current)</th>
                  <th className="py-3 px-4 font-semibold text-right">1 – 30 ngày</th>
                  <th className="py-3 px-4 font-semibold text-right">31 – 60 ngày</th>
                  <th className="py-3 px-4 font-semibold text-right">&gt;60 ngày</th>
                  <th className="py-3 px-4 font-semibold text-center">Trạng thái hạn mức</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAging.map((row) => {
                  const percentCredit = Math.round((row.totalDebtVnd / row.creditLimitVnd) * 100);

                  return (
                    <tr key={row.customerId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{row.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {row.customerCode} • {row.customerType}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                        {row.creditLimitVnd.toLocaleString('vi-VN')}đ
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        {row.totalDebtVnd.toLocaleString('vi-VN')}đ
                      </td>

                      <td className="py-3.5 px-4 text-right text-emerald-700 font-semibold">
                        {row.currentPeriodVnd.toLocaleString('vi-VN')}đ
                      </td>

                      <td className="py-3.5 px-4 text-right text-amber-700 font-semibold">
                        {row.days1to30Vnd > 0 ? `${row.days1to30Vnd.toLocaleString('vi-VN')}đ` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right text-red-600 font-semibold">
                        {row.days31to60Vnd > 0 ? `${row.days31to60Vnd.toLocaleString('vi-VN')}đ` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right text-red-700 font-bold">
                        {row.days61to90Vnd + row.daysOver90Vnd > 0
                          ? `${(row.days61to90Vnd + row.daysOver90Vnd).toLocaleString('vi-VN')}đ`
                          : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            percentCredit > 90
                              ? 'bg-red-100 text-red-800'
                              : percentCredit > 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {percentCredit}% Hạn mức
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenPaymentModal(row.customerId)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px] transition-colors"
                        >
                          Thu tiền
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Lịch sử thanh toán */}
      {activeTab === 'PAYMENT_HISTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Mã phiếu thu</th>
                  <th className="py-3 px-4 font-semibold">Khách hàng</th>
                  <th className="py-3 px-4 font-semibold">Đơn hàng liên kết</th>
                  <th className="py-3 px-4 font-semibold">Ngày thanh toán</th>
                  <th className="py-3 px-4 font-semibold">Phương thức</th>
                  <th className="py-3 px-4 font-semibold">Mã tham chiếu ngân hàng</th>
                  <th className="py-3 px-4 font-semibold text-right">Số tiền</th>
                  <th className="py-3 px-4 font-semibold">Kế toán ghi nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                      {pay.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{pay.customerName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{pay.orderCode || 'Đối soát kỳ'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{pay.paymentDate}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {pay.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : pay.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{pay.transactionReference}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 text-sm">
                      +{pay.amountVnd.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{pay.recordedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận thanh toán (Screen 20 / 42) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Ghi Nhận Thanh Toán</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Khách hàng thanh toán *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const custOrders = salesOrders.filter((o) => o.customerId === e.target.value && o.outstandingAmountVnd > 0);
                    if (custOrders.length > 0) {
                      setSelectedOrderId(custOrders[0].id);
                      setPayAmount(custOrders[0].outstandingAmountVnd);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Nợ hiện tại: {c.currentDebtVnd.toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Cấn trừ vào đơn hàng</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => {
                    setSelectedOrderId(e.target.value);
                    const ord = salesOrders.find((o) => o.id === e.target.value);
                    if (ord) setPayAmount(ord.outstandingAmountVnd);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                >
                  <option value="">Thanh toán đối soát công nợ chung</option>
                  {customerOrdersWithOutstanding.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} — Còn nợ: {o.outstandingAmountVnd.toLocaleString('vi-VN')}đ (Tổng: {o.totalAmountVnd.toLocaleString('vi-VN')}đ)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Số tiền thực nhận (VNĐ) *</label>
                <input
                  type="number"
                  step={100000}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-emerald-800 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phương thức *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  >
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="CREDIT_NOTE">Cấn trừ trả hàng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Mã tham chiếu ngân hàng</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú phiếu thu</label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Thanh toán đợt 1 hợp đồng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold shadow-sm"
                >
                  Xác nhận phiếu thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
