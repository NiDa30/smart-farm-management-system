import React, { useState, useMemo } from 'react';
import {
  FileText,
  Filter,
  RotateCcw,
  Search,
  Calendar,
  User,
  Shield,
  Clock,
  ArrowRight,
  Laptop,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AuditLogEntry, ModuleKey } from '../../../types';
import { DataTable, ColumnDef } from '../../../components/common/DataTable';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const AuditLog: React.FC = () => {
  const { auditLogs, users } = useApp();

  // Filters
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Drawer
  const [activeLog, setActiveLog] = useState<AuditLogEntry | null>(null);

  const resetFilters = () => {
    setSelectedUser('ALL');
    setSelectedModule('ALL');
    setSelectedAction('ALL');
    setFromDate('');
    setToDate('');
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchUser = selectedUser === 'ALL' || log.userId === selectedUser;
      const matchModule = selectedModule === 'ALL' || log.module === selectedModule;
      const matchAction = selectedAction === 'ALL' || log.action === selectedAction;
      return matchUser && matchModule && matchAction;
    });
  }, [auditLogs, selectedUser, selectedModule, selectedAction]);

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Thời gian',
      width: '160px',
      sortable: true,
      render: (l) => (
        <span className="font-mono text-slate-700 tabular-nums font-medium text-[11px]">
          {l.timestamp}
        </span>
      ),
    },
    {
      key: 'userName',
      header: 'Người thực hiện',
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[10px]">
            {l.userName.slice(0, 1)}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block">{l.userName}</span>
            <span className="text-[10px] text-slate-400">{l.userRole}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'actionLabel',
      header: 'Hành động',
      render: (l) => {
        let badgeColor = 'bg-slate-100 text-slate-700';
        if (l.action === 'CREATE') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        if (l.action === 'UPDATE') badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
        if (l.action === 'LOCK' || l.action === 'DELETE')
          badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
        if (l.action === 'CONFIG') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';

        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${badgeColor}`}
          >
            {l.actionLabel}
          </span>
        );
      },
    },
    {
      key: 'moduleLabel',
      header: 'Phân hệ',
      render: (l) => <span className="text-slate-600 font-medium">{l.moduleLabel}</span>,
    },
    {
      key: 'target',
      header: 'Đối tượng tác động',
      render: (l) => (
        <span className="text-slate-800 font-medium truncate max-w-xs block" title={l.target}>
          {l.target}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'Địa chỉ IP',
      render: (l) => (
        <span className="font-mono text-slate-500 text-[11px] tabular-nums">{l.ip}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Nhật ký kiểm toán hệ thống (Audit Log)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu vết toàn bộ thao tác bảo mật, cập nhật hồ sơ cây, can thiệp IoT và phân quyền
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* User filter */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Tất cả người dùng</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} (@{u.username})
              </option>
            ))}
          </select>

          {/* Module filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Tất cả phân hệ</option>
            <option value="SYSTEM">Hệ thống & Phân quyền</option>
            <option value="PLANTS">Sản xuất & Cây trồng</option>
            <option value="IOT">IoT & Tự động hóa</option>
            <option value="INVENTORY">Vật tư nông nghiệp</option>
          </select>

          {/* Action filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="CREATE">Tạo mới (CREATE)</option>
            <option value="UPDATE">Cập nhật (UPDATE)</option>
            <option value="LOCK">Khóa tài khoản (LOCK)</option>
            <option value="ASSIGN_ROLE">Phân quyền (ASSIGN)</option>
            <option value="CONFIG">Cấu hình (CONFIG)</option>
          </select>
        </div>

        <button
          onClick={resetFilters}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Đặt lại bộ lọc</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        keyField="id"
        searchPlaceholder="Tìm kiếm theo hành động, mục tiêu, IP..."
        searchFilterFields={['actionLabel', 'target', 'userName', 'ip']}
        onRowClick={(log) => setActiveLog(log)}
      />

      {/* Audit Diff Drawer */}
      <RightDrawer
        isOpen={!!activeLog}
        onClose={() => setActiveLog(null)}
        title="Chi tiết kiểm toán (Audit Detail)"
        subtitle={activeLog?.id}
        footerActions={
          <button
            onClick={() => setActiveLog(null)}
            className="px-4 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
          >
            Đóng
          </button>
        }
      >
        {activeLog && (
          <div className="space-y-5 text-xs">
            {/* Metadata overview */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[11px]">Người thực hiện</span>
                  <strong className="text-slate-900">{activeLog.userName}</strong> ({activeLog.userRole})
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Thời gian ghi nhận</span>
                  <span className="font-mono text-slate-800">{activeLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Hành động</span>
                  <strong className="text-emerald-800">{activeLog.actionLabel}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Địa chỉ IP & Trạm</span>
                  <span className="font-mono text-slate-800">{activeLog.ip}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 block text-[11px]">Mục tiêu tác động:</span>
                <span className="font-semibold text-slate-900">{activeLog.target}</span>
              </div>
            </div>

            {/* Note details if present */}
            {activeLog.details && (
              <div className="p-3 rounded border border-slate-200 bg-white space-y-1">
                <h4 className="font-semibold text-slate-800">Ghi chú diễn biến:</h4>
                <p className="text-slate-600 leading-relaxed">{activeLog.details}</p>
              </div>
            )}

            {/* Structured Before vs After Diff comparison */}
            {activeLog.diff && activeLog.diff.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Thay đổi giá trị thuộc tính (Value Diff):
                </h4>

                <div className="space-y-2.5">
                  {activeLog.diff.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 overflow-hidden text-xs"
                    >
                      <div className="bg-slate-100 px-3 py-1.5 font-semibold text-slate-800 border-b border-slate-200 flex justify-between">
                        <span>{item.fieldLabel}</span>
                        <span className="font-mono text-slate-400 text-[10px]">{item.field}</span>
                      </div>

                      <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50">
                        {/* Before */}
                        <div className="p-2.5 bg-rose-50/50">
                          <span className="text-[10px] font-bold text-rose-700 uppercase block mb-1">
                            Trước khi thay đổi (Before)
                          </span>
                          <span className="text-slate-700 font-mono text-xs">{item.before}</span>
                        </div>

                        {/* After */}
                        <div className="p-2.5 bg-emerald-50/50">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                            Sau khi thay đổi (After)
                          </span>
                          <span className="text-emerald-900 font-mono text-xs font-semibold">
                            {item.after}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
