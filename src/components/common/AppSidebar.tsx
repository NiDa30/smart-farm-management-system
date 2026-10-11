import React, { useState } from 'react';
import {
  LayoutDashboard,
  Settings,
  TreePine,
  Package,
  Cpu,
  ShoppingBag,
  BarChart3,
  ChevronDown,
  ChevronRight,
  MapPin,
  Users,
  ShieldCheck,
  FileText,
  Sliders,
  Sprout,
  Compass,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  CalendarCheck,
  Droplets,
  FlaskConical,
  Bug,
  Sparkles,
  Wheat,
  QrCode,
  Activity,
  Truck,
  ShoppingCart,
  Wrench,
  Boxes,
  Radio,
  Power,
  Network,
  AlertTriangle,
  History,
  Tag,
  CreditCard,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const { currentRoute, navigate, activeFarm, farms, setActiveFarmId } = useApp();
  const [productionOpen, setProductionOpen] = useState(
    currentRoute.startsWith('/production')
  );
  const [resourcesOpen, setResourcesOpen] = useState(
    currentRoute.startsWith('/resources') || currentRoute.startsWith('/inventory')
  );
  const [iotOpen, setIotOpen] = useState(
    currentRoute.startsWith('/iot')
  );
  const [salesOpen, setSalesOpen] = useState(
    currentRoute.startsWith('/sales') || currentRoute === '/commerce'
  );
  const [systemOpen, setSystemOpen] = useState(
    currentRoute.startsWith('/system')
  );
  const [analyticsOpen, setAnalyticsOpen] = useState(
    currentRoute.startsWith('/analytics') || currentRoute.startsWith('/reports')
  );
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);

  const analyticsSubmenu = [
    { label: 'Tổng quan điều hành (Executive BI)', route: '/analytics/dashboard', icon: LayoutDashboard },
    { label: 'Sản xuất & Cây trồng (Crop BI)', route: '/analytics/production', icon: TreePine },
    { label: 'IoT, Nước & Vi khí hậu', route: '/analytics/iot', icon: Droplets },
    { label: 'Vật tư & Máy móc tài sản', route: '/analytics/resources', icon: Package },
    { label: 'Kinh doanh & Tài chính', route: '/analytics/sales', icon: DollarSign },
    { label: 'Đối sánh Đa chiều (Benchmark)', route: '/analytics/benchmark', icon: BarChart3 },
    { label: 'Cảnh báo Bất thường (Anomalies)', route: '/analytics/anomalies', icon: AlertTriangle },
    { label: 'Dự báo Mùa vụ & Nhu cầu', route: '/analytics/forecast', icon: Sparkles },
    { label: 'Trình tạo Báo cáo (Report Builder)', route: '/analytics/reports', icon: FileText },
  ];

  const salesSubmenu = [
    { label: 'Tổng quan kinh doanh', route: '/sales/dashboard', icon: LayoutDashboard },
    { label: 'Danh sách khách hàng', route: '/sales/customers', icon: Users },
    { label: 'Nhật ký CRM & Lịch hẹn', route: '/sales/crm', icon: MessageSquare },
    { label: 'Sản phẩm thương mại', route: '/sales/products', icon: Boxes },
    { label: 'Phân loại sau thu hoạch', route: '/sales/classification', icon: CheckCircle2 },
    { label: 'Kho thành phẩm', route: '/sales/inventory', icon: Layers },
    { label: 'Bảng giá & Chính sách', route: '/sales/pricing', icon: Tag },
    { label: 'Báo giá khách hàng', route: '/sales/quotations', icon: FileText },
    { label: 'Quản lý đơn hàng', route: '/sales/orders', icon: ShoppingBag },
    { label: 'Cung ứng & Dự báo hái', route: '/sales/supply-plan', icon: TrendingUp },
    { label: 'Vận chuyển & Giao hàng', route: '/sales/deliveries', icon: Truck },
    { label: 'Thanh toán & Công nợ', route: '/sales/payments', icon: CreditCard },
    { label: 'Trả hàng & Khiếu nại', route: '/sales/claims', icon: RotateCcw },
    { label: 'Truy xuất nguồn gốc', route: '/sales/traceability', icon: QrCode },
  ];

  const iotSubmenu = [
    { label: 'Tổng quan IoT', route: '/iot/dashboard', icon: LayoutDashboard },
    { label: 'Giám sát thiết bị', route: '/iot/devices', icon: Radio },
    { label: 'Sensor Realtime', route: '/iot/realtime', icon: Activity },
    { label: 'Lịch sử & So sánh', route: '/iot/history', icon: History },
    { label: 'Sơ đồ mạng Topology', route: '/iot/topology', icon: Network },
    { label: 'Điều khiển Actuator', route: '/iot/control', icon: Power },
    { label: 'Bản sao số Digital Twin', route: '/iot/digital-twin', icon: Layers },
    { label: 'Quy tắc Tự động hóa', route: '/iot/automation', icon: Sparkles },
    { label: 'Trung tâm Cảnh báo', route: '/iot/alerts', icon: AlertTriangle },
    { label: 'Tiêu thụ Nước & Điện', route: '/iot/resources', icon: Droplets },
    { label: 'An toàn Fail-Safe & Edge', route: '/iot/safety', icon: ShieldCheck },
    { label: 'Nhật ký sự kiện Event Log', route: '/iot/events', icon: FileText },
  ];

  const resourcesSubmenu = [
    { label: 'Tổng quan vật tư', route: '/resources/dashboard', icon: LayoutDashboard },
    { label: 'Danh mục vật tư', route: '/resources/materials', icon: Package },
    { label: 'Nhà cung cấp', route: '/resources/suppliers', icon: Truck },
    { label: 'Mua hàng & Nhận hàng', route: '/resources/purchases', icon: ShoppingCart },
    { label: 'Kho & Lô hàng', route: '/resources/inventory', icon: Layers },
    { label: 'Thiết bị & Máy móc', route: '/resources/assets', icon: Wrench },
    { label: 'Thiết bị IoT & Cảm biến', route: '/resources/iot-devices', icon: Cpu },
  ];

  const productionSubmenu = [
    { label: 'Tổng quan sản xuất', route: '/production/dashboard', icon: LayoutDashboard },
    { label: 'Sơ đồ vườn & Định vị cây', route: '/production/map', icon: Compass },
    { label: 'Cây trồng & Hồ sơ', route: '/production/plants', icon: TreePine },
    { label: 'Chỉ số sinh trưởng', route: '/production/growth', icon: Activity },
    { label: 'Công việc & Lịch chăm sóc', route: '/production/tasks', icon: CalendarCheck },
    { label: 'Dinh dưỡng & Bón phân', route: '/production/nutrition', icon: FlaskConical },
    { label: 'Nước & Tưới tiêu', route: '/production/irrigation', icon: Droplets },
    { label: 'Đất & Môi trường', route: '/production/environment', icon: Sprout },
    { label: 'Thư viện sâu bệnh', route: '/production/diseases', icon: Bug },
    { label: 'Thuốc BVTV sinh học', route: '/production/pesticides', icon: Sparkles },
    { label: 'Case điều trị bệnh', route: '/production/disease-cases', icon: Bug },
    { label: 'Thu hoạch & Năng suất', route: '/production/harvests', icon: Wheat },
    { label: 'Truy xuất nguồn gốc', route: '/production/traceability', icon: QrCode },
  ];

  const systemSubmenu = [
    { label: 'Trang trại', route: '/system/farms', icon: MapPin },
    { label: 'Cấu trúc khu vực', route: '/system/areas', icon: Layers },
    { label: 'Bản đồ trang trại', route: '/system/map', icon: Compass },
    { label: 'Người dùng', route: '/system/users', icon: Users },
    { label: 'Vai trò & Phân quyền', route: '/system/roles', icon: ShieldCheck },
    { label: 'Audit Log', route: '/system/audit', icon: FileText },
    { label: 'Cấu hình hệ thống', route: '/system/settings', icon: Sliders },
  ];

  return (
    <aside
      className={`h-screen bg-[#0F2D32] text-slate-200 flex flex-col shrink-0 select-none transition-all duration-200 border-r border-[#164047] z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand & Logo */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#164047]">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-white tracking-tight text-sm block truncate">
                Smart Farm IoT
              </span>
              <span className="text-[10px] text-emerald-400 font-mono block -mt-0.5">
                CROP & PRODUCTION
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#164047] transition-colors"
          title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="w-4 h-4" />
          ) : (
            <ChevronsLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Active Farm Switcher Header */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-[#164047]/60 relative">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block px-1 mb-1">
            Trang trại đang chọn
          </label>
          <div className="relative">
            <button
              onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#164047]/50 hover:bg-[#164047] border border-[#1f525a] text-xs text-white transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="truncate font-medium">{activeFarm.name}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {farmDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 bg-[#0b2327] border border-[#1f525a] rounded-md shadow-xl py-1 z-40 text-xs">
                {farms.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFarmId(f.id);
                      setFarmDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#164047] transition-colors ${
                      f.id === activeFarm.id
                        ? 'text-emerald-400 font-semibold bg-[#164047]/60'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{f.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {f.areaHa} ha
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* Module 2: SẢN XUẤT & CÂY TRỒNG (Primary focus) */}
        <div>
          {!collapsed ? (
            <button
              onClick={() => setProductionOpen(!productionOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span className="flex items-center gap-2">
                <TreePine className="w-3.5 h-3.5" />
                <span>Sản xuất & Cây trồng</span>
              </span>
              {productionOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-full text-center py-1 text-emerald-400">
              <TreePine className="w-4 h-4 mx-auto" />
            </div>
          )}

          {(productionOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {productionSubmenu.map((sub) => {
                const Icon = sub.icon;
                const isActive =
                  currentRoute === sub.route ||
                  (sub.route !== '/production/dashboard' &&
                    currentRoute.startsWith(sub.route));
                return (
                  <button
                    key={sub.route}
                    onClick={() => navigate(sub.route)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#1A4D55] text-emerald-300 font-semibold border-l-2 border-emerald-400'
                        : 'text-slate-300 hover:text-white hover:bg-[#164047]'
                    } ${collapsed ? 'justify-center' : 'pl-5'}`}
                    title={sub.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{sub.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Module 3: VẬT TƯ NÔNG NGHIỆP */}
        <div className="pt-2 border-t border-[#164047]/60">
          {!collapsed ? (
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-amber-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                <span>Vật tư nông nghiệp</span>
              </span>
              {resourcesOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-full text-center py-1 text-amber-400">
              <Package className="w-4 h-4 mx-auto" />
            </div>
          )}

          {(resourcesOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {resourcesSubmenu.map((sub) => {
                const Icon = sub.icon;
                const isActive =
                  currentRoute === sub.route ||
                  (sub.route !== '/resources/dashboard' &&
                    currentRoute.startsWith(sub.route));
                return (
                  <button
                    key={sub.route}
                    onClick={() => navigate(sub.route)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#1A4D55] text-amber-300 font-semibold border-l-2 border-amber-400'
                        : 'text-slate-300 hover:text-white hover:bg-[#164047]'
                    } ${collapsed ? 'justify-center' : 'pl-5'}`}
                    title={sub.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{sub.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Module 4: IoT & TỰ ĐỘNG HÓA */}
        <div className="pt-2 border-t border-[#164047]/60">
          {!collapsed ? (
            <button
              onClick={() => setIotOpen(!iotOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-cyan-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>IoT & Tự động hóa</span>
              </span>
              {iotOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-full text-center py-1 text-cyan-400">
              <Cpu className="w-4 h-4 mx-auto" />
            </div>
          )}

          {(iotOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {iotSubmenu.map((sub) => {
                const Icon = sub.icon;
                const isActive =
                  currentRoute === sub.route ||
                  (sub.route !== '/iot/dashboard' &&
                    currentRoute.startsWith(sub.route));
                return (
                  <button
                    key={sub.route}
                    onClick={() => navigate(sub.route)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#1A4D55] text-cyan-300 font-semibold border-l-2 border-cyan-400'
                        : 'text-slate-300 hover:text-white hover:bg-[#164047]'
                    } ${collapsed ? 'justify-center' : 'pl-5'}`}
                    title={sub.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{sub.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Module 5: KINH DOANH & KHÁCH HÀNG */}
        <div className="pt-2 border-t border-[#164047]/60">
          {!collapsed ? (
            <button
              onClick={() => setSalesOpen(!salesOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-rose-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Kinh doanh & Khách hàng</span>
              </span>
              {salesOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-full text-center py-1 text-rose-400">
              <ShoppingBag className="w-4 h-4 mx-auto" />
            </div>
          )}

          {(salesOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {salesSubmenu.map((sub) => {
                const Icon = sub.icon;
                const isActive =
                  currentRoute === sub.route ||
                  (sub.route !== '/sales/dashboard' &&
                    currentRoute.startsWith(sub.route));
                return (
                  <button
                    key={sub.route}
                    onClick={() => navigate(sub.route)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#1A4D55] text-rose-300 font-semibold border-l-2 border-rose-400'
                        : 'text-slate-300 hover:text-white hover:bg-[#164047]'
                    } ${collapsed ? 'justify-center' : 'pl-5'}`}
                    title={sub.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{sub.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Module 1: HỆ THỐNG & PHÂN QUYỀN */}
        <div className="pt-2 border-t border-[#164047]/60">
          {!collapsed ? (
            <button
              onClick={() => setSystemOpen(!systemOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                <span>Hệ thống & Phân quyền</span>
              </span>
              {systemOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-full text-center py-1 text-slate-400">
              <Settings className="w-4 h-4 mx-auto" />
            </div>
          )}

          {(systemOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {systemSubmenu.map((sub) => {
                const Icon = sub.icon;
                const isActive =
                  currentRoute === sub.route ||
                  (sub.route !== '/system/dashboard' &&
                    currentRoute.startsWith(sub.route));
                return (
                  <button
                    key={sub.route}
                    onClick={() => navigate(sub.route)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#1A4D55] text-emerald-300 font-semibold border-l-2 border-emerald-400'
                        : 'text-slate-300 hover:text-white hover:bg-[#164047]'
                    } ${collapsed ? 'justify-center' : 'pl-5'}`}
                    title={sub.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{sub.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Module 6: BÁO CÁO & PHÂN TÍCH (BI ANALYTICS) */}
        <div className="pt-2 border-t border-[#164047]/60">
          {!collapsed ? (
            <button
              onClick={() => setAnalyticsOpen(!analyticsOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Báo cáo & Phân tích</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono border border-emerald-800">
                  BI
                </span>
                {analyticsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>
            </button>
          ) : (
            <div className="w-full text-center py-1 text-emerald-400" title="Báo cáo & Phân tích">
              <BarChart3 className="w-4 h-4 mx-auto" />
            </div>
          )}

          {(analyticsOpen || collapsed) && (
            <div className="space-y-0.5 mt-1">
              {analyticsSubmenu.map((sub) => {
                const Icon = sub.icon;
                const isActive =
                  currentRoute === sub.route ||
                  (sub.route !== '/analytics/dashboard' &&
                    currentRoute.startsWith(sub.route));
                return (
                  <button
                    key={sub.route}
                    onClick={() => navigate(sub.route)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      isActive
                        ? 'bg-[#1A4D55] text-emerald-300 font-semibold border-l-2 border-emerald-400'
                        : 'text-slate-300 hover:text-white hover:bg-[#164047]'
                    } ${collapsed ? 'justify-center' : 'pl-5'}`}
                    title={sub.label}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span className="truncate">{sub.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer Profile Status */}
      <div className="p-3 border-t border-[#164047] bg-[#0c2428] text-xs">
        {!collapsed ? (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Phiên bản v2.6.4</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LoRa Live
            </span>
          </div>
        ) : (
          <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto" title="LoRa Live" />
        )}
      </div>
    </aside>
  );
};
