import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShoppingCart,
  ChevronRight,
  ExternalLink,
  Edit,
  History,
  Building,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Material, MaterialCategory, MaterialStatus } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const MaterialList: React.FC = () => {
  const { materials, materialBatches, addMaterial, updateMaterial, navigate, showToast } =
    useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  // Detail Drawer State
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [detailTab, setDetailTab] = useState<
    'OVERVIEW' | 'BATCHES' | 'HISTORY' | 'SUPPLIERS'
  >('OVERVIEW');

  // New Material Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formCode, setFormCode] = useState(`FERT-00${materials.length + 1}`);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('FERTILIZER');
  const [formUnit, setFormUnit] = useState('kg');
  const [formSpec, setFormSpec] = useState('Bao 25kg');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formMinStock, setFormMinStock] = useState<number>(50);
  const [formWarehouse, setFormWarehouse] = useState('wh-main');

  // Filtered List
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory =
        categoryFilter === 'ALL' || m.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const matchWarehouse =
        warehouseFilter === 'ALL' || m.warehouseId === warehouseFilter;
      return matchSearch && matchCategory && matchStatus && matchWarehouse;
    });
  }, [materials, searchTerm, categoryFilter, statusFilter, warehouseFilter]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Vui lòng nhập tên vật tư', 'warning');
      return;
    }

    const newMat: Material = {
      id: `mat-${Date.now()}`,
      code: formCode,
      name: formName,
      category: formCategory,
      categoryLabel:
        formCategory === 'FERTILIZER'
          ? 'Phân bón'
          : formCategory === 'PESTICIDE'
          ? 'Thuốc BVTV Sinh học'
          : formCategory === 'IRRIGATION_PART'
          ? 'Hệ thống tưới'
          : formCategory === 'PACKAGING'
          ? 'Bao bì đóng gói'
          : 'Dụng cụ / Khác',
      unit: formUnit,
      spec: formSpec,
      manufacturer: formManufacturer || 'Việt Nam',
      currentStock: 0,
      minStock: formMinStock,
      latestPrice: 0,
      latestExpiry: 'Chưa nhập kho',
      status: 'OUT_OF_STOCK',
      warehouseId: formWarehouse,
      warehouseName:
        formWarehouse === 'wh-main'
          ? 'Kho tổng An Phú'
          : formWarehouse === 'wh-north'
          ? 'Kho phân bón Khu Bắc'
          : 'Kho thiết bị kỹ thuật & IoT',
    };

    addMaterial(newMat);
    setIsCreateOpen(false);
    setSelectedMaterial(newMat);
  };

  // Batches for selected material
  const batchesForSelected = selectedMaterial
    ? materialBatches.filter((b) => b.materialId === selectedMaterial.id)
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Danh mục Vật tư Nông nghiệp
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {materials.length} Vật tư
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý quy cách, đơn vị tính, ngưỡng tồn tối thiểu và lịch sử giá nhập vật tư phục vụ sản xuất
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vật tư mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên vật tư, mã (FERT-001...), nhà sản xuất..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Nhóm */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Nhóm:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả nhóm</option>
              <option value="FERTILIZER">Phân bón</option>
              <option value="PESTICIDE">Thuốc BVTV Sinh học</option>
              <option value="IRRIGATION_PART">Hệ thống tưới</option>
              <option value="PACKAGING">Bao bì đóng gói</option>
              <option value="TOOL">Dụng cụ nông nghiệp</option>
            </select>
          </div>

          {/* Trạng thái */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NORMAL">Bình thường</option>
              <option value="LOW_STOCK">Sắp hết hàng</option>
              <option value="EXPIRING">Sắp hết hạn</option>
              <option value="OUT_OF_STOCK">Hết hàng</option>
            </select>
          </div>

          {/* Kho */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Kho:</span>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả kho</option>
              <option value="wh-main">Kho tổng An Phú</option>
              <option value="wh-north">Kho phân bón Khu Bắc</option>
              <option value="wh-iot">Kho thiết bị IoT</option>
            </select>
          </div>

          <span className="text-slate-400 font-mono text-xs pl-2">
            {filteredMaterials.length} vật tư
          </span>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Mã</th>
                <th className="py-3 px-3">Tên vật tư</th>
                <th className="py-3 px-3">Nhóm</th>
                <th className="py-3 px-3">Đơn vị & Quy cách</th>
                <th className="py-3 px-3">Tồn kho / Tối thiểu</th>
                <th className="py-3 px-3">Giá gần nhất</th>
                <th className="py-3 px-3">Hạn sử dụng</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.map((mat) => {
                const isLow = mat.currentStock <= mat.minStock;
                return (
                  <tr
                    key={mat.id}
                    onClick={() => {
                      setSelectedMaterial(mat);
                      setDetailTab('OVERVIEW');
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                      {mat.code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {mat.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{mat.manufacturer}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                        {mat.categoryLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">{mat.unit}</span>
                      <span className="text-[10px] text-slate-400 block">{mat.spec}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span
                          className={`font-bold ${
                            isLow ? 'text-amber-700' : 'text-emerald-800'
                          }`}
                        >
                          {mat.currentStock} {mat.unit}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          (min {mat.minStock})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {mat.warehouseName}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {mat.latestPrice > 0
                        ? `${mat.latestPrice.toLocaleString('vi-VN')} đ`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {mat.latestExpiry}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                          mat.status === 'LOW_STOCK'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : mat.status === 'EXPIRING'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : mat.status === 'OUT_OF_STOCK'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            mat.status === 'LOW_STOCK'
                              ? 'bg-amber-500'
                              : mat.status === 'EXPIRING'
                              ? 'bg-rose-500'
                              : mat.status === 'OUT_OF_STOCK'
                              ? 'bg-slate-400'
                              : 'bg-emerald-500'
                          }`}
                        ></span>
                        {mat.status === 'LOW_STOCK'
                          ? 'Sắp hết hàng'
                          : mat.status === 'EXPIRING'
                          ? 'Sắp hết hạn'
                          : mat.status === 'OUT_OF_STOCK'
                          ? 'Hết hàng'
                          : 'Bình thường'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMaterial(mat);
                            setDetailTab('OVERVIEW');
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded text-[11px]"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => navigate('/resources/purchases/new')}
                          title="Tạo đơn mua vật tư này"
                          className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen 03: Material Detail Right Drawer */}
      <RightDrawer
        isOpen={!!selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
        title={selectedMaterial?.name || 'Chi tiết vật tư'}
        subtitle={`Mã: ${selectedMaterial?.code} • ${selectedMaterial?.categoryLabel}`}
        width="w-full sm:w-[580px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setSelectedMaterial(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedMaterial(null);
                  navigate('/resources/inventory/issue');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                Xuất sử dụng
              </button>
              <button
                onClick={() => {
                  setSelectedMaterial(null);
                  navigate('/resources/purchases/new');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs flex items-center gap-1"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Tạo đơn mua
              </button>
            </div>
          </div>
        }
      >
        {selectedMaterial && (
          <div className="space-y-4 text-xs">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-medium">
              {[
                { key: 'OVERVIEW', label: 'Tổng quan' },
                { key: 'BATCHES', label: `Lô hàng (${batchesForSelected.length})` },
                { key: 'HISTORY', label: 'Lịch sử xuất nhập' },
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
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tồn kho hiện tại:</span>
                    <span className="font-bold text-slate-900 text-base font-mono">
                      {selectedMaterial.currentStock} {selectedMaterial.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Định mức tối thiểu:</span>
                    <span className="font-bold text-slate-900 text-base font-mono">
                      {selectedMaterial.minStock} {selectedMaterial.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Giá nhập gần nhất:</span>
                    <span className="font-bold text-emerald-700 text-sm font-mono">
                      {selectedMaterial.latestPrice.toLocaleString('vi-VN')} đ / {selectedMaterial.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kho lưu trữ mặc định:</span>
                    <span className="font-medium text-slate-800 text-xs">
                      {selectedMaterial.warehouseName}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Quy cách đóng gói:</span>
                    <span className="font-semibold text-slate-800">{selectedMaterial.spec}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Nhà sản xuất:</span>
                    <span className="font-semibold text-slate-800">{selectedMaterial.manufacturer}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Hạn sử dụng ghi nhận:</span>
                    <span className="font-mono text-slate-800">{selectedMaterial.latestExpiry}</span>
                  </div>
                  {selectedMaterial.description && (
                    <div className="pt-2">
                      <span className="text-slate-500 block mb-1">Mô tả công dụng:</span>
                      <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                        {selectedMaterial.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Batches */}
            {detailTab === 'BATCHES' && (
              <div className="space-y-3">
                {batchesForSelected.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    Chưa có lô hàng nào được ghi nhận cho vật tư này.
                  </div>
                ) : (
                  batchesForSelected.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {b.batchNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            b.status === 'EXPIRING'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {b.status === 'EXPIRING' ? 'Sắp hết hạn' : 'Đang sử dụng'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <div>
                          Tồn lô: <strong className="font-mono text-slate-900">{b.currentQty} {b.unit}</strong>
                        </div>
                        <div>
                          Vị trí: <strong className="text-slate-800">{b.locationRack}</strong>
                        </div>
                        <div>
                          Ngày nhập: <span className="font-mono">{b.importDate}</span>
                        </div>
                        <div>
                          Hạn dùng: <span className="font-mono text-rose-700 font-semibold">{b.expiryDate}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: History */}
            {detailTab === 'HISTORY' && (
              <div className="space-y-3">
                {batchesForSelected.flatMap((b) => b.transactions).length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    Chưa có lịch sử giao dịch kho cho vật tư này.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-200 pl-4 space-y-4 ml-1">
                    {batchesForSelected
                      .flatMap((b) => b.transactions)
                      .map((tx, idx) => (
                        <div key={idx} className="relative">
                          <span
                            className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              tx.type === 'IMPORT' ? 'bg-emerald-600' : 'bg-blue-600'
                            }`}
                          ></span>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>{tx.date}</span>
                            <span>{tx.actor}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-semibold mt-0.5">
                            <span className="text-slate-900">
                              {tx.type === 'IMPORT' ? 'Nhập kho từ đơn mua' : 'Xuất kho sử dụng'} ({tx.refCode})
                            </span>
                            <span
                              className={`font-mono ${
                                tx.qtyChange > 0 ? 'text-emerald-700' : 'text-blue-700'
                              }`}
                            >
                              {tx.qtyChange > 0 ? `+${tx.qtyChange}` : tx.qtyChange} {selectedMaterial.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </RightDrawer>

      {/* Add Material Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Thêm Vật tư Nông nghiệp mới</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã vật tư *:</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nhóm vật tư *:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MaterialCategory)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    <option value="FERTILIZER">Phân bón</option>
                    <option value="PESTICIDE">Thuốc BVTV Sinh học</option>
                    <option value="IRRIGATION_PART">Hệ thống tưới</option>
                    <option value="PACKAGING">Bao bì đóng gói</option>
                    <option value="TOOL">Dụng cụ / Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên vật tư *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phân hữu cơ khoáng Quế Lâm..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Đơn vị tính *:</label>
                  <input
                    type="text"
                    required
                    placeholder="kg, lít, bao, cái..."
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Quy cách đóng gói:</label>
                  <input
                    type="text"
                    placeholder="Bao 25kg, Can 5L..."
                    value={formSpec}
                    onChange={(e) => setFormSpec(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nhà sản xuất:</label>
                  <input
                    type="text"
                    placeholder="Tên công ty / viện..."
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mức tồn tối thiểu:</label>
                  <input
                    type="number"
                    min="0"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kho lưu trữ mặc định:</label>
                <select
                  value={formWarehouse}
                  onChange={(e) => setFormWarehouse(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                >
                  <option value="wh-main">Kho tổng An Phú</option>
                  <option value="wh-north">Kho phân bón Khu Bắc</option>
                  <option value="wh-iot">Kho thiết bị kỹ thuật & IoT</option>
                </select>
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
                  Lưu vật tư mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
