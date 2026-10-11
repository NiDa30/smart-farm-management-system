import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Save,
  CheckSquare,
  Square,
  AlertTriangle,
  Search,
  Shield,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { ModuleKey, PermissionActions, Role } from '../../../types';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

interface RolePermissionProps {
  roleId?: string;
}

export const RolePermission: React.FC<RolePermissionProps> = ({ roleId }) => {
  const { roles, updateRolePermissions, duplicateRole, navigate } = useApp();

  const activeRoleId = roleId || roles[3]?.id || roles[0]?.id;
  const currentRole = roles.find((r) => r.id === activeRoleId) || roles[0];

  const [permissionsState, setPermissionsState] = useState<Record<ModuleKey, PermissionActions>>(
    currentRole.permissions
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // When changing selected role from dropdown
  const handleRoleChange = (newRoleId: string) => {
    navigate(`/system/roles/${newRoleId}`);
    const found = roles.find((r) => r.id === newRoleId);
    if (found) setPermissionsState(found.permissions);
  };

  const moduleDefinitions: { key: ModuleKey; label: string; desc: string }[] = [
    {
      key: 'PLANTS',
      label: 'Cây trồng & Sinh trưởng',
      desc: 'Hồ sơ cá thể cây, chỉ số sinh trưởng, nhật ký vòng đời cây dừa.',
    },
    {
      key: 'TASKS',
      label: 'Công việc & Chăm sóc',
      desc: 'Lập lịch tưới, bón phân, tỉa cành, làm cỏ và theo dõi thực hiện.',
    },
    {
      key: 'PESTS',
      label: 'Sâu bệnh & Điều trị',
      desc: 'Thư viện sâu bệnh, thuốc BVTV sinh học, mở case điều trị bọ cánh cứng.',
    },
    {
      key: 'INVENTORY',
      label: 'Kho & Vật tư nông nghiệp',
      desc: 'Nhập xuất tồn phân bón, hạt giống, đơn vị FEFO và điều chuyển kho.',
    },
    {
      key: 'IOT',
      label: 'IoT & Tự động hóa',
      desc: 'Giám sát cảm biến đất, điều khiển van Solenoid, máy bơm và kích hoạt tự động.',
    },
    {
      key: 'COMMERCE',
      label: 'Kinh doanh & Khách hàng',
      desc: 'CRM khách hàng, báo giá dừa thành phẩm, đơn hàng và công nợ bán buôn.',
    },
    {
      key: 'REPORTS',
      label: 'Báo cáo & Phân tích',
      desc: 'Dashboard tổng hợp năng suất, phân tích chi phí và anomaly detection.',
    },
    {
      key: 'SYSTEM',
      label: 'Cấu hình hệ thống & User',
      desc: 'Quản lý tài khoản người dùng, cấu hình trang trại và phân quyền RBAC.',
    },
  ];

  // Toggle single action
  const togglePermission = (mod: ModuleKey, action: keyof PermissionActions) => {
    setPermissionsState((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [action]: !prev[mod][action],
      },
    }));
  };

  // Toggle entire row
  const toggleRow = (mod: ModuleKey) => {
    const current = permissionsState[mod];
    const allActive =
      current.view && current.create && current.update && current.delete && current.approve;
    const nextVal = !allActive;
    setPermissionsState((prev) => ({
      ...prev,
      [mod]: {
        view: nextVal,
        create: nextVal,
        update: nextVal,
        delete: nextVal,
        approve: nextVal,
      },
    }));
  };

  // Toggle entire column
  const toggleColumn = (action: keyof PermissionActions) => {
    const allChecked = moduleDefinitions.every((m) => permissionsState[m.key][action]);
    const nextVal = !allChecked;
    setPermissionsState((prev) => {
      const updated = { ...prev };
      moduleDefinitions.forEach((m) => {
        updated[m.key] = {
          ...updated[m.key],
          [action]: nextVal,
        };
      });
      return updated;
    });
  };

  const handleSaveConfirmed = () => {
    updateRolePermissions(currentRole.id, permissionsState);
    setIsConfirmModalOpen(false);
  };

  const filteredModules = moduleDefinitions.filter(
    (m) =>
      m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/system/roles')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Ma trận phân quyền: {currentRole.name}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                {currentRole.type}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Đang áp dụng cho <strong>{currentRole.userCount}</strong> người dùng trong hệ thống
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Switch Role Dropdown */}
          <select
            value={currentRole.id}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                Vai trò: {r.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => duplicateRole(currentRole.id, `${currentRole.name} (Bản sao)`)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Nhân bản</span>
          </button>

          <button
            onClick={() => setIsConfirmModalOpen(true)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu phân quyền</span>
          </button>
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-4 shadow-2xs">
        <div className="relative max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm phân hệ quyền hạn..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          Mẹo: Nhấp vào tiêu đề cột để tích/bỏ tích toàn bộ phân hệ
        </div>
      </div>

      {/* Permission Matrix Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
            <tr>
              <th className="py-3 px-4 w-72">Phân hệ nghiệp vụ</th>
              <th className="py-3 px-4 w-24 text-center">Tất cả hàng</th>
              {(
                [
                  { key: 'view', label: 'Xem (View)' },
                  { key: 'create', label: 'Tạo mới (Create)' },
                  { key: 'update', label: 'Chỉnh sửa (Update)' },
                  { key: 'delete', label: 'Xóa (Delete)' },
                  { key: 'approve', label: 'Phê duyệt (Approve)' },
                ] as { key: keyof PermissionActions; label: string }[]
              ).map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  title="Nhấp để bật/tắt toàn bộ cột"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredModules.map((mod) => {
              const perms = permissionsState[mod.key];
              const allChecked =
                perms.view && perms.create && perms.update && perms.delete && perms.approve;

              return (
                <tr key={mod.key} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{mod.label}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{mod.desc}</span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => toggleRow(mod.key)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium"
                    >
                      {allChecked ? 'Bỏ chọn' : 'Chọn hết'}
                    </button>
                  </td>

                  {(['view', 'create', 'update', 'delete', 'approve'] as (keyof PermissionActions)[]).map(
                    (action) => (
                      <td key={action} className="py-3 px-3 text-center">
                        <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={perms[action]}
                            onChange={() => togglePermission(mod.key, action)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </label>
                      </td>
                    )
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal when saving permissions */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleSaveConfirmed}
        variant="warning"
        title="Xác nhận cập nhật ma trận phân quyền"
        description={
          <div>
            <p>
              Bạn đang thay đổi cấu hình quyền hạn của vai trò{' '}
              <strong>{currentRole.name}</strong>.
            </p>
            <p className="mt-2 font-medium text-amber-700">
              {currentRole.userCount} người dùng thuộc vai trò này sẽ bị ảnh hưởng ngay lập tức
              khi hệ thống áp dụng cấu hình mới.
            </p>
          </div>
        }
        confirmLabel="Lưu & Áp dụng phân quyền"
      />
    </div>
  );
};
