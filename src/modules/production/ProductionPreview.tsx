import React from 'react';
import { TreePine, QrCode, Droplets, HeartPulse, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const ProductionPreview: React.FC = () => {
  const { activeFarm, plants, navigate } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Phân hệ 2 — Sản xuất & Quản lý Cá thể Cây trồng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi sinh trưởng, tưới tiêu, bón phân, phòng trừ sâu bệnh và thu hoạch cho {activeFarm.stats.plantsCount.toLocaleString()} cây dừa
          </p>
        </div>

        <button
          onClick={() => navigate('/system/map')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Xem vị trí từng cây trên bản đồ</span>
        </button>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Cá thể cây theo dõi</span>
          <span className="text-2xl font-bold font-mono text-emerald-800">
            {activeFarm.stats.plantsCount} cây
          </span>
          <p className="text-[11px] text-slate-500">Mã QR từng cây từ A001 đến A100</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Tỷ lệ cây đạt chuẩn sinh trưởng</span>
          <span className="text-2xl font-bold font-mono text-slate-900">96.8%</span>
          <p className="text-[11px] text-slate-500">Độ cao trung bình 4.7m · 72 trái/cây</p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
          <span className="text-slate-400 block font-medium">Sâu bệnh cần điều trị</span>
          <span className="text-2xl font-bold font-mono text-amber-600">2 ca ghi nhận</span>
          <p className="text-[11px] text-slate-500">Bọ cánh cứng (A018) & Nấm lá (B024)</p>
        </div>
      </div>

      {/* Featured Individual Plant Profiles */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Danh sách cá thể cây mẫu trong phân khu Bắc (Vườn 01 - Hàng A)
          </h3>
          <span className="text-xs text-slate-500">Dữ liệu thời gian thực</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plants.map((plant) => (
            <div
              key={plant.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2 text-xs hover:border-emerald-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-sm">{plant.code}</span>
                <StatusBadge status={plant.health} size="sm" />
              </div>
              <p className="font-medium text-slate-800">{plant.variety}</p>
              <div className="text-[11px] text-slate-500 space-y-1">
                <div>Cao: <strong>{plant.heightMeters} m</strong> · Thân: <strong>{plant.trunkDiameterCm} cm</strong></div>
                <div>Trái: <strong>{plant.fruitsCount} quả</strong> · Lá: <strong>{plant.leavesCount} tàu</strong></div>
                <div>Tưới gần nhất: {plant.lastWatered}</div>
              </div>
              {plant.activeIssue && (
                <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                  {plant.activeIssue}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
