import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AnomalyItem, AnomalySeverity, AnomalyStatus } from '../../../types/analytics';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const AnomalyCenter: React.FC = () => {
  const { navigate, showToast } = useApp();

  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([
    {
      id: 'anom-01',
      code: 'ANOM-2026-089',
      severity: 'CRITICAL',
      status: 'NEW',
      objectType: 'ZONE',
      objectId: 'zone-south',
      objectName: 'Phân khu Nam (Vườn 04, 05)',
      metric: 'Suất tiêu hao nước tưới trên 1 kg sản phẩm',
      currentValue: '27.5 L/kg',
      normalRange: '18.0 – 21.0 L/kg',
      deviationPercent: 35.0,
      confidenceScore: 94,
      detectedAt: 'Hôm nay, 07:15',
      explanation: 'Lưu lượng nước cấp qua đồng hồ tổng Vùng 04 tăng đột biến trong khi độ ẩm đất tầng sâu không tăng tương ứng.',
      evidenceData: [
        { label: 'Lưu lượng nước đo được', value: '45.2 m³/ngày' },
        { label: 'Lượng mưa thực tế', value: '0.0 mm' },
        { label: 'Độ ẩm đất trung bình', value: '38% (Không tăng)' },
        { label: 'Số chu kỳ tưới kích hoạt', value: '3 lần / ngày', correlationNote: 'Có tương quan quan sát được với cảnh báo áp lực van Solenoid số 04 tụt 0.8 bar' },
      ],
      recommendedAction: 'Cử nhân sự kiểm tra hiện trường đường ống áp lực và gioăng cao su van Solenoid 04.',
      targetModuleRoute: '/iot/control',
      targetModuleActionLabel: 'Mở Điều Khiển Van IoT',
    },
    {
      id: 'anom-02',
      code: 'ANOM-2026-088',
      severity: 'HIGH',
      status: 'REVIEWING',
      objectType: 'PLANT',
      objectId: 'plant-023',
      objectName: 'Cá thể Cây Dừa #A023',
      metric: 'Tốc độ tăng trưởng buồng & số trái đậu',
      currentValue: '34 quả / cây',
      normalRange: '50 – 70 quả / cây',
      deviationPercent: -28.0,
      confidenceScore: 88,
      detectedAt: '03/10/2026',
      explanation: 'Sản lượng buồng quả sụt giảm 28% so với nhóm cây cùng hàng A và cùng 4 năm tuổi.',
      evidenceData: [
        { label: 'Số quả đếm được', value: '34 quả (Kỳ vọng: 55 quả)' },
        { label: 'Màu sắc lá', value: 'Vàng chóp lá tầng dưới', correlationNote: 'Có tương quan quan sát được với dấu hiệu thiếu đạm vi lượng' },
        { label: 'Số lượng buồng trổ', value: '6 buồng' },
      ],
      recommendedAction: 'Lấy mẫu kiểm tra mô lá và bổ sung dinh dưỡng vi lượng Bo + Magie.',
      targetModuleRoute: '/production/plants/plant-023',
      targetModuleActionLabel: 'Mở Hồ Sơ Cây A023',
    },
    {
      id: 'anom-03',
      code: 'ANOM-2026-085',
      severity: 'MEDIUM',
      status: 'CONFIRMED',
      objectType: 'DEVICE',
      objectId: 'device-sm-07',
      objectName: 'Cảm biến Ẩm đất SM-07 (Khu Nam)',
      metric: 'Sai lệch giá trị so với cụm sensor lân cận',
      currentValue: 'Độ ẩm: 18%',
      normalRange: '36% – 42%',
      deviationPercent: -52.0,
      confidenceScore: 91,
      detectedAt: '02/10/2026',
      explanation: 'Đầu dò cảm biến SM-07 báo ẩm 18% nhưng trạm lân cận SM-08 cách 14m báo 40%. Nghi ngờ đầu dò bị hở gốc tiếp xúc.',
      evidenceData: [
        { label: 'Giá trị SM-07', value: '18% độ ẩm' },
        { label: 'Giá trị SM-08 lân cận', value: '40% độ ẩm' },
        { label: 'Mức pin LoRaWAN', value: '94% (Pin tốt)' },
      ],
      recommendedAction: 'Hiệu chuẩn lại que cắm cảm biến tại thực địa.',
      targetModuleRoute: '/iot/devices',
      targetModuleActionLabel: 'Mở Quản Lý Thiết Bị IoT',
    },
  ]);

  const handleUpdateStatus = (id: string, newStatus: AnomalyStatus) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    if (selectedAnomaly && selectedAnomaly.id === id) {
      setSelectedAnomaly({ ...selectedAnomaly, status: newStatus });
    }
    showToast(`Đã chuyển trạng thái bất thường sang: ${newStatus}`, 'success');
  };

  const filteredAnomalies = anomalies.filter((a) => {
    const matchSev = filterSeverity === 'ALL' || a.severity === filterSeverity;
    const matchStat = filterStatus === 'ALL' || a.status === filterStatus;
    return matchSev && matchStat;
  });

  return (
    <div className="space-y-5 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Trung tâm Quản trị Bất thường Tự động (Automated Anomaly Center)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-bold border border-rose-200">
              AI ENGINE & HEURISTICS
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Phát hiện sớm độ lệch chuẩn bất thường về năng suất cây, nước tưới và tín hiệu cảm biến IoT
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 text-xs">
            {anomalies.filter((a) => a.status === 'NEW').length} Bất thường Mới cần xử lý
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Mức độ nghiêm trọng:</span>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded font-semibold text-slate-800"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">🔴 Nguy cấp (Critical)</option>
              <option value="HIGH">🟠 Cao (High)</option>
              <option value="MEDIUM">🟡 Trung bình (Medium)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded font-semibold text-slate-800"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Chưa xử lý (NEW)</option>
              <option value="REVIEWING">Đang điều tra (REVIEWING)</option>
              <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
              <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
            </select>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          Hiển thị {filteredAnomalies.length} / {anomalies.length} cảnh báo
        </span>
      </div>

      {/* Anomaly Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Mức độ</th>
                <th className="py-2.5 px-3">Mã & Đối tượng</th>
                <th className="py-2.5 px-3">Chỉ số bất thường</th>
                <th className="py-2.5 px-3">Thực tế vs Chuẩn</th>
                <th className="py-2.5 px-3">Độ lệch</th>
                <th className="py-2.5 px-3">Độ tin cậy</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAnomalies.map((anom) => {
                const isCrit = anom.severity === 'CRITICAL';
                const isHigh = anom.severity === 'HIGH';

                return (
                  <tr
                    key={anom.id}
                    onClick={() => setSelectedAnomaly(anom)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                          isCrit
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {anom.severity}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900 block">{anom.code}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{anom.objectName}</span>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-800 max-w-xs truncate">
                      {anom.metric}
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-slate-900 block">{anom.currentValue}</span>
                      <span className="text-[10px] text-slate-400">Chuẩn: {anom.normalRange}</span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold">
                      <span className={anom.deviationPercent > 0 ? 'text-rose-600' : 'text-amber-600'}>
                        {anom.deviationPercent > 0 ? `+${anom.deviationPercent}%` : `${anom.deviationPercent}%`}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-emerald-800 font-bold">
                      {anom.confidenceScore}%
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {anom.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnomaly(anom);
                        }}
                        className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                      >
                        Điều tra →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ANOMALY INVESTIGATION DRAWER */}
      {selectedAnomaly && (
        <RightDrawer
          isOpen={true}
          onClose={() => setSelectedAnomaly(null)}
          title={`Chi tiết Bất thường: ${selectedAnomaly.code}`}
          width="max-w-lg"
        >
          <div className="space-y-4 text-xs">
            {/* Object Header */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{selectedAnomaly.objectName}</span>
                <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
                  {selectedAnomaly.severity}
                </span>
              </div>
              <p className="text-slate-500">{selectedAnomaly.metric}</p>
              <div className="text-[11px] text-slate-600 pt-1">
                Phát hiện lúc: <strong>{selectedAnomaly.detectedAt}</strong> · Độ tin cậy thuật toán: <strong>{selectedAnomaly.confidenceScore}%</strong>
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-1">
              <span className="font-bold text-slate-800 block">Mô tả độ lệch chuẩn:</span>
              <p className="p-2.5 rounded bg-amber-50/60 border border-amber-200 text-amber-950 leading-relaxed">
                {selectedAnomaly.explanation}
              </p>
            </div>

            {/* Evidence Data with Non-causation Disclaimer */}
            <div className="space-y-2">
              <span className="font-bold text-slate-800 block">Dữ liệu Bằng chứng Ghi nhận (Evidence Metrics):</span>
              <div className="space-y-1.5">
                {selectedAnomaly.evidenceData.map((ev, i) => (
                  <div key={i} className="p-2 rounded bg-slate-50 border border-slate-200 space-y-0.5">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">{ev.label}:</span>
                      <strong className="font-mono text-slate-900">{ev.value}</strong>
                    </div>
                    {ev.correlationNote && (
                      <span className="text-[10px] text-emerald-800 italic block">
                        ℹ️ {ev.correlationNote}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 italic block">
                * Lưu ý: Mối tương quan dữ liệu chỉ mang tính phát hiện gợi ý, không tự động quy kết nguyên nhân nhân quả khi chưa có kiểm chứng hiện trường.
              </span>
            </div>

            {/* Recommended Action */}
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
              <span className="font-bold text-emerald-950 block">Hành động Đề xuất Khắc phục:</span>
              <p className="text-emerald-900">{selectedAnomaly.recommendedAction}</p>
            </div>

            {/* Cross-Module Navigation Action */}
            <button
              onClick={() => {
                navigate(selectedAnomaly.targetModuleRoute);
                setSelectedAnomaly(null);
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>{selectedAnomaly.targetModuleActionLabel}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Status Change Buttons */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 block text-[11px]">Cập nhật trạng thái xử lý:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedAnomaly.id, 'CONFIRMED')}
                  className="py-1 px-2 rounded border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 text-[11px]"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAnomaly.id, 'RESOLVED')}
                  className="py-1 px-2 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold text-[11px]"
                >
                  Đã giải quyết
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedAnomaly.id, 'DISMISSED')}
                  className="py-1 px-2 rounded border border-slate-200 hover:bg-slate-100 text-slate-500 text-[11px]"
                >
                  Bỏ qua (Dismiss)
                </button>
              </div>
            </div>
          </div>
        </RightDrawer>
      )}
    </div>
  );
};
