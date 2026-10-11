import React, { useState } from 'react';
import { FlaskConical, Plus, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const NutritionManager: React.FC = () => {
  const { nutritionPlans, fertilizationLogs, plants, navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'programs' | 'history'>('programs');

  const plantA023 = plants.find((p) => p.code === 'A023');

  return (
    <div className="space-y-6 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Dinh dưỡng & Bón phân (Crop Nutrition & Fertilization)
          </h1>
          <p className="text-slate-500 mt-0.5">
            Quy trình chuẩn VietGAP cho Dừa xiêm lùn Bến Tre & Nhật ký định mức từng cá thể cây
          </p>
        </div>
      </div>

      {/* Featured Status Card for Plant A023 */}
      {plantA023 && (
        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-bold text-emerald-900 text-sm">
              Trạng thái dinh dưỡng: Dừa {plantA023.code} ({plantA023.variety})
            </span>
            <p className="text-emerald-800 text-[11px]">
              Lần bón gần nhất: <strong>{plantA023.lastFertilized}</strong> (1.5 kg NPK 16-16-8 Hữu cơ) · Lần bón tiếp theo dự kiến: <strong>18 ngày nữa</strong>
            </p>
          </div>
          <button
            onClick={() => navigate(`/production/plants/${plantA023.id}`)}
            className="px-3.5 py-1.5 bg-emerald-700 text-white rounded font-semibold hover:bg-emerald-800 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>Hồ sơ cây A023</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg">
        <nav className="flex space-x-6 font-medium">
          <button
            onClick={() => setActiveTab('programs')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'programs'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Quy trình dinh dưỡng chuẩn ({nutritionPlans.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lịch sử bón phân thực tế ({fertilizationLogs.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Programs */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {nutritionPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{plan.variety}</h3>
                  <span className="text-slate-500 font-medium">
                    {plan.ageRange} · {plan.stage}
                  </span>
                </div>
                <span className="font-mono text-emerald-800 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  Chu kỳ: {plan.cycleDays} ngày / lần
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">Loại phân bón & Liều lượng:</span>
                  <p className="font-medium text-emerald-900">{plan.fertilizerName}</p>
                  <p className="font-mono font-bold text-slate-800">
                    Định mức: {plan.dosagePerTree} {plan.unit}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 block">Điều kiện áp dụng:</span>
                  <p>{plan.conditions}</p>
                </div>
              </div>

              <div className="space-y-1 text-slate-600">
                <span className="font-semibold text-slate-800">Phương pháp bón chuẩn:</span>
                <p className="leading-relaxed">{plan.applicationMethod}</p>
              </div>

              <div className="p-2.5 rounded bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px]">
                <strong className="block">Lưu ý kỹ thuật nông học:</strong>
                {plan.technicalNotes}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Ngày</th>
                <th className="py-2.5 px-3">Mã cây / Khu</th>
                <th className="py-2.5 px-3">Phân bón</th>
                <th className="py-2.5 px-3">Liều lượng</th>
                <th className="py-2.5 px-3">Người thực hiện</th>
                <th className="py-2.5 px-3">Chi phí (VNĐ)</th>
                <th className="py-2.5 px-3">Kết quả đánh giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fertilizationLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-medium">{log.date}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-900 px-1.5 py-0.5 rounded bg-slate-100 border">
                      {log.plantCode}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5">{log.zoneName}</span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{log.fertilizerName}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                    {log.dosage} {log.unit}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{log.applicatorName}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{log.costVnd.toLocaleString('vi-VN')} ₫</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.resultNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
