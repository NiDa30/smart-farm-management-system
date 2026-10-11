import React, { useState, useMemo } from 'react';
import {
  Bug,
  Search,
  Filter,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Sparkles,
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { PestDisease } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const DiseaseLibrary: React.FC = () => {
  const { pestDiseases, pesticides, navigate, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedPart, setSelectedPart] = useState<string>('ALL');
  const [activeDisease, setActiveDisease] = useState<PestDisease | null>(null);

  // Filtered list
  const filteredDiseases = useMemo(() => {
    return pestDiseases.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.symptoms.toLowerCase().includes(searchTerm.toLowerCase());

      const matchSeverity =
        selectedSeverity === 'ALL' || d.severity === selectedSeverity;

      const matchPart =
        selectedPart === 'ALL' ||
        d.affectedParts.toLowerCase().includes(selectedPart.toLowerCase());

      return matchSearch && matchSeverity && matchPart;
    });
  }, [pestDiseases, searchTerm, selectedSeverity, selectedPart]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Thư viện Sâu bệnh & Dịch hại
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              IPM Database
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cơ sở dữ liệu triệu chứng, tác nhân gây hại, phác đồ điều trị sinh học và biện pháp phòng ngừa chuẩn VietGAP
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/production/disease-cases')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Xem Case điều trị đang mở</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên bệnh, tên khoa học, triệu chứng nhận biết..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Severity Filter */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Mức độ:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">Nguy hiểm cao (Đỏ)</option>
              <option value="HIGH">Nặng (Cam)</option>
              <option value="MEDIUM">Trung bình (Vàng)</option>
              <option value="LOW">Nhẹ (Xanh)</option>
            </select>
          </div>

          {/* Part Filter */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Bộ phận:</span>
            <select
              value={selectedPart}
              onChange={(e) => setSelectedPart(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Toàn cây</option>
              <option value="đọt">Đọt non / búp</option>
              <option value="lá">Tàu lá</option>
              <option value="thân">Thân cây</option>
              <option value="rễ">Rễ củ</option>
              <option value="hoa">Hoa / Trái</option>
            </select>
          </div>

          <span className="text-slate-400 text-xs pl-2 font-mono">
            {filteredDiseases.length} kết quả
          </span>
        </div>
      </div>

      {/* Disease Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDiseases.map((disease) => {
          const suitableCount = disease.suitablePesticideIds.length;
          return (
            <div
              key={disease.id}
              onClick={() => setActiveDisease(disease)}
              className="bg-white rounded-xl border border-slate-200 hover:border-emerald-500 p-4 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header tags */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                    {disease.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      disease.severity === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : disease.severity === 'HIGH'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                    }`}
                  >
                    {disease.severity === 'CRITICAL'
                      ? 'RẤT NGUY HIỂM'
                      : disease.severity === 'HIGH'
                      ? 'MỨC ĐỘ CAO'
                      : 'TRUNG BÌNH'}
                  </span>
                </div>

                {/* Name & Scientific */}
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {disease.name}
                </h3>
                <p className="text-xs text-slate-500 italic font-serif mb-2">
                  {disease.scientificName}
                </p>

                {/* Affected Plant & Part */}
                <div className="text-xs space-y-1 mb-3 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-semibold text-slate-700">Cây trồng:</span>
                    <span>{disease.affectedPlant}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-semibold text-slate-700">Bộ phận hại:</span>
                    <span className="text-amber-800 font-medium">{disease.affectedParts}</span>
                  </div>
                </div>

                {/* Symptoms Preview */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  <span className="font-medium text-slate-800">Triệu chứng: </span>
                  {disease.symptoms}
                </p>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {suitableCount} phác đồ sinh học
                </span>
                <span className="text-slate-400 group-hover:text-emerald-600 flex items-center gap-0.5 font-medium">
                  Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Right Drawer */}
      <RightDrawer
        isOpen={!!activeDisease}
        onClose={() => setActiveDisease(null)}
        title={activeDisease?.name || 'Chi tiết sâu bệnh'}
        subtitle={activeDisease?.scientificName}
        width="w-full sm:w-[540px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setActiveDisease(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                const disease = activeDisease;
                setActiveDisease(null);
                navigate('/production/disease-cases');
                showToast(`Đang chuyển sang tạo case điều trị cho ${disease?.name}`, 'info');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Mở Case điều trị mới
            </button>
          </div>
        }
      >
        {activeDisease && (
          <div className="space-y-5 text-xs">
            {/* Overview Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-500 font-semibold">{activeDisease.code}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    activeDisease.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : activeDisease.severity === 'HIGH'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                  }`}
                >
                  {activeDisease.severity}
                </span>
              </div>
              <div className="text-slate-700">
                <span className="font-semibold">Bộ phận bị tấn công:</span>{' '}
                <span className="text-rose-700 font-medium">{activeDisease.affectedParts}</span>
              </div>
            </div>

            {/* Symptoms Section */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Triệu chứng nhận biết thực địa
              </h4>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                {activeDisease.symptoms}
              </p>
            </div>

            {/* Causes and Biology */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Bug className="w-3.5 h-3.5 text-slate-600" /> Đặc điểm sinh học & Cơ chế lây lan
              </h4>
              <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                {activeDisease.causes}
              </p>
            </div>

            {/* Prevention Protocols */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Biện pháp phòng ngừa (IPM)
              </h4>
              <p className="text-slate-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 leading-relaxed">
                {activeDisease.prevention}
              </p>
            </div>

            {/* Treatment Regimen & Compatible Bio-pesticides */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Phác đồ điều trị & Thuốc BVTV phù hợp
              </h4>
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 mb-3">
                <div className="font-medium text-slate-800">Quy trình điều trị:</div>
                <div className="text-slate-600 leading-relaxed">{activeDisease.treatment}</div>
              </div>

              {/* Suitable Products List */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Chế phẩm sinh học khuyến nghị trong kho:
                </span>
                {activeDisease.suitablePesticideIds.map((pId) => {
                  const pestItem = pesticides.find((p) => p.id === pId);
                  if (!pestItem) return null;
                  return (
                    <div
                      key={pestItem.id}
                      className="p-2.5 rounded-lg border border-purple-100 bg-purple-50/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-purple-950 text-xs">
                          {pestItem.tradeName}
                        </div>
                        <div className="text-[10px] text-purple-800">
                          {pestItem.activeIngredient} • Cách ly {pestItem.safetyIntervalDays} ngày
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveDisease(null);
                          navigate('/production/pesticides');
                        }}
                        className="text-xs text-purple-700 font-semibold hover:underline"
                      >
                        Kho thuốc &rarr;
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
