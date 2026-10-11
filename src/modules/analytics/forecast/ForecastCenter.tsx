import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Wheat,
  Droplets,
  Package,
  DollarSign,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const ForecastCenter: React.FC = () => {
  const { navigate } = useApp();

  return (
    <div className="space-y-5 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Trung tâm Dự báo Mùa vụ & Nhu cầu Tài nguyên (AI Forecasting)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-200">
              PREDICTIVE ANALYTICS
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Mô hình xác suất dự phóng sản lượng thu hoạch, nhu cầu vật tư phân bón và dự báo tiêu thụ nước theo vi khí hậu
          </p>
        </div>

        <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
          Huấn luyện trên 18 tháng dữ liệu lịch sử
        </span>
      </div>

      {/* Grid: 3 Forecast Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Harvest Yield Forecast */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
              <Wheat className="w-4 h-4 text-emerald-600" />
              <span>Dự Báo Sản Lượng Tháng 11/2026</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Độ tin cậy: 84%
            </span>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-1">
            <span className="text-slate-500 text-[11px]">Sản lượng dự kiến thu hoạch:</span>
            <div className="text-2xl font-bold font-mono text-emerald-800">
              1.550 – 1.720 <span className="text-sm font-sans font-normal text-slate-600">quả</span>
            </div>
            <p className="text-[11px] text-emerald-900 pt-1">
              Dựa trên đếm buồng non tầng 3 và độ ẩm đất duy trì &gt; 40% trong 2 tháng qua.
            </p>
          </div>

          <div className="space-y-1.5 text-slate-600 pt-1">
            <div className="flex justify-between">
              <span>Biên độ cận dưới (Kịch bản xấu):</span>
              <strong className="font-mono text-slate-800">1.480 quả</strong>
            </div>
            <div className="flex justify-between">
              <span>Biên độ cận trên (Kịch bản tối ưu):</span>
              <strong className="font-mono text-slate-800">1.790 quả</strong>
            </div>
          </div>
        </div>

        {/* Pillar 2: Material Shortage Demand Forecast */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Nhu Cầu Phân Bón 30 Ngày Tới</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
              Cảnh báo thiếu hụt
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 space-y-1">
            <span className="text-slate-500 text-[11px]">Nhu cầu bón thúc Phân NPK:</span>
            <div className="text-2xl font-bold font-mono text-amber-900">450 kg</div>
            <p className="text-[11px] text-amber-800 pt-1">
              Tồn kho hiện tại chỉ còn <strong>350 kg</strong>. Dự kiến thiếu <strong>100 kg</strong> vào ngày 22/10.
            </p>
          </div>

          <button
            onClick={() => navigate('/resources/purchases')}
            className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold transition-colors shadow-2xs"
          >
            Tạo Đề Xuất Mua Hàng Bổ Sung (+100 kg)
          </button>
        </div>

        {/* Pillar 3: Water Demand Forecast */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
              <Droplets className="w-4 h-4 text-sky-600" />
              <span>Dự Báo Nhu Cầu Nước Mùa Khô</span>
            </div>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 font-bold border border-sky-200">
              Độ tin cậy: 89%
            </span>
          </div>

          <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-200 space-y-1">
            <span className="text-slate-500 text-[11px]">Dự kiến lượng nước cần cấp:</span>
            <div className="text-2xl font-bold font-mono text-sky-900">385 m³ / tháng</div>
            <p className="text-[11px] text-sky-800 pt-1">
              Nhiệt độ dự báo tăng 1.5°C, bốc thoát hơi nước tăng 12% so với tháng 10.
            </p>
          </div>

          <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-600 text-[11px]">
            Đề xuất duy trì mực nước hồ lắng tối thiểu ở ngưỡng <strong>75% dung tích</strong>.
          </div>
        </div>
      </div>

      {/* Visual Disclaimer */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-[11px] flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          <strong>Lưu ý về mô hình dự báo:</strong> Tất cả các số liệu trong trung tâm này là kết quả tính toán xác suất từ mô hình hồi quy và dữ liệu lịch sử mùa vụ, không phải là con số cam kết chắc chắn 100%. Quản lý cần đối chiếu thêm với diễn biến thời tiết khí tượng thực tế.
        </span>
      </div>
    </div>
  );
};
