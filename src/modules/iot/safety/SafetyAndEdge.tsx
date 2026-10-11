import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  HardDrive,
  Power,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const SafetyAndEdge: React.FC = () => {
  const { failsafeRules, iotDevices, triggerOTAUpdate, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'FAILSAFE' | 'EDGE' | 'OTA'>('FAILSAFE');

  // Bulk OTA State
  const [selectedForOTA, setSelectedForOTA] = useState<string[]>(['SM-01', 'SM-02', 'SM-03']);
  const [isBulkFlashing, setIsBulkFlashing] = useState(false);
  const [otaProgress, setOtaProgress] = useState(0);

  const handleStartBulkOTA = () => {
    setIsBulkFlashing(true);
    setOtaProgress(10);
    const intv = setInterval(() => {
      setOtaProgress((prev) => {
        if (prev >= 100) {
          clearInterval(intv);
          setIsBulkFlashing(false);
          showToast('Nâng cấp Firmware OTA hàng loạt hoàn tất cho 3 thiết bị!', 'success');
          return 100;
        }
        return prev + 25;
      });
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Cơ chế An toàn Phần cứng & Vận hành Cục bộ (Fail-Safe & Edge)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bảo vệ máy bơm chống chạy khô (Dry-run), giới hạn thời gian chạy liên tục và tự chủ cục bộ khi mất Internet
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('FAILSAFE')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'FAILSAFE'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Fail-Safe Rules ({failsafeRules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('EDGE')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'EDGE'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Edge / Gateway Status</span>
          </button>
          <button
            onClick={() => setActiveTab('OTA')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'OTA'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nâng cấp OTA Firmware</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: FAIL-SAFE RULES (Screen 21 & 55, 56) */}
      {/* ==================================================== */}
      {activeTab === 'FAILSAFE' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/70 flex items-start gap-3 text-xs">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-900 text-sm">
                Nguyên tắc An toàn Ưu tiên Cấp cao nhất (Hardware Interlock)
              </span>
              <p className="text-rose-800 mt-1 leading-relaxed">
                Tất cả các quy tắc Fail-Safe có mức ưu tiên cao nhất (Priority 85–100) và luôn ghi đè (Override) mọi lệnh tự động hay thủ công để bảo vệ động cơ bơm, chống nứt vỡ đường ống và chống cạn kiệt hồ chứa ngầm.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {failsafeRules.map((fs) => (
              <div
                key={fs.id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {fs.code}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{fs.name}</h3>
                  </div>

                  <span className="px-2 py-0.5 rounded-full font-bold font-mono text-[10px] bg-emerald-100 text-emerald-800">
                    ● {fs.status}
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed">{fs.description}</p>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500 font-sans">Điều kiện ngắt:</span>
                    <span className="font-bold text-rose-700">{fs.triggerCondition}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500 font-sans">Hành động bảo vệ:</span>
                    <span className="font-semibold text-slate-900">{fs.actionTaken}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5" />
                    Chạy độc lập trên chip ESP32: CÓ
                  </span>
                  <span className="text-slate-400 font-mono">Độ ưu tiên: {fs.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: EDGE / GATEWAY STATUS (Screen 22 & 57, 58) */}
      {/* ==================================================== */}
      {activeTab === 'EDGE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">
              Trạng thái Bộ điều khiển Biên (Edge Gateways & Local Rules)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">GW-ESP32-01</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    ONLINE
                  </span>
                </div>
                <div className="text-slate-500">Trạm điều khiển Khu Bắc</div>
                <div className="pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Quy tắc cục bộ:</span>
                    <strong>4 Edge Rules</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Đồng bộ Cloud:</span>
                    <strong>1 giây trước</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Flash Storage:</span>
                    <strong>4.2MB / 16MB</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">GW-ESP32-02</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    ONLINE
                  </span>
                </div>
                <div className="text-slate-500">Trạm Khu Nam (4G LTE)</div>
                <div className="pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Quy tắc cục bộ:</span>
                    <strong>2 Edge Rules</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Đồng bộ Cloud:</span>
                    <strong>4 giây trước</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Flash Storage:</span>
                    <strong>3.1MB / 16MB</strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">GW-ESP32-03</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    DEGRADED
                  </span>
                </div>
                <div className="text-slate-500">Trạm Vườn Ươm (WiFi MESH)</div>
                <div className="pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Quy tắc cục bộ:</span>
                    <strong>2 Edge Rules</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Đồng bộ Cloud:</span>
                    <strong>45 giây trước</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Flash Storage:</span>
                    <strong>2.8MB / 16MB</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: OTA FIRMWARE (Screen 20 & 54) */}
      {/* ==================================================== */}
      {activeTab === 'OTA' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Nâng cấp Firmware từ xa qua sóng (FOTA - Firmware Over-The-Air)
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Cập nhật các bản vá lỗi thuật toán Kalman filter và tối ưu năng lượng pin cho node cảm biến
                </p>
              </div>

              <button
                onClick={handleStartBulkOTA}
                disabled={isBulkFlashing}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Nâng cấp hàng loạt ({selectedForOTA.length} nodes)</span>
              </button>
            </div>

            {/* Progress Bar when flashing */}
            {isBulkFlashing && (
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/80 space-y-2">
                <div className="flex justify-between font-mono font-semibold text-indigo-900">
                  <span>Đang nạp OTA Firmware v1.3.0 qua kênh LoRa multicast...</span>
                  <span>{otaProgress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-indigo-200 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${otaProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Firmware Nodes Table */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Thiết bị</th>
                  <th className="py-2.5 px-3">Phân loại</th>
                  <th className="py-2.5 px-3">Firmware hiện tại</th>
                  <th className="py-2.5 px-3">Firmware mới nhất</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {iotDevices.slice(0, 6).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900 font-sans">
                      {d.name} ({d.id})
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{d.type}</td>
                    <td className="py-2.5 px-3 text-slate-700">{d.firmwareVersion}</td>
                    <td className="py-2.5 px-3 text-emerald-700 font-bold">{d.latestFirmware}</td>
                    <td className="py-2.5 px-3 font-sans">
                      {d.firmwareVersion === d.latestFirmware ? (
                        <span className="text-emerald-700 font-semibold">✓ Đã cập nhật</span>
                      ) : (
                        <span className="text-amber-600 font-bold">▲ Có bản mới</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <button
                        onClick={() => triggerOTAUpdate(d.id)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                      >
                        Nâng cấp đơn lẻ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
