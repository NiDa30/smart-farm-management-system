import React, { useState } from 'react';
import {
  Sliders,
  Calendar,
  Bell,
  Shield,
  Radio,
  Database,
  Save,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { SystemSettingsState } from '../../../types';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

export const SystemSettings: React.FC = () => {
  const { settings, updateSettings, runBackupNow, isBackingUp, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'format' | 'notification' | 'security' | 'integration' | 'backup'>('general');
  const [localSettings, setLocalSettings] = useState<SystemSettingsState>(settings);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const handleSave = () => {
    updateSettings(localSettings);
  };

  const navItems = [
    { id: 'general', label: 'Thông tin chung', icon: Sliders },
    { id: 'format', label: 'Định dạng & Đơn vị', icon: Calendar },
    { id: 'notification', label: 'Ma trận thông báo', icon: Bell },
    { id: 'security', label: 'Bảo mật & Phiên làm việc', icon: Shield },
    { id: 'integration', label: 'Kết nối IoT & Dịch vụ', icon: Radio },
    { id: 'backup', label: 'Sao lưu & Phục hồi dữ liệu', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Cấu hình hệ thống (System Settings)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập tham số toàn cục, chuẩn hóa quy chuẩn nông học và chính sách bảo mật
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Lưu cấu hình</span>
        </button>
      </div>

      {/* Main Settings Master-Detail Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Settings Navigation Menu (col-span-4) */}
        <div className="md:col-span-4 bg-white rounded-lg border border-slate-200 p-2 shadow-2xs space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-xs font-medium flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-2 border-emerald-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content Area (col-span-8) */}
        <div className="md:col-span-8 bg-white rounded-lg border border-slate-200 p-6 shadow-2xs text-xs space-y-5">
          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Thông tin chung hệ thống (General)
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tên hệ thống:</label>
                  <input
                    type="text"
                    value={localSettings.general.systemName}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        general: { ...localSettings.general, systemName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Màu chủ đạo:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={localSettings.general.primaryColor}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            general: { ...localSettings.general, primaryColor: e.target.value },
                          })
                        }
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                      />
                      <span className="font-mono text-slate-600">
                        {localSettings.general.primaryColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ngôn ngữ giao diện:</label>
                    <select
                      value={localSettings.general.language}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          general: { ...localSettings.general, language: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                    >
                      <option value="vi-VN">Tiếng Việt (Việt Nam)</option>
                      <option value="en-US">English (United States)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Múi giờ máy chủ:</label>
                  <input
                    type="text"
                    disabled
                    value={localSettings.general.timezone}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FORMAT */}
          {activeTab === 'format' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Định dạng chuẩn & Đơn vị đo lường nông học (Format)
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Định dạng ngày (Date):</label>
                  <select
                    value={localSettings.format.dateFormat}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        format: { ...localSettings.format, dateFormat: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Ví dụ: 05/10/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Định dạng giờ (Time):</label>
                  <select
                    value={localSettings.format.timeFormat}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        format: { ...localSettings.format, timeFormat: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                  >
                    <option value="24-hour (HH:mm:ss)">24 giờ (HH:mm:ss)</option>
                    <option value="12-hour (hh:mm A)">12 giờ (AM/PM)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Đơn vị tiền tệ (Currency):</label>
                  <input
                    type="text"
                    value={localSettings.format.currency}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        format: { ...localSettings.format, currency: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số chữ số thập phân (Decimals):</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={localSettings.format.decimalPlaces}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        format: {
                          ...localSettings.format,
                          decimalPlaces: parseInt(e.target.value) || 2,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Đơn vị diện tích:</label>
                  <input
                    type="text"
                    value={localSettings.format.areaUnit}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        format: { ...localSettings.format, areaUnit: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Đơn vị thể tích nước:</label>
                  <input
                    type="text"
                    value={localSettings.format.volumeUnit}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        format: { ...localSettings.format, volumeUnit: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATION */}
          {activeTab === 'notification' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Ma trận cấu hình kênh cảnh báo (Notification Matrix)
              </h2>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Loại sự kiện</th>
                      <th className="py-2.5 px-3 text-center w-24">In-App Web</th>
                      <th className="py-2.5 px-3 text-center w-24">Email</th>
                      <th className="py-2.5 px-3 text-center w-24">Tin nhắn SMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { key: 'iotCritical', label: 'IoT Critical (Mất kết nối gateway, hỏng bơm)' },
                      { key: 'taskOverdue', label: 'Công việc tưới/bón phân quá hạn' },
                      { key: 'lowInventory', label: 'Kho vật tư sắp cạn dưới định mức an toàn' },
                      { key: 'pestsAlert', label: 'Phát hiện sâu bệnh mới trên cây' },
                      { key: 'weatherWarning', label: 'Dự báo bão, triều cường hoặc hạn mặn' },
                    ].map((row) => {
                      const item = (localSettings.notifications as any)[row.key];
                      return (
                        <tr key={row.key} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{row.label}</td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.inApp}
                              onChange={(e) =>
                                setLocalSettings({
                                  ...localSettings,
                                  notifications: {
                                    ...localSettings.notifications,
                                    [row.key]: { ...item, inApp: e.target.checked },
                                  },
                                })
                              }
                              className="rounded text-emerald-600"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.email}
                              onChange={(e) =>
                                setLocalSettings({
                                  ...localSettings,
                                  notifications: {
                                    ...localSettings.notifications,
                                    [row.key]: { ...item, email: e.target.checked },
                                  },
                                })
                              }
                              className="rounded text-emerald-600"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.sms}
                              onChange={(e) =>
                                setLocalSettings({
                                  ...localSettings,
                                  notifications: {
                                    ...localSettings.notifications,
                                    [row.key]: { ...item, sms: e.target.checked },
                                  },
                                })
                              }
                              className="rounded text-emerald-600"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Chính sách an toàn & Xác thực (Security Policy)
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Độ dài mật khẩu tối thiểu:
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={localSettings.security.minPasswordLength}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        security: {
                          ...localSettings.security,
                          minPasswordLength: parseInt(e.target.value) || 8,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Thời gian hết hạn phiên làm việc (phút):
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    value={localSettings.security.sessionTimeoutMins}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        security: {
                          ...localSettings.security,
                          sessionTimeoutMins: parseInt(e.target.value) || 60,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Giới hạn số lần đăng nhập sai trước khi khóa:
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={localSettings.security.failedLoginLimit}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        security: {
                          ...localSettings.security,
                          failedLoginLimit: parseInt(e.target.value) || 5,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={localSettings.security.requireStrongPassword}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        security: {
                          ...localSettings.security,
                          requireStrongPassword: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Bắt buộc mật khẩu có chữ hoa, số và ký tự đặc biệt</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={localSettings.security.autoLockInactive}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        security: {
                          ...localSettings.security,
                          autoLockInactive: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-emerald-600"
                  />
                  <span>Tự động khóa tài khoản sau 30 ngày không có hoạt động</span>
                </label>
              </div>
            </div>
          )}

          {/* INTEGRATION */}
          {activeTab === 'integration' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Kết nối viễn thám IoT & Cổng dịch vụ thứ 3
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Địa chỉ MQTT Broker (LoRa Gateway & Solenoid Valves):
                  </label>
                  <input
                    type="text"
                    value={localSettings.integrations.mqttBrokerUrl}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        integrations: {
                          ...localSettings.integrations,
                          mqttBrokerUrl: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Cổng MQTT (Port):</label>
                    <input
                      type="number"
                      value={localSettings.integrations.mqttPort}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          integrations: {
                            ...localSettings.integrations,
                            mqttPort: parseInt(e.target.value) || 8883,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Domain phát hành mã QR cây:
                    </label>
                    <input
                      type="text"
                      value={localSettings.integrations.qrDomain}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          integrations: {
                            ...localSettings.integrations,
                            qrDomain: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Sao lưu dự phòng & Khôi phục dữ liệu (Backup & Restore)
              </h2>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Lần sao lưu gần nhất:</span>
                  <strong className="font-mono text-slate-900">{settings.backup.lastBackup}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái bảo toàn:</span>
                  <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Thành công 100% (128.4 MB)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isBackingUp}
                  onClick={runBackupNow}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isBackingUp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tạo bản chụp sao lưu...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Sao lưu ngay (Backup Now)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(true)}
                  className="px-4 py-2 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-rose-600" />
                  <span>Phục hồi dữ liệu (Restore)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Restore Dangerous Confirmation Modal */}
      <ConfirmModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={() => {
          showToast('Đã phục hồi thành công từ bản sao lưu gần nhất!', 'success');
          setIsRestoreModalOpen(false);
        }}
        variant="danger"
        title="CẢNH BÁO NGUY HIỂM: Phục hồi toàn bộ cơ sở dữ liệu"
        description={
          <div>
            <p className="font-medium text-rose-900">
              Thao tác này sẽ ghi đè toàn bộ dữ liệu nhật ký cây trồng, cấu hình IoT và đơn hàng hiện
              tại về trạng thái tại mốc sao lưu: <strong>{settings.backup.lastBackup}</strong>.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Vui lòng đảm bảo bạn có thẩm quyền cao nhất của Hệ thống (Admin) trước khi tiếp tục.
            </p>
          </div>
        }
        confirmLabel="Tôi hiểu rủi ro, Phục hồi ngay"
      />
    </div>
  );
};
