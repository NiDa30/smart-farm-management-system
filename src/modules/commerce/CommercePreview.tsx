import React from 'react';
import { ShoppingBag, Truck, Receipt, Users, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CommercePreview: React.FC = () => {
  return (
    <div className="space-y-6 text-xs">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Phân hệ 5 — Kinh doanh & Khách hàng (CRM & Sales)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quy trình chuỗi giá trị: Thu hoạch → Phân loại dừa loại 1/2 → Kho thành phẩm → Báo giá & Đơn hàng → Giao nhận & Thanh toán
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Doanh thu tháng 10/2026</span>
          <span className="text-xl font-bold font-mono text-emerald-800">485.600.000 ₫</span>
          <p className="text-[11px] text-slate-500">+12% so với tháng trước</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Dừa xuất kho tuần này</span>
          <span className="text-xl font-bold font-mono text-slate-900">18.500 quả</span>
          <p className="text-[11px] text-slate-500">Dừa xiêm xanh xuất khẩu</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Đơn hàng đang xử lý</span>
          <span className="text-xl font-bold font-mono text-slate-900">8 đơn hàng</span>
          <p className="text-[11px] text-slate-500">Giữ hàng trong kho lạnh</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Khách hàng đối tác</span>
          <span className="text-xl font-bold font-mono text-slate-900">24 đối tác</span>
          <p className="text-[11px] text-slate-500">Hợp đồng bao tiêu nông sản</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Truy xuất nguồn gốc từ quả dừa thành phẩm tới từng cá thể cây:
        </h3>
        <p className="text-slate-600 leading-relaxed">
          Mỗi lô dừa xuất khẩu đều gắn tem QR truy xuất: Người tiêu dùng hoặc đối tác nhập khẩu quét mã sẽ thấy toàn bộ:
          Mã số cây mẹ (ví dụ A001), phân khu canh tác (Khu Bắc - Vườn 01), nhật ký bón phân hữu cơ vi sinh,
          chỉ số tưới nước và ngày thu hoạch thực tế.
        </p>
      </div>
    </div>
  );
};
