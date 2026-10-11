import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit,
  Shield,
  Layers,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle,
  Clock,
  Laptop,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge } from '../../../components/common/StatusBadge';

interface UserDetailProps {
  userId: string;
}

export const UserDetail: React.FC<UserDetailProps> = ({ userId }) => {
  const { users, roles, auditLogs, navigate, toggleLockUser, showToast } = useApp();

  const user = users.find((u) => u.id === userId) || users[0];
  const userRole = roles.find((r) => r.id === user.roleId) || roles[0];
  const userLogs = auditLogs.filter((l) => l.userId === user.id);

  const [activeTab, setActiveTab] = useState<'info' | 'role' | 'scope' | 'activity' | 'sessions'>('info');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/system/users')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hồ sơ người dùng</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chi tiết tài khoản, vai trò và phạm vi truy cập dữ liệu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/system/users/${user.id}/edit`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Chỉnh sửa</span>
          </button>
          <button
            onClick={() => toggleLockUser(user.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              user.status === 'LOCKED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {user.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
          </button>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-800 text-white font-bold text-lg flex items-center justify-center shadow-xs">
            {user.name.split(' ').pop()?.slice(0, 1) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
              <StatusBadge status={user.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="font-mono text-slate-700 font-medium">@{user.username}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-800 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                {user.roleName}
              </span>
              <span>·</span>
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6 text-xs space-y-1">
          <span className="text-slate-400 block">Đăng nhập lần cuối:</span>
          <span className="font-mono text-slate-800 font-medium">{user.lastLogin}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-3 rounded-t-lg">
        <nav className="flex space-x-6 text-xs font-medium">
          {[
            { id: 'info', label: 'Thông tin tài khoản' },
            { id: 'role', label: 'Vai trò & Quyền hạn' },
            { id: 'scope', label: 'Phạm vi dữ liệu (Data Scope)' },
            { id: 'activity', label: `Lịch sử hoạt động (${userLogs.length})` },
            { id: 'sessions', label: 'Phiên đăng nhập' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-b-lg border border-slate-200 p-6 shadow-2xs text-xs">
        {activeTab === 'info' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Thông tin liên hệ & Đăng nhập
            </h3>
            <div className="divide-y divide-slate-100 space-y-2">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-semibold text-slate-900">{user.name}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Tên đăng nhập (Username):</span>
                <span className="font-mono font-medium text-slate-900">{user.username}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Địa chỉ Email:</span>
                <span className="text-slate-800">{user.email}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-mono text-slate-800">{user.phone}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500">Chính sách mật khẩu:</span>
                <span className="text-emerald-700 font-medium">Đã kích hoạt 2 lớp xác thực</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'role' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{userRole.name}</h3>
                <p className="text-slate-500 text-xs mt-0.5">{userRole.description}</p>
              </div>
              <button
                onClick={() => navigate('/system/roles')}
                className="text-xs text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Xem ma trận quyền chi tiết</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(userRole.permissions).map(([moduleKey, perms]) => (
                <div key={moduleKey} className="p-3 rounded border border-slate-200 bg-slate-50 space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase">
                    {moduleKey}
                  </span>
                  <div className="space-y-0.5 text-[11px] text-slate-600">
                    <div>Xem: {perms.view ? '✓ Có' : '✗ Không'}</div>
                    <div>Thêm: {perms.create ? '✓ Có' : '✗ Không'}</div>
                    <div>Sửa: {perms.update ? '✓ Có' : '✗ Không'}</div>
                    <div>Xóa: {perms.delete ? '✓ Có' : '✗ Không'}</div>
                    <div>Duyệt: {perms.approve ? '✓ Có' : '✗ Không'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scope' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Phạm vi dữ liệu được phép truy cập (Data Scope)
            </h3>
            <p className="text-xs text-slate-500">
              Người dùng chỉ có thể xem hồ sơ cây, thực hiện task và giám sát IoT trên các khu vực
              được tích chọn dưới đây:
            </p>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <label className="flex items-center gap-2 font-bold text-slate-900">
                <input
                  type="checkbox"
                  disabled
                  checked={true}
                  className="rounded text-emerald-600"
                />
                <span>Trại Dừa An Phú (FARM-001)</span>
              </label>

              <div className="pl-6 space-y-2 text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled
                    checked={
                      user.scopeType === 'SYSTEM' ||
                      user.scopeType === 'FARM' ||
                      user.allowedAreaIds.includes('zone-north')
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Khu Bắc (320 cây · Vườn 01, Vườn 02)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled
                    checked={
                      user.scopeType === 'SYSTEM' ||
                      user.scopeType === 'FARM' ||
                      user.allowedAreaIds.includes('zone-center')
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Khu Trung (450 cây · Vườn 03, Vườn 04, Vườn 05)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled
                    checked={
                      user.scopeType === 'SYSTEM' ||
                      user.scopeType === 'FARM' ||
                      user.allowedAreaIds.includes('zone-south')
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Khu Nam (480 cây · Vườn 06, Vườn 07, Vườn 08)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Lịch sử tác vụ kiểm toán (Audit)</h3>
            {userLogs.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {userLogs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{log.actionLabel}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.target}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 py-6 text-center">Chưa có bản ghi hoạt động nào.</p>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Các phiên làm việc đang hoạt động
            </h3>
            <div className="space-y-2">
              <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Chrome trên macOS (Phiên hiện tại)
                    </span>
                    <div className="text-[11px] text-slate-500 font-mono">
                      IP: 113.161.42.88 · Bến Tre, VN
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Đang hoạt động
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-slate-500" />
                  <div>
                    <span className="font-semibold text-slate-900">
                      Smart Farm Field App trên Android
                    </span>
                    <div className="text-[11px] text-slate-500 font-mono">
                      IP: 14.169.80.12 · 4 giờ trước
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => showToast('Đã thu hồi phiên đăng nhập thiết bị di động')}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Thu hồi phiên
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
