import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Layers,
  TreePine,
  Cpu,
  Calendar,
  AlertOctagon,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle,
  WifiOff,
  Lock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { KpiCard } from '../../../components/common/KpiCard';
import { RightDrawer } from '../../../components/common/RightDrawer';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { AreaNode } from '../../../types';

export const SystemDashboard: React.FC = () => {
  const {
    activeFarm,
    areasTree,
    users,
    roles,
    iotDevices,
    auditLogs,
    navigate,
    setSelectedAreaId,
  } = useApp();

  const [dateRange, setDateRange] = useState('Hôm nay');
  const [selectedZone, setSelectedZone] = useState<AreaNode | null>(null);

  // Stats calculation
  const onlineDevicesCount = iotDevices.filter((d) => d.status === 'ONLINE').length;
  const offlineDevicesCount = iotDevices.filter((d) => d.status === 'OFFLINE').length;
  const lockedUsersCount = users.filter((u) => u.status === 'LOCKED').length;

  const zones = areasTree.children || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Tổng quan hệ thống
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              {activeFarm.code}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{activeFarm.name}</span>
            <span>·</span>
            <span>{activeFarm.address}</span>
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-medium"
            >
              <option value="Hôm nay">Hôm nay (05/10/2026)</option>
              <option value="7 ngày qua">7 ngày qua</option>
              <option value="Tháng này">Tháng này (10/2026)</option>
              <option value="Năm 2026">Năm 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <KpiCard
          icon={<Users className="w-4 h-4 text-blue-600" />}
          label="Người dùng"
          value={users.length}
          trend={{ value: '+2 tháng này', isPositive: true }}
          onClick={() => navigate('/system/users')}
        />
        <KpiCard
          icon={<ShieldCheck className="w-4 h-4 text-purple-600" />}
          label="Vai trò"
          value={roles.length}
          caption="Hệ thống & Tùy biến"
          onClick={() => navigate('/system/roles')}
        />
        <KpiCard
          icon={<Layers className="w-4 h-4 text-emerald-600" />}
          label="Khu vực"
          value={activeFarm.stats.gardensCount}
          caption="3 khu · 8 vườn lô"
          onClick={() => navigate('/system/areas')}
        />
        <KpiCard
          icon={<TreePine className="w-4 h-4 text-green-700" />}
          label="Cây dừa"
          value={activeFarm.stats.plantsCount.toLocaleString('vi-VN')}
          caption="Định danh từng cá thể"
          onClick={() => navigate('/system/map')}
        />
        <KpiCard
          icon={<Cpu className="w-4 h-4 text-amber-600" />}
          label="IoT Devices"
          value={iotDevices.length}
          subBadges={[
            { label: 'Online', count: onlineDevicesCount, colorClass: 'bg-emerald-100 text-emerald-800' },
            { label: 'Offline', count: offlineDevicesCount, colorClass: 'bg-rose-100 text-rose-800' },
          ]}
          onClick={() => navigate('/system/map')}
        />
      </div>

      {/* Dashboard Main Content: 60% Farm Overview & 40% Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 60% Farm Overview */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Sơ đồ tổng quan trang trại (Farm Overview)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhấp vào từng phân khu để mở bảng thông số chi tiết và tình trạng IoT
              </p>
            </div>
            <button
              onClick={() => navigate('/system/map')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              <span>Xem bản đồ vệ tinh</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive Zone Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {zones.map((zone) => {
              const isSelected = selectedZone?.id === zone.id;
              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  className={`p-4 rounded-lg border text-left cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-xs'
                      : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      {zone.code}
                    </span>
                    <StatusBadge
                      status={zone.status}
                      size="sm"
                      customLabel={zone.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {zone.name.toUpperCase()}
                  </h3>

                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Diện tích:</span>
                      <span className="font-mono font-medium">{zone.areaHa} ha</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số cây:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {zone.plantsCount} cây
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IoT Offline:</span>
                      <span
                        className={`font-mono ${
                          (zone.offlineDevicesCount || 0) > 0
                            ? 'text-rose-600 font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        {zone.offlineDevicesCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
                    <span>Xem chi tiết khu</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Farm Mini Interactive Vector Grid */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
              <span className="font-medium">Phân bố cây & Cảm biến theo dải luống</span>
              <span className="text-[11px] text-slate-400">Cập nhật qua LoRaWAN</span>
            </div>
            <div className="h-28 w-full rounded border border-emerald-900/10 bg-emerald-900/5 relative overflow-hidden flex items-center justify-around p-3">
              {/* Visualized zone plots */}
              <div className="w-[30%] h-full bg-emerald-700/15 border border-emerald-600/30 rounded flex flex-col justify-between p-2">
                <span className="text-[10px] font-bold text-emerald-800">KHU BẮC (KB)</span>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === 3 ? 'bg-amber-500 animate-ping' : i === 8 ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">8.2 ha · 320 cây</span>
              </div>

              <div className="w-[30%] h-full bg-emerald-700/10 border border-emerald-600/30 rounded flex flex-col justify-between p-2">
                <span className="text-[10px] font-bold text-emerald-800">KHU TRUNG (KT)</span>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-emerald-600" />
                  ))}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">9.4 ha · 450 cây</span>
              </div>

              <div className="w-[30%] h-full bg-emerald-700/10 border border-emerald-600/30 rounded flex flex-col justify-between p-2">
                <span className="text-[10px] font-bold text-emerald-800">KHU NAM (KN)</span>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i === 5 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    />
                  ))}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">8.0 ha · 480 cây</span>
              </div>
            </div>
          </div>
        </div>

        {/* 40% Recent Activity & System Alerts */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Hoạt động gần đây (Recent Activity)
              </h2>
              <button
                onClick={() => navigate('/system/audit')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
              >
                Xem tất cả
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {auditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="py-2.5 text-xs flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center shrink-0 text-[11px]">
                    {log.userName.split(' ').pop()?.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate">
                        {log.userName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.timestamp.split(' ')[1]}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5 truncate">{log.actionLabel}</p>
                    <p className="text-slate-400 text-[11px] truncate mt-0.5">
                      {log.target}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Alerts Panel */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Cảnh báo hệ thống (System Alerts)
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                2 Sự vụ
              </span>
            </div>

            {/* Critical Alert */}
            <div className="p-3 rounded-lg bg-rose-50/80 border border-rose-200 flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900">Critical: Gateway G02 Offline</span>
                  <span className="text-[10px] font-mono text-rose-600">38m trước</span>
                </div>
                <p className="text-rose-700 mt-0.5">
                  Mất tín hiệu kết nối LoRa trạm bờ rạch Vườn 02. Đang chuyển tiếp qua Gateway G01.
                </p>
                <button
                  onClick={() => navigate('/system/map')}
                  className="mt-2 text-rose-800 underline font-medium hover:text-rose-900 inline-flex items-center gap-1"
                >
                  Kiểm tra trên sơ đồ
                </button>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">
                    Warning: {lockedUsersCount} tài khoản bị khóa
                  </span>
                  <span className="text-[10px] text-amber-700 font-mono">Bảo mật</span>
                </div>
                <p className="text-amber-700 mt-0.5">
                  Tài khoản kỹ thuật viên Bùi Thế H, Đỗ Hữu K, Phan Văn M đang tạm dừng quyền truy cập.
                </p>
                <button
                  onClick={() => navigate('/system/users')}
                  className="mt-2 text-amber-800 underline font-medium hover:text-amber-900 inline-flex items-center gap-1"
                >
                  Xem danh sách người dùng
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Drawer for Selected Zone Detail */}
      <RightDrawer
        isOpen={!!selectedZone}
        onClose={() => setSelectedZone(null)}
        title={selectedZone ? `Thông tin chi tiết: ${selectedZone.name}` : ''}
        subtitle="Phân khu trực thuộc Trại Dừa An Phú"
        footerActions={
          <>
            <button
              onClick={() => setSelectedZone(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                if (selectedZone) {
                  setSelectedAreaId(selectedZone.id);
                  navigate('/system/areas');
                  setSelectedZone(null);
                }
              }}
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
            >
              Quản lý cấu trúc khu
            </button>
          </>
        }
      >
        {selectedZone && (
          <div className="space-y-5 text-xs">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block mb-1">Diện tích</span>
                <span className="text-lg font-bold text-slate-800 font-mono">
                  {selectedZone.areaHa} ha
                </span>
              </div>
              <div className="p-3 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block mb-1">Tổng số cây</span>
                <span className="text-lg font-bold text-slate-800 font-mono">
                  {selectedZone.plantsCount} cây
                </span>
              </div>
              <div className="p-3 rounded bg-amber-50 border border-amber-200">
                <span className="text-amber-700 block mb-1">Cây cần theo dõi</span>
                <span className="text-lg font-bold text-amber-900 font-mono">
                  {selectedZone.flaggedPlantsCount || 6} cây
                </span>
              </div>
              <div className="p-3 rounded bg-rose-50 border border-rose-200">
                <span className="text-rose-700 block mb-1">IoT Offline</span>
                <span className="text-lg font-bold text-rose-900 font-mono">
                  {selectedZone.offlineDevicesCount || 0} thiết bị
                </span>
              </div>
            </div>

            {/* Environmental Indicators */}
            <div className="p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-800">Thông số vi khí hậu & Đất</h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  pH Đất: <strong className="font-mono text-slate-900">{selectedZone.soilPh || 6.4}</strong>
                </div>
                <div>
                  Độ ẩm đất: <strong className="font-mono text-slate-900">{selectedZone.soilMoisture || 42}%</strong>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {selectedZone.notes || 'Khu vực hoạt động ổn định.'}
              </p>
            </div>

            {/* Children Gardens */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Danh sách vườn trực thuộc:</h4>
              <div className="space-y-2">
                {selectedZone.children?.map((garden) => (
                  <div
                    key={garden.id}
                    className="p-2.5 rounded border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{garden.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Mã: {garden.code} · {garden.plantsCount} cây · {garden.areaHa} ha
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigate('/system/map');
                        setSelectedZone(null);
                      }}
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      Bản đồ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
