import React, { useState } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Calendar,
  TreePine,
  Sparkles,
  Droplets,
  Sprout,
  ExternalLink,
  Printer,
  Copy,
  Clock,
  Award,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Plant, HarvestBatch } from '../../../types';

export const TraceabilityView: React.FC = () => {
  const {
    activeFarm,
    plants,
    harvestBatches,
    lifecycleEvents,
    fertilizationLogs,
    showToast,
  } = useApp();

  const [queryCode, setQueryCode] = useState<string>('A023');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(
    plants.find((p) => p.code === 'A023') || plants[0]
  );
  const [selectedLot, setSelectedLot] = useState<HarvestBatch | null>(
    harvestBatches[0] || null
  );

  const handleSearch = (code: string) => {
    setQueryCode(code);
    const clean = code.trim().toUpperCase();

    // Check if it matches a plant
    const matchedPlant = plants.find(
      (p) => p.code.toUpperCase() === clean || p.id.toUpperCase() === clean
    );
    if (matchedPlant) {
      setSelectedPlant(matchedPlant);
      showToast(`Đã tải hồ sơ truy xuất cho cây #${matchedPlant.code}`, 'success');
      return;
    }

    // Check if it matches a lot
    const matchedLot = harvestBatches.find(
      (b) =>
        b.generatedLotCode.toUpperCase().includes(clean) ||
        b.code.toUpperCase() === clean
    );
    if (matchedLot) {
      setSelectedLot(matchedLot);
      // match first plant of lot
      const firstPlant = plants.find((p) => p.code === matchedLot.selectedPlants[0]);
      if (firstPlant) setSelectedPlant(firstPlant);
      showToast(`Đã tải hồ sơ truy xuất Lô ${matchedLot.generatedLotCode}`, 'success');
      return;
    }

    showToast(`Không tìm thấy mã '${code}'. Hãy thử A023, A001 hoặc mã Lô.`, 'warning');
  };

  const handleCopyLink = () => {
    showToast('Đã sao chép liên kết truy xuất công khai vào bộ nhớ tạm!', 'success');
  };

  const handlePrint = () => {
    showToast('Đang tạo tem nhãn QR truy xuất nguồn gốc chuẩn in mã vạch...', 'info');
  };

  // Lifecycle events for this plant
  const eventsForPlant = lifecycleEvents.filter(
    (e) => !selectedPlant || e.plantId === selectedPlant.id
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Truy xuất Nguồn gốc & Nhật ký Vòng đời
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-200">
              Traceability Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cổng thông tin minh bạch hóa toàn bộ vòng đời từng cá thể cây và lô thu hoạch cho người tiêu dùng và đối tác
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Tem QR</span>
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-2xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao chép Link QR</span>
          </button>
        </div>
      </div>

      {/* Search & Sample Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Nhập mã cây (vd: A023, A001) hoặc Mã Lô hàng (vd: LOT-COC-20261002-KB)..."
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(queryCode)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-600 transition-colors font-mono"
            />
          </div>
          <button
            onClick={() => handleSearch(queryCode)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" /> Tra cứu Nguồn gốc
          </button>
        </div>

        {/* Quick Sample Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600">
          <span className="text-[11px] text-slate-400 font-medium">Mẫu tra cứu nhanh:</span>
          <button
            onClick={() => handleSearch('A023')}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 transition-colors font-mono text-[11px]"
          >
            Cây #A023 (Dừa Xiêm Xanh)
          </button>
          <button
            onClick={() => handleSearch('A001')}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 transition-colors font-mono text-[11px]"
          >
            Cây #A001 (Thu hoạch ổn định)
          </button>
          <button
            onClick={() => handleSearch('LOT-COC-20261002-KB')}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 transition-colors font-mono text-[11px]"
          >
            Lô Xuất khẩu LOT-COC-20261002-KB
          </button>
        </div>
      </div>

      {/* Traceability Certificate View Card */}
      {selectedPlant && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Certificate Header Banner */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-[#0F2D32] text-white p-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase tracking-wider font-bold border border-emerald-400/30">
                    Verified Digital Certificate
                  </span>
                  <span className="text-[11px] text-emerald-200 font-medium">
                    Hệ thống Smart Farm IoT Bến Tre
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">
                  Chứng chỉ Truy xuất Nguồn gốc Cá thể Cây #{selectedPlant.code}
                </h2>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  {activeFarm.name} • {selectedPlant.zoneName} - {selectedPlant.gardenName} ({selectedPlant.rowName})
                </p>
              </div>

              {/* QR Code Stamp Box */}
              <div className="bg-white text-slate-900 p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3 shrink-0 self-start md:self-center">
                <div className="w-16 h-16 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                  <QrCode className="w-12 h-12 text-emerald-400" />
                </div>
                <div className="text-left font-mono text-[10px] space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs">QR Traceability</div>
                  <div className="text-slate-500">ID: {selectedPlant.code}</div>
                  <div className="text-emerald-700 font-bold">VietGAP Certified</div>
                  <div className="text-slate-400">GPS: 10.3356, 106.3552</div>
                </div>
              </div>
            </div>
          </div>

          {/* Plant Core Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 border-b border-slate-200 bg-slate-50/50 text-xs">
            <div className="p-4">
              <span className="text-slate-400 block text-[10px] font-medium">Giống cây trồng:</span>
              <span className="font-bold text-slate-900 block mt-0.5">{selectedPlant.variety}</span>
              <span className="text-[10px] text-emerald-700 font-medium">F1 nguồn gốc Bến Tre</span>
            </div>
            <div className="p-4">
              <span className="text-slate-400 block text-[10px] font-medium">Ngày xuống giống:</span>
              <span className="font-bold text-slate-900 font-mono block mt-0.5">
                {selectedPlant.plantedDate}
              </span>
              <span className="text-[10px] text-slate-500">{selectedPlant.ageYearsText}</span>
            </div>
            <div className="p-4">
              <span className="text-slate-400 block text-[10px] font-medium">Giai đoạn sinh trưởng:</span>
              <span className="font-bold text-slate-900 block mt-0.5">{selectedPlant.stage}</span>
              <span className="text-[10px] text-slate-500">Cao {selectedPlant.heightMeters}m • {selectedPlant.bunchCount} buồng</span>
            </div>
            <div className="p-4">
              <span className="text-slate-400 block text-[10px] font-medium">Chỉ số an toàn bảo vệ TV:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Đạt chuẩn an toàn (0 PHI)
              </span>
              <span className="text-[10px] text-slate-500">100% Chế phẩm sinh học</span>
            </div>
          </div>

          {/* Verified Timeline Audit Trail */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Nhật ký vòng đời thực địa (Lifecycle Audit Trail)
                </h3>
                <p className="text-xs text-slate-500">
                  Dữ liệu được ký số và ghi nhận tự động từ ứng dụng thực địa của kỹ thuật viên
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                {eventsForPlant.length} Mốc sự kiện
              </span>
            </div>

            {/* Timeline component */}
            <div className="relative border-l-2 border-emerald-500/40 pl-6 space-y-6 ml-2 pt-2">
              {eventsForPlant.map((ev, idx) => (
                <div key={idx} className="relative group">
                  {/* Dot */}
                  <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs group-hover:scale-125 transition-transform"></span>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 mb-1">
                    <span className="font-bold text-slate-900 text-xs">
                      {ev.title}
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono">
                      <span>{ev.date}</span>
                      <span>•</span>
                      <span className="text-slate-600 font-sans">{ev.actor}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                    {ev.description}
                  </p>
                </div>
              ))}
            </div>

            {/* GlobalGAP / VietGAP Verification Seal */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>
                  Sản phẩm tuân thủ quy chuẩn kỹ thuật Quốc gia về canh tác dừa hữu cơ bền vững
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                Hash: 0x9f4a...8b12 (Smart Farm Provenance)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
