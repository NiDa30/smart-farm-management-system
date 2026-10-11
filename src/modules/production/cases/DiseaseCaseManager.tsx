import React, { useState } from 'react';
import {
  ShieldAlert,
  Bug,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  User,
  Activity,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { DiseaseCase, DiseaseCaseStatus } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const DiseaseCaseManager: React.FC = () => {
  const {
    diseaseCases,
    plants,
    pestDiseases,
    pesticides,
    createDiseaseCase,
    updateDiseaseCaseStatus,
    navigate,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<DiseaseCase | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Case Form State
  const [formPlantCode, setFormPlantCode] = useState('A002');
  const [formDiseaseId, setFormDiseaseId] = useState(pestDiseases[0]?.id || 'pest-01');
  const [formSeverity, setFormSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [formDiagnosis, setFormDiagnosis] = useState('');

  // Status progression counts
  const totalCount = diseaseCases.length;
  const treatingCount = diseaseCases.filter((c) => c.status === 'TREATING').length;
  const monitoringCount = diseaseCases.filter((c) => c.status === 'MONITORING').length;
  const resolvedCount = diseaseCases.filter((c) => c.status === 'RESOLVED').length;

  const filteredCases = diseaseCases.filter((c) => {
    const matchSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.diseaseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPlant = plants.find((p) => p.code === formPlantCode) || plants[0];
    const disease = pestDiseases.find((d) => d.id === formDiseaseId) || pestDiseases[0];

    const newCaseId = `case-${Date.now()}`;
    const newCaseCode = `CASE-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCase: DiseaseCase = {
      id: newCaseId,
      code: newCaseCode,
      plantId: targetPlant.id,
      plantCode: targetPlant.code,
      plantVariety: targetPlant.variety,
      zoneName: targetPlant.zoneName || 'Khu Bắc',
      gardenName: targetPlant.gardenName || 'Vườn 01',
      rowName: targetPlant.rowName || 'Hàng A',
      diseaseId: disease.id,
      diseaseName: disease.name,
      severity: formSeverity,
      detectedDate: new Date().toLocaleDateString('vi-VN'),
      status: 'DETECTED',
      diagnosisNotes: formDiagnosis || 'Phát hiện triệu chứng thực địa, đang tiến hành cách ly và lấy mẫu vi sinh.',
      proposedTreatments: [
        {
          id: `treat-${Date.now()}`,
          title: `Phác đồ chuẩn: ${disease.treatment}`,
          pesticideName: 'Chế phẩm nấm sinh học VietGAP',
          dosage: '50g/bình 16L',
          costVnd: 85000,
          effectiveness: '90%',
        },
      ],
      timeline: [
        {
          date: `${new Date().toLocaleDateString('vi-VN')} 08:00`,
          stage: 'Khởi tạo hồ sơ',
          note: formDiagnosis || 'Ghi nhận dấu hiệu bất thường trên tán lá/đọt non.',
          actor: 'Lê Văn C (Kỹ thuật viên)',
        },
      ],
    };

    createDiseaseCase(newCase);
    setIsCreateOpen(false);
    setSelectedCase(newCase);
    showToast(`Đã tạo Case điều trị thành công: ${newCaseCode}`, 'success');
  };

  const handleStatusChange = (caseId: string, nextStatus: DiseaseCaseStatus) => {
    updateDiseaseCaseStatus(caseId, nextStatus);
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase({
        ...selectedCase,
        status: nextStatus,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản lý Case Điều trị Bệnh
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-bold border border-rose-200">
              Treatment Cases
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi từng cây nhiễm bệnh, tiến trình phác đồ điều trị, nhật ký cách ly và đánh giá khỏi bệnh
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mở Case điều trị mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'ALL'
              ? 'bg-emerald-50/60 border-emerald-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium block">Tổng số Case ghi nhận</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-0.5 block">{totalCount}</span>
          <span className="text-[10px] text-slate-400">Niên vụ 2026</span>
        </div>

        <div
          onClick={() => setStatusFilter('TREATING')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'TREATING'
              ? 'bg-amber-50 border-amber-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-xs text-amber-700 font-medium block">Đang điều trị</span>
          <span className="text-2xl font-bold font-mono text-amber-800 mt-0.5 block">{treatingCount}</span>
          <span className="text-[10px] text-amber-600">Đang phun xịt & bẫy</span>
        </div>

        <div
          onClick={() => setStatusFilter('MONITORING')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'MONITORING'
              ? 'bg-blue-50 border-blue-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-xs text-blue-700 font-medium block">Đang theo dõi phục hồi</span>
          <span className="text-2xl font-bold font-mono text-blue-800 mt-0.5 block">{monitoringCount}</span>
          <span className="text-[10px] text-blue-600">Đọt mới nhú xanh</span>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-xs text-emerald-700 font-medium block">Đã khỏi / Lưu hồ sơ</span>
          <span className="text-2xl font-bold font-mono text-emerald-800 mt-0.5 block">{resolvedCount}</span>
          <span className="text-[10px] text-emerald-600">Phục hồi hoàn toàn</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã case, mã cây (A023...), tên bệnh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DETECTED">Mới phát hiện</option>
              <option value="TREATING">Đang điều trị</option>
              <option value="MONITORING">Đang theo dõi</option>
              <option value="RESOLVED">Đã khỏi</option>
            </select>
          </div>
          <span className="text-slate-400 font-mono text-xs pl-2">
            {filteredCases.length} case
          </span>
        </div>
      </div>

      {/* Cases List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Mã Case</th>
                <th className="py-3 px-3">Cá thể Cây</th>
                <th className="py-3 px-3">Bệnh / Dịch hại</th>
                <th className="py-3 px-3">Mức độ</th>
                <th className="py-3 px-3">Ngày phát hiện</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3">Phác đồ áp dụng</th>
                <th className="py-3 px-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900 group-hover:text-emerald-700">
                    {c.code}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-emerald-800 font-mono">
                      Cây #{c.plantCode}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {c.zoneName} - {c.gardenName} ({c.rowName})
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {c.diseaseName}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        c.severity === 'CRITICAL'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : c.severity === 'HIGH'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {c.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono">
                    {c.detectedDate}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        c.status === 'DETECTED'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : c.status === 'TREATING'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : c.status === 'MONITORING'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {c.status === 'DETECTED'
                        ? 'Mới phát hiện'
                        : c.status === 'TREATING'
                        ? 'Đang điều trị'
                        : c.status === 'MONITORING'
                        ? 'Đang theo dõi'
                        : 'Đã khỏi'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-[200px] truncate">
                    {c.selectedTreatment?.pesticideName || 'Đang cân nhắc phương án'}
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

      {/* Create Case Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Mở Hồ sơ Case Điều trị Bệnh mới
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Cá thể cây nhiễm bệnh:
                  </label>
                  <select
                    value={formPlantCode}
                    onChange={(e) => setFormPlantCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-mono"
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.code}>
                        Cây #{p.code} - {p.variety} ({p.rowName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Loại sâu bệnh / Dịch hại:
                  </label>
                  <select
                    value={formDiseaseId}
                    onChange={(e) => setFormDiseaseId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    {pestDiseases.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mức độ gây hại:
                </label>
                <div className="flex items-center gap-4">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((lvl) => (
                    <label key={lvl} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="severity"
                        value={lvl}
                        checked={formSeverity === lvl}
                        onChange={() => setFormSeverity(lvl)}
                        className="text-emerald-600"
                      />
                      <span>
                        {lvl === 'LOW'
                          ? 'Nhẹ'
                          : lvl === 'MEDIUM'
                          ? 'Trung bình'
                          : lvl === 'HIGH'
                          ? 'Nặng'
                          : 'Rất nguy cấp'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mô tả chẩn đoán & Triệu chứng ghi nhận:
                </label>
                <textarea
                  rows={3}
                  value={formDiagnosis}
                  onChange={(e) => setFormDiagnosis(e.target.value)}
                  placeholder="Ghi nhận số bẹ lá bị hại, mật độ sâu hoặc vết nấm đốm hoại tử..."
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
                  Khởi tạo Case điều trị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Details Drawer */}
      <RightDrawer
        isOpen={!!selectedCase}
        onClose={() => setSelectedCase(null)}
        title={selectedCase?.code || 'Chi tiết Case'}
        subtitle={`Cây #${selectedCase?.plantCode} - ${selectedCase?.diseaseName}`}
        width="w-full sm:w-[560px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setSelectedCase(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            <div className="flex items-center gap-2">
              {selectedCase?.status === 'DETECTED' && (
                <button
                  onClick={() => handleStatusChange(selectedCase.id, 'TREATING')}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                >
                  Bắt đầu điều trị
                </button>
              )}
              {selectedCase?.status === 'TREATING' && (
                <button
                  onClick={() => handleStatusChange(selectedCase.id, 'MONITORING')}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Chuyển sang theo dõi
                </button>
              )}
              {selectedCase?.status === 'MONITORING' && (
                <button
                  onClick={() => handleStatusChange(selectedCase.id, 'RESOLVED')}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  Đánh dấu đã khỏi bệnh
                </button>
              )}
            </div>
          </div>
        }
      >
        {selectedCase && (
          <div className="space-y-5 text-xs">
            {/* Header Status Bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Trạng thái hiện tại:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedCase.status === 'DETECTED'
                    ? 'Mới phát hiện'
                    : selectedCase.status === 'TREATING'
                    ? 'Đang điều trị phác đồ'
                    : selectedCase.status === 'MONITORING'
                    ? 'Đang theo dõi phục hồi'
                    : 'Đã khỏi & Lưu hồ sơ'}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedCase(null);
                  navigate('/production/plants');
                }}
                className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded border border-emerald-200 flex items-center gap-1"
              >
                Hồ sơ cây #{selectedCase.plantCode} &rarr;
              </button>
            </div>

            {/* Diagnostic */}
            <div>
              <span className="font-bold text-slate-800 block mb-1">Chẩn đoán ban đầu:</span>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                {selectedCase.diagnosisNotes}
              </p>
            </div>

            {/* Selected Treatment Regimen */}
            {selectedCase.selectedTreatment && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Phác đồ sinh học đã áp dụng:
                </span>
                <div className="text-emerald-900 font-semibold">
                  {selectedCase.selectedTreatment.pesticideName}
                </div>
                <div className="text-slate-600">
                  Liều lượng: {selectedCase.selectedTreatment.dosage} • Người thực hiện:{' '}
                  {selectedCase.selectedTreatment.appliedBy}
                </div>
                {selectedCase.selectedTreatment.resultNotes && (
                  <div className="text-slate-700 bg-white/80 p-2 rounded border border-emerald-200 mt-1 italic">
                    Ghi chú theo dõi: {selectedCase.selectedTreatment.resultNotes}
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider block mb-2">
                Nhật ký tiến trình điều trị ({selectedCase.timeline.length})
              </span>
              <div className="relative border-l-2 border-emerald-500/30 pl-4 space-y-4 ml-1">
                {selectedCase.timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white"></span>
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="font-mono">{item.date}</span>
                      <span className="font-medium text-slate-600">{item.actor}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">
                      {item.stage}
                    </div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed bg-white p-2 rounded border border-slate-100">
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
