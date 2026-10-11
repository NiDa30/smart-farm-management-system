import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Star,
  ExternalLink,
  ChevronRight,
  Clock,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Supplier, SupplierProduct } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const SupplierList: React.FC = () => {
  const { suppliers, addSupplier, navigate, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'PRODUCTS' | 'DEBT'>('OVERVIEW');

  // Add Supplier Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formTerms, setFormTerms] = useState('Gối đầu 30 ngày');

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplyCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Vui lòng nhập tên nhà cung cấp', 'warning');
      return;
    }

    const newCode = `SUP-00${suppliers.length + 1}`;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      code: newCode,
      name: formName,
      contactPerson: formContact,
      phone: formPhone,
      email: formEmail,
      address: formAddress,
      supplyCategory: formCategory || 'Vật tư nông nghiệp',
      rating: 5.0,
      status: 'ACTIVE',
      totalOrders: 0,
      totalSpend: 0,
      currentDebt: 0,
      paymentTerms: formTerms,
      products: [],
    };

    addSupplier(newSup);
    setIsCreateOpen(false);
    setSelectedSupplier(newSup);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Nhà Cung Cấp Vật Tư & Thiết Bị
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {suppliers.length} Đối tác
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý danh bạ đối tác cung ứng, theo dõi bảng giá chào hàng, thời gian giao hàng (Lead time) và công nợ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm nhà cung cấp</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên nhà cung cấp, mã (SUP-001...), mặt hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <span className="text-slate-400 font-mono text-xs pl-2">
          {filteredSuppliers.length} đối tác
        </span>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Mã</th>
                <th className="py-3 px-3">Nhà cung cấp</th>
                <th className="py-3 px-3">Người liên hệ & Điện thoại</th>
                <th className="py-3 px-3">Nhóm cung cấp</th>
                <th className="py-3 px-3 text-center">Số đơn mua</th>
                <th className="py-3 px-3">Công nợ hiện tại</th>
                <th className="py-3 px-3">Đánh giá</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => {
                    setSelectedSupplier(s);
                    setDetailTab('OVERVIEW');
                  }}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                    {s.code}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                      {s.address}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    <div className="font-medium text-slate-900">{s.contactPerson}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{s.phone}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">
                    {s.supplyCategory}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-center text-slate-800">
                    {s.totalOrders}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">
                    {s.currentDebt > 0 ? (
                      <span className="text-amber-700">
                        {s.currentDebt.toLocaleString('vi-VN')} đ
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-normal">0 đ (Hết nợ)</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{s.rating}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Đang hợp tác
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedSupplier(s);
                          setDetailTab('OVERVIEW');
                        }}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded text-[11px]"
                      >
                        Chi tiết
                      </button>
                      <button
                        onClick={() => navigate('/resources/purchases/new')}
                        title="Tạo đơn mua hàng từ NCC này"
                        className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen 05: Supplier Detail Drawer */}
      <RightDrawer
        isOpen={!!selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || 'Chi tiết nhà cung cấp'}
        subtitle={`Mã: ${selectedSupplier?.code} • Đánh giá: ${selectedSupplier?.rating} ★`}
        width="w-full sm:w-[580px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setSelectedSupplier(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                setSelectedSupplier(null);
                navigate('/resources/purchases/new');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Tạo đơn mua mới
            </button>
          </div>
        }
      >
        {selectedSupplier && (
          <div className="space-y-4 text-xs">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-medium">
              {[
                { key: 'OVERVIEW', label: 'Tổng quan' },
                { key: 'PRODUCTS', label: `Sản phẩm cung ứng (${selectedSupplier.products.length})` },
                { key: 'DEBT', label: 'Công nợ & Điều khoản' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key as any)}
                  className={`pb-2 border-b-2 transition-colors ${
                    detailTab === tab.key
                      ? 'border-emerald-600 text-emerald-800 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {detailTab === 'OVERVIEW' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>Điện thoại: </span>
                    <strong className="font-mono text-slate-900">{selectedSupplier.phone}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Email: </span>
                    <span className="font-mono text-slate-900">{selectedSupplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Địa chỉ: </span>
                    <span className="text-slate-900">{selectedSupplier.address}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tổng đơn đã đặt:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedSupplier.totalOrders} đơn hàng
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tổng chi tiêu tích lũy:</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {selectedSupplier.totalSpend.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Products */}
            {detailTab === 'PRODUCTS' && (
              <div className="space-y-3">
                {selectedSupplier.products.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    Chưa cập nhật danh mục báo giá chi tiết cho đối tác này.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Vật tư</th>
                          <th className="py-2.5 px-3">Giá hiện tại</th>
                          <th className="py-2.5 px-3">Đơn vị</th>
                          <th className="py-2.5 px-3">MOQ</th>
                          <th className="py-2.5 px-3">Giao hàng</th>
                          <th className="py-2.5 px-3">Cập nhật</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {selectedSupplier.products.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                              {p.materialName}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-emerald-800">
                              {p.price.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{p.unit}</td>
                            <td className="py-2.5 px-3 text-slate-700">{p.moq} {p.unit}</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">{p.leadTimeDays} ngày</td>
                            <td className="py-2.5 px-3 text-slate-400">{p.updatedDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Debt */}
            {detailTab === 'DEBT' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-xs text-amber-800 font-medium">Công nợ hiện tại:</span>
                  <div className="text-xl font-bold font-mono text-amber-900">
                    {selectedSupplier.currentDebt.toLocaleString('vi-VN')} đ
                  </div>
                  <span className="text-[11px] text-amber-700 block">
                    Điều khoản: {selectedSupplier.paymentTerms}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </RightDrawer>

      {/* Add Supplier Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Thêm Nhà Cung Cấp mới</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên nhà cung cấp *:</label>
                <input
                  type="text"
                  required
                  placeholder="Công ty TNHH Phân bón..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Người đại diện:</label>
                  <input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *:</label>
                  <input
                    type="text"
                    required
                    placeholder="0918..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email:</label>
                <input
                  type="email"
                  placeholder="sales@..."
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Địa chỉ kho bãi:</label>
                <input
                  type="text"
                  placeholder="Khu công nghiệp..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nhóm hàng hóa cung cấp:</label>
                <input
                  type="text"
                  placeholder="Phân bón, thiết bị tưới..."
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Lưu nhà cung cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
