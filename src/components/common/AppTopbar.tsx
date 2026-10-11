import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  AlertTriangle,
  ChevronRight,
  Shield,
  WifiOff,
  UserCheck,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AppTopbarProps {
  onToggleSidebar: () => void;
}

export const AppTopbar: React.FC<AppTopbarProps> = ({ onToggleSidebar }) => {
  const {
    currentRoute,
    navigate,
    activeFarm,
    users,
    activeUser,
    setActiveUser,
    iotDevices,
  } = useApp();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [iotAlertOpen, setIotAlertOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Compute offline IoT devices
  const offlineDevices = iotDevices.filter((d) => d.status === 'OFFLINE');
  const warningDevices = iotDevices.filter((d) => d.status === 'WARNING');

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    // Exact System Dashboard
    if (currentRoute === '/system/dashboard' || currentRoute === '/') {
      return [{ label: 'Smart Farm', route: '/system/dashboard' }, { label: 'Tổng quan hệ thống' }];
    }

    // PHÂN HỆ 1: HỆ THỐNG & PHÂN QUYỀN
    if (currentRoute.startsWith('/system/')) {
      const parts: { label: string; route?: string }[] = [
        { label: 'Hệ thống', route: '/system/farms' },
      ];
      if (currentRoute === '/system/farms') {
        parts.push({ label: 'Danh sách trang trại' });
      } else if (currentRoute.startsWith('/system/farms/new')) {
        parts.push({ label: 'Trang trại', route: '/system/farms' });
        parts.push({ label: 'Thêm trang trại mới' });
      } else if (currentRoute.includes('/edit')) {
        parts.push({ label: 'Trang trại', route: '/system/farms' });
        parts.push({ label: 'Chỉnh sửa' });
      } else if (currentRoute.startsWith('/system/areas')) {
        parts.push({ label: 'Cấu trúc khu vực', route: '/system/areas' });
      } else if (currentRoute.startsWith('/system/map')) {
        parts.push({ label: 'Bản đồ trang trại' });
      } else if (currentRoute.startsWith('/system/users')) {
        parts.push({ label: 'Người dùng & Phân quyền', route: '/system/users' });
      } else if (currentRoute.startsWith('/system/roles')) {
        parts.push({ label: 'Vai trò & Quyền hạn' });
      } else if (currentRoute.startsWith('/system/audit')) {
        parts.push({ label: 'Audit Log' });
      } else if (currentRoute.startsWith('/system/settings')) {
        parts.push({ label: 'Cấu hình hệ thống' });
      } else {
        parts.push({ label: activeFarm.name });
      }
      return parts;
    }

    // PHÂN HỆ 2: SẢN XUẤT & CÂY TRỒNG
    if (currentRoute.startsWith('/production')) {
      const parts: { label: string; route?: string }[] = [
        { label: 'Sản xuất & Cây trồng', route: '/production/dashboard' },
      ];
      if (currentRoute === '/production/dashboard' || currentRoute === '/production') {
        parts.push({ label: 'Tổng quan sản xuất' });
      } else if (currentRoute.startsWith('/production/map')) {
        parts.push({ label: 'Sơ đồ vườn & Định vị cây' });
      } else if (currentRoute.startsWith('/production/plants')) {
        parts.push({ label: 'Hồ sơ cây trồng', route: '/production/plants' });
        if (currentRoute.includes('/new')) parts.push({ label: 'Thêm cây mới' });
        else if (currentRoute.includes('/edit')) parts.push({ label: 'Chỉnh sửa' });
        else if (currentRoute !== '/production/plants') parts.push({ label: 'Chi tiết cây' });
      } else if (currentRoute.startsWith('/production/growth')) {
        parts.push({ label: 'Chỉ số sinh trưởng' });
      } else if (currentRoute.startsWith('/production/tasks')) {
        parts.push({ label: 'Công việc & Chăm sóc' });
      } else if (currentRoute.startsWith('/production/nutrition')) {
        parts.push({ label: 'Dinh dưỡng & Bón phân' });
      } else if (currentRoute.startsWith('/production/irrigation')) {
        parts.push({ label: 'Nước & Tưới tiêu' });
      } else if (currentRoute.startsWith('/production/environment')) {
        parts.push({ label: 'Đất & Môi trường' });
      } else if (currentRoute.startsWith('/production/diseases')) {
        parts.push({ label: 'Thư viện sâu bệnh' });
      } else if (currentRoute.startsWith('/production/pesticides')) {
        parts.push({ label: 'Thuốc BVTV sinh học' });
      } else if (currentRoute.startsWith('/production/disease-cases')) {
        parts.push({ label: 'Case điều trị bệnh' });
      } else if (currentRoute.startsWith('/production/harvests')) {
        parts.push({ label: 'Thu hoạch & Năng suất' });
      } else if (currentRoute.startsWith('/production/traceability')) {
        parts.push({ label: 'Truy xuất nguồn gốc cây' });
      }
      return parts;
    }

    // PHÂN HỆ 3: VẬT TƯ NÔNG NGHIỆP
    if (currentRoute.startsWith('/resources') || currentRoute.startsWith('/inventory')) {
      const parts: { label: string; route?: string }[] = [
        { label: 'Vật tư & Kho', route: '/resources/dashboard' },
      ];
      if (currentRoute === '/resources/dashboard' || currentRoute === '/resources' || currentRoute === '/inventory/dashboard' || currentRoute === '/inventory') {
        parts.push({ label: 'Tổng quan vật tư' });
      } else if (currentRoute.startsWith('/resources/materials')) {
        parts.push({ label: 'Danh mục vật tư' });
      } else if (currentRoute.startsWith('/resources/suppliers')) {
        parts.push({ label: 'Nhà cung cấp' });
      } else if (currentRoute.startsWith('/resources/purchases')) {
        parts.push({ label: 'Mua hàng & Nhập kho' });
      } else if (currentRoute.startsWith('/resources/inventory')) {
        parts.push({ label: 'Kho & Lô vật tư' });
      } else if (currentRoute.startsWith('/resources/assets')) {
        parts.push({ label: 'Máy móc & Thiết bị' });
      } else if (currentRoute.startsWith('/resources/iot-devices')) {
        parts.push({ label: 'Thiết bị IoT & Cảm biến' });
      }
      return parts;
    }

    // PHÂN HỆ 4: IoT & TỰ ĐỘNG HÓA
    if (currentRoute.startsWith('/iot')) {
      const parts: { label: string; route?: string }[] = [
        { label: 'IoT & Tự động hóa', route: '/iot/dashboard' },
      ];
      if (currentRoute === '/iot/dashboard' || currentRoute === '/iot') {
        parts.push({ label: 'Tổng quan IoT' });
      } else if (currentRoute.startsWith('/iot/devices')) {
        parts.push({ label: 'Giám sát thiết bị' });
      } else if (currentRoute.startsWith('/iot/realtime')) {
        parts.push({ label: 'Sensor Realtime' });
      } else if (currentRoute.startsWith('/iot/history')) {
        parts.push({ label: 'Lịch sử & So sánh' });
      } else if (currentRoute.startsWith('/iot/topology')) {
        parts.push({ label: 'Sơ đồ mạng Topology' });
      } else if (currentRoute.startsWith('/iot/control')) {
        parts.push({ label: 'Điều khiển Actuator' });
      } else if (currentRoute.startsWith('/iot/digital-twin')) {
        parts.push({ label: 'Bản sao số Digital Twin' });
      } else if (currentRoute.startsWith('/iot/automation')) {
        parts.push({ label: 'Quy tắc Tự động hóa' });
      } else if (currentRoute.startsWith('/iot/alerts')) {
        parts.push({ label: 'Trung tâm Cảnh báo' });
      } else if (currentRoute.startsWith('/iot/resources')) {
        parts.push({ label: 'Tiêu thụ Nước & Điện' });
      } else if (currentRoute.startsWith('/iot/safety')) {
        parts.push({ label: 'An toàn Fail-Safe & Edge' });
      } else if (currentRoute.startsWith('/iot/events')) {
        parts.push({ label: 'Nhật ký sự kiện Event Log' });
      }
      return parts;
    }

    // PHÂN HỆ 5: KINH DOANH & KHÁCH HÀNG
    if (currentRoute.startsWith('/sales') || currentRoute.startsWith('/commerce')) {
      const parts: { label: string; route?: string }[] = [
        { label: 'Kinh doanh & Khách hàng', route: '/sales/dashboard' },
      ];
      if (currentRoute === '/sales/dashboard' || currentRoute === '/sales' || currentRoute === '/commerce/dashboard' || currentRoute === '/commerce') {
        parts.push({ label: 'Tổng quan kinh doanh' });
      } else if (currentRoute.startsWith('/sales/customers')) {
        parts.push({ label: 'Khách hàng & CRM' });
      } else if (currentRoute.startsWith('/sales/crm')) {
        parts.push({ label: 'Nhật ký CRM & Lịch hẹn' });
      } else if (currentRoute.startsWith('/sales/products')) {
        parts.push({ label: 'Sản phẩm thương mại' });
      } else if (currentRoute.startsWith('/sales/classification')) {
        parts.push({ label: 'Phân loại sau thu hoạch' });
      } else if (currentRoute.startsWith('/sales/inventory')) {
        parts.push({ label: 'Kho thành phẩm' });
      } else if (currentRoute.startsWith('/sales/pricing')) {
        parts.push({ label: 'Bảng giá & Chính sách' });
      } else if (currentRoute.startsWith('/sales/quotations')) {
        parts.push({ label: 'Báo giá' });
      } else if (currentRoute.startsWith('/sales/orders')) {
        parts.push({ label: 'Quản lý đơn hàng' });
      } else if (currentRoute.startsWith('/sales/supply-plan')) {
        parts.push({ label: 'Cung ứng & Dự báo hái' });
      } else if (currentRoute.startsWith('/sales/deliveries')) {
        parts.push({ label: 'Vận chuyển & Giao hàng' });
      } else if (currentRoute.startsWith('/sales/payments')) {
        parts.push({ label: 'Thanh toán & Công nợ' });
      } else if (currentRoute.startsWith('/sales/claims')) {
        parts.push({ label: 'Khiếu nại & Trả hàng' });
      } else if (currentRoute.startsWith('/sales/traceability')) {
        parts.push({ label: 'Truy xuất nguồn gốc' });
      }
      return parts;
    }

    // BÁO CÁO & PHÂN TÍCH
    if (currentRoute.startsWith('/reports')) {
      return [{ label: 'Smart Farm', route: '/system/dashboard' }, { label: 'Báo cáo & Phân tích' }];
    }

    return [
      { label: 'Trang trại', route: '/system/farms' },
      { label: activeFarm.name },
    ];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Thu gọn/Mở rộng menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Trail */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              {crumb.route ? (
                <button
                  onClick={() => crumb.route && navigate(crumb.route)}
                  className="hover:text-emerald-700 transition-colors font-medium"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right Zone: Search, IoT Alerts, Notifications, User */}
      <div className="flex items-center gap-2">
        {/* Global Search Button */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-500 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Tìm nhanh (cây, khu vực, thiết bị...)</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* IoT Alert Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setIotAlertOpen(!iotAlertOpen);
              setNotificationOpen(false);
              setUserMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              offlineDevices.length > 0
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Cảnh báo IoT"
          >
            {offlineDevices.length > 0 ? (
              <WifiOff className="w-4 h-4 text-rose-600 animate-pulse" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-slate-400" />
            )}
            <span className="font-mono tabular-nums font-bold">
              {offlineDevices.length}
            </span>
            <span className="hidden sm:inline">Offline</span>
          </button>

          {iotAlertOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-900">
                <span className="flex items-center gap-1.5 text-rose-600">
                  <WifiOff className="w-4 h-4" />
                  Thiết bị IoT mất kết nối ({offlineDevices.length})
                </span>
                <button
                  onClick={() => setIotAlertOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                {offlineDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-2 rounded bg-rose-50/70 border border-rose-100 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-900">{dev.name}</span>
                      <span className="text-[10px] font-mono text-rose-600">
                        {dev.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Vị trí: Khu Bắc (Vườn 02)</span>
                      <span className="text-slate-400">{dev.lastPing}</span>
                    </div>
                  </div>
                ))}

                {warningDevices.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-amber-700 block mb-1">
                      Cần kiểm tra pin ({warningDevices.length})
                    </span>
                    {warningDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-2 rounded bg-amber-50/70 border border-amber-100 text-[11px]"
                      >
                        <div className="flex justify-between font-medium text-amber-900">
                          <span>{dev.name}</span>
                          <span>Pin: {dev.batteryPercent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setIotAlertOpen(false);
                  navigate('/system/map');
                }}
                className="w-full mt-2 py-1.5 text-center text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 rounded border border-emerald-200 transition-colors"
              >
                Mở sơ đồ định vị thiết bị
              </button>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              setIotAlertOpen(false);
              setUserMenuOpen(false);
            }}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
            title="Thông báo hệ thống"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </button>

          {notificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-900">
                <span>Thông báo hệ thống</span>
                <span className="text-[11px] text-emerald-600 font-normal">
                  Đánh dấu đã đọc
                </span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2 rounded hover:bg-slate-50 transition-colors">
                  <div className="font-medium text-slate-800">
                    Khu Bắc: Bọ cánh cứng trên cây A018
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Kỹ thuật viên Lê Văn C vừa cập nhật hồ sơ cây · 35 phút trước
                  </div>
                </div>
                <div className="p-2 rounded hover:bg-slate-50 transition-colors">
                  <div className="font-medium text-slate-800">
                    Sao lưu dữ liệu tự động hoàn tất
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Snapshot 128 MB lưu trữ an toàn · 02:00 sáng
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher */}
        <div className="relative pl-2 border-l border-slate-200">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationOpen(false);
              setIotAlertOpen(false);
            }}
            className="flex items-center gap-2 p-1 rounded-md hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-semibold flex items-center justify-center text-xs shadow-xs">
              {activeUser.name.split(' ').pop()?.slice(0, 1) || 'A'}
            </div>
            <div className="hidden sm:block text-xs">
              <div className="font-semibold text-slate-800 leading-tight">
                {activeUser.name}
              </div>
              <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <Shield className="w-3 h-3" />
                <span>{activeUser.roleName.split(' ')[0]}</span>
              </div>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-3 text-xs">
              <div className="pb-2 border-b border-slate-100">
                <div className="font-semibold text-slate-900">{activeUser.name}</div>
                <div className="text-[11px] text-slate-500">{activeUser.email}</div>
                <div className="text-[11px] text-emerald-700 font-medium mt-1">
                  Vai trò: {activeUser.roleName}
                </div>
              </div>

              {/* Simulation Switcher */}
              <div className="py-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Đổi người dùng mô phỏng
                </span>
                <div className="space-y-1">
                  {users.slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setActiveUser(u);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                        u.id === activeUser.id
                          ? 'text-emerald-700 font-semibold bg-emerald-50'
                          : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{u.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {u.roleName.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <button
                  onClick={() => {
                    navigate('/system/settings');
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cài đặt tài khoản
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Quick Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setSearchModalOpen(false)}
          />
          <div className="min-h-full flex items-start justify-center p-4 pt-20">
            <div className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-xs">
              <div className="p-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên cây (A001), khu vực (Khu Bắc), người dùng, thiết bị..."
                  className="w-full bg-transparent focus:outline-none text-slate-900 placeholder-slate-400 text-sm"
                />
                <button
                  onClick={() => setSearchModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 max-h-72 overflow-y-auto divide-y divide-slate-100">
                <div className="py-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-2 mb-1">
                    Gợi ý điều hướng
                  </span>
                  {[
                    { label: 'Tổng quan kinh doanh & Farm-to-Customer', route: '/sales/dashboard', tag: 'Kinh doanh' },
                    { label: 'Đơn hàng #SO-2026-1028 (Siêu thị Big C)', route: '/sales/orders', tag: 'Đơn hàng' },
                    { label: 'Khách hàng: Siêu thị Thực phẩm Sạch GreenMart', route: '/sales/customers', tag: 'CRM' },
                    { label: 'Lô thành phẩm LOT-COC-A-20261005 (Kho lạnh)', route: '/sales/inventory', tag: 'Kho' },
                    { label: 'Phiếu giao hàng DEL-2026-0220 (Xe Isuzu 1.9T)', route: '/sales/deliveries', tag: 'Giao hàng' },
                    { label: 'Tra cứu chuỗi cung ứng QR Code', route: '/sales/traceability', tag: 'Traceability' },
                    { label: 'Cây Dừa #A018 (Cần theo dõi sâu bệnh)', route: '/production/plants', tag: 'Sản xuất' },
                    { label: 'Bản đồ số trang trại & Định vị IoT', route: '/system/map', tag: 'Bản đồ' },
                    { label: 'Sensor Realtime độ ẩm & nhiệt độ đất', route: '/iot/realtime', tag: 'IoT' },
                    { label: 'Báo giá khách hàng & Chính sách giá', route: '/sales/quotations', tag: 'Báo giá' },
                    { label: 'Quản lý tuổi nợ & Thu hồi công nợ', route: '/sales/payments', tag: 'Tài chính' },
                    { label: 'Thư viện sâu bọ & Thuốc BVTV sinh học', route: '/production/diseases', tag: 'BVTV' },
                    { label: 'Xem nhật ký kiểm toán (Audit Log)', route: '/system/audit', tag: 'Hệ thống' },
                  ]
                    .filter((item) =>
                      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.tag.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          navigate(item.route);
                          setSearchModalOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 flex items-center justify-between text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {item.tag}
                          </span>
                          <span className="font-medium text-xs text-slate-800">{item.label}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
