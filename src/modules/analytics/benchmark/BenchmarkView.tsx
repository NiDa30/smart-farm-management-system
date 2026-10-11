import React, { useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  TreePine,
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { BenchmarkComparisonItem } from '../../../types/analytics';

export const BenchmarkView: React.FC = () => {
  const { navigate } = useApp();
  const [benchmarkType, setBenchmarkType] = useState<'zone' | 'plant'>('zone');

  const [entityA, setEntityA] = useState('zone-north');
  const [entityB, setEntityB] = useState('zone-south');

  // Zone Benchmark Data
  const zoneMetrics: BenchmarkComparisonItem[] = [
    {
      key: 'yield',
      label: 'Năng suất bình quân',
      unit: 'tấn/ha',
      valA: '12.4',
      valB: '10.8',
      deltaPercent: 14.8,
      winner: 'A',
      insight: 'Khu Bắc cao hơn 14.8% nhờ mật độ tán lá đồng đều',
    },
    {
      key: 'water',
      label: 'Suất tiêu hao nước tưới',
      unit: 'L/kg',
      valA: '18.2',
      valB: '27.5',
      deltaPercent: -33.8,
      winner: 'A',
      insight: 'Khu Nam tốn thêm 51% lượng nước do van cũ bị rò rỉ áp lực',
      isPotentialEfficiencyIssue: true,
    },
    {
      key: 'fertilizer',
      label: 'Lượng phân bón cấp',
      unit: 'kg/cây/năm',
      valA: '1.8',
      valB: '2.2',
      deltaPercent: -18.2,
      winner: 'A',
      insight: 'Khu Nam bón nhiều hơn 22% nhưng năng suất không tăng tương xứng',
      isPotentialEfficiencyIssue: true,
    },
    {
      key: 'disease',
      label: 'Số ca bệnh phát sinh',
      unit: 'ca/tháng',
      valA: '2',
      valB: '11',
      deltaPercent: -81.8,
      winner: 'A',
      insight: 'Khu Nam có mật độ ẩm cao tạo điều kiện nấm đốm lá phát triển',
    },
    {
      key: 'cost',
      label: 'Giá thành sản xuất',
      unit: 'đ/kg',
      valA: '8.200',
      valB: '10.500',
      deltaPercent: -21.9,
      winner: 'A',
      insight: 'Khu Bắc tiết kiệm 2.300 đ trên mỗi kg dừa thương phẩm',
    },
    {
      key: 'revenue',
      label: 'Doanh thu trung bình/ha',
      unit: 'triệu/ha',
      valA: '185',
      valB: '142',
      deltaPercent: 30.2,
      winner: 'A',
      insight: 'Khu Bắc tỷ lệ quả Loại 1 xuất khẩu đạt 92%',
    },
  ];

  return (
    <div className="space-y-5 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Trung tâm Đối sánh Đa chiều (Benchmarking Center)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              CROSS-ENTITY ANALYTICS
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Đặt hai đối tượng canh tác lên bàn cân so sánh: Phân khu vs Phân khu, hoặc Cá thể cây vs Chuẩn chung
          </p>
        </div>

        {/* Switcher Mode */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setBenchmarkType('zone')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              benchmarkType === 'zone' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đối sánh Phân khu
          </button>
          <button
            onClick={() => setBenchmarkType('plant')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              benchmarkType === 'plant' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đối sánh Cá thể Cây
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Đối tượng A:</span>
            <select
              value={entityA}
              onChange={(e) => setEntityA(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 font-bold text-emerald-950 focus:outline-none"
            >
              <option value="zone-north">Phân khu Bắc (Vườn 01, 02)</option>
              <option value="zone-center">Phân khu Trung (Vườn 03)</option>
              <option value="zone-south">Phân khu Nam (Vườn 04, 05)</option>
            </select>
          </div>

          <div className="p-1 rounded-full bg-slate-100 text-slate-400">
            <ArrowRightLeft className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Đối tượng B:</span>
            <select
              value={entityB}
              onChange={(e) => setEntityB(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-sky-300 bg-sky-50 font-bold text-sky-950 focus:outline-none"
            >
              <option value="zone-south">Phân khu Nam (Vườn 04, 05)</option>
              <option value="zone-center">Phân khu Trung (Vườn 03)</option>
              <option value="zone-north">Phân khu Bắc (Vườn 01, 02)</option>
            </select>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          Khoảng thời gian: Quý 3/2026 – Tháng 10/2026
        </span>
      </div>

      {/* Benchmark Matrix Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Bảng Ma Trận So Sánh Các Chỉ Số Trọng Yếu
          </h3>
          <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100/60 px-2 py-0.5 rounded">
            🟢 Khu Bắc vượt trội ở 5/6 chỉ số
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {zoneMetrics.map((m) => (
            <div key={m.key} className="p-3.5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 sm:w-1/3">
                <span className="font-bold text-slate-900 text-xs block">{m.label}</span>
                <span className="text-[11px] text-slate-400">Đơn vị: {m.unit}</span>
                {m.isPotentialEfficiencyIssue && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 mt-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Lệch chuẩn hiệu quả</span>
                  </span>
                )}
              </div>

              {/* Head-to-Head Values */}
              <div className="flex items-center gap-6 sm:w-1/3 justify-center">
                <div className="text-center p-2 rounded bg-emerald-50/60 border border-emerald-200 w-28">
                  <span className="text-[10px] text-emerald-800 font-bold block">Khu Bắc</span>
                  <span className="text-base font-bold font-mono text-emerald-950">{m.valA}</span>
                </div>

                <span className="font-bold text-slate-400 font-mono">vs</span>

                <div className="text-center p-2 rounded bg-sky-50/60 border border-sky-200 w-28">
                  <span className="text-[10px] text-sky-800 font-bold block">Khu Nam</span>
                  <span className="text-base font-bold font-mono text-sky-950">{m.valB}</span>
                </div>
              </div>

              {/* Insight Explanation */}
              <div className="sm:w-1/3 text-right">
                <p className="text-[11px] text-slate-700 font-medium">{m.insight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
