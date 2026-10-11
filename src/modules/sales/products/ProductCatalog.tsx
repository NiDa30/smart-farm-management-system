import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Filter,
  DollarSign,
  Tag,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  Edit,
  CheckCircle2,
  Calendar,
  Eye,
  Info,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { CommercialProduct } from '../../../types';

export const ProductCatalog: React.FC = () => {
  const { commercialProducts, updateCommercialProduct, finishedGoodsLots, navigate } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [selectedProduct, setSelectedProduct] = useState<CommercialProduct | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'LOTS' | 'PRICING'>('OVERVIEW');

  // Modal edit / add
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPrice, setEditPrice] = useState(0);
  const [editMinPrice, setEditMinPrice] = useState(0);
  const [editMinThreshold, setEditMinThreshold] = useState(0);

  const filteredProducts = commercialProducts.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cropSource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrade = gradeFilter === 'ALL' || p.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const handleOpenEdit = (p: CommercialProduct) => {
    setSelectedProduct(p);
    setEditPrice(p.standardPriceVnd);
    setEditMinPrice(p.minPriceVnd);
    setEditMinThreshold(p.minThreshold);
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    updateCommercialProduct(selectedProduct.id, {
      standardPriceVnd: Number(editPrice),
      minPriceVnd: Number(editMinPrice),
      minThreshold: Number(editMinThreshold),
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Sản phẩm thương mại
            </span>
            <span className="text-xs text-slate-500 font-mono">Finished Goods SKU</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Danh mục Sản phẩm Thương mại
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân định rõ ràng giữa Cây trồng (Crop/Variety) và Sản phẩm thương mại được đóng gói xuất kho
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sales/classification')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Boxes className="w-4 h-4" />
            <span>Phân loại từ Thu hoạch</span>
          </button>
          <button
            onClick={() => navigate('/sales/inventory')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Kho thành phẩm</span>
          </button>
        </div>
      </div>

      {/* Explanatory concept banner (Section 14) */}
      <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Quy chuẩn dữ liệu nông nghiệp:</span> Một giống cây trồng (Ví dụ:{' '}
          <em>Dừa xiêm xanh Bến Tre</em>) sau khi thu hoạch và phân loại chất lượng sẽ tạo ra nhiều mã sản phẩm thương
          mại khác nhau: <strong>Dừa loại A (Trái 1.2-1.5kg)</strong>, <strong>Dừa loại B (Trái 0.9-1.1kg)</strong>, và{' '}
          <strong>Dừa nguyên buồng tuyển chọn</strong>. Giá bán và tồn kho khả dụng được quản lý độc lập theo từng SKU thương mại.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên / mã SKU / nguồn cây trồng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả phân hạng (Grade)</option>
            <option value="A">Hạng A (Tiêu chuẩn cao)</option>
            <option value="B">Hạng B (Tiêu chuẩn vừa)</option>
            <option value="PREMIUM">Hạng Premium (Đặc biệt)</option>
          </select>
        </div>
      </div>

      {/* Product Cards Grid (Screen 05 Table/Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((prod) => {
          const percentReserved = Math.round((prod.reserved / (prod.onHand || 1)) * 100);

          return (
            <div
              key={prod.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    {prod.sku}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    Grade {prod.grade}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm hover:text-emerald-700">
                    {prod.name}
                  </h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Nguồn cây: <strong className="text-slate-700">{prod.cropSource}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {prod.specifications}
                </p>

                {/* Price block */}
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400">Giá chuẩn:</span>
                    <div className="text-base font-bold text-emerald-700">
                      {prod.standardPriceVnd.toLocaleString('vi-VN')}đ
                      <span className="text-[11px] font-normal text-slate-500">/{prod.salesUnit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Giá sàn:</span>
                    <div className="text-xs font-semibold text-slate-600">
                      {prod.minPriceVnd.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                </div>

                {/* Inventory block with Formula */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Có thể bán (Available):</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {prod.available.toLocaleString('vi-VN')} {prod.salesUnit}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-600"
                      style={{ width: `${100 - percentReserved}%` }}
                      title={`Khả dụng: ${prod.available}`}
                    />
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${percentReserved}%` }}
                      title={`Đã giữ: ${prod.reserved}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Tổng tồn: {prod.onHand.toLocaleString('vi-VN')}</span>
                    <span>Đã giữ (Reserved): {prod.reserved.toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Action footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setSelectedProduct(prod);
                    setDetailTab('OVERVIEW');
                  }}
                  className="px-2.5 py-1 text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem chi tiết</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(prod)}
                  className="px-3 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded font-semibold transition-colors flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Cập nhật</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Detail Modal (Screen 06) */}
      {selectedProduct && !isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {selectedProduct.sku}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    Hạng {selectedProduct.grade}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 mt-1">
                  {selectedProduct.name}
                </h2>
                <div className="text-xs text-slate-500">
                  Nguồn gốc cây trồng: <strong>{selectedProduct.cropSource}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setDetailTab('OVERVIEW')}
                className={`pb-2 border-b-2 ${
                  detailTab === 'OVERVIEW' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
                }`}
              >
                Tổng quan & Tiêu chuẩn
              </button>
              <button
                onClick={() => setDetailTab('LOTS')}
                className={`pb-2 border-b-2 ${
                  detailTab === 'LOTS' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
                }`}
              >
                Lô thành phẩm ({finishedGoodsLots.filter((l) => l.productId === selectedProduct.id).length})
              </button>
            </div>

            {/* Tab content */}
            {detailTab === 'OVERVIEW' ? (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">Quy cách & Đặc tính chất lượng</div>
                  <p className="text-slate-600">{selectedProduct.specifications}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-slate-600">
                    <div>Đơn vị kinh doanh: <strong>{selectedProduct.salesUnit}</strong></div>
                    <div>Ngưỡng cảnh báo tồn: <strong>{selectedProduct.minThreshold} {selectedProduct.salesUnit}</strong></div>
                    <div>Giá niêm yết: <strong className="text-emerald-700">{selectedProduct.standardPriceVnd.toLocaleString('vi-VN')}đ</strong></div>
                    <div>Giá sàn tối thiểu: <strong>{selectedProduct.minPriceVnd.toLocaleString('vi-VN')}đ</strong></div>
                  </div>
                </div>

                <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200">
                  <div className="font-bold text-emerald-900 mb-1">Cân đối tồn kho thành phẩm:</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded border border-emerald-100">
                      <div className="text-[10px] text-slate-500">Vật lý (On Hand)</div>
                      <div className="font-bold text-slate-800">{selectedProduct.onHand.toLocaleString('vi-VN')}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-amber-100">
                      <div className="text-[10px] text-slate-500">Đã giữ (Reserved)</div>
                      <div className="font-bold text-amber-700">{selectedProduct.reserved.toLocaleString('vi-VN')}</div>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-300">
                      <div className="text-[10px] text-emerald-700 font-bold">Khả dụng (Available)</div>
                      <div className="font-bold text-emerald-800 text-sm">{selectedProduct.available.toLocaleString('vi-VN')}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs max-h-72 overflow-y-auto">
                {finishedGoodsLots
                  .filter((l) => l.productId === selectedProduct.id)
                  .map((lot) => (
                    <div
                      key={lot.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-emerald-800">{lot.lotCode}</div>
                        <div className="text-[11px] text-slate-500">
                          Thu hoạch: {lot.harvestDate} • {lot.farmArea}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Vị trí: {lot.warehouseLocation}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          Tồn: {lot.onHandQty} | Khả dụng: <span className="text-emerald-700">{lot.availableQty}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProduct(null);
                            navigate('/sales/traceability');
                          }}
                          className="text-[11px] text-emerald-700 hover:underline mt-0.5"
                        >
                          Truy xuất nguồn gốc →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa giá & ngưỡng tồn */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">
                Cập nhật thông số: {selectedProduct.name}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Giá bán chuẩn (VNĐ / {selectedProduct.salesUnit}) *
                </label>
                <input
                  type="number"
                  step={500}
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Giá bán sàn tối thiểu (VNĐ / {selectedProduct.salesUnit})
                </label>
                <input
                  type="number"
                  step={500}
                  value={editMinPrice}
                  onChange={(e) => setEditMinPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-700"
                />
                <span className="text-[10px] text-slate-400">
                  Nhân viên kinh doanh không được phép báo giá dưới ngưỡng này.
                </span>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Ngưỡng cảnh báo sắp hết hàng ({selectedProduct.salesUnit})
                </label>
                <input
                  type="number"
                  value={editMinThreshold}
                  onChange={(e) => setEditMinThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
