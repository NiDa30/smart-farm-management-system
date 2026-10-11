import React, { useState } from 'react';
import {
  DollarSign,
  Tag,
  Percent,
  History,
  Plus,
  Edit,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  X,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { PriceList, PriceRule } from '../../../types';

export const PricingManager: React.FC = () => {
  const {
    priceLists,
    priceRules,
    priceHistory,
    commercialProducts,
    updatePriceListItem,
    activeUser,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'PRICE_LISTS' | 'TIER_RULES' | 'HISTORY'>('PRICE_LISTS');
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>(priceLists[0]?.id || 'PL-RETAIL');

  // Edit item modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState('');
  const [editingProductName, setEditingProductName] = useState('');
  const [currentPrice, setCurrentPrice] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [changeReason, setChangeReason] = useState('');

  const selectedPriceList = priceLists.find((pl) => pl.id === selectedPriceListId) || priceLists[0];

  const handleOpenEditPrice = (productId: string, productName: string, price: number) => {
    setEditingProductId(productId);
    setEditingProductName(productName);
    setCurrentPrice(price);
    setNewPrice(price);
    setChangeReason('');
    setIsEditModalOpen(true);
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId || newPrice <= 0 || !changeReason.trim()) {
      alert('Vui lòng nhập giá mới và lý do thay đổi!');
      return;
    }

    updatePriceListItem(
      selectedPriceList.id,
      editingProductId,
      Number(newPrice),
      activeUser.name,
      changeReason
    );
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Bảng giá & Chính sách giá
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 09 & 10</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Bảng Giá Đa Phân Khúc & Chính Sách Chiết Khấu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hỗ trợ giá bán lẻ, giá đại lý, giá khách sỉ, giá số lượng lớn và lưu vết toàn bộ lịch sử thay đổi
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('PRICE_LISTS')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'PRICE_LISTS'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Danh mục Bảng giá ({priceLists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TIER_RULES')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'TIER_RULES'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Chính sách giá theo số lượng ({priceRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'HISTORY'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử thay đổi giá ({priceHistory.length})</span>
        </button>
      </div>

      {/* Tab 1: Bảng giá */}
      {activeTab === 'PRICE_LISTS' && (
        <div className="space-y-4">
          {/* Price List Selector Chips */}
          <div className="flex flex-wrap gap-2.5">
            {priceLists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => setSelectedPriceListId(pl.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  selectedPriceListId === pl.id
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{pl.name}</span>
                {pl.isDefault && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-emerald-800 text-emerald-100">
                    Mặc định
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Selected Price List Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{selectedPriceList.name}</h3>
                <div className="text-[11px] text-slate-500">
                  Hiệu lực từ ngày: <strong>{selectedPriceList.effectiveDate}</strong> • Mã:{' '}
                  <span className="font-mono">{selectedPriceList.code}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Mã SKU</th>
                    <th className="py-3 px-4 font-semibold">Tên sản phẩm</th>
                    <th className="py-3 px-4 font-semibold">Đơn vị</th>
                    <th className="py-3 px-4 font-semibold text-right">Giá bán áp dụng</th>
                    <th className="py-3 px-4 font-semibold text-right">Giá sàn tối thiểu</th>
                    <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPriceList.items.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                        {item.productSku}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{item.productName}</td>
                      <td className="py-3.5 px-4 text-slate-500">{item.unit}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-emerald-800 text-sm">
                          {item.priceVnd.toLocaleString('vi-VN')}đ
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        {item.minPriceVnd.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditPrice(item.productId, item.productName, item.priceVnd)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Điều chỉnh</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Chính sách giá theo số lượng (Section 21) */}
      {activeTab === 'TIER_RULES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Chính sách giá theo khối lượng (Tiered Pricing Rules)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động áp dụng giá theo số lượng đặt mua khi tạo Báo giá hoặc Đơn hàng
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                  <th className="py-3 px-4 font-semibold">Khung số lượng</th>
                  <th className="py-3 px-4 font-semibold text-right">Đơn giá ưu đãi</th>
                  <th className="py-3 px-4 font-semibold text-right">Tỷ lệ giảm</th>
                  <th className="py-3 px-4 font-semibold">Áp dụng riêng cho khách</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{rule.productName}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {rule.maxQuantity ? `${rule.minQuantity} – ${rule.maxQuantity} trái` : `≥ ${rule.minQuantity} trái`}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                      {rule.unitPriceVnd.toLocaleString('vi-VN')}đ/trái
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                      {rule.discountPercentage ? `-${rule.discountPercentage}%` : 'Chuẩn'}
                    </td>
                    <td className="py-3.5 px-4">
                      {rule.customerSpecificName ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-200">
                          {rule.customerSpecificName}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Tất cả khách hàng</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Lịch sử giá (Section 22: Price History) */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Nhật ký Lịch sử Thay đổi Giá (Audit Trail)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lưu vết đầy đủ: Ngày, Bảng giá, Giá cũ, Giá mới, Người thay đổi và Lý do — Không ghi đè mất lịch sử
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Ngày thay đổi</th>
                  <th className="py-3 px-4 font-semibold">Bảng giá</th>
                  <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                  <th className="py-3 px-4 font-semibold text-right">Giá cũ</th>
                  <th className="py-3 px-4 font-semibold text-right">Giá mới</th>
                  <th className="py-3 px-4 font-semibold">Người điều chỉnh</th>
                  <th className="py-3 px-4 font-semibold">Lý do điều chỉnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 text-slate-500 font-mono">{item.date}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{item.priceListName}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{item.productName}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 line-through">
                      {item.oldPriceVnd.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-800">
                      {item.newPriceVnd.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{item.changedBy}</td>
                    <td className="py-3.5 px-4 text-slate-700 italic max-w-xs">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Điều chỉnh giá */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">
                Điều chỉnh giá: {editingProductName}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Bảng giá áp dụng</label>
                <input
                  type="text"
                  disabled
                  value={selectedPriceList.name}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded font-medium text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Giá hiện tại</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentPrice.toLocaleString('vi-VN')}đ`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded font-medium text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Giá mới (VNĐ) *</label>
                  <input
                    type="number"
                    step={500}
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-emerald-800 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Lý do thay đổi giá (Bắt buộc để lưu audit log) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Ví dụ: Chi phí thu hoạch tăng, chính sách ưu đãi mùa thu..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold"
                >
                  Xác nhận & Lưu lịch sử
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
