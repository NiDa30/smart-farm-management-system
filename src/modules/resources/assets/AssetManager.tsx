import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { FarmAsset, AssetStatus } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const AssetManager: React.FC = () => {
  const { farmAssets, addFarmAsset, navigate, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAsset, setSelectedAsset] = useState<FarmAsset | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'MAINTENANCE' | 'COSTS'>('OVERVIEW');

  // Add Asset Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formCode, setFormCode] = useState(`EQ-00${farmAssets.length + 1}`);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<FarmAsset['type']>('PUMP');
  const [formModel, setFormModel] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formLocation, setFormLocation] = useState('Khu Văn phòng điều hành');
  const [formZone, setFormZone] = useState('Khu Bắc');
  const [formPrice, setFormPrice] = useState<number>(5000000);
  const [formSupplier, setFormSupplier] = useState('');

  const filteredAssets = farmAssets.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || a.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Vui lòng nhập tên thiết bị', 'warning');
      return;
    }

    const newAsset: FarmAsset = {
      id: `asset-${Date.now()}`,
      code: formCode,
      name: formName,
      type: formType,
      typeLabel:
        formType === 'PUMP'
          ? 'Máy bơm tưới'
          : formType === 'TRACTOR'
          ? 'Cơ giới nông nghiệp'
          : formType === 'CUTTER'
          ? 'Dụng cụ làm vườn'
          : 'Hệ thống lọc / Khác',
      model: formModel || 'Tiêu chuẩn',
      serialNumber: formSerial || `SN-${Date.now().toString().slice(-6)}`,
      location: formLocation,
      zoneName: formZone,
      purchaseDate: new Date().toLocaleDateString('vi-VN'),
      purchasePrice: formPrice,
      supplierName: formSupplier || 'Đại lý máy nông nghiệp',
      status: 'ACTIVE',
      nextMaintenanceDate: '15/12/2026',
      lastMaintenanceDate: new Date().toLocaleDateString('vi-VN'),
      totalMaintenanceCost: 0,
      logs: [],
    };

    addFarmAsset(newAsset);
    setIsCreateOpen(false);
    setSelectedAsset(newAsset);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Thiết Bị & Tài Sản Trang Trại
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {farmAssets.length} Tài sản
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị vòng đời tài sản cơ giới, trạm bơm tưới, lịch sử bảo dưỡng và chi phí sửa chữa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm thiết bị mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã (PUMP-P01...), tên thiết bị, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Loại */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Loại:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="PUMP">Máy bơm</option>
              <option value="TRACTOR">Máy xới đất</option>
              <option value="CUTTER">Máy cắt cỏ</option>
              <option value="FILTER">Hệ thống lọc</option>
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
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="MAINTENANCE">Đang bảo trì / sửa chữa</option>
              <option value="IN_STOCK">Trong kho</option>
              <option value="BROKEN">Gặp sự cố</option>
            </select>
          </div>

          <span className="text-slate-400 font-mono text-xs pl-2">
            {filteredAssets.length} thiết bị
          </span>
        </div>
      </div>

      {/* Assets Table (Screen 16) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Mã tài sản</th>
                <th className="py-3 px-3">Tên thiết bị & Model</th>
                <th className="py-3 px-3">Phân loại</th>
                <th className="py-3 px-3">Vị trí lắp đặt</th>
                <th className="py-3 px-3">Ngày mua</th>
                <th className="py-3 px-3">Giá mua</th>
                <th className="py-3 px-3">Bảo trì tiếp theo</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => {
                    setSelectedAsset(asset);
                    setDetailTab('OVERVIEW');
                  }}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                    {asset.code}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {asset.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {asset.model} • SN: {asset.serialNumber}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                      {asset.typeLabel}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    <div className="font-medium text-slate-900">{asset.location}</div>
                    <div className="text-[10px] text-slate-400">{asset.zoneName}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{asset.purchaseDate}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {asset.purchasePrice.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className="text-slate-800 font-medium">{asset.nextMaintenanceDate}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        asset.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : asset.status === 'MAINTENANCE'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {asset.status === 'ACTIVE'
                        ? 'Đang hoạt động'
                        : asset.status === 'MAINTENANCE'
                        ? 'Đang bảo trì'
                        : 'Hỏng hóc'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedAsset(asset);
                        setDetailTab('OVERVIEW');
                      }}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded text-[11px]"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen 17: Asset Detail Right Drawer */}
      <RightDrawer
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset?.name || 'Chi tiết thiết bị'}
        subtitle={`Mã: ${selectedAsset?.code} • ${selectedAsset?.model}`}
        width="w-full sm:w-[560px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setSelectedAsset(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                setSelectedAsset(null);
                navigate('/resources/maintenance');
                showToast(`Đang chuyển sang tạo phiếu bảo trì cho ${selectedAsset?.name}`, 'info');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs"
            >
              <Wrench className="w-3.5 h-3.5" /> Tạo phiếu bảo dưỡng / sửa chữa
            </button>
          </div>
        }
      >
        {selectedAsset && (
          <div className="space-y-4 text-xs">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-medium">
              {[
                { key: 'OVERVIEW', label: 'Tổng quan' },
                { key: 'MAINTENANCE', label: 'Nhật ký bảo dưỡng' },
                { key: 'COSTS', label: 'Chi phí khấu hao' },
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
                    <span className="text-slate-400 block text-[10px]">Trạng thái vận hành:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedAsset.status === 'ACTIVE'
                        ? 'Đang hoạt động'
                        : selectedAsset.status === 'MAINTENANCE'
                        ? 'Đang bảo trì'
                        : 'Sự cố dừng máy'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kỳ bảo trì tiếp theo:</span>
                    <span className="font-mono font-bold text-amber-800 text-sm">
                      {selectedAsset.nextMaintenanceDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Nguyên giá tài sản:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {selectedAsset.purchasePrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tổng chi bảo trì tích lũy:</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {selectedAsset.totalMaintenanceCost.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Số Serial:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedAsset.serialNumber}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Vị trí hiện tại:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedAsset.location} ({selectedAsset.zoneName})
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Nhà cung cấp máy:</span>
                    <span className="text-slate-800">{selectedAsset.supplierName}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Lần bảo trì gần nhất:</span>
                    <span className="font-mono text-slate-800">{selectedAsset.lastMaintenanceDate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Maintenance */}
            {detailTab === 'MAINTENANCE' && (
              <div className="space-y-3">
                {selectedAsset.logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    Chưa có lịch sử bảo dưỡng nào được ghi nhận.
                  </div>
                ) : (
                  selectedAsset.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{log.type}</span>
                        <span className="font-mono text-[10px] text-slate-400">{log.date}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{log.description}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-[11px]">
                        <span className="text-slate-500">Người thực hiện: {log.actor}</span>
                        <span className="font-bold text-emerald-800">
                          {log.cost.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Costs */}
            {detailTab === 'COSTS' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Nguyên giá ban đầu:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedAsset.purchasePrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Chi phí bảo trì, thay thế:</span>
                    <span className="font-mono font-bold text-amber-800">
                      {selectedAsset.totalMaintenanceCost.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 font-bold">
                    <span className="text-slate-900">Tổng chi phí vòng đời thiết bị:</span>
                    <span className="font-mono text-emerald-800 text-sm">
                      {(selectedAsset.purchasePrice + selectedAsset.totalMaintenanceCost).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </RightDrawer>

      {/* Add Asset Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Thêm Thiết Bị / Máy Móc Mới</h3>
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
                  <label className="font-semibold text-slate-700 block mb-1">Mã tài sản *:</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phân loại *:</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="PUMP">Máy bơm tưới</option>
                    <option value="TRACTOR">Máy xới đất</option>
                    <option value="CUTTER">Máy cắt cỏ</option>
                    <option value="FILTER">Hệ thống lọc</option>
                    <option value="GENERATOR">Máy phát điện</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên thiết bị *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy bơm ly tâm 3HP Pentax..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model máy:</label>
                  <input
                    type="text"
                    placeholder="Pentax CH300..."
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số Serial:</label>
                  <input
                    type="text"
                    placeholder="SN123456..."
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vị trí lắp đặt:</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giá mua (VNĐ):</label>
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg"
                  />
                </div>
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
                  Lưu thiết bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
