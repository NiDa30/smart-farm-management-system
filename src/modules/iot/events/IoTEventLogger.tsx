import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  History,
  Info,
  Power,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const IoTEventLogger: React.FC = () => {
  const { iotEventLogs } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');

  const filteredLogs = iotEventLogs.filter((log) => {
    const matchSearch =
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSeverity = severityFilter === 'ALL' || log.severity === severityFilter;
    const matchEventType = eventTypeFilter === 'ALL' || log.eventType === eventTypeFilter;
    return matchSearch && matchSeverity && matchEventType;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Nhật ký Sự kiện Mạng IoT (IoT Event Log)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu vết chi tiết toàn bộ lệnh điều khiển, bản tin telemetry cảm biến, xác nhận ACK và các sự kiện an toàn phần cứng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Xuất log sự kiện dưới định dạng JSON')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất JSON Log</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nội dung bản tin, mã thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
        >
          <option value="ALL">Tất cả loại sự kiện</option>
          <option value="TELEMETRY">Bản tin đo lường (TELEMETRY)</option>
          <option value="COMMAND_SENT">Lệnh điều khiển (COMMAND_SENT)</option>
          <option value="COMMAND_ACK">Xác nhận phản hồi (COMMAND_ACK)</option>
          <option value="SAFETY_TRIP">Ngắt an toàn (SAFETY_TRIP)</option>
          <option value="RULE_TRIGGER">Kích hoạt Rule (RULE_TRIGGER)</option>
          <option value="CONFIG_UPDATE">Cập nhật cấu hình (CONFIG_UPDATE)</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
        >
          <option value="ALL">Tất cả mức độ</option>
          <option value="INFO">INFO (Thông tin)</option>
          <option value="WARN">WARN (Cảnh báo)</option>
          <option value="ERROR">ERROR (Lỗi / Sự cố)</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Thời gian</th>
              <th className="py-3 px-4">Thiết bị</th>
              <th className="py-3 px-4">Loại sự kiện</th>
              <th className="py-3 px-4">Nguồn phát sinh</th>
              <th className="py-3 px-4">Nội dung bản tin chi tiết</th>
              <th className="py-3 px-4">Mức độ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-slate-500">{log.timestamp}</td>
                <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                  {log.deviceName} ({log.deviceId})
                </td>
                <td className="py-3 px-4">
                  <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                    {log.eventType}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 font-sans">{log.source}</td>
                <td className="py-3 px-4 text-slate-700 font-sans leading-relaxed">
                  {log.message}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      log.severity === 'ERROR'
                        ? 'bg-rose-100 text-rose-800'
                        : log.severity === 'WARN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {log.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
