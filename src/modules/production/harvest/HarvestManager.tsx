import React, { useState } from 'react';
import {
  Wheat,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Scale,
  Award,
  QrCode,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { HarvestBatch } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const HarvestManager: React.FC = () => {
  const { harvestBatches, createHarvestBatch, navigate, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<HarvestBatch | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Harvest Batch Form State
  const [formZone, setFormZone] = useState('Khu Bắc');
  const [formGarden, setFormGarden] = useState('Vườn 01');
  const [formWeight, setFormWeight] = useState<number>(380);
  const [formFruits, setFormFruits] = useState<number>(320);
  const [formGradeA, setFormGradeA] = useState<number>(290);
  const [formGradeB, setFormGradeB] = useState<number>(70);
  const [formReject, setFormReject] = useState<number>(20);
  const [formNotes, setFormNotes] = useState('');

  // Calculations
  const totalWeight = harvestBatches.reduce((sum, b) => sum + b.totalWeightKg, 0);
  const totalFruits = harvestBatches.reduce((sum, b) => sum + b.totalFruitsCount, 0);
  const totalGradeA = harvestBatches.reduce((sum, b) => sum + b.gradeA_Kg, 0);
  const gradeARatio = totalWeight > 0 ? Math.round((totalGradeA / totalWeight) * 100) : 0;

  const filteredBatches = harvestBatches.filter(
    (b) =>
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.generatedLotCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.zoneName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = new Date().toLocaleDateString('vi-VN');
    const newCode = `HARV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLotCode = `LOT-COC-${Date.now().toString().slice(-6)}-KB`;

    const newBatch: HarvestBatch = {
      id: `harv-${Date.now()}`,
      code: newCode,
      date: dateStr,
      zoneName: formZone,
      gardenName: formGarden,
      selectedPlants: ['A001', 'A002', 'A003', 'A004', 'A005', 'B001'],
      totalFruitsCount: formFruits,
      totalWeightKg: formWeight,
      gradeA_Kg: formGradeA,
      gradeB_Kg: formGradeB,
      reject_Kg: formReject,
      notes: formNotes || 'Thu hoạch dừa lứa chín đồng đều, đạt chuẩn kiểm nghiệm an toàn vi sinh.',
      generatedLotCode: newLotCode,
    };

    createHarvestBatch(newBatch);
    setIsCreateOpen(false);
    setSelectedBatch(newBatch);
    showToast(`Đã ghi nhận Lô thu hoạch mới: ${newCode}`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Thu hoạch & Sản lượng Nông sản
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
              Harvest & Yield
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các đợt thu hoạch theo từng lô vườn, phân loại chất lượng quả (Loại 1, Loại 2) và cấp mã truy xuất
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ghi nhận Đợt thu hoạch mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Tổng sản lượng thu</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalWeight.toLocaleString('vi-VN')} kg
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">
            Tương đương {(totalWeight / 1000).toFixed(2)} tấn dừa gáo
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Số lượng quả</span>
            <Wheat className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalFruits.toLocaleString('vi-VN')} quả
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Bình quân 1.15 kg / quả
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Tỷ lệ Loại 1 (Xuất khẩu)</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {gradeARatio}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-emerald-600 h-1.5 rounded-full"
              style={{ width: `${gradeARatio}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Mã Lô truy xuất</span>
            <QrCode className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {harvestBatches.length} Lô
          </div>
          <span className="text-[10px] text-purple-700 font-medium">
            100% Đã cấp QR Traceability
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đợt thu, mã lô (LOT-COC...), phân khu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{filteredBatches.length} đợt thu hoạch</span>
        </div>
      </div>

      {/* Harvest Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Mã Đợt & Ngày</th>
                <th className="py-3 px-3">Khu vực / Lô vườn</th>
                <th className="py-3 px-3">Sản lượng (kg)</th>
                <th className="py-3 px-3">Số lượng quả</th>
                <th className="py-3 px-3">Cơ cấu phẩm cấp (Loại 1 / 2 / Dạt)</th>
                <th className="py-3 px-3">Mã Lô Traceability</th>
                <th className="py-3 px-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedBatch(b)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-700">
                      {b.code}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{b.date}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800">{b.zoneName}</div>
                    <div className="text-[10px] text-slate-400">{b.gardenName}</div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {b.totalWeightKg.toLocaleString('vi-VN')} kg
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {b.totalFruitsCount} quả
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {b.gradeA_Kg} kg (L1)
                      </span>
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {b.gradeB_Kg} kg (L2)
                      </span>
                      <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {b.reject_Kg} kg
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                      <QrCode className="w-3 h-3" /> {b.generatedLotCode}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-slate-400 group-hover:text-emerald-700 text-xs font-medium inline-flex items-center gap-0.5">
                      Xem <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Harvest Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Ghi nhận Đợt Thu hoạch Nông sản
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Phân khu thu hoạch:
                  </label>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    <option value="Khu Bắc">Khu Bắc</option>
                    <option value="Khu Trung">Khu Trung</option>
                    <option value="Khu Nam">Khu Nam</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Lô Vườn:
                  </label>
                  <select
                    value={formGarden}
                    onChange={(e) => setFormGarden(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    <option value="Vườn 01">Vườn 01</option>
                    <option value="Vườn 02">Vườn 02</option>
                    <option value="Vườn 03">Vườn 03</option>
                    <option value="Vườn 04">Vườn 04</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tổng sản lượng (kg):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formWeight}
                    onChange={(e) => setFormWeight(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Số lượng quả:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formFruits}
                    onChange={(e) => setFormFruits(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-800 block">
                  Phân loại phẩm cấp (kg):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-emerald-800 font-bold block mb-0.5">
                      Loại 1 (Xuất khẩu)
                    </label>
                    <input
                      type="number"
                      value={formGradeA}
                      onChange={(e) => setFormGradeA(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 font-mono text-xs border border-emerald-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber-800 font-bold block mb-0.5">
                      Loại 2 (Nội địa)
                    </label>
                    <input
                      type="number"
                      value={formGradeB}
                      onChange={(e) => setFormGradeB(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 font-mono text-xs border border-amber-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-bold block mb-0.5">
                      Dạt (Phế phẩm)
                    </label>
                    <input
                      type="number"
                      value={formReject}
                      onChange={(e) => setFormReject(parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Ghi chú chất lượng & Brix:
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Gáo dày, nước ngọt thanh, độ brix đạt 7.2..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Tạo Lô thu hoạch & Mã QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Details Drawer */}
      <RightDrawer
        isOpen={!!selectedBatch}
        onClose={() => setSelectedBatch(null)}
        title={selectedBatch?.code || 'Chi tiết Lô thu hoạch'}
        subtitle={`Lô: ${selectedBatch?.generatedLotCode}`}
        width="w-full sm:w-[500px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setSelectedBatch(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                setSelectedBatch(null);
                navigate('/production/traceability');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5" /> Xem Trang Truy xuất Nguồn gốc
            </button>
          </div>
        }
      >
        {selectedBatch && (
          <div className="space-y-5 text-xs">
            {/* Overview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Ngày thu hoạch:</span>
                <span className="font-semibold text-slate-900 font-mono">{selectedBatch.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Vùng thu hoạch:</span>
                <span className="font-semibold text-slate-800">
                  {selectedBatch.zoneName} - {selectedBatch.gardenName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mã Lô thương mại:</span>
                <span className="font-bold text-purple-700 font-mono">
                  {selectedBatch.generatedLotCode}
                </span>
              </div>
            </div>

            {/* Quality Classification */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 uppercase tracking-wider block">
                Cơ cấu sản lượng & Phẩm cấp:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <span className="text-[10px] text-emerald-800 font-medium block">Loại 1 (Xuất khẩu)</span>
                  <span className="text-base font-bold font-mono text-emerald-900 block">
                    {selectedBatch.gradeA_Kg} kg
                  </span>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <span className="text-[10px] text-amber-800 font-medium block">Loại 2 (Nội địa)</span>
                  <span className="text-base font-bold font-mono text-amber-900 block">
                    {selectedBatch.gradeB_Kg} kg
                  </span>
                </div>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-center">
                  <span className="text-[10px] text-slate-600 font-medium block">Dạt</span>
                  <span className="text-base font-bold font-mono text-slate-800 block">
                    {selectedBatch.reject_Kg} kg
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedBatch.notes && (
              <div>
                <span className="font-bold text-slate-900 block mb-1">Ghi chú chất lượng:</span>
                <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                  {selectedBatch.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
