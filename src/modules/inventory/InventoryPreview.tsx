import React from 'react';
import { Package, Truck, Layers, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const InventoryPreview: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Phân hệ 3 — Vật tư Nông nghiệp & Quản lý Kho
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị chuỗi cung ứng vật tư: Phân bón hữu cơ, thuốc BVTV sinh học, máy móc thiết bị và phụ tùng
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Tồn kho phân bón</span>
          <span className="text-2xl font-bold font-mono text-slate-900">7,250 kg</span>
          <p className="text-[11px] text-slate-500">145 bao NPK hữu cơ Bến Tre</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Thuốc BVTV Sinh học</span>
          <span className="text-2xl font-bold font-mono text-emerald-800">42 lít</span>
          <p className="text-[11px] text-slate-500">Chế phẩm nấm xanh & Pheromone</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Đơn mua hàng PO gần nhất</span>
          <span className="text-base font-bold font-mono text-slate-900">PO-2026-088</span>
          <p className="text-[11px] text-emerald-700">Tự động tăng kho +100 bao</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Phương pháp xuất kho</span>
          <span className="text-base font-bold text-slate-900">FEFO Chuẩn</span>
          <p className="text-[11px] text-slate-500">Ưu tiên lô cận date trước</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-900">
          Quy tắc tự động hóa kho: "Một hành động chỉ nhập một lần"
        </h3>
        <p className="text-slate-600 leading-relaxed">
          Khi thủ kho xác nhận nhận hàng đơn PO, hệ thống tự động: Tăng tồn kho thực tế, cập nhật đơn giá bình quân,
          đồng bộ tài chính kế toán và ghi nhật ký kiểm toán không cần lập phiếu lần hai. Tương tự khi nhân viên bấm
          hoàn thành task bón phân cho Hàng A (Khu Bắc), định lượng phân bón tự động trừ kho và ghi nhận chi phí vào
          hồ sơ cá thể cây.
        </p>
      </div>
    </div>
  );
};
