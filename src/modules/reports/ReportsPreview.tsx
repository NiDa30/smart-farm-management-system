import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, PieChart, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ReportsPreview: React.FC = () => {
  return (
    <div className="space-y-6 text-xs">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Phân hệ 6 — Báo cáo & Phân tích Đa chiều
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Báo cáo tổng hợp: Năng suất từng cá thể cây, tiêu hao nước tưới, chỉ số dinh dưỡng đất và biên lợi nhuận
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-3">
          <span className="font-bold text-slate-800 text-sm block">Hiệu quả năng suất cá thể cây</span>
          <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2">
            {[
              { label: 'Khu Bắc', val: 78 },
              { label: 'Khu Trung', val: 92 },
              { label: 'Khu Nam', val: 86 },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="font-mono text-[11px] font-bold text-slate-700">{bar.val} q/c</span>
                <div
                  className="w-full bg-emerald-600 rounded-t transition-all"
                  style={{ height: `${bar.val}%` }}
                />
                <span className="text-[10px] text-slate-500 truncate">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-3">
          <span className="font-bold text-slate-800 text-sm block">Cơ cấu chi phí sản xuất</span>
          <div className="space-y-2 pt-2 text-slate-700">
            <div className="flex justify-between">
              <span>Phân bón hữu cơ & vi lượng:</span>
              <strong className="font-mono">42%</strong>
            </div>
            <div className="flex justify-between">
              <span>Điện năng & Vận hành bơm IoT:</span>
              <strong className="font-mono">18%</strong>
            </div>
            <div className="flex justify-between">
              <span>Nhân công cắt tỉa & thu hái:</span>
              <strong className="font-mono">28%</strong>
            </div>
            <div className="flex justify-between">
              <span>Bảo trì thiết bị & cảm biến:</span>
              <strong className="font-mono">12%</strong>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 space-y-3">
          <span className="font-bold text-slate-800 text-sm block">Dự báo mùa vụ (AI & Heuristic)</span>
          <div className="p-3 bg-emerald-50 rounded border border-emerald-200 text-emerald-950 space-y-1">
            <div className="font-bold">Dự kiến thu hoạch tháng 11/2026:</div>
            <div className="text-xl font-mono font-bold text-emerald-800">22.400 quả</div>
            <p className="text-[11px] text-emerald-800 mt-1">
              Độ ẩm đất duy trì ở 42% trong tuần qua giúp tỷ lệ đậu trái tăng 6.4% so với cùng kỳ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
