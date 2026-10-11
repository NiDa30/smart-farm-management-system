import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Users,
  Copy,
  Trash2,
  Edit,
  Eye,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Role } from '../../../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { DataTable, ColumnDef } from '../../../components/common/DataTable';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

export const RoleList: React.FC = () => {
  const { roles, navigate, duplicateRole, deleteRole } = useApp();

  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [duplicateModalRole, setDuplicateModalRole] = useState<Role | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  const columns: ColumnDef<Role>[] = [
    {
      key: 'name',
      header: 'Vai trò (Role)',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-900 block hover:text-emerald-700">
            {r.name}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Mã: {r.code}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Mô tả quyền hạn',
      render: (r) => <span className="text-slate-600 line-clamp-1">{r.description}</span>,
    },
    {
      key: 'userCount',
      header: 'Người dùng',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-slate-800">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{r.userCount}</span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Phân loại',
      render: (r) => <StatusBadge status={r.type} size="sm" />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (r) => <StatusBadge status={r.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Vai trò & Phân quyền (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị vai trò người dùng, thiết lập ma trận đặc quyền bảo mật theo phân hệ
          </p>
        </div>

        <button
          onClick={() => {
            const firstRole = roles[3] || roles[0];
            navigate(`/system/roles/${firstRole.id}`);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Ma trận phân quyền chi tiết</span>
        </button>
      </div>

      {/* Roles Data Table */}
      <DataTable
        data={roles}
        columns={columns}
        keyField="id"
        searchPlaceholder="Tìm vai trò, mô tả..."
        searchFilterFields={['name', 'code', 'description']}
        onRowClick={(r) => navigate(`/system/roles/${r.id}`)}
        rowActions={(r) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => navigate(`/system/roles/${r.id}`)}
              className="p-1 text-slate-400 hover:text-emerald-700"
              title="Xem và chỉnh sửa ma trận quyền"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDuplicateModalRole(r);
                setDuplicateName(`${r.name} (Bản sao)`);
              }}
              className="p-1 text-slate-400 hover:text-blue-700"
              title="Nhân bản vai trò"
            >
              <Copy className="w-4 h-4" />
            </button>
            {r.type === 'CUSTOM' ? (
              <button
                onClick={() => setRoleToDelete(r)}
                className="p-1 text-slate-400 hover:text-rose-600"
                title="Xóa vai trò tùy chỉnh"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <span
                className="p-1 text-slate-300 cursor-not-allowed"
                title="Vai trò hệ thống không được xóa"
              >
                <Lock className="w-4 h-4" />
              </span>
            )}
          </div>
        )}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={() => {
          if (roleToDelete) {
            deleteRole(roleToDelete.id);
            setRoleToDelete(null);
          }
        }}
        variant="danger"
        title={`Xác nhận xóa vai trò: ${roleToDelete?.name}`}
        description={
          <div>
            <p>
              Bạn có chắc chắn muốn xóa vai trò tùy biến này không? Thao tác này không thể hoàn tác.
            </p>
            {roleToDelete && roleToDelete.userCount > 0 && (
              <p className="mt-2 text-rose-600 font-medium">
                Cảnh báo: Đang có {roleToDelete.userCount} người dùng thuộc vai trò này. Bạn phải
                chuyển vai trò cho họ trước khi xóa.
              </p>
            )}
          </div>
        }
        confirmDisabled={Boolean(roleToDelete && roleToDelete.userCount > 0)}
        confirmLabel="Xóa vai trò"
      />

      {/* Duplicate Role Modal */}
      {duplicateModalRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setDuplicateModalRole(null)}
          />
          <div className="relative bg-white rounded-lg p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Nhân bản vai trò: {duplicateModalRole.name}
            </h3>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tên vai trò mới:
              </label>
              <input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDuplicateModalRole(null)}
                className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  duplicateRole(duplicateModalRole.id, duplicateName);
                  setDuplicateModalRole(null);
                }}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
              >
                Tạo bản sao
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
