import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  Boxes,
  Calendar,
  MapPin,
  TreePine,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  X,
  QrCode,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { FinishedGoodsLot } from '../../../types';

export const FinishedGoodsInventoryView: React.FC = () => {
  const { finishedGoodsLots, commercialProducts, navigate, setSelectedPlant, plants } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');

  // Selected Lot for Drawer / Modal (Screen 12)
  const [selectedLot, setSelectedLot] = useState<FinishedGoodsLot | null>(null);

  // Totals
  const totalSKUs = commercialProducts.length;
  const totalOnHand = commercialProducts.reduce((acc, curr) => acc + curr.onHand, 0);
  const totalReserved = commercialProducts.reduce((acc, curr) => acc + curr.reserved, 0);
  const totalAvailable = commercialProducts.reduce((acc, curr) => acc + curr.available, 0);

  const filteredLots = useMemo(() => {
    return finishedGoodsLots.filter((lot) => {
      const matchSearch =
        lot.lotCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.harvestBatchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.farmArea.toLowerCase().includes(searchTerm.toLowerCase());

      const matchWarehouse =
        warehouseFilter === 'ALL' || lot.warehouseLocation.includes(warehouseFilter);
      const matchProduct = productFilter === 'ALL' || lot.productId === productFilter;

      return matchSearch && matchWarehouse && matchProduct;
    });
  }, [finishedGoodsLots, searchTerm, warehouseFilter, productFilter]);

  const handleInspectPlant = (plantCode: string) => {
    const foundPlant = plants.find((p) => p.code === plantCode);
    if (foundPlant) {
      setSelectedPlant(foundPlant);
      navigate(`/production/plants/${foundPlant.id}`);
    } else {
      navigate('/production/plants');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Kho thành phẩm & Lô hàng
            </span>
            <span className="text-xs text-slate-500 font-mono">Finished Goods Inventory</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Kho Thành Phẩm & Phân Bổ Tồn Khả Dụng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tồn kho theo lô thu hoạch, truy xuất nguồn gốc cá thể cây và bảo vệ nguyên tắc không bán vượt tồn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sales/classification')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Boxes className="w-4 h-4" />
            <span>+ Nhập kho từ Phân loại</span>
          </button>
          <button
            onClick={() => navigate('/sales/orders')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <span>Đến Giữ hàng / Đơn hàng</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs defined in Section 17 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Tổng SKU */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium">Tổng SKU Thành phẩm</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{totalSKUs} SKU</div>
          <div className="text-[11px] text-slate-400 mt-1">Đang kinh doanh hoạt động</div>
        </div>

        {/* KPI 2: On Hand */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium">Tồn kho vật lý (On Hand)</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">
            {totalOnHand.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Đang thực tế nằm trong kho</div>
        </div>

        {/* KPI 3: Reserved */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-amber-800 text-xs font-medium">Đã giữ cho đơn (Reserved)</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {totalReserved.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-amber-700 mt-1">Đã phân bổ theo các đơn PO/SO</div>
        </div>

        {/* KPI 4: Available */}
        <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 shadow-sm">
          <div className="text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>Khả dụng để bán (Available)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">
            {totalAvailable.toLocaleString('vi-VN')}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            = On Hand - Reserved
          </div>
        </div>
      </div>

      {/* Filter and Warehouse Selector Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã Lô / Sản phẩm / Đợt thu hoạch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Warehouse Selector (Section 15) */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả kho thành phẩm</option>
            <option value="Lạnh 01">Kho TP Lạnh 01 (18°C)</option>
            <option value="Thường 02">Kho TP Thường 02</option>
          </select>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả sản phẩm</option>
            {commercialProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Finished Goods Lot Table (Screen 11 / 15) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Mã Lô thành phẩm</th>
                <th className="py-3 px-4 font-semibold">Sản phẩm / SKU</th>
                <th className="py-3 px-4 font-semibold text-right">On Hand</th>
                <th className="py-3 px-4 font-semibold text-right">Reserved</th>
                <th className="py-3 px-4 font-semibold text-right">Available</th>
                <th className="py-3 px-4 font-semibold">Ngày thu hoạch</th>
                <th className="py-3 px-4 font-semibold">Hạn sử dụng</th>
                <th className="py-3 px-4 font-semibold">Vị trí kho</th>
                <th className="py-3 px-4 font-semibold text-center">Nguồn gốc</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLots.map((lot) => {
                const percentReserved = Math.round((lot.reservedQty / (lot.onHandQty || 1)) * 100);

                return (
                  <tr
                    key={lot.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedLot(lot)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-emerald-800 flex items-center gap-1.5">
                        <span>{lot.lotCode}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Từ đợt: {lot.harvestBatchCode}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{lot.productName}</div>
                      <div className="text-[10px] text-slate-500">
                        {lot.productSku} • {lot.qualityGrade}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {lot.onHandQty.toLocaleString('vi-VN')} {lot.unit}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {lot.reservedQty.toLocaleString('vi-VN')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                        {lot.availableQty.toLocaleString('vi-VN')} {lot.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {lot.harvestDate}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {lot.expiryDate}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {lot.warehouseLocation}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                        {lot.plantCodes.length} cây
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedLot(lot)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Chi tiết Lô</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen 12: Chi tiết Lô hàng & Traceability Drawer */}
      {selectedLot && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                  {selectedLot.lotCode}
                </span>
                <h2 className="text-xl font-bold text-slate-800 mt-1">
                  {selectedLot.productName}
                </h2>
                <div className="text-xs text-slate-500">
                  Vùng trồng: <strong>{selectedLot.farmArea}</strong> • {selectedLot.qualityGrade}
                </div>
              </div>
              <button
                onClick={() => setSelectedLot(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
              {/* Cân đối tồn kho của lô */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 text-sm">
                  Cân đối tồn kho Lô hàng
                </div>
                <div className="grid grid-cols-4 gap-2 text-center pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-400">Ban đầu</div>
                    <div className="font-bold text-slate-700 mt-0.5">{selectedLot.initialQty} {selectedLot.unit}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-400">Vật lý (On Hand)</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedLot.onHandQty}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-amber-700">Đã giữ (Reserved)</div>
                    <div className="font-bold text-amber-700 mt-0.5">{selectedLot.reservedQty}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-300">
                    <div className="text-[10px] text-emerald-700 font-bold">Khả dụng</div>
                    <div className="font-bold text-emerald-800 mt-0.5">{selectedLot.availableQty}</div>
                  </div>
                </div>
              </div>

              {/* Thông tin thu hoạch & vị trí kho */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <h3 className="font-bold text-slate-800 text-sm">Thông tin thu hoạch & Bảo quản</h3>
                <div className="grid grid-cols-2 gap-3 text-slate-600">
                  <div>
                    Ngày thu hái: <strong>{selectedLot.harvestDate}</strong>
                  </div>
                  <div>
                    Ngày đóng gói: <strong>{selectedLot.packagedDate}</strong>
                  </div>
                  <div>
                    Hạn sử dụng: <strong>{selectedLot.expiryDate}</strong>
                  </div>
                  <div>
                    Đợt thu hoạch (Phân hệ 2):{' '}
                    <strong className="font-mono text-emerald-800">{selectedLot.harvestBatchCode}</strong>
                  </div>
                  <div className="col-span-2">
                    Vị trí lưu kho: <strong>{selectedLot.warehouseLocation}</strong>
                  </div>
                  <div className="col-span-2 font-mono text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                    <span>Mã QR Barcode: {selectedLot.qrCode}</span>
                    <QrCode className="w-4 h-4 text-slate-700" />
                  </div>
                </div>
              </div>

              {/* Truy xuất cá thể cây trồng nguồn gốc (Phân hệ 2 Integration) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <TreePine className="w-4 h-4 text-emerald-600" />
                    <span>Cá thể cây trồng nguồn gốc ({selectedLot.plantCodes.length} cây)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Bấm vào cây để xem nhật ký chăm sóc
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedLot.plantCodes.map((plantCode) => (
                    <button
                      key={plantCode}
                      onClick={() => handleInspectPlant(plantCode)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                      title="Xem chi tiết cây trồng ở Phân hệ 2"
                    >
                      <span>Cây {plantCode}</span>
                      <ExternalLink className="w-3 h-3 text-emerald-600" />
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  ✓ Toàn bộ nhật ký tưới nước, bón phân, phòng trừ sâu bệnh của các cây trên đều được liên kết trực tiếp vào mã lô này.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setSelectedLot(null);
                    navigate('/sales/traceability');
                  }}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Mở Cây Truy Xuất Nguồn Gốc Toàn Diện</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
