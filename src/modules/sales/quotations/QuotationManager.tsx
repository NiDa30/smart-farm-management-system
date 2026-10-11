import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  X,
  Trash2,
  Copy,
  ChevronRight,
  Eye,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Quotation, QuotationItem, QuotationStatus } from '../../../types';

export const QuotationManager: React.FC = () => {
  const {
    quotations,
    createQuotation,
    updateQuotationStatus,
    convertQuotationToOrder,
    customers,
    commercialProducts,
    priceLists,
    priceRules,
    navigate,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Modal State (Screen 12)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [validUntilDays, setValidUntilDays] = useState(7);
  const [quoteItems, setQuoteItems] = useState<
    { productId: string; quantity: number; unitPrice: number; discount: number }[]
  >([{ productId: commercialProducts[0]?.id || 'PROD-COC-A', quantity: 500, unitPrice: 15000, discount: 0 }]);
  const [quoteNotes, setQuoteNotes] = useState('');

  // Selected Quotation for detail view
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const selectedQuote = useMemo(() => {
    return quotations.find((q) => q.id === selectedQuoteId) || null;
  }, [quotations, selectedQuoteId]);

  const filteredQuotes = useMemo(() => {
    return quotations.filter((q) => {
      const matchSearch =
        q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quotations, searchTerm, statusFilter]);

  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId);

  // Auto price calculation helper
  const getProductPriceForCustomer = (productId: string, qty: number, custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    const pl = priceLists.find((p) => p.id === cust?.priceGroupId) || priceLists[0];
    const plItem = pl?.items.find((i) => i.productId === productId);
    let basePrice = plItem?.priceVnd || 18000;

    // Check quantity tier rules
    const specificRule = priceRules.find(
      (r) => r.productId === productId && r.customerSpecificId === custId && qty >= r.minQuantity
    );
    if (specificRule) {
      return specificRule.unitPriceVnd;
    }

    const tierRule = priceRules.find(
      (r) => r.productId === productId && !r.customerSpecificId && qty >= r.minQuantity && (!r.maxQuantity || qty <= r.maxQuantity)
    );
    if (tierRule) {
      return tierRule.unitPriceVnd;
    }

    return basePrice;
  };

  const handleCustomerChange = (newCustId: string) => {
    setSelectedCustomerId(newCustId);
    setQuoteItems((prev) =>
      prev.map((item) => ({
        ...item,
        unitPrice: getProductPriceForCustomer(item.productId, item.quantity, newCustId),
      }))
    );
  };

  const handleAddItemRow = () => {
    const defaultProd = commercialProducts[0];
    const price = getProductPriceForCustomer(defaultProd.id, 100, selectedCustomerId);
    setQuoteItems((prev) => [
      ...prev,
      { productId: defaultProd.id, quantity: 100, unitPrice: price, discount: 0 },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setQuoteItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setQuoteItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };

      if (field === 'productId' || field === 'quantity') {
        item.unitPrice = getProductPriceForCustomer(
          field === 'productId' ? val : item.productId,
          field === 'quantity' ? Number(val) : item.quantity,
          selectedCustomerId
        );
      }

      updated[index] = item;
      return updated;
    });
  };

  // Subtotals
  const calculatedItems: QuotationItem[] = useMemo(() => {
    return quoteItems.map((item) => {
      const prod = commercialProducts.find((p) => p.id === item.productId);
      const sub = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount);
      return {
        productId: item.productId,
        productSku: prod?.sku || 'SKU-GEN',
        productName: prod?.name || 'Sản phẩm',
        unit: prod?.salesUnit || 'trái',
        quantity: Number(item.quantity),
        unitPriceVnd: Number(item.unitPrice),
        discountVnd: Number(item.discount),
        subtotalVnd: Math.max(0, sub),
        availableQty: prod?.available || 0,
      };
    });
  }, [quoteItems, commercialProducts]);

  const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.subtotalVnd, 0);
  const totalAmount = subtotal;

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerObj || calculatedItems.length === 0) return;

    const validUntilDate = new Date(Date.now() + validUntilDays * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0];

    createQuotation({
      customerId: selectedCustomerObj.id,
      customerCode: selectedCustomerObj.code,
      customerName: selectedCustomerObj.name,
      priceListId: selectedCustomerObj.priceGroupId,
      priceListName: selectedCustomerObj.priceGroupName,
      date: new Date().toISOString().split('T')[0],
      validUntil: validUntilDate,
      paymentTermsDays: selectedCustomerObj.paymentTermsDays,
      items: calculatedItems,
      subtotalVnd: subtotal,
      discountTotalVnd: 0,
      taxVnd: 0,
      totalAmountVnd: totalAmount,
      status: 'SENT',
      createdBy: 'Nguyễn Văn Hùng',
      notes: quoteNotes,
    });

    setIsCreateModalOpen(false);
  };

  const handleConvertOrder = (quoteId: string) => {
    const orderId = convertQuotationToOrder(quoteId);
    if (orderId) {
      setSelectedQuoteId(null);
      navigate('/sales/orders');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Bán hàng & Báo giá
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 11 & 12</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Quản lý Báo giá & Chuyển đổi Đơn hàng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động áp giá theo phân khúc khách hàng & chuyển thẳng thành Đơn hàng 1-click không nhập lại
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo báo giá mới</span>
        </button>
      </div>

      {/* Principle 3 Callout */}
      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
        <div>
          <span className="font-bold">Nguyên tắc 3: Một nghiệp vụ không nhập hai lần</span> — Khi khách hàng
          chấp nhận báo giá, bấm nút <strong>[Chuyển thành đơn hàng]</strong> để hệ thống tự động kế thừa toàn bộ
          sản phẩm, giá bán, số lượng và điều khoản thanh toán mà không phải tạo lại từ đầu.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã báo giá / Khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Nháp (DRAFT)</option>
            <option value="SENT">Đã gửi (SENT)</option>
            <option value="ACCEPTED">Khách duyệt (ACCEPTED)</option>
            <option value="CONVERTED">Đã tạo đơn (CONVERTED)</option>
            <option value="REJECTED">Từ chối (REJECTED)</option>
            <option value="EXPIRED">Hết hạn (EXPIRED)</option>
          </select>
        </div>
      </div>

      {/* Quotation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Mã báo giá</th>
                <th className="py-3 px-4 font-semibold">Khách hàng</th>
                <th className="py-3 px-4 font-semibold">Ngày báo</th>
                <th className="py-3 px-4 font-semibold">Hiệu lực đến</th>
                <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                <th className="py-3 px-4 font-semibold text-right">Tổng tiền</th>
                <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                <th className="py-3 px-4 font-semibold">Người tạo</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((quote) => {
                const statusStyles: Record<string, string> = {
                  DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
                  SENT: 'bg-blue-50 text-blue-700 border-blue-200',
                  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
                  CONVERTED: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
                  REJECTED: 'bg-red-50 text-red-700 border-red-200',
                  EXPIRED: 'bg-amber-50 text-amber-700 border-amber-200',
                };

                const statusLabels: Record<string, string> = {
                  DRAFT: 'Nháp',
                  SENT: 'Đã gửi',
                  ACCEPTED: 'Khách duyệt',
                  CONVERTED: 'Đã thành đơn',
                  REJECTED: 'Từ chối',
                  EXPIRED: 'Hết hạn',
                };

                return (
                  <tr
                    key={quote.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedQuoteId(quote.id)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                      {quote.code}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {quote.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{quote.date}</td>
                    <td className="py-3.5 px-4 text-slate-600">{quote.validUntil}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {quote.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                      {quote.totalAmountVnd.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          statusStyles[quote.status]
                        }`}
                      >
                        {statusLabels[quote.status] || quote.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{quote.createdBy}</td>
                    <td className="py-3.5 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      {quote.status === 'SENT' && (
                        <button
                          onClick={() => updateQuotationStatus(quote.id, 'ACCEPTED')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px]"
                        >
                          Khách duyệt
                        </button>
                      )}
                      {(quote.status === 'ACCEPTED' || quote.status === 'SENT') && (
                        <button
                          onClick={() => handleConvertOrder(quote.id)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] shadow-xs inline-flex items-center gap-1"
                          title="Chuyển thành Đơn hàng không cần nhập lại dữ liệu"
                        >
                          <span>→ Tạo đơn</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedQuoteId(quote.id)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px]"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer Chi tiết Báo giá (Screen 11 detail) */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {selectedQuote.code}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    {selectedQuote.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mt-1">
                  Báo giá: {selectedQuote.customerName}
                </h2>
                <div className="text-xs text-slate-500">
                  Áp dụng: {selectedQuote.priceListName} • Điều khoản: {selectedQuote.paymentTermsDays} ngày
                </div>
              </div>
              <button onClick={() => setSelectedQuoteId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Sản phẩm</th>
                    <th className="py-2.5 px-3 text-right">Số lượng</th>
                    <th className="py-2.5 px-3 text-right">Đơn giá</th>
                    <th className="py-2.5 px-3 text-right">Thành tiền</th>
                    <th className="py-2.5 px-3 text-center">Tồn khả dụng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedQuote.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">{i.productName}</div>
                        <div className="text-[10px] text-slate-400">{i.productSku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                        {i.quantity.toLocaleString('vi-VN')} {i.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold">
                        {i.unitPriceVnd.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {i.subtotalVnd.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-emerald-700 font-medium">
                          {i.availableQty.toLocaleString('vi-VN')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
              <div className="text-slate-500">
                Hiệu lực đến ngày: <strong>{selectedQuote.validUntil}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 mr-2">Tổng giá trị:</span>
                <span className="text-lg font-bold text-emerald-800">
                  {selectedQuote.totalAmountVnd.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {selectedQuote.notes && (
              <div className="p-3 bg-amber-50 rounded text-xs text-amber-900 border border-amber-200">
                <strong>Ghi chú:</strong> {selectedQuote.notes}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                onClick={() => setSelectedQuoteId(null)}
                className="px-4 py-2 border border-slate-200 rounded text-xs text-slate-600 font-semibold"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {selectedQuote.status !== 'CONVERTED' && (
                  <button
                    onClick={() => handleConvertOrder(selectedQuote.id)}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm flex items-center gap-1.5"
                  >
                    <span>Chuyển thành Đơn hàng ngay (Convert)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Báo giá mới (Screen 12) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Tạo Báo Giá Mới</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
              {/* Customer Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Khách hàng *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code} - {c.typeLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nhóm bảng giá tự động</label>
                  <input
                    type="text"
                    disabled
                    value={selectedCustomerObj?.priceGroupName || 'Giá đại lý'}
                    className="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded text-slate-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Thời hạn hiệu lực (Ngày)</label>
                  <input
                    type="number"
                    value={validUntilDays}
                    onChange={(e) => setValidUntilDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Danh mục mặt hàng báo giá</h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm dòng</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {quoteItems.map((item, idx) => {
                    const prod = commercialProducts.find((p) => p.id === item.productId);
                    const lineSub = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount);

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="col-span-5">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Sản phẩm</label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                          >
                            {commercialProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Tồn khả dụng: {p.available})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Số lượng</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-right font-semibold"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Đơn giá (VNĐ)</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-right text-emerald-800 font-bold"
                          />
                        </div>

                        <div className="col-span-2 text-right">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Thành tiền</label>
                          <span className="font-bold text-slate-800 text-xs">
                            {lineSub.toLocaleString('vi-VN')}đ
                          </span>
                        </div>

                        <div className="col-span-1 text-center">
                          {quoteItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quotation Summary */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-emerald-900 font-semibold">Tạm tính & Tổng cộng:</span>
                  <div className="text-[11px] text-slate-500">Đã áp dụng chính sách giá theo phân khúc & bậc số lượng</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-emerald-800">
                    {totalAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú điều khoản báo giá</label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Giao hàng tận nơi, thanh toán 15 ngày sau khi nhận hàng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold shadow-sm"
                >
                  Gửi báo giá cho khách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
