import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  Calculator,
  ShieldCheck,
  Package,
  AlertCircle,
  Clock,
  Coins,
  ChevronRight,
  Droplets,
  Plus,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Pesticide } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const PesticideList: React.FC = () => {
  const { pesticides, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [activePesticide, setActivePesticide] = useState<Pesticide | null>(null);

  // Dosage Calculator Modal State
  const [calcPesticide, setCalcPesticide] = useState<Pesticide | null>(null);
  const [treeCount, setTreeCount] = useState<number>(30);

  const filteredPesticides = pesticides.filter((p) => {
    const matchSearch =
      p.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.uses.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Thuốc BVTV Sinh học & An toàn
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              VietGAP / GlobalGAP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý danh mục chế phẩm sinh học, nấm đối kháng, bẫy Pheromone và kiểm soát thời gian cách ly (PHI)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 text-emerald-800 text-xs px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Chế phẩm đạt tiêu chuẩn an toàn hữu cơ</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên thương mại, hoạt chất, sâu bệnh mục tiêu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Nhóm chế phẩm:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả nhóm</option>
              <option value="BIOLOGICAL">Chế phẩm sinh học (Bio)</option>
              <option value="PHEROMONE">Bẫy sinh học Pheromone</option>
              <option value="ORGANIC">Khoáng / Dầu hữu cơ</option>
              <option value="CHEMICAL">Hóa học (Hạn chế)</option>
            </select>
          </div>
          <span className="text-slate-400 font-mono text-xs pl-2">
            {filteredPesticides.length} mục
          </span>
        </div>
      </div>

      {/* Pesticides Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Mã & Chế phẩm</th>
                <th className="py-3 px-3">Hoạt chất / Chủng loài</th>
                <th className="py-3 px-3">Phân loại</th>
                <th className="py-3 px-3">Thời gian cách ly (PHI)</th>
                <th className="py-3 px-3">Liều lượng khuyến nghị</th>
                <th className="py-3 px-3">Tồn kho</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPesticides.map((pest) => (
                <tr
                  key={pest.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  onClick={() => setActivePesticide(pest)}
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {pest.tradeName}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">{pest.code}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-mono max-w-[200px] truncate">
                    {pest.activeIngredient}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        pest.category === 'BIOLOGICAL'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : pest.category === 'PHEROMONE'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}
                    >
                      {pest.category === 'BIOLOGICAL'
                        ? 'Sinh học'
                        : pest.category === 'PHEROMONE'
                        ? 'Pheromone'
                        : 'Hữu cơ'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    {pest.safetyIntervalDays === 0 ? (
                      <span className="text-emerald-600 font-bold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> 0 ngày (Không tồn dư)
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {pest.safetyIntervalDays} ngày
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">
                    {pest.dosage}
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-800">
                    {pest.stockQty} {pest.stockUnit}
                  </td>
                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setCalcPesticide(pest)}
                        title="Tính toán liều lượng theo số cây"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setActivePesticide(pest)}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded text-[11px]"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Dosage Calculator Modal */}
      {calcPesticide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Máy tính liều lượng phun xịt
                </h3>
              </div>
              <button
                onClick={() => setCalcPesticide(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block mb-0.5">Sản phẩm chọn:</span>
              <span className="font-semibold text-slate-900 text-xs block">
                {calcPesticide.tradeName}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Định mức gốc: {calcPesticide.dosage}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Số lượng cây cần xử lý:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={treeCount}
                  onChange={(e) => setTreeCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
                <span className="text-xs text-slate-500 font-medium">cây</span>
              </div>
            </div>

            {/* Calculations Result */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>Ước tính nước pha (0.8L/cây đọt):</span>
                <span className="font-bold font-mono text-slate-900">
                  {(treeCount * 0.8).toFixed(1)} Lít
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Số bình phun 16L quy đổi:</span>
                <span className="font-bold font-mono text-slate-900">
                  {Math.ceil((treeCount * 0.8) / 16)} bình
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 border-t border-emerald-200/60 pt-2">
                <span>Tổng lượng chế phẩm ước tính:</span>
                <span className="font-bold font-mono text-emerald-800 text-sm">
                  {(treeCount * 3.2).toFixed(0)} gram
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Chi phí dự kiến:</span>
                <span className="font-bold font-mono text-slate-900">
                  {((treeCount * 3.2 * (calcPesticide.priceVnd / 200)).toLocaleString('vi-VN'))} đ
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCalcPesticide(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setCalcPesticide(null);
                  showToast(`Đã xuất thông số pha thuốc cho ${treeCount} cây`, 'success');
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Áp dụng vào Phiếu phun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Right Drawer */}
      <RightDrawer
        isOpen={!!activePesticide}
        onClose={() => setActivePesticide(null)}
        title={activePesticide?.tradeName || 'Chi tiết chế phẩm'}
        subtitle={activePesticide?.code}
        width="w-full sm:w-[500px]"
      >
        {activePesticide && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Hoạt chất chính:</span>
                <span className="font-semibold text-slate-900">{activePesticide.activeIngredient}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nhà cung cấp:</span>
                <span className="text-slate-800">{activePesticide.supplier}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Đơn giá niêm yết:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {activePesticide.priceVnd.toLocaleString('vi-VN')} đ / {activePesticide.stockUnit}
                </span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Công dụng điều trị:</span>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                {activePesticide.uses}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Liều lượng khuyến nghị:</span>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-mono">
                {activePesticide.dosage}
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
              <span className="font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Lưu ý an toàn và thời gian cách ly:
              </span>
              <p className="text-amber-800 leading-relaxed">
                {activePesticide.precautions}
              </p>
              <div className="mt-2 text-amber-950 font-bold font-mono">
                Thời gian cách ly bắt buộc trước thu hoạch: {activePesticide.safetyIntervalDays} ngày.
              </div>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
