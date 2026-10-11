import React, { useState } from 'react';
import { ArrowLeft, Shield, Lock, Layers, Check } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { ScopeType, User, UserStatus } from '../../../types';

interface UserFormProps {
  editMode?: boolean;
  userId?: string;
}

export const UserForm: React.FC<UserFormProps> = ({ editMode = false, userId }) => {
  const { users, roles, addUser, updateUser, navigate } = useApp();

  const existingUser = editMode ? users.find((u) => u.id === userId) : null;

  const [formData, setFormData] = useState({
    name: existingUser?.name || '',
    email: existingUser?.email || '',
    phone: existingUser?.phone || '',
    username: existingUser?.username || '',
    password: '',
    confirmPassword: '',
    mustChangePassword: existingUser?.mustChangePassword ?? true,
    roleId: existingUser?.roleId || roles[3]?.id || roles[0]?.id,
    scopeType: existingUser?.scopeType || ('CUSTOM_AREAS' as ScopeType),
    allowedAreaIds: existingUser?.allowedAreaIds || ['zone-north'],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Vui lòng nhập họ và tên';
    if (!formData.email.trim()) errs.email = 'Vui lòng nhập email';
    if (!formData.username.trim()) errs.username = 'Vui lòng nhập tên đăng nhập';

    if (!editMode) {
      if (!formData.password) errs.password = 'Vui lòng nhập mật khẩu';
      else if (formData.password.length < 8) errs.password = 'Mật khẩu tối thiểu 8 ký tự';
      if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const selectedRole = roles.find((r) => r.id === formData.roleId);

    if (editMode && existingUser) {
      updateUser(existingUser.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        roleId: formData.roleId,
        roleName: selectedRole?.name || existingUser.roleName,
        scopeType: formData.scopeType,
        allowedAreaIds: formData.allowedAreaIds,
        mustChangePassword: formData.mustChangePassword,
      });
      navigate(`/system/users/${existingUser.id}`);
    } else {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        roleId: formData.roleId,
        roleName: selectedRole?.name || 'Kỹ thuật viên',
        status: 'ACTIVE',
        lastLogin: 'Chưa đăng nhập',
        scopeType: formData.scopeType,
        allowedAreaIds: formData.allowedAreaIds,
        mustChangePassword: formData.mustChangePassword,
      };
      addUser(newUser);
      navigate('/system/users');
    }
  };

  const toggleArea = (areaId: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedAreaIds: prev.allowedAreaIds.includes(areaId)
        ? prev.allowedAreaIds.filter((id) => id !== areaId)
        : [...prev.allowedAreaIds, areaId],
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/system/users')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {editMode ? `Chỉnh sửa tài khoản: ${existingUser?.name}` : 'Thêm người dùng mới'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấp tài khoản đăng nhập, gán vai trò quyền hạn và giới hạn phạm vi truy cập
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            1. Thông tin cá nhân (Personal Information)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              {errors.name && <p className="text-rose-600 text-[11px] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nva@anphufarm.vn"
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              {errors.email && <p className="text-rose-600 text-[11px] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Số điện thoại</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0912 345 678"
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Account */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            2. Tài khoản & Bảo mật (Account & Credentials)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tên đăng nhập (Username) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={editMode}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="nguyen.vana"
                className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50"
              />
              {errors.username && <p className="text-rose-600 text-[11px] mt-1">{errors.username}</p>}
            </div>

            {!editMode && (
              <>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Tối thiểu 8 ký tự..."
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.password && (
                    <p className="text-rose-600 text-[11px] mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Xác nhận mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.confirmPassword && (
                    <p className="text-rose-600 text-[11px] mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </>
            )}

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.mustChangePassword}
                  onChange={(e) =>
                    setFormData({ ...formData, mustChangePassword: e.target.checked })
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium">
                  Yêu cầu đổi mật khẩu trong lần đăng nhập đầu tiên
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Role Assignment */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            3. Vai trò phân quyền (Role Assignment)
          </h2>
          <div className="text-xs space-y-2">
            <label className="font-semibold text-slate-700 block">Chọn vai trò:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map((r) => (
                <label
                  key={r.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-3 ${
                    formData.roleId === r.id
                      ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="roleId"
                    value={r.id}
                    checked={formData.roleId === r.id}
                    onChange={() => setFormData({ ...formData, roleId: r.id })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{r.name}</span>
                    <span className="text-[11px] text-slate-500">{r.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Data Scope */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            4. Phạm vi dữ liệu (Data Scope)
          </h2>
          <div className="space-y-3 text-xs">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="radio"
                  name="scopeType"
                  value="SYSTEM"
                  checked={formData.scopeType === 'SYSTEM'}
                  onChange={() => setFormData({ ...formData, scopeType: 'SYSTEM' })}
                  className="text-emerald-600"
                />
                <span>Toàn hệ thống (Tất cả trang trại)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="radio"
                  name="scopeType"
                  value="FARM"
                  checked={formData.scopeType === 'FARM'}
                  onChange={() => setFormData({ ...formData, scopeType: 'FARM' })}
                  className="text-emerald-600"
                />
                <span>Toàn trang trại đang chọn (Trại Dừa An Phú)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                <input
                  type="radio"
                  name="scopeType"
                  value="CUSTOM_AREAS"
                  checked={formData.scopeType === 'CUSTOM_AREAS'}
                  onChange={() => setFormData({ ...formData, scopeType: 'CUSTOM_AREAS' })}
                  className="text-emerald-600"
                />
                <span>Giới hạn theo từng phân khu cụ thể (Custom Areas)</span>
              </label>
            </div>

            {formData.scopeType === 'CUSTOM_AREAS' && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <span className="font-semibold text-slate-800 block">
                  Chọn các khu vực được phép thao tác:
                </span>
                <div className="space-y-1.5 pl-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowedAreaIds.includes('zone-north')}
                      onChange={() => toggleArea('zone-north')}
                      className="rounded text-emerald-600"
                    />
                    <span>Khu Bắc (320 cây · Vườn 01, Vườn 02)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowedAreaIds.includes('zone-center')}
                      onChange={() => toggleArea('zone-center')}
                      className="rounded text-emerald-600"
                    />
                    <span>Khu Trung (450 cây · Vườn 03, Vườn 04, Vườn 05)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowedAreaIds.includes('zone-south')}
                      onChange={() => toggleArea('zone-south')}
                      className="rounded text-emerald-600"
                    />
                    <span>Khu Nam (480 cây · Vườn 06, Vườn 07, Vườn 08)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Actions Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-3 z-30 shadow-lg">
          <button
            type="button"
            onClick={() => navigate('/system/users')}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition-colors"
          >
            {editMode ? 'Lưu thay đổi' : 'Tạo người dùng'}
          </button>
        </div>
      </form>
    </div>
  );
};
