import React, { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  TreePine,
  Clock,
  ArrowRight,
  Boxes,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const SupplyPlanningView: React.FC = () => {
  const { commercialProducts, expectedHarvests, salesOrders, navigate } = useApp();

  const [selectedProductId, setSelectedProductId] = useState('PROD-COC-A');
  const selectedProduct = commercialProducts.find((p) => p.id === selectedProductId) || commercialProducts[0];

  // Calculations for demonstration scenario (Section 34)
  const availableInventory = selectedProduct.available; // 7.700
  const orderDemand = 2000; // Sample upcoming major demand
  const reservedElsewhere = selectedProduct.reserved; // 2.100

  const relevantProjections = expectedHarvests.filter((h) => h.cropName.includes('Dừa xiêm'));
  const totalExpectedHarvest = relevantProjections.reduce((acc, curr) => acc + curr.projectedQty, 0); // 2.700

  const projectedTotalSupply = availableInventory + totalExpectedHarvest;
  const isPotentiallyFulfillable = projectedTotalSupply >= orderDemand;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Cân đối Cung – Cầu & Kế hoạch Thu hoạch
            </span>
            <span className="text-xs text-slate-500 font-mono">Screen 16: Supply Planning</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Kế Hoạch Cung Ứng & Dự Báo Thu Hoạch Phân Hệ 2
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cân đối nhu cầu đơn hàng vượt tồn kho với sản lượng cây trồng dự kiến thu hoạch trong tương lai
          </p>
        </div>

        <button
          onClick={() => navigate('/production/harvests')}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <TreePine className="w-4 h-4" />
          <span>Xem Lịch Thu Hoạch Phân Hệ 2</span>
        </button>
      </div>

      {/* Mandatory Safeguard Warning Banner (Section 34) */}
      <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-300 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm text-amber-800">
            Nguyên tắc bảo vệ dữ liệu: Không coi Dự báo (Forecast) là Tồn kho thật!
          </div>
          <p className="mt-0.5 text-amber-800 leading-relaxed">
            Hệ thống hiển thị tính toán năng lực đáp ứng đơn hàng dựa trên <strong>sản lượng dự kiến</strong> của cây trồng trong vườn.
            Tuy nhiên, sản lượng dự kiến <em>không được cộng gộp vào Tồn kho có thể bán (Available Inventory)</em> cho đến khi thực sự
            thu hái và hoàn tất quy trình Phân loại kiểm định (QC Post-Harvest).
          </p>
        </div>
      </div>

      {/* Supply vs Demand Comparison Cards (Section 34) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Available physical stock */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-slate-500 text-xs font-semibold">Tồn kho khả dụng (Available)</div>
          <div className="text-2xl font-bold text-emerald-800">
            {availableInventory.toLocaleString('vi-VN')} {selectedProduct.salesUnit}
          </div>
          <div className="text-[11px] text-slate-400">
            Tồn vật lý: {selectedProduct.onHand} • Đã giữ: {reservedElsewhere}
          </div>
        </div>

        {/* Card 2: Expected Harvest from Farm (Phân hệ 2) */}
        <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm space-y-1">
          <div className="text-blue-800 text-xs font-semibold flex items-center justify-between">
            <span>Dự kiến thu hoạch tới</span>
            <TreePine className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700">
            +{totalExpectedHarvest.toLocaleString('vi-VN')} {selectedProduct.salesUnit}
          </div>
          <div className="text-[11px] text-blue-600">
            Từ 2 đợt hái (Độ tin cậy 92%)
          </div>
        </div>

        {/* Card 3: Total Projected Supply */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-slate-500 text-xs font-semibold">Tổng cung dự phóng</div>
          <div className="text-2xl font-bold text-slate-800">
            {projectedTotalSupply.toLocaleString('vi-VN')} {selectedProduct.salesUnit}
          </div>
          <div className="text-[11px] text-slate-400">
            = Tồn khả dụng + Dự kiến hái
          </div>
        </div>

        {/* Card 4: Fulfillable Status Badge */}
        <div className="bg-white p-5 rounded-xl border border-emerald-300 bg-emerald-50/50 shadow-sm space-y-1">
          <div className="text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>Khả năng đáp ứng đơn mới</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800">
            {isPotentiallyFulfillable ? 'CÓ THỂ NHẬN' : 'CẢNH BÁO THIẾU'}
          </div>
          <div className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            Dựa trên sản lượng dự kiến
          </div>
        </div>
      </div>

      {/* Supply Timeline (Section 35) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Dòng Thời Gian Cung Ứng & Giao Nhận (Supply Timeline)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dự báo diễn biến tồn kho qua từng cột mốc thu hoạch và ngày hẹn giao đơn của khách hàng
          </p>
        </div>

        <div className="space-y-4 border-l-2 border-slate-200 pl-6 ml-3 text-xs">
          {/* Timeline Step 1: 05/10/2026 */}
          <div className="relative pb-4">
            <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-800">05/10/2026 (Hôm nay)</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                Hiện trạng thực tế
              </span>
            </div>
            <div className="text-slate-600 mt-1">
              Kho thành phẩm có sẵn: <strong>{availableInventory.toLocaleString('vi-VN')} {selectedProduct.salesUnit}</strong> khả dụng
              (Đã trừ {reservedElsewhere} trái giữ cho các đơn khác).
            </div>
          </div>

          {/* Timeline Step 2: 07/10/2026 */}
          <div className="relative pb-4">
            <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-900">07/10/2026</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                Dự kiến thu hoạch Phân hệ 2
              </span>
            </div>
            <div className="text-slate-700 font-semibold mt-1">
              Đợt hái HARV-EXP-01: +1.500 trái Dừa xiêm xanh tại Khu Tây - Vườn 02
            </div>
            <p className="text-[11px] text-slate-500">
              Cá thể cây: A061 – A100. Độ ngọt dự kiến 7.6 Brix. Tỷ lệ tin cậy: <strong>92%</strong>.
            </p>
          </div>

          {/* Timeline Step 3: 08/10/2026 */}
          <div className="relative pb-4">
            <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-white" />
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-900">08/10/2026</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                Lịch xuất hàng giao đơn
              </span>
            </div>
            <div className="text-slate-700 font-semibold mt-1">
              Giao hàng đơn SO-2026-1028 (Nhà hàng Đặc sản Biển Xanh): -500 trái Dừa A
            </div>
            <p className="text-[11px] text-slate-500">
              Đã giữ hàng đầy đủ từ Lô LOT-COC-A-20261005 và LOT-COC-A-20261001.
            </p>
          </div>

          {/* Timeline Step 4: 12/10/2026 */}
          <div className="relative">
            <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-blue-900">12/10/2026</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                Dự kiến thu hoạch Phân hệ 2 (Đợt 2)
              </span>
            </div>
            <div className="text-slate-700 font-semibold mt-1">
              Đợt hái HARV-EXP-02: +1.200 trái Dừa xiêm xanh tại Khu Bắc - Vườn Dừa 01
            </div>
            <p className="text-[11px] text-slate-500">
              Cá thể cây: A011 – A025. Dự báo đáp ứng tiếp cho chuỗi siêu thị GreenMart.
            </p>
          </div>
        </div>
      </div>

      {/* Action Decision Support Footer */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
        <div className="text-slate-600">
          Người quản lý có thể tự tin xác nhận các đơn đặt trước (Pre-orders) khi đối chiếu với lịch thu hoạch thực địa.
        </div>
        <button
          onClick={() => navigate('/sales/quotations')}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs transition-colors"
        >
          Lập Báo Giá Đơn Lớn Mới →
        </button>
      </div>
    </div>
  );
};
