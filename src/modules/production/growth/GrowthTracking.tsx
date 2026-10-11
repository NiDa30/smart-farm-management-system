import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  TreePine,
  Search,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { GrowthMeasurement } from '../../../types';

export const GrowthTracking: React.FC = () => {
  const { growthMeasurements, plants, addGrowthMeasurement, activeUser, navigate } = useApp();

  const [selectedPlantCode, setSelectedPlantCode] = useState('A023');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formMeasure, setFormMeasure] = useState({
    plantCode: 'A023',
    date: new Date().toLocaleDateString('vi-VN'),
    heightMeters: 4.5,
    trunkDiameterCm: 30.5,
    leavesCount: 22,
    flowersCount: 4,
    bunchCount: 6,
    fruitsCount: 34,
    notes: '',
  });

  const plantRecords = growthMeasurements.filter((g) => g.plantCode === selectedPlantCode);
  const selectedPlant = plants.find((p) => p.code === selectedPlantCode) || plants[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const record: GrowthMeasurement = {
      id: `growth-${Date.now()}`,
      plantId: selectedPlant?.id || `plant-${formMeasure.plantCode.toLowerCase()}`,
      plantCode: formMeasure.plantCode,
      date: formMeasure.date,
      heightMeters: Number(formMeasure.heightMeters),
      trunkDiameterCm: Number(formMeasure.trunkDiameterCm),
      leavesCount: Number(formMeasure.leavesCount),
      flowersCount: Number(formMeasure.flowersCount),
      bunchCount: Number(formMeasure.bunchCount),
      fruitsCount: Number(formMeasure.fruitsCount),
      notes: formMeasure.notes,
      recordedBy: activeUser.name,
    };
    addGrowthMeasurement(record);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Theo dõi sinh trưởng cá thể cây (Crop Growth Analytics)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát chiều cao, số tàu lá, chu kỳ trổ buồng và biến động tỷ lệ đậu trái
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Plant Selector */}
          <select
            value={selectedPlantCode}
            onChange={(e) => {
              setSelectedPlantCode(e.target.value);
              setFormMeasure({ ...formMeasure, plantCode: e.target.value });
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800"
          >
            <option value="A023">Cây A023 (Dừa xiêm xanh - Cần theo dõi)</option>
            <option value="A001">Cây A001 (Dừa xiêm xanh - Năng suất cao)</option>
            <option value="A018">Cây A018 (Dừa xiêm xanh)</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Ghi nhận chỉ số</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Chart + Right Records */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Growth Chart & Analysis (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Biểu đồ biến động số trái: Cây {selectedPlantCode}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{selectedPlant?.variety}</p>
            </div>
            {selectedPlantCode === 'A023' && (
              <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-bold inline-flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                <span>↓ 27.6% trong 3 tháng qua</span>
              </span>
            )}
          </div>

          {/* Chart Visualization */}
          <div className="h-56 w-full bg-slate-50 rounded-lg p-5 border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Đơn vị: Quả trái / cây</span>
              <span className="font-mono text-emerald-800 font-bold">Chu kỳ đo: Hàng tháng</span>
            </div>

            <div className="h-36 flex items-end justify-between gap-6 px-4 pt-2">
              {plantRecords.map((rec) => {
                const heightPct = Math.min(100, (rec.fruitsCount / 90) * 100);
                const isLatest = rec.date.includes('10/2026');
                return (
                  <div key={rec.id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-xs font-mono font-bold text-slate-800">{rec.fruitsCount}q</span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isLatest && selectedPlantCode === 'A023'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[11px] font-mono text-slate-600 font-medium">{rec.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1 text-slate-700">
            <span className="font-bold text-slate-900 block">Nhận định nông học:</span>
            <p>
              Đối với cây A023, số trái sụt giảm từ 47 xuống 34 quả phản ánh tác động của đợt bọ cánh cứng
              hại đọt non đầu tháng 9. Sau khi áp dụng phác đồ sinh học nấm xanh Metarhizium và bẫy Pheromone,
              đỉnh sinh trưởng đã hồi phục và dự kiến đậu buồng trở lại sau 45 ngày.
            </p>
          </div>
        </div>

        {/* Right: History Measurements (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Lịch sử ghi nhận ({plantRecords.length} lần)
            </h2>
            <button
              onClick={() => navigate(`/production/plants/${selectedPlant?.id}`)}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              Hồ sơ cây →
            </button>
          </div>

          <div className="space-y-3">
            {plantRecords.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{r.date}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{r.recordedBy}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-slate-700 font-medium text-[11px]">
                  <div>Cao: <strong className="font-mono">{r.heightMeters} m</strong></div>
                  <div>Gốc: <strong className="font-mono">{r.trunkDiameterCm} cm</strong></div>
                  <div>Lá: <strong className="font-mono">{r.leavesCount} tàu</strong></div>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-slate-200/60">
                  <span>Số buồng: {r.bunchCount} buồng</span>
                  <span>Tổng trái: {r.fruitsCount} quả</span>
                </div>
                {r.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5">{r.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Measurement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <form
            onSubmit={handleSave}
            className="relative bg-white rounded-lg p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="font-bold text-slate-900 text-sm">
              Ghi nhận chỉ số sinh trưởng: {selectedPlantCode}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ngày đo:</label>
                <input
                  type="text"
                  value={formMeasure.date}
                  onChange={(e) => setFormMeasure({ ...formMeasure, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Chiều cao (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={formMeasure.heightMeters}
                  onChange={(e) => setFormMeasure({ ...formMeasure, heightMeters: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Đường kính thân (cm):</label>
                <input
                  type="number"
                  step="0.1"
                  value={formMeasure.trunkDiameterCm}
                  onChange={(e) =>
                    setFormMeasure({ ...formMeasure, trunkDiameterCm: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số tàu lá:</label>
                <input
                  type="number"
                  value={formMeasure.leavesCount}
                  onChange={(e) => setFormMeasure({ ...formMeasure, leavesCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số buồng quả:</label>
                <input
                  type="number"
                  value={formMeasure.bunchCount}
                  onChange={(e) => setFormMeasure({ ...formMeasure, bunchCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số quả trái:</label>
                <input
                  type="number"
                  value={formMeasure.fruitsCount}
                  onChange={(e) => setFormMeasure({ ...formMeasure, fruitsCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú phát triển:</label>
                <input
                  type="text"
                  value={formMeasure.notes}
                  onChange={(e) => setFormMeasure({ ...formMeasure, notes: e.target.value })}
                  placeholder="Ghi nhận tán lá, hiện tượng rụng quả..."
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
              >
                Lưu chỉ số
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
