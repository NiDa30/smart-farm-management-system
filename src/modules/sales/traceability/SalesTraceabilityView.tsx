import React, { useState, useMemo } from 'react';
import {
  QrCode,
  Search,
  TreePine,
  Layers,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Calendar,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Eye,
  X,
  Droplets,
  Sprout,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const SalesTraceabilityView: React.FC = () => {
  const {
    finishedGoodsLots,
    salesOrders,
    deliveries,
    classifications,
    harvestBatches,
    plants,
    setSelectedPlant,
    navigate,
  } = useApp();

  const [query, setQuery] = useState('LOT-COC-A-20261005');
  const [selectedLotCode, setSelectedLotCode] = useState('LOT-COC-A-20261005');

  // Public Consumer QR Modal View (Section 53)
  const [isConsumerQRModalOpen, setIsConsumerQRModalOpen] = useState(false);

  const currentLot = useMemo(() => {
    const q = selectedLotCode.trim().toLowerCase();
    // 1. Direct lotCode match
    const byLot = finishedGoodsLots.find((l) => l.lotCode.toLowerCase().includes(q));
    if (byLot) return byLot;

    // 2. By order code
    const byOrder = salesOrders.find((o) => o.code.toLowerCase().includes(q));
    if (byOrder) {
      const allocatedLotCode = byOrder.items.flatMap((i) => i.allocatedLots).map((l) => l.lotCode)[0];
      const match = finishedGoodsLots.find((l) => l.lotCode === allocatedLotCode);
      if (match) return match;
    }

    // 3. By harvest batch
    const byHarvest = finishedGoodsLots.find((l) => l.harvestBatchCode.toLowerCase().includes(q));
    if (byHarvest) return byHarvest;

    // 4. By plant code
    const byPlant = finishedGoodsLots.find((l) => l.plantCodes.some((code) => code.toLowerCase().includes(q)));
    if (byPlant) return byPlant;

    return finishedGoodsLots[0];
  }, [finishedGoodsLots, salesOrders, selectedLotCode]);

  const linkedClassification = classifications.find((c) => c.harvestBatchCode === currentLot?.harvestBatchCode);
  const linkedHarvest = harvestBatches.find((h) => h.code === currentLot?.harvestBatchCode) || harvestBatches[0];
  const linkedOrder = salesOrders.find((o) =>
    o.items.some((i) => i.allocatedLots.some((lot) => lot.lotCode === currentLot?.lotCode))
  ) || salesOrders[0];
  const linkedDelivery = deliveries.find((d) => d.orderId === linkedOrder?.id) || deliveries[0];

  const handleInspectPlant = (plantCode: string) => {
    const p = plants.find((plant) => plant.code === plantCode);
    if (p) {
      setSelectedPlant(p);
      navigate(`/production/plants/${p.id}`);
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
              Truy xuất nguồn gốc chuỗi cung ứng
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 25 & 53</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Truy Xuất Nguồn Gốc Từ Cây Trồng Đến Khách Hàng (Traceability Tree)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mối quan hệ liên tục: Cây trồng → Thu hoạch → Phân loại QC → Lô thành phẩm → Đơn hàng → Vận chuyển → Khách hàng
          </p>
        </div>

        <button
          onClick={() => setIsConsumerQRModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>Xem Trang Quét QR Người Tiêu Dùng</span>
        </button>
      </div>

      {/* Global Search Bar (Section 52) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Nhập mã Lô thành phẩm, Đơn hàng, hoặc Đợt thu hoạch (VD: LOT-COC-A-20261005)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSelectedLotCode(query.trim() || 'LOT-COC-A-20261005')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            Tra cứu chuỗi
          </button>
        </div>
      </div>

      {/* Interactive Traceability Tree (Section 52) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Cây gia phả nguồn gốc (Traceability Hierarchy)</span>
            </h2>
            <div className="text-xs text-slate-500 mt-0.5">
              Đang truy vết cho Lô hàng:{' '}
              <strong className="font-mono text-emerald-800">{currentLot?.lotCode}</strong> ({currentLot?.productName})
            </div>
          </div>

          <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            Chuỗi xác thực VietGAP 100%
          </span>
        </div>

        {/* Tree Visual Flow */}
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-600 before:via-blue-600 before:to-purple-600">
          {/* Node 1: Trang trại & Vùng trồng */}
          <div className="relative pl-10">
            <span className="absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white" />
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>1. NGUỒN GỐC TRANG TRẠI & VÙNG TRỒNG</span>
                </span>
                <span className="text-[10px] text-slate-400">Tọa độ: 10.241°N, 106.375°E</span>
              </div>
              <div className="font-bold text-slate-800 text-sm">
                Trang trại Nông nghiệp Thông minh Bến Tre — {currentLot?.farmArea}
              </div>
              <p className="text-slate-600">
                Thổ nhưỡng phù sa ven sông Tiền, hệ thống tưới tự động cảm biến độ ẩm đất IoT LoRaWAN.
              </p>
            </div>
          </div>

          {/* Node 2: Cá thể cây trồng nguồn gốc */}
          <div className="relative pl-10">
            <span className="absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white" />
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <TreePine className="w-4 h-4" />
                  <span>2. CÁ THỂ CÂY TRỒNG NGUỒN GỐC (Phân hệ 2 Sản xuất)</span>
                </span>
                <span className="text-emerald-700 font-semibold text-[11px]">
                  {currentLot?.plantCodes.length} cây cá thể
                </span>
              </div>
              <p className="text-slate-700">
                Được thu hái từ các cây dừa xiêm xanh cụ thể trong vườn (tuổi cây 4.5 năm):
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentLot?.plantCodes.map((plantCode) => (
                  <button
                    key={plantCode}
                    onClick={() => handleInspectPlant(plantCode)}
                    className="px-2.5 py-1 rounded bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-colors"
                  >
                    <span>Cây {plantCode}</span>
                    <ExternalLink className="w-3 h-3 text-emerald-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Node 3: Đợt thu hoạch */}
          <div className="relative pl-10">
            <span className="absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-white" />
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>3. ĐỢT THU HOẠCH (HARVEST BATCH)</span>
                </span>
                <span className="font-mono font-bold text-blue-800">{currentLot?.harvestBatchCode}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
                <div>Ngày hái: <strong>{currentLot?.harvestDate}</strong></div>
                <div>Tổng thu: <strong>{linkedHarvest.totalFruitsCount} trái</strong></div>
                <div>Trọng lượng: <strong>{linkedHarvest.totalWeightKg} kg</strong></div>
                <div>Đội thu hoạch: <strong>{linkedHarvest.harvestedBy || 'Tổ hái 01'}</strong></div>
              </div>
            </div>
          </div>

          {/* Node 4: Phân loại chất lượng QC */}
          <div className="relative pl-10">
            <span className="absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-white" />
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>4. KIỂM ĐỊNH & PHÂN LOẠI CHẤT LƯỢNG (POST-HARVEST QC)</span>
                </span>
                <span className="font-mono text-amber-800 font-bold">{linkedClassification?.code || 'CLASS-01'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <div className="text-emerald-800 font-bold">750 trái (75%)</div>
                  <div className="text-slate-500 text-[10px]">Loại A Xuất khẩu</div>
                </div>
                <div className="bg-white p-2 rounded border border-blue-200">
                  <div className="text-blue-800 font-bold">200 trái (20%)</div>
                  <div className="text-slate-500 text-[10px]">Loại B Thường</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-700 font-bold">50 trái (5%)</div>
                  <div className="text-slate-500 text-[10px]">Reject (Ủ phân)</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                ✓ Chỉ 950 trái đạt tiêu chuẩn được cấp phép nhập kho thành phẩm thương mại.
              </p>
            </div>
          </div>

          {/* Node 5: Lô thành phẩm thương mại */}
          <div className="relative pl-10">
            <span className="absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white" />
            <div className="p-4 rounded-xl border border-emerald-300 bg-white space-y-2 text-xs shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>5. LÔ THÀNH PHẨM (FINISHED GOODS LOT)</span>
                </span>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                  {currentLot?.lotCode}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                <div>Sản phẩm: <strong>{currentLot?.productName}</strong></div>
                <div>Đóng gói: <strong>{currentLot?.packagedDate}</strong></div>
                <div>Hạn dùng: <strong>{currentLot?.expiryDate}</strong></div>
                <div>Vị trí: <strong>{currentLot?.warehouseLocation}</strong></div>
              </div>
            </div>
          </div>

          {/* Node 6: Đơn hàng & Vận chuyển & Khách hàng */}
          <div className="relative pl-10">
            <span className="absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full bg-purple-600 ring-4 ring-white" />
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  <span>6. XUẤT BÁN, GIAO NHẬN & ĐIỂM TIÊU THỤ</span>
                </span>
                <span className="font-mono text-purple-800 font-bold">{linkedOrder?.code}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                <div>Khách hàng: <strong>{linkedOrder?.customerName}</strong></div>
                <div>Phiếu giao: <strong className="font-mono">{linkedDelivery?.code}</strong></div>
                <div>Phương tiện: <strong>{linkedDelivery?.vehicle}</strong></div>
                <div className="col-span-2 sm:col-span-3">
                  Địa chỉ giao: <strong>{linkedOrder?.deliveryAddress}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen 53: Modal Giao diện Quét QR Người Tiêu Dùng (Public Consumer QR View) */}
      {isConsumerQRModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-fadeIn">
            {/* Consumer Mobile Header */}
            <div className="bg-emerald-800 text-white p-5 text-center relative">
              <button
                onClick={() => setIsConsumerQRModalOpen(false)}
                className="absolute top-3 right-3 text-emerald-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-700 flex items-center justify-center text-white mb-2 shadow-inner">
                <Sprout className="w-6 h-6 text-emerald-300" />
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-300">
                Chứng nhận nguồn gốc số
              </div>
              <h3 className="text-base font-bold mt-0.5">Trang Trại Bến Tre SmartFarm</h3>
              <p className="text-xs text-emerald-200 mt-0.5">Tiêu chuẩn VietGAP Certified</p>
            </div>

            {/* Consumer Clean Content (Hiding internal costs & private logins) */}
            <div className="p-5 space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-slate-100">
                <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {currentLot?.lotCode}
                </span>
                <h4 className="text-base font-bold text-slate-800 mt-1">
                  {currentLot?.productName}
                </h4>
                <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Độ brix ngọt thanh &gt;7.5 • Không chất bảo quản
                </div>
              </div>

              <div className="space-y-2.5 text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Giống cây:</span>
                  <span className="font-semibold text-slate-800">Dừa xiêm xanh Bến Tre</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Vùng canh tác:</span>
                  <span className="font-semibold text-slate-800">{currentLot?.farmArea}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Ngày thu hái:</span>
                  <span className="font-semibold text-slate-800">{currentLot?.harvestDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Ngày đóng sọt:</span>
                  <span className="font-semibold text-slate-800">{currentLot?.packagedDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Hạn khuyên dùng:</span>
                  <span className="font-semibold text-slate-800">{currentLot?.expiryDate}</span>
                </div>
              </div>

              {/* Safety & Organic pledge */}
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Cam kết an toàn thực phẩm:</span>
                </div>
                <p className="text-[10px] text-emerald-800">
                  Canh tác theo hướng hữu cơ sinh học, đo lường độ ẩm và bón phân tự động qua hệ thống IoT, đảm bảo quả dừa nguyên chất tự nhiên.
                </p>
              </div>

              <div className="text-center pt-2">
                <div className="text-[10px] text-slate-400">
                  Mã xác thực số: SMARTFARM-{currentLot?.lotCode}-BENTRE
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setIsConsumerQRModalOpen(false)}
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Đóng giao diện xem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
