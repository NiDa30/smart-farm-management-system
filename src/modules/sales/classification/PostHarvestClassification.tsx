import React, { useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Calendar,
  TreePine,
  ShieldCheck,
  FileCheck,
  Plus,
  Info,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const PostHarvestClassificationView: React.FC = () => {
  const {
    harvestBatches,
    commercialProducts,
    classifications,
    performClassification,
    activeUser,
    navigate,
  } = useApp();

  // Find batches that are pending classification or storage
  const availableBatches = harvestBatches;
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    availableBatches[0]?.id || 'HARV-001'
  );

  const selectedBatch = availableBatches.find((b) => b.id === selectedBatchId) || availableBatches[0];

  // Form classification inputs for the selected batch
  const totalFruits = selectedBatch?.totalFruitsCount || 1000;
  const [qtyA, setQtyA] = useState<number>(Math.round(totalFruits * 0.75));
  const [qtyB, setQtyB] = useState<number>(Math.round(totalFruits * 0.2));
  const [qtyReject, setQtyReject] = useState<number>(totalFruits - Math.round(totalFruits * 0.75) - Math.round(totalFruits * 0.2));

  const [productIdA, setProductIdA] = useState<string>('PROD-COC-A');
  const [productIdB, setProductIdB] = useState<string>('PROD-COC-B');
  const [notesA, setNotesA] = useState<string>('Trái căng mọng, cuống tươi, độ brix đo đạt >7.5, đạt chuẩn nhà hàng');
  const [notesB, setNotesB] = useState<string>('Trái nhỏ dưới 1.1kg, vỏ rám nhẹ, nước ngọt đạt chuẩn');
  const [notesReject, setNotesReject] = useState<string>('Quả nứt cuống, dập do va đập thu hái; chuyển ủ phân vi sinh');

  // Handle batch selection change
  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
    const batch = availableBatches.find((b) => b.id === batchId);
    if (batch) {
      const total = batch.totalFruitsCount || 1000;
      const a = Math.round(total * 0.75);
      const b_val = Math.round(total * 0.2);
      const rej = total - a - b_val;
      setQtyA(a);
      setQtyB(b_val);
      setQtyReject(rej);
    }
  };

  const currentSum = Number(qtyA) + Number(qtyB) + Number(qtyReject);
  const isValidSum = currentSum === totalFruits;

  const handleConfirmClassification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidSum) {
      alert(`Tổng số lượng phân loại (${currentSum}) phải bằng đúng tổng số lượng thu hoạch (${totalFruits})!`);
      return;
    }

    const prodA = commercialProducts.find((p) => p.id === productIdA);
    const prodB = commercialProducts.find((p) => p.id === productIdB);

    performClassification({
      harvestBatchId: selectedBatch.id,
      harvestBatchCode: selectedBatch.code,
      harvestDate: selectedBatch.date,
      areaName: `${selectedBatch.zoneName} - ${selectedBatch.gardenName}`,
      plantCodes: selectedBatch.selectedPlants || ['A001', 'A002', 'A003'],
      totalHarvestQty: totalFruits,
      unit: 'trái',
      classifiedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      inspectorName: `${activeUser.name} (QC Lead)`,
      results: [
        {
          grade: 'A',
          qty: Number(qtyA),
          percentage: Math.round((Number(qtyA) / totalFruits) * 1000) / 10,
          targetProductId: productIdA,
          targetProductName: prodA?.name || 'Dừa loại A',
          targetLotCode: `LOT-${prodA?.sku || 'COC-A'}-${selectedBatch.code.replace('HARV-', '').replace(/-/g, '')}`,
          notes: notesA,
        },
        {
          grade: 'B',
          qty: Number(qtyB),
          percentage: Math.round((Number(qtyB) / totalFruits) * 1000) / 10,
          targetProductId: productIdB,
          targetProductName: prodB?.name || 'Dừa loại B',
          targetLotCode: `LOT-${prodB?.sku || 'COC-B'}-${selectedBatch.code.replace('HARV-', '').replace(/-/g, '')}`,
          notes: notesB,
        },
        {
          grade: 'REJECT',
          qty: Number(qtyReject),
          percentage: Math.round((Number(qtyReject) / totalFruits) * 1000) / 10,
          notes: notesReject,
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              QC & Phân loại chất lượng
            </span>
            <span className="text-xs text-slate-500 font-mono">Screen 07: Post-Harvest QC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Phân loại Sau Thu hoạch → Nhập kho Thành phẩm
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chuyển giao dữ liệu từ Phân hệ 2 (Sản xuất) sang Phân hệ 5 (Kinh doanh) — Hàng lỗi không tính vào kho có thể bán
          </p>
        </div>

        <button
          onClick={() => navigate('/sales/inventory')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Layers className="w-4 h-4" />
          <span>Xem Kho thành phẩm</span>
        </button>
      </div>

      {/* Principle 1 Explanation Callout */}
      <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-300 text-xs text-emerald-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Nguyên tắc Nghiệp vụ 1: Thu hoạch không đồng nghĩa với hàng bán được</span>
        </div>
        <p className="text-emerald-800 leading-relaxed">
          Đợt thu hoạch từ các cây trồng cần qua kiểm định chất lượng (QC) để phân định tỷ lệ:
          <strong> Loại A</strong> (Đạt chuẩn cao), <strong>Loại B</strong> (Tiêu chuẩn phổ thông) và <strong>Reject</strong> (Nứt vỏ, hư hỏng).
          Chỉ có sản phẩm đạt Loại A & B mới được kích hoạt mã Lô thành phẩm và ghi nhận tăng <em>Tồn kho bán được (Available)</em>.
          Sản phẩm loại bỏ được đưa vào xử lý phụ phẩm nông nghiệp, tuyệt đối không cho phép bán trên hệ thống.
        </p>
      </div>

      {/* Main Form & Batch Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Classification Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-600" />
              <span>Biên bản Phân loại Chất lượng Đợt Thu hoạch</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Mã QC: CLASS-20261005-AUTO</span>
          </div>

          <form onSubmit={handleConfirmClassification} className="space-y-5 text-xs">
            {/* 1. Chọn đợt thu hoạch từ Phân hệ 2 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-2">
                  <TreePine className="w-4 h-4 text-emerald-600" />
                  <span>Chọn đợt thu hoạch từ Phân hệ 2 (Sản xuất) *</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  Dữ liệu tự động đồng bộ từ Harvest Manager
                </span>
              </div>

              <select
                value={selectedBatchId}
                onChange={(e) => handleSelectBatch(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {availableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.zoneName} ({b.gardenName}) • Ngày {b.date} • Thu hoạch: {b.totalFruitsCount} trái (Trọng lượng: {b.totalWeightKg} kg)
                  </option>
                ))}
              </select>

              {selectedBatch && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-slate-600 text-[11px]">
                  <div>
                    Khu vực: <strong>{selectedBatch.zoneName}</strong>
                  </div>
                  <div>
                    Ngày hái: <strong>{selectedBatch.date}</strong>
                  </div>
                  <div>
                    Số cây hái: <strong>{selectedBatch.selectedPlants?.length || 9} cây</strong>
                  </div>
                  <div>
                    Người thu hái: <strong>{selectedBatch.harvestedBy || 'Đội thu hoạch 01'}</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-4 text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded">
                    Mã cây nguồn gốc: <strong>{selectedBatch.selectedPlants?.join(', ') || 'A001, A002, A003, A004, A005, A010, A015, A023, A030'}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Bảng phân loại chi tiết (Classification Table - Section 16) */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                <span>Thiết lập sản phẩm thương mại tạo thành</span>
                <span className={`text-xs ${isValidSum ? 'text-emerald-700' : 'text-red-600 font-bold'}`}>
                  Tổng phân loại: {currentSum} / {totalFruits} trái {isValidSum ? '✓ Khớp' : '⚠️ Sai lệch'}
                </span>
              </h3>

              {/* Row Grade A */}
              <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      A
                    </span>
                    <span className="font-bold text-emerald-900 text-xs">Phân loại A — Xuất khẩu / VIP</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-800">
                    {Math.round((qtyA / (totalFruits || 1)) * 100)}% tổng đợt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Số lượng đạt (trái) *</label>
                    <input
                      type="number"
                      value={qtyA}
                      onChange={(e) => setQtyA(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-bold text-emerald-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">SKU thương mại tương ứng *</label>
                    <select
                      value={productIdA}
                      onChange={(e) => setProductIdA(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
                    >
                      {commercialProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} ({p.standardPriceVnd.toLocaleString('vi-VN')}đ/{p.salesUnit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={notesA}
                    onChange={(e) => setNotesA(e.target.value)}
                    placeholder="Ghi chú chất lượng độ brix, trọng lượng..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-600 text-[11px]"
                  />
                </div>
              </div>

              {/* Row Grade B */}
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      B
                    </span>
                    <span className="font-bold text-blue-900 text-xs">Phân loại B — Tiêu chuẩn thường</span>
                  </div>
                  <span className="text-xs font-bold text-blue-800">
                    {Math.round((qtyB / (totalFruits || 1)) * 100)}% tổng đợt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Số lượng đạt (trái) *</label>
                    <input
                      type="number"
                      value={qtyB}
                      onChange={(e) => setQtyB(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-bold text-blue-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">SKU thương mại tương ứng *</label>
                    <select
                      value={productIdB}
                      onChange={(e) => setProductIdB(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded"
                    >
                      {commercialProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} ({p.standardPriceVnd.toLocaleString('vi-VN')}đ/{p.salesUnit})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={notesB}
                    onChange={(e) => setNotesB(e.target.value)}
                    placeholder="Ghi chú đặc điểm loại B..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-600 text-[11px]"
                  />
                </div>
              </div>

              {/* Row Reject (Hàng lỗi không nhập kho bán) */}
              <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-500 text-white font-bold flex items-center justify-center text-xs">
                      ✕
                    </span>
                    <span className="font-bold text-slate-800 text-xs">Reject — Loại bỏ / Không thể bán</span>
                  </div>
                  <span className="text-xs font-bold text-red-600">
                    {Math.round((qtyReject / (totalFruits || 1)) * 100)}% (Không tăng tồn kho)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Số lượng lỗi (trái)</label>
                    <input
                      type="number"
                      value={qtyReject}
                      onChange={(e) => setQtyReject(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-bold text-red-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 font-semibold mb-1">Phương án xử lý phụ phẩm</label>
                    <input
                      type="text"
                      disabled
                      value="Ủ phân compost hữu cơ trang trại (Không tạo mã SKU)"
                      className="w-full px-3 py-1.5 bg-slate-200 border border-slate-300 rounded text-slate-600 italic"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={notesReject}
                    onChange={(e) => setNotesReject(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-600 text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* Confirm action button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-slate-500 text-xs">
                Sau khi xác nhận: Kho thành phẩm sẽ tăng{' '}
                <strong className="text-emerald-800">+{qtyA} Loại A</strong> và{' '}
                <strong className="text-blue-800">+{qtyB} Loại B</strong>.
              </div>
              <button
                type="submit"
                disabled={!isValidSum}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2 ${
                  isValidSum
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận phân loại & Nhập kho TP</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Lịch sử phân loại (Audit Logs) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Lịch sử phân loại trước đây</span>
            </h3>

            <div className="space-y-3 divide-y divide-slate-100">
              {classifications.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-800">{item.code}</span>
                    <span className="text-[10px] text-slate-400">{item.classifiedDate}</span>
                  </div>

                  <div className="text-slate-700 font-medium">
                    Từ đợt: <span className="font-mono text-slate-900">{item.harvestBatchCode}</span> ({item.areaName})
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Tổng: <strong>{item.totalHarvestQty.toLocaleString('vi-VN')} {item.unit}</strong> • QC: {item.inspectorName}
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1">
                    {item.results.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-1 rounded ${
                          r.grade === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.grade === 'B'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <div className="font-bold">{r.qty}</div>
                        <div>{r.grade === 'REJECT' ? 'Hủy' : `Hạng ${r.grade}`}</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Cây nguồn gốc: {item.plantCodes.slice(0, 5).join(', ')}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
