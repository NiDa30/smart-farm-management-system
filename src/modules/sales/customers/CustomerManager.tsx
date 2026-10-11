import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Eye,
  Edit,
  ShoppingBag,
  TrendingUp,
  MessageSquare,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Customer, CustomerType, CRMActivity, CRMActivityType } from '../../../types';

export const CustomerManager: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    crmActivities,
    addCRMActivity,
    salesOrders,
    quotations,
    salesPayments,
    customerClaims,
    priceLists,
    navigate,
  } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priceGroupFilter, setPriceGroupFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'HAS_DEBT' | 'NO_DEBT' | 'OVER_LIMIT'>('ALL');

  // Detail Modal / Drawer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'ORDERS' | 'QUOTATIONS' | 'PAYMENTS' | 'CRM' | 'CLAIMS'>('OVERVIEW');

  // Create / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Quick CRM note modal
  const [isCRMModalOpen, setIsCRMModalOpen] = useState(false);
  const [crmType, setCrmType] = useState<CRMActivityType>('CALL');
  const [crmTitle, setCrmTitle] = useState('');
  const [crmNotes, setCrmNotes] = useState('');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CustomerType>('RESTAURANT');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTaxCode, setFormTaxCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState('');
  const [formPriceGroupId, setFormPriceGroupId] = useState('PL-RESTAURANT');
  const [formCreditLimit, setFormCreditLimit] = useState(50000000);
  const [formPaymentTerms, setFormPaymentTerms] = useState(15);
  const [formSalesRep, setFormSalesRep] = useState('Nguyễn Văn Hùng');
  const [formNotes, setFormNotes] = useState('');

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchSearch =
        cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.phone.includes(searchTerm) ||
        (cust.email && cust.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = typeFilter === 'ALL' || cust.customerType === typeFilter;
      const matchPriceGroup = priceGroupFilter === 'ALL' || cust.priceGroupId === priceGroupFilter;
      const matchStatus = statusFilter === 'ALL' || cust.status === statusFilter;

      let matchDebt = true;
      if (debtFilter === 'HAS_DEBT') matchDebt = cust.currentDebtVnd > 0;
      if (debtFilter === 'NO_DEBT') matchDebt = cust.currentDebtVnd === 0;
      if (debtFilter === 'OVER_LIMIT') matchDebt = cust.currentDebtVnd > cust.creditLimitVnd;

      return matchSearch && matchType && matchPriceGroup && matchStatus && matchDebt;
    });
  }, [customers, searchTerm, typeFilter, priceGroupFilter, statusFilter, debtFilter]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormType('RESTAURANT');
    setFormPhone('');
    setFormEmail('');
    setFormTaxCode('');
    setFormAddress('');
    setFormDeliveryAddress('');
    setFormPriceGroupId('PL-RESTAURANT');
    setFormCreditLimit(50000000);
    setFormPaymentTerms(15);
    setFormSalesRep('Nguyễn Văn Hùng');
    setFormNotes('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormType(cust.customerType);
    setFormPhone(cust.phone);
    setFormEmail(cust.email || '');
    setFormTaxCode(cust.taxCode || '');
    setFormAddress(cust.address);
    setFormDeliveryAddress(cust.deliveryAddress);
    setFormPriceGroupId(cust.priceGroupId);
    setFormCreditLimit(cust.creditLimitVnd);
    setFormPaymentTerms(cust.paymentTermsDays);
    setFormSalesRep(cust.assignedSalesRep);
    setFormNotes(cust.notes || '');
    setIsFormOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert('Vui lòng nhập Tên khách hàng và Số điện thoại!');
      return;
    }

    const typeLabels: Record<CustomerType, string> = {
      RETAIL: 'Khách lẻ',
      WHOLESALE: 'Khách sỉ',
      DEALER: 'Đại lý',
      DISTRIBUTOR: 'Nhà phân phối',
      RESTAURANT: 'Nhà hàng',
      HOTEL: 'Khách sạn',
      SUPERMARKET: 'Siêu thị',
      ENTERPRISE: 'Doanh nghiệp',
    };

    const selectedPL = priceLists.find((pl) => pl.id === formPriceGroupId);

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: formName,
        customerType: formType,
        typeLabel: typeLabels[formType],
        phone: formPhone,
        email: formEmail,
        taxCode: formTaxCode,
        address: formAddress,
        deliveryAddress: formDeliveryAddress || formAddress,
        priceGroupId: formPriceGroupId,
        priceGroupName: selectedPL?.name || 'Bảng giá chuẩn',
        creditLimitVnd: Number(formCreditLimit),
        paymentTermsDays: Number(formPaymentTerms),
        assignedSalesRep: formSalesRep,
        notes: formNotes,
      });
    } else {
      addCustomer({
        name: formName,
        customerType: formType,
        typeLabel: typeLabels[formType],
        phone: formPhone,
        email: formEmail,
        taxCode: formTaxCode,
        address: formAddress,
        deliveryAddress: formDeliveryAddress || formAddress,
        priceGroupId: formPriceGroupId,
        priceGroupName: selectedPL?.name || 'Bảng giá chuẩn',
        creditLimitVnd: Number(formCreditLimit),
        paymentTermsDays: Number(formPaymentTerms),
        lastPurchaseDate: new Date().toISOString().split('T')[0],
        purchaseFrequencyDays: 7,
        status: 'ACTIVE',
        assignedSalesRep: formSalesRep,
        notes: formNotes,
      });
    }

    setIsFormOpen(false);
  };

  const handleSaveCRM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !crmTitle.trim()) return;

    addCRMActivity({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      type: crmType,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      title: crmTitle,
      notes: crmNotes,
      performedBy: 'Nguyễn Văn Hùng',
      status: 'COMPLETED',
    });

    setCrmTitle('');
    setCrmNotes('');
    setIsCRMModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Khách hàng & CRM
            </span>
            <span className="text-xs text-slate-500 font-mono">B2B & B2C Accounts</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Danh sách Khách hàng & Quản lý Giao dịch
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin đối tác, hạn mức công nợ, lịch sử mua hàng và hoạt động CRM
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm khách hàng</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên / mã khách / số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả loại khách</option>
              <option value="RETAIL">Khách lẻ</option>
              <option value="WHOLESALE">Khách sỉ</option>
              <option value="DEALER">Đại lý</option>
              <option value="RESTAURANT">Nhà hàng</option>
              <option value="HOTEL">Khách sạn</option>
              <option value="SUPERMARKET">Siêu thị</option>
              <option value="ENTERPRISE">Doanh nghiệp</option>
            </select>
          </div>

          {/* Price Group Filter */}
          <div>
            <select
              value={priceGroupFilter}
              onChange={(e) => setPriceGroupFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả nhóm giá</option>
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Debt Filter */}
          <div>
            <select
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">Tất cả công nợ</option>
              <option value="HAS_DEBT">Đang có nợ (&gt;0đ)</option>
              <option value="OVER_LIMIT">Vượt hạn mức</option>
              <option value="NO_DEBT">Không nợ (0đ)</option>
            </select>
          </div>
        </div>

        {/* Quick stat bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>
            Hiển thị <strong>{filteredCustomers.length}</strong> / {customers.length} khách hàng
          </div>
          <div className="flex items-center gap-4">
            <span>
              Tổng nợ lọc được:{' '}
              <strong className="text-amber-700">
                {filteredCustomers.reduce((acc, c) => acc + c.currentDebtVnd, 0).toLocaleString('vi-VN')}đ
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Mã khách</th>
                <th className="py-3 px-4 font-semibold">Tên khách hàng</th>
                <th className="py-3 px-4 font-semibold">Loại</th>
                <th className="py-3 px-4 font-semibold">Điện thoại</th>
                <th className="py-3 px-4 font-semibold">Nhóm giá</th>
                <th className="py-3 px-4 font-semibold text-center">Đơn hàng</th>
                <th className="py-3 px-4 font-semibold text-right">Doanh thu</th>
                <th className="py-3 px-4 font-semibold text-right">Công nợ</th>
                <th className="py-3 px-4 font-semibold">Lần mua gần nhất</th>
                <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Không tìm thấy khách hàng phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isOverLimit = cust.currentDebtVnd > cust.creditLimitVnd;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setDetailTab('OVERVIEW');
                      }}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {cust.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 hover:text-emerald-700">
                          {cust.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {cust.deliveryAddress}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {cust.typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {cust.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {cust.priceGroupName}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {cust.totalOrdersCount}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {cust.totalRevenueVnd.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold ${
                            isOverLimit
                              ? 'text-red-600 underline'
                              : cust.currentDebtVnd > 0
                              ? 'text-amber-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {cust.currentDebtVnd.toLocaleString('vi-VN')}đ
                        </span>
                        {isOverLimit && (
                          <div className="text-[9px] text-red-500 font-semibold">Vượt hạn mức!</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {cust.lastPurchaseDate}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            cust.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cust.status === 'BLOCKED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          ● {cust.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setDetailTab('OVERVIEW');
                          }}
                          className="p-1 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          className="p-1 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal (Screens 03 & 26) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                    {selectedCustomer.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      selectedCustomer.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    ● {selectedCustomer.status === 'ACTIVE' ? 'Đang hoạt động' : selectedCustomer.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mt-1">
                  {selectedCustomer.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedCustomer.typeLabel} • Phụ trách: {selectedCustomer.assignedSalesRep}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigate('/sales/orders');
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tạo đơn hàng</span>
                </button>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-white border-b border-slate-200 text-center">
              <div className="p-2.5 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-500 font-medium">Tổng doanh thu</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedCustomer.totalRevenueVnd.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-500 font-medium">Tổng đơn hàng</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedCustomer.totalOrdersCount} đơn
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50">
                <div className="text-[10px] text-slate-500 font-medium">Đơn trung bình</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedCustomer.averageOrderVnd.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200">
                <div className="text-[10px] text-amber-800 font-medium">Công nợ hiện tại</div>
                <div className="text-sm font-bold text-amber-700 mt-0.5">
                  {selectedCustomer.currentDebtVnd.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            {/* CRM Slow-Purchase Alert Banner if applicable (Section 55) */}
            <div className="mx-4 mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-amber-900">
                  Cảnh báo CRM — Tần suất mua hàng:
                </span>{' '}
                <span className="text-amber-800">
                  Lần mua gần nhất cách đây <strong>3 ngày</strong>. Tần suất trung bình:{' '}
                  <strong>{selectedCustomer.purchaseFrequencyDays} ngày/lần</strong>.
                </span>
              </div>
              <button
                onClick={() => setIsCRMModalOpen(true)}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold shrink-0"
              >
                + Ghi nhận chăm sóc
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center gap-1 px-4 border-b border-slate-200 mt-3 overflow-x-auto text-xs font-semibold">
              {[
                { id: 'OVERVIEW', label: 'Tổng quan' },
                { id: 'ORDERS', label: `Đơn hàng (${salesOrders.filter((o) => o.customerId === selectedCustomer.id).length})` },
                { id: 'QUOTATIONS', label: `Báo giá (${quotations.filter((q) => q.customerId === selectedCustomer.id).length})` },
                { id: 'PAYMENTS', label: 'Thanh toán & Nợ' },
                { id: 'CRM', label: `CRM Activity (${crmActivities.filter((a) => a.customerId === selectedCustomer.id).length})` },
                { id: 'CLAIMS', label: `Khiếu nại (${customerClaims.filter((c) => c.customerId === selectedCustomer.id).length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDetailTab(tab.id as any)}
                  className={`px-3 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
                    detailTab === tab.id
                      ? 'border-emerald-600 text-emerald-700 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Tab 1: Tổng quan */}
              {detailTab === 'OVERVIEW' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <h3 className="font-bold text-slate-800 text-sm">Thông tin liên hệ</h3>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        Điện thoại: <strong>{selectedCustomer.phone}</strong>
                      </div>
                      <div>
                        Email: <strong>{selectedCustomer.email || '—'}</strong>
                      </div>
                      <div>
                        Mã số thuế: <strong>{selectedCustomer.taxCode || '—'}</strong>
                      </div>
                      <div>
                        Nhóm giá áp dụng: <strong>{selectedCustomer.priceGroupName}</strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-slate-500">Địa chỉ xuất hóa đơn:</div>
                      <div className="font-medium text-slate-800">{selectedCustomer.address}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Địa chỉ giao hàng thực tế:</div>
                      <div className="font-medium text-slate-800">{selectedCustomer.deliveryAddress}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <h3 className="font-bold text-slate-800 text-sm">Chính sách tín dụng & Thanh toán</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <div className="text-[10px] text-slate-500">Hạn mức công nợ</div>
                        <div className="font-bold text-emerald-800 text-xs">
                          {selectedCustomer.creditLimitVnd.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <div className="text-[10px] text-slate-500">Điều khoản thanh toán</div>
                        <div className="font-bold text-slate-800 text-xs">
                          {selectedCustomer.paymentTermsDays} ngày kể từ giao
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200">
                        <div className="text-[10px] text-slate-500">Dư nợ hiện tại</div>
                        <div className="font-bold text-amber-700 text-xs">
                          {selectedCustomer.currentDebtVnd.toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedCustomer.notes && (
                    <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                      <strong>Ghi chú kinh doanh:</strong> {selectedCustomer.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Đơn hàng */}
              {detailTab === 'ORDERS' && (
                <div className="space-y-3">
                  {salesOrders
                    .filter((o) => o.customerId === selectedCustomer.id)
                    .map((order) => (
                      <div
                        key={order.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-800 font-mono">{order.code}</span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700">
                              {order.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Đặt: {order.orderDate} • Giao: {order.deliveryDate}
                          </div>
                          <div className="text-slate-700 text-[11px] mt-0.5">
                            {order.items.map((i) => `${i.productName}: ${i.quantityOrdered} ${i.unit}`).join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-800">
                            {order.totalAmountVnd.toLocaleString('vi-VN')}đ
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Đã thanh toán: {order.paidAmountVnd.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 3: Báo giá */}
              {detailTab === 'QUOTATIONS' && (
                <div className="space-y-3">
                  {quotations
                    .filter((q) => q.customerId === selectedCustomer.id)
                    .map((quote) => (
                      <div
                        key={quote.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-800 font-mono">{quote.code}</span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {quote.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Ngày báo: {quote.date} • Hiệu lực đến: {quote.validUntil}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-800">
                            {quote.totalAmountVnd.toLocaleString('vi-VN')}đ
                          </div>
                          <span className="text-[10px] text-slate-400">{quote.items.length} mặt hàng</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 4: Thanh toán */}
              {detailTab === 'PAYMENTS' && (
                <div className="space-y-3">
                  {salesPayments
                    .filter((p) => p.customerId === selectedCustomer.id)
                    .map((pay) => (
                      <div
                        key={pay.id}
                        className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-emerald-800">{pay.code}</div>
                          <div className="text-[11px] text-slate-500">
                            {pay.paymentDate} • {pay.paymentMethod}
                          </div>
                          <div className="text-[10px] text-slate-400">Ref: {pay.transactionReference}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-700">
                            +{pay.amountVnd.toLocaleString('vi-VN')}đ
                          </div>
                          <div className="text-[10px] text-slate-400">{pay.recordedBy}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Tab 5: CRM Activity (Section 12 & 54) */}
              {detailTab === 'CRM' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsCRMModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Thêm hoạt động CRM</span>
                    </button>
                  </div>

                  <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                    {crmActivities
                      .filter((a) => a.customerId === selectedCustomer.id)
                      .map((act) => {
                        const typeIcons: Record<string, string> = {
                          CALL: '📞 Cuộc gọi',
                          MEETING: '🤝 Gặp mặt',
                          MESSAGE: '💬 Tin nhắn',
                          EMAIL: '✉️ Email',
                          FOLLOW_UP: '🔔 Follow-up',
                          NOTE: '📝 Ghi chú',
                        };

                        return (
                          <div key={act.id} className="relative pb-3 text-xs">
                            <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                            <div className="flex items-center justify-between text-slate-400 text-[10px]">
                              <span>{act.date}</span>
                              <span className="font-semibold text-slate-600">{typeIcons[act.type] || act.type}</span>
                            </div>
                            <div className="font-bold text-slate-800 text-xs mt-0.5">{act.title}</div>
                            <p className="text-slate-600 text-[11px] mt-0.5">{act.notes}</p>
                            <div className="text-[10px] text-slate-400 mt-1">Thực hiện: {act.performedBy}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Tab 6: Khiếu nại */}
              {detailTab === 'CLAIMS' && (
                <div className="space-y-3">
                  {customerClaims
                    .filter((c) => c.customerId === selectedCustomer.id)
                    .map((claim) => (
                      <div
                        key={claim.id}
                        className="p-3 bg-white rounded-lg border border-amber-200 bg-amber-50/30 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-900">{claim.code}</span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800">
                            {claim.status}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800">{claim.productName}</div>
                        <p className="text-slate-600 text-[11px]">{claim.issueDescription}</p>
                        <div className="p-2 bg-white rounded border border-amber-100 text-[10px] text-slate-500 font-mono">
                          Trace: Lô {claim.lotCode} • Thu hoạch {claim.harvestBatchId}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa khách hàng (Screen 04) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editingCustomer ? `Chỉnh sửa: ${editingCustomer.name}` : 'Tạo mới Khách hàng'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              {/* Section 1: Thông tin chung */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  1. Thông tin chung
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Tên khách hàng / Đơn vị *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Nhà hàng ABC, Chuỗi siêu thị..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Loại khách hàng *</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as CustomerType)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="RETAIL">Khách lẻ</option>
                      <option value="WHOLESALE">Khách sỉ</option>
                      <option value="DEALER">Đại lý</option>
                      <option value="DISTRIBUTOR">Nhà phân phối</option>
                      <option value="RESTAURANT">Nhà hàng</option>
                      <option value="HOTEL">Khách sạn</option>
                      <option value="SUPERMARKET">Siêu thị</option>
                      <option value="ENTERPRISE">Doanh nghiệp</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Số điện thoại *</label>
                    <input
                      type="text"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Email liên hệ</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="contact@nhahang.vn"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Mã số thuế</label>
                    <input
                      type="text"
                      value={formTaxCode}
                      onChange={(e) => setFormTaxCode(e.target.value)}
                      placeholder="0312983741"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nhân viên phụ trách</label>
                    <input
                      type="text"
                      value={formSalesRep}
                      onChange={(e) => setFormSalesRep(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Địa chỉ */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  2. Địa chỉ
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Địa chỉ chính (Hóa đơn)</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Địa chỉ giao hàng thực tế</label>
                    <input
                      type="text"
                      value={formDeliveryAddress}
                      onChange={(e) => setFormDeliveryAddress(e.target.value)}
                      placeholder="Kho giao hàng, cổng phụ Bếp trung tâm..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Chính sách thương mại */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  3. Chính sách thương mại & Công nợ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nhóm bảng giá</label>
                    <select
                      value={formPriceGroupId}
                      onChange={(e) => setFormPriceGroupId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      {priceLists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Hạn mức công nợ (VNĐ)
                    </label>
                    <input
                      type="number"
                      step={5000000}
                      value={formCreditLimit}
                      onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-semibold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Thời hạn thanh toán (Ngày)
                    </label>
                    <input
                      type="number"
                      value={formPaymentTerms}
                      onChange={(e) => setFormPaymentTerms(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú đối tác</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú sở thích, quy cách đóng gói đặc biệt..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-sm"
                >
                  Lưu khách hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick CRM Activity */}
      {isCRMModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Ghi nhận hoạt động CRM</h3>
              <button onClick={() => setIsCRMModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCRM} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Khách hàng</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedCustomer.name} (${selectedCustomer.code})`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Loại hoạt động</label>
                <select
                  value={crmType}
                  onChange={(e) => setCrmType(e.target.value as CRMActivityType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="CALL">Cuộc gọi điện thoại</option>
                  <option value="MEETING">Gặp mặt trực tiếp</option>
                  <option value="MESSAGE">Tin nhắn (Zalo / SMS)</option>
                  <option value="EMAIL">Email trao đổi</option>
                  <option value="FOLLOW_UP">Follow-up định kỳ</option>
                  <option value="NOTE">Ghi chú nội bộ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tiêu đề hoạt động *</label>
                <input
                  type="text"
                  required
                  value={crmTitle}
                  onChange={(e) => setCrmTitle(e.target.value)}
                  placeholder="Gọi xác nhận đơn hàng, gửi bảng giá mới..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={3}
                  value={crmNotes}
                  onChange={(e) => setCrmNotes(e.target.value)}
                  placeholder="Khách đồng ý đặt thêm 300 trái, yêu cầu giao sáng thứ 6..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCRMModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold"
                >
                  Lưu hoạt động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
