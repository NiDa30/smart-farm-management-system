import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit,
  MapPin,
  Calendar,
  Globe,
  Coins,
  Scale,
  Compass,
  Layers,
  TreePine,
  Cpu,
  Users,
  CheckCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { KpiCard } from '../../../components/common/KpiCard';

export const FarmDetail: React.FC = () => {
  const { activeFarm, navigate, users, iotDevices, auditLogs } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'structure' | 'map' | 'users' | 'devices' | 'activity'>('overview');

  const farmUsers = users.filter((u) => u.allowedAreaIds.includes(activeFarm.id) || u.scopeType === 'SYSTEM');
  const farmDevices = iotDevices; // devices associated with active farm
  const farmLogs = auditLogs.filter((l) => l.module === 'SYSTEM' || l.target.includes(activeFarm.name));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/system/farms')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Quay lại danh sách trang trại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {activeFarm.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {activeFarm.code}
              </span>
              <StatusBadge status={activeFarm.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeFarm.address}</span>
              <span>·</span>
              <span className="font-mono">{activeFarm.areaHa} ha</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/system/farms/${activeFarm.id}/edit`)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors self-start sm:self-auto"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Chỉnh sửa thông tin</span>
        </button>
      </div>

      {/* 6 Overview Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Phân khu</span>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {activeFarm.stats.zonesCount}
          </span>
          <span className="text-[11px] text-slate-500 block">khu vực</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Vườn / Lô</span>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {activeFarm.stats.gardensCount}
          </span>
          <span className="text-[11px] text-slate-500 block">vườn chuyên canh</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Hàng / Luống</span>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {activeFarm.stats.rowsCount}
          </span>
          <span className="text-[11px] text-slate-500 block">dãy luống</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Cá thể cây</span>
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-700">
            {activeFarm.stats.plantsCount.toLocaleString('vi-VN')}
          </span>
          <span className="text-[11px] text-slate-500 block">cây định danh QR</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Thiết bị IoT</span>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {activeFarm.stats.devicesCount}
          </span>
          <span className="text-[11px] text-slate-500 block">cảm biến & van</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Người dùng</span>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {activeFarm.stats.usersCount}
          </span>
          <span className="text-[11px] text-slate-500 block">nhân sự phân quyền</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg">
        <nav className="flex space-x-6 text-xs font-medium">
          {[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'structure', label: 'Cấu trúc khu vực' },
            { id: 'map', label: 'Bản đồ số' },
            { id: 'users', label: `Người dùng (${farmUsers.length})` },
            { id: 'devices', label: `Thiết bị IoT (${farmDevices.length})` },
            { id: 'activity', label: 'Hoạt động & Nhật ký' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Farm Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-slate-900">Thông tin quy hoạch</h3>
            <div className="divide-y divide-slate-100">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Mã định danh:</span>
                <span className="font-mono font-semibold text-slate-900">{activeFarm.code}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Loại hình canh tác:</span>
                <span className="text-slate-800 font-medium">{activeFarm.type}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Giống cây trồng chính:</span>
                <span className="text-emerald-800 font-medium">{activeFarm.mainCrop}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Tổng diện tích:</span>
                <span className="font-mono font-bold text-slate-900">{activeFarm.areaHa} ha</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Tọa độ GPS trung tâm:</span>
                <span className="font-mono text-slate-700">
                  {activeFarm.latitude}, {activeFarm.longitude}
                </span>
              </div>
              <div className="py-2 flex flex-col gap-1">
                <span className="text-slate-500">Mô tả giới thiệu:</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100">
                  {activeFarm.description}
                </p>
              </div>
            </div>
          </div>

          {/* Regional Standards & Units Config */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-slate-900">Đơn vị đo lường & Cấu hình vùng</h3>
            <div className="divide-y divide-slate-100">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Đơn vị đo diện tích:</span>
                <span className="font-medium text-slate-800">{activeFarm.areaUnit}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Đơn vị trọng lượng:</span>
                <span className="font-medium text-slate-800">{activeFarm.weightUnit}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Đơn vị thể tích nước:</span>
                <span className="font-medium text-slate-800">{activeFarm.volumeUnit}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Đơn vị tiền tệ:</span>
                <span className="font-medium text-slate-800">{activeFarm.currency}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Múi giờ hệ thống:</span>
                <span className="font-mono text-slate-800">{activeFarm.timezone}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Ngôn ngữ mặc định:</span>
                <span className="font-medium text-slate-800">{activeFarm.language}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => navigate('/system/areas')}
                className="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-center font-medium transition-colors"
              >
                Mở sơ đồ cấu trúc phân khu (Area Structure)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'structure' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center space-y-3">
          <Layers className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">
            Xem và cấu hình phân cấp: Trang trại → Khu → Vườn → Hàng → Cây
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hệ thống cung cấp giao diện cây phân cấp đa tầng (Master-Detail) để quản lý từng luống
            cây và vị trí cảm biến.
          </p>
          <button
            onClick={() => navigate('/system/areas')}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <span>Đến màn hình Cấu trúc khu vực</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center space-y-3">
          <Compass className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900">Bản đồ số trang trại (Farm Map)</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Xem trực quan ranh giới phân khu, vị trí từng cây dừa, trạng thái sức khỏe và cảm biến
            IoT thời gian thực.
          </p>
          <button
            onClick={() => navigate('/system/map')}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <span>Mở Bản đồ không gian toàn màn hình</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-800">
              Nhân sự có quyền truy cập trang trại ({farmUsers.length})
            </span>
            <button
              onClick={() => navigate('/system/users/new')}
              className="text-emerald-700 hover:underline font-medium"
            >
              + Gán người dùng mới
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {farmUsers.map((user) => (
              <div key={user.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center">
                    {user.name.slice(0, 1)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">{user.name}</span>
                    <span className="text-slate-400 ml-2">@{user.username}</span>
                    <div className="text-[11px] text-slate-500">{user.email} · {user.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 font-medium">{user.roleName}</span>
                  <StatusBadge status={user.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-800">
              Danh sách thiết bị cảm biến & điều khiển ({farmDevices.length})
            </span>
            <span className="text-slate-400 font-mono">LoRaWAN & MQTT</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {farmDevices.map((dev) => (
              <div key={dev.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">{dev.code}</span>
                    <span className="font-semibold text-slate-900">{dev.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Loại: {dev.type} · Pin: {dev.batteryPercent}% · Tín hiệu: {dev.signalDbm} dBm
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">{dev.lastPing}</span>
                  <StatusBadge status={dev.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Nhật ký kiểm toán trang trại (Audit Log)
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {farmLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900">{log.userName}</span>
                  <span className="text-slate-500 ml-1.5">— {log.actionLabel}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{log.target}</p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
