import React, { useState, useMemo } from 'react';
import {
  Plus,
  Lock,
  Unlock,
  Edit,
  Eye,
  KeyRound,
  Shield,
  Layers,
  MapPin,
  CheckCircle,
  MoreVertical,
  Filter,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { User, UserStatus } from '../../../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { DataTable, ColumnDef } from '../../../components/common/DataTable';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

export const UserList: React.FC = () => {
  const {
    users,
    roles,
    farms,
    navigate,
    toggleLockUser,
    bulkLockUsers,
    bulkAssignRole,
    showToast,
  } = useApp();

  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userToLock, setUserToLock] = useState<User | null>(null);
  const [bulkRoleModalOpen, setBulkRoleModalOpen] = useState(false);
  const [selectedBulkUserIds, setSelectedBulkUserIds] = useState<string[]>([]);
  const [selectedTargetRole, setSelectedTargetRole] = useState(roles[0]?.id || '');

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === 'ALL' || u.roleId === roleFilter;
      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
      return matchRole && matchStatus;
    });
  }, [users, roleFilter, statusFilter]);

  const handleRowClick = (user: User) => {
    navigate(`/system/users/${user.id}`);
  };

  const columns: ColumnDef<User>[] = [
    {
      key: 'name',
      header: 'Người dùng',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-semibold flex items-center justify-center text-xs shrink-0 shadow-2xs">
            {u.name.split(' ').pop()?.slice(0, 1) || 'U'}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block hover:text-emerald-700">
              {u.name}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">@{u.username}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email & SĐT',
      render: (u) => (
        <div>
          <span className="text-slate-800 block">{u.email}</span>
          <span className="text-[11px] text-slate-500 font-mono">{u.phone}</span>
        </div>
      ),
    },
    {
      key: 'roleName',
      header: 'Vai trò (Role)',
      sortable: true,
      render: (u) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-xs">
          <Shield className="w-3 h-3 text-slate-500" />
          <span>{u.roleName.split('(')[0]}</span>
        </span>
      ),
    },
    {
      key: 'scopeType',
      header: 'Phạm vi dữ liệu (Scope)',
      render: (u) => {
        let label = 'Toàn hệ thống';
        if (u.scopeType === 'FARM') label = 'Toàn trang trại';
        if (u.scopeType === 'CUSTOM_AREAS') label = `Phân khu (${u.allowedAreaIds.length})`;
        return (
          <span className="text-slate-600 font-medium text-xs">
            {label}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      sortable: true,
      render: (u) => <StatusBadge status={u.status} size="sm" />,
    },
    {
      key: 'lastLogin',
      header: 'Lần đăng nhập cuối',
      render: (u) => (
        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
          {u.lastLogin}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản trị người dùng & Phân quyền
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tài khoản nhân sự, phân bổ vai trò và phạm vi dữ liệu trang trại
          </p>
        </div>

        <button
          onClick={() => navigate('/system/users/new')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm người dùng</span>
        </button>
      </div>

      {/* Main Data Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        keyField="id"
        searchPlaceholder="Tìm theo họ tên, username, email, sđt..."
        searchFilterFields={['name', 'username', 'email', 'phone']}
        onRowClick={handleRowClick}
        filters={
          <div className="flex items-center gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả vai trò</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </select>
          </div>
        }
        bulkActions={(selectedIds, clearSelection) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                bulkLockUsers(selectedIds);
                clearSelection();
              }}
              className="px-2.5 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors inline-flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Khóa tài khoản ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => {
                setSelectedBulkUserIds(selectedIds);
                setBulkRoleModalOpen(true);
              }}
              className="px-2.5 py-1 rounded bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors inline-flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Gán vai trò</span>
            </button>
          </div>
        )}
        rowActions={(u) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => navigate(`/system/users/${u.id}`)}
              className="p-1 text-slate-400 hover:text-emerald-700"
              title="Xem hồ sơ"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/system/users/${u.id}/edit`)}
              className="p-1 text-slate-400 hover:text-blue-700"
              title="Chỉnh sửa"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                showToast(`Đã gửi email liên kết đặt lại mật khẩu tới ${u.email}`);
              }}
              className="p-1 text-slate-400 hover:text-amber-600"
              title="Đặt lại mật khẩu"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              onClick={() => setUserToLock(u)}
              className={`p-1 ${
                u.status === 'LOCKED'
                  ? 'text-emerald-600 hover:text-emerald-700'
                  : 'text-rose-500 hover:text-rose-700'
              }`}
              title={u.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
            >
              {u.status === 'LOCKED' ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      />

      {/* Lock Confirmation Modal */}
      <ConfirmModal
        isOpen={!!userToLock}
        onClose={() => setUserToLock(null)}
        onConfirm={() => {
          if (userToLock) {
            toggleLockUser(userToLock.id);
            setUserToLock(null);
          }
        }}
        variant={userToLock?.status === 'LOCKED' ? 'primary' : 'danger'}
        title={
          userToLock?.status === 'LOCKED'
            ? `Mở khóa tài khoản: ${userToLock?.name}`
            : `Khóa tài khoản: ${userToLock?.name}`
        }
        description={
          userToLock?.status === 'LOCKED' ? (
            <p>
              Tài khoản sẽ được cấp lại quyền đăng nhập vào ứng dụng và đồng bộ dữ liệu di động.
            </p>
          ) : (
            <p>
              Khi bị khóa, người dùng sẽ bị chấm dứt ngay phiên làm việc và không thể truy cập
              các phân hệ canh tác hay IoT.
            </p>
          )
        }
        confirmLabel={userToLock?.status === 'LOCKED' ? 'Mở khóa ngay' : 'Khóa tài khoản'}
      />

      {/* Bulk Assign Role Modal */}
      {bulkRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setBulkRoleModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Gán vai trò mới cho {selectedBulkUserIds.length} người dùng
            </h3>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Chọn vai trò muốn gán:
              </label>
              <select
                value={selectedTargetRole}
                onChange={(e) => setSelectedTargetRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBulkRoleModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  bulkAssignRole(selectedBulkUserIds, selectedTargetRole);
                  setBulkRoleModalOpen(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
              >
                Xác nhận gán
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
