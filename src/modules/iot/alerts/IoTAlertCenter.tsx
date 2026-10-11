import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Battery,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Info,
  Power,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Wrench,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { IoTAlert } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const IoTAlertCenter: React.FC = () => {
  const {
    iotAlerts,
    acknowledgeIoTAlert,
    resolveIoTAlert,
    controlActuator,
    createMaintenanceFromIoT,
    navigate,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedAlert, setSelectedAlert] = useState<IoTAlert | null>(null);

  const filteredAlerts = iotAlerts.filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.deviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchSearch && matchSeverity && matchStatus;
  });

  const criticalCount = iotAlerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
  const warningCount = iotAlerts.filter((a) => a.severity === 'WARNING' && a.status !== 'RESOLVED').length;
  const infoCount = iotAlerts.filter((a) => a.severity === 'INFO' && a.status !== 'RESOLVED').length;
  const unresolvedCount = iotAlerts.filter((a) => a.status !== 'RESOLVED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Trung tâm Xử lý Cảnh báo IoT (IoT Alert Center)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát cảnh báo chạy khô máy bơm, mất sóng cảm biến, pin kiệt và hướng dẫn các bước khắc phục sự cố hiện trường
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/iot/control')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5 text-slate-500" />
            <span>Ngắt khẩn cấp Máy bơm</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
            <span>Nguy cấp (Critical)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono mt-1">
            {criticalCount}
          </div>
          <span className="text-[11px] text-rose-500 font-medium">Nguy cơ cháy bơm / mất tín hiệu</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Cảnh báo (Warning)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {warningCount}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Pin thấp hoặc sóng suy giảm</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
            <span>Thông tin (Info)</span>
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 font-mono mt-1">
            {infoCount}
          </div>
          <span className="text-[11px] text-blue-600">Ngưỡng tưới & chu kỳ kích hoạt</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>Chưa xử lý (Unresolved)</span>
            <Shield className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {unresolvedCount}
          </div>
          <span className="text-[11px] text-slate-500">Đang trong vòng đời xử lý</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã sự cố, tên cảnh báo, thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
        >
          <option value="ALL">Tất cả mức độ</option>
          <option value="CRITICAL">🔴 Nguy cấp (Critical)</option>
          <option value="WARNING">🟡 Cảnh báo (Warning)</option>
          <option value="INFO">🔵 Thông tin (Info)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="OPEN">Mở (OPEN)</option>
          <option value="ACKNOWLEDGED">Đã tiếp nhận (ACKNOWLEDGED)</option>
          <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Mức độ</th>
              <th className="py-3 px-4">Tiêu đề cảnh báo sự cố</th>
              <th className="py-3 px-4">Thiết bị liên quan</th>
              <th className="py-3 px-4">Vị trí</th>
              <th className="py-3 px-4">Bắt đầu lúc</th>
              <th className="py-3 px-4">Thời gian tồn tại</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAlerts.map((alert) => (
              <tr
                key={alert.id}
                className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                onClick={() => setSelectedAlert(alert)}
              >
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </td>

                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{alert.title}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{alert.message}</div>
                </td>

                <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                  {alert.deviceId}
                </td>

                <td className="py-3 px-4 text-slate-600">{alert.location}</td>

                <td className="py-3 px-4 font-mono text-slate-500">{alert.startedAt}</td>

                <td className="py-3 px-4 font-mono text-slate-700">{alert.duration}</td>

                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      alert.status === 'OPEN'
                        ? 'bg-rose-100 text-rose-700'
                        : alert.status === 'ACKNOWLEDGED'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {alert.status}
                  </span>
                </td>

                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                  >
                    Xử lý →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alert Detail & Remediation Drawer (Screens 38 & 39) */}
      <RightDrawer
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert ? `Xử lý sự cố: ${selectedAlert.code}` : ''}
        subtitle={selectedAlert?.title}
        width="w-full sm:w-[560px]"
      >
        {selectedAlert && (
          <div className="space-y-5 text-xs">
            {/* Alert Severity & Details */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 text-sm">{selectedAlert.title}</span>
                <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-mono font-bold text-[10px]">
                  {selectedAlert.severity}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{selectedAlert.message}</p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-rose-200/60 flex justify-between font-mono">
                <span>Thiết bị: {selectedAlert.deviceId}</span>
                <span>Bắt đầu lúc: {selectedAlert.startedAt} ({selectedAlert.duration})</span>
              </div>
            </div>

            {/* Suggested Remediation Actions (Screen 38) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Quy trình Khắc phục Khuyến nghị (Suggested Actions)
              </h4>
              <ol className="space-y-2 list-decimal list-inside text-slate-700">
                {selectedAlert.suggestedActions.map((act, index) => (
                  <li key={index} className="leading-relaxed font-medium">
                    {act}
                  </li>
                ))}
              </ol>
            </div>

            {/* Action Buttons: Immediate Command & Phân hệ 3 Maintenance Link */}
            <div className="space-y-2 pt-2">
              {selectedAlert.type === 'NO_FLOW' && (
                <button
                  onClick={() => controlActuator('PUMP-P01', 'STOP', 0, 'Ngắt khẩn cấp do sự cố No-Flow')}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Power className="w-4 h-4" />
                  <span>NGẮT KHẨN CẤP MÁY BƠM P01 (TRÁNH CHÁY CÁNH QUẠT)</span>
                </button>
              )}

              {/* Link to Module 3 (Phân hệ 3 Maintenance) */}
              <button
                onClick={() => {
                  createMaintenanceFromIoT(selectedAlert.deviceId, selectedAlert.title);
                  setSelectedAlert(null);
                }}
                className="w-full py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs"
              >
                <Wrench className="w-4 h-4 text-emerald-600" />
                <span>Tạo Phiếu Bảo trì Kỹ thuật tại Hiện trường (Phân hệ 3)</span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    acknowledgeIoTAlert(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                  className="py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  Tiếp nhận xử lý (Acknowledge)
                </button>
                <button
                  onClick={() => {
                    resolveIoTAlert(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                  className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  Đóng sự cố (Resolve)
                </button>
              </div>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
