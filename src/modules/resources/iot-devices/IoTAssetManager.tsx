import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Network,
  Activity,
  Radio,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Shield,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Wrench,
  Gauge,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { IoTAssetItem } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const IoTAssetManager: React.FC = () => {
  const { iotAssets, installIoTAsset, addIoTAsset, navigate, showToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDevice, setSelectedDevice] = useState<IoTAssetItem | null>(null);
  const [detailTab, setDetailTab] = useState<'OVERVIEW' | 'CONNECT' | 'CALIB'>('OVERVIEW');

  // Screen 20: Installation Modal State
  const [installingDevice, setInstallingDevice] = useState<IoTAssetItem | null>(null);
  const [installZone, setInstallZone] = useState('Khu Bắc');
  const [installGarden, setInstallGarden] = useState('Vườn 01');
  const [installTarget, setInstallTarget] = useState('A021–A040 (Hàng A)');
  const [installGateway, setInstallGateway] = useState('Gateway Trạm ESP32-04');

  // Add IoT Device Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formDevId, setFormDevId] = useState(`SM-0${iotAssets.length + 1}`);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<IoTAssetItem['type']>('SOIL_SENSOR');
  const [formModel, setFormModel] = useState('AgriSense S100 RS485/LoRa');
  const [formSerial, setFormSerial] = useState('');
  const [formPrice, setFormPrice] = useState<number>(450000);

  const filteredAssets = iotAssets.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || d.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || d.assetStatus === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const handleInstallConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!installingDevice) return;

    installIoTAsset(
      installingDevice.deviceId,
      installZone === 'Khu Bắc' ? 'zone-north' : 'zone-center',
      installZone,
      installGarden,
      installTarget,
      'gw-esp32-04',
      installGateway
    );

    setInstallingDevice(null);
    setSelectedDevice(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Vui lòng nhập tên thiết bị', 'warning');
      return;
    }

    const newIoT: IoTAssetItem = {
      id: `iot-${Date.now()}`,
      deviceId: formDevId,
      name: formName,
      type: formType,
      typeLabel:
        formType === 'SOIL_SENSOR'
          ? 'Cảm biến đất'
          : formType === 'WEATHER_STATION'
          ? 'Trạm khí tượng'
          : formType === 'VALVE'
          ? 'Van điện từ'
          : 'Lưu lượng / Gateway',
      model: formModel,
      serialNumber: formSerial || `SN-IOT-${Date.now().toString().slice(-6)}`,
      supplierName: 'Công ty SmartAgTech',
      purchaseDate: new Date().toLocaleDateString('vi-VN'),
      purchasePrice: formPrice,
      firmware: 'v1.4.2-lora',
      assetStatus: 'IN_STOCK',
      installStatus: 'UNINSTALLED',
      servedTarget: 'Chưa lắp đặt (Tồn kho kỹ thuật)',
      calibrationIntervalDays: 90,
    };

    addIoTAsset(newIoT);
    setIsAddOpen(false);
    setSelectedDevice(newIoT);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Quản Trị Tài Sản Thiết Bị IoT
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-200">
              Hardware Asset & Topology
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý vòng đời phần cứng IoT, lịch sử lắp đặt, liên kết Gateway / Parent và định kỳ hiệu chuẩn cảm biến
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/production/environment')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xem Telemetry thời gian thực &rarr;</span>
          </button>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm thiết bị IoT</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Device ID (SM-03...), tên thiết bị, serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Loại */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Loại:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="SOIL_SENSOR">Cảm biến đất</option>
              <option value="WEATHER_STATION">Trạm thời tiết</option>
              <option value="VALVE">Van điện từ</option>
              <option value="FLOW_METER">Đồng hồ lưu lượng</option>
            </select>
          </div>

          {/* Trạng thái */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="IN_STOCK">Trong kho (Chưa lắp)</option>
            </select>
          </div>

          <span className="text-slate-400 font-mono text-xs pl-2">
            {filteredAssets.length} thiết bị
          </span>
        </div>
      </div>

      {/* IoT Devices Table (Screen 18) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Device ID</th>
                <th className="py-3 px-3">Tên thiết bị</th>
                <th className="py-3 px-3">Loại</th>
                <th className="py-3 px-3">Model & Serial</th>
                <th className="py-3 px-3">Vị trí / Mục tiêu phục vụ</th>
                <th className="py-3 px-3">Trạm Gateway</th>
                <th className="py-3 px-3">Firmware</th>
                <th className="py-3 px-3">Trạng thái tài sản</th>
                <th className="py-3 px-3">Lắp đặt</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => {
                    setSelectedDevice(d);
                    setDetailTab('OVERVIEW');
                  }}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                    {d.deviceId}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 group-hover:text-emerald-700">
                    {d.name}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                      {d.typeLabel}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    <div>{d.model}</div>
                    <div className="text-[10px] text-slate-400">SN: {d.serialNumber}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800">{d.servedTarget}</div>
                    <div className="text-[10px] text-slate-400">
                      {d.zoneName ? `${d.zoneName} - ${d.gardenName}` : 'Chưa gán'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                    {d.gatewayName || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">{d.firmware}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        d.assetStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          d.assetStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      ></span>
                      {d.assetStatus === 'ACTIVE' ? 'Hoạt động' : 'Tồn kho'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {d.installStatus === 'INSTALLED' ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đã lắp
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInstallingDevice(d);
                        }}
                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded font-semibold text-[11px] border border-purple-200"
                      >
                        Lắp đặt &rarr;
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedDevice(d);
                        setDetailTab('OVERVIEW');
                      }}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded text-[11px]"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen 19: IoT Asset Detail Drawer */}
      <RightDrawer
        isOpen={!!selectedDevice && !installingDevice}
        onClose={() => setSelectedDevice(null)}
        title={selectedDevice?.name || 'Chi tiết phần cứng IoT'}
        subtitle={`ID: ${selectedDevice?.deviceId} • Model: ${selectedDevice?.model}`}
        width="w-full sm:w-[560px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setSelectedDevice(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            <div className="flex items-center gap-2">
              {selectedDevice && selectedDevice.installStatus === 'UNINSTALLED' && (
                <button
                  onClick={() => setInstallingDevice(selectedDevice)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs"
                >
                  <Network className="w-3.5 h-3.5" /> Lắp đặt thiết bị vào vườn
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedDevice(null);
                  navigate('/production/environment');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs"
              >
                <Activity className="w-3.5 h-3.5" /> Xem realtime trong IoT &rarr;
              </button>
            </div>
          </div>
        }
      >
        {selectedDevice && (
          <div className="space-y-4 text-xs">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-medium">
              {[
                { key: 'OVERVIEW', label: 'Thông tin tài sản' },
                { key: 'CONNECT', label: 'Cấu hình kết nối' },
                { key: 'CALIB', label: 'Chu kỳ hiệu chuẩn' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key as any)}
                  className={`pb-2 border-b-2 transition-colors ${
                    detailTab === tab.key
                      ? 'border-emerald-600 text-emerald-800 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {detailTab === 'OVERVIEW' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Trạng thái lắp đặt:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedDevice.installStatus === 'INSTALLED'
                        ? 'Đã lắp đặt ngoài thực địa'
                        : 'Lưu kho kỹ thuật'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Khu vực & Vườn:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDevice.zoneName || 'Chưa gán'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ngày đưa vào sử dụng:</span>
                    <span className="font-mono text-slate-800">
                      {selectedDevice.installDate || 'Chưa lắp'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kỹ thuật viên lắp đặt:</span>
                    <span className="font-medium text-slate-800">
                      {selectedDevice.installedBy || '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Mục tiêu phục vụ:</span>
                    <span className="font-semibold text-emerald-800">
                      {selectedDevice.servedTarget}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Số Serial nhà máy:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedDevice.serialNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Phiên bản Firmware:</span>
                    <span className="font-mono text-slate-800">{selectedDevice.firmware}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Đơn vị cung cấp:</span>
                    <span className="text-slate-800">{selectedDevice.supplierName}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Topology / Connection */}
            {detailTab === 'CONNECT' && (
              <div className="space-y-3">
                <span className="font-bold text-slate-900 block">Sơ đồ mạng kết nối (Topology Preview):</span>
                <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-2">
                  <div className="text-emerald-400 font-bold">
                    [Gateway Trung tâm] {selectedDevice.gatewayName || 'Gateway ESP32-04'}
                  </div>
                  <div className="pl-4 text-slate-400">│</div>
                  <div className="pl-4 text-slate-400">
                    └── <span className="text-white font-semibold">[Node Sensor] {selectedDevice.name} ({selectedDevice.deviceId})</span>
                  </div>
                  <div className="pl-10 text-slate-400">│</div>
                  <div className="pl-10 text-slate-400">
                    └── <span className="text-purple-300 font-medium">[Vị trí] {selectedDevice.zoneName || 'Khu Bắc'} &rarr; {selectedDevice.servedTarget}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Calibration */}
            {detailTab === 'CALIB' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Lần hiệu chuẩn gần nhất:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedDevice.lastCalibrationDate || 'Chưa hiệu chuẩn'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Hạn hiệu chuẩn tiếp theo:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {selectedDevice.nextCalibrationDate || '90 ngày'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </RightDrawer>

      {/* Screen 20: IoT Installation Modal with Topology Preview */}
      {installingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Lắp Đặt & Gán Thiết Bị IoT Vào Vườn
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Thiết bị: {installingDevice.name} ({installingDevice.deviceId})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInstallingDevice(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInstallConfirm} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phân khu lắp đặt *:</label>
                  <select
                    value={installZone}
                    onChange={(e) => setInstallZone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="Khu Bắc">Khu Bắc</option>
                    <option value="Khu Trung">Khu Trung</option>
                    <option value="Khu Nam">Khu Nam</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lô Vườn *:</label>
                  <select
                    value={installGarden}
                    onChange={(e) => setInstallGarden(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="Vườn 01">Vườn 01</option>
                    <option value="Vườn 02">Vườn 02</option>
                    <option value="Vườn 03">Vườn 03</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nhóm cây hoặc cụm phục vụ *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phục vụ hàng cây A021–A040..."
                  value={installTarget}
                  onChange={(e) => setInstallTarget(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Trạm Gateway / Parent thu thập dữ liệu *:
                </label>
                <select
                  value={installGateway}
                  onChange={(e) => setInstallGateway(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                >
                  <option value="Gateway Trạm ESP32-04">Gateway Trạm ESP32-04 (Vườn 01)</option>
                  <option value="Gateway Trạm ESP32-05">Gateway Trạm ESP32-05 (Vườn 02)</option>
                  <option value="Trạm Trung tâm Gateway 4G">Trạm Trung tâm Gateway 4G</option>
                </select>
              </div>

              {/* Topology Preview (Screen 20 Topology Preview) */}
              <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl space-y-1 text-[11px] font-mono">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">
                  Sơ đồ đấu nối sau cấu hình:
                </span>
                <div className="text-emerald-400 font-semibold">{installGateway}</div>
                <div className="pl-3 text-slate-400">&darr;</div>
                <div className="pl-3 text-white font-semibold">
                  {installingDevice.name} ({installingDevice.deviceId})
                </div>
                <div className="pl-6 text-slate-400">&darr;</div>
                <div className="pl-6 text-purple-300">
                  {installZone} - {installGarden} ({installTarget})
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInstallingDevice(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Xác nhận lắp đặt & Kích hoạt Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add IoT Device Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Thêm Thiết Bị IoT Mới</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Device ID *:</label>
                  <input
                    type="text"
                    required
                    value={formDevId}
                    onChange={(e) => setFormDevId(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại thiết bị *:</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="SOIL_SENSOR">Cảm biến độ ẩm đất</option>
                    <option value="WEATHER_STATION">Trạm thời tiết</option>
                    <option value="VALVE">Van điện từ thông minh</option>
                    <option value="FLOW_METER">Đồng hồ lưu lượng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên thiết bị *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cảm biến độ ẩm đất IoT Soil-09..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Model phần cứng:</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số Serial:</label>
                  <input
                    type="text"
                    placeholder="SN123456..."
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Đơn giá nhập (VNĐ):</label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Lưu vào kho thiết bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
