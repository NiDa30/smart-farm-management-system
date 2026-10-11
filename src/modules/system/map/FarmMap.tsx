import React, { useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Maximize2,
  Layers,
  Map as MapIcon,
  Globe,
  Compass,
  TreePine,
  Cpu,
  AlertTriangle,
  QrCode,
  Droplets,
  Calendar,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { RightDrawer } from '../../../components/common/RightDrawer';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { IoTDevice, Plant } from '../../../types';

export const FarmMap: React.FC = () => {
  const { activeFarm, areasTree, plants, iotDevices, navigate } = useApp();

  // Toolbar & layer controls
  const [mapMode, setMapMode] = useState<'vector' | 'satellite'>('vector');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [layers, setLayers] = useState({
    zones: true,
    gardens: true,
    rows: true,
    plants: true,
    iot: true,
    alerts: true,
  });
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Inspector Drawer State
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [selectedZoneName, setSelectedZoneName] = useState<string | null>(null);

  const zones = areasTree.children || [];

  const handlePlantClick = (plant: Plant, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlant(plant);
    setSelectedDevice(null);
    setSelectedZoneName(null);
  };

  const handleDeviceClick = (dev: IoTDevice, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDevice(dev);
    setSelectedPlant(null);
    setSelectedZoneName(null);
  };

  const handleZoneClick = (name: string) => {
    setSelectedZoneName(name);
    setSelectedPlant(null);
    setSelectedDevice(null);
  };

  return (
    <div className="relative h-[calc(100vh-6rem)] w-full bg-[#0b2427] rounded-lg overflow-hidden border border-slate-300 shadow-sm select-none">
      {/* Top Floating Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Search */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-md shadow-md border border-slate-200">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm cây (A001, A018) hoặc thiết bị..."
            className="pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none w-56"
          />
        </div>

        {/* Map / Satellite Mode */}
        <div className="bg-white/95 backdrop-blur-md rounded-md shadow-md border border-slate-200 p-0.5 flex items-center text-xs">
          <button
            onClick={() => setMapMode('vector')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-medium ${
              mapMode === 'vector'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Sơ đồ (Vector)</span>
          </button>
          <button
            onClick={() => setMapMode('satellite')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-medium ${
              mapMode === 'satellite'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Vệ tinh</span>
          </button>
        </div>
      </div>

      {/* Right Floating Controls: Zoom & Layers */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {/* Layers Button & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-md shadow-md text-xs font-semibold text-slate-700 hover:bg-white"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lớp bản đồ ({Object.values(layers).filter(Boolean).length})</span>
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-xl p-3 z-30 text-xs space-y-2">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider pb-1 border-b border-slate-100">
                Hiển thị các lớp (Layers)
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={layers.zones}
                  onChange={(e) => setLayers({ ...layers, zones: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>☑ Phân khu (Zones)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={layers.gardens}
                  onChange={(e) => setLayers({ ...layers, gardens: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>☑ Vườn / Lô</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={layers.rows}
                  onChange={(e) => setLayers({ ...layers, rows: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>☑ Hàng / Luống</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={layers.plants}
                  onChange={(e) => setLayers({ ...layers, plants: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>☑ Cá thể cây (Cây dừa)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={layers.iot}
                  onChange={(e) => setLayers({ ...layers, iot: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>☑ Thiết bị IoT & Van</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={layers.alerts}
                  onChange={(e) => setLayers({ ...layers, alerts: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-amber-700 font-semibold">Cảnh báo sâu bệnh & Offline</span>
              </label>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-md shadow-md flex flex-col p-1 gap-1">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2.2))}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
            title="Phóng to"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.7))}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
            title="Thu nhỏ"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700"
            title="Vừa màn hình (Fit)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend & Waterway Watermark Banner at Bottom */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-md shadow-md p-2.5 text-[11px] text-slate-700 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <span>Cây khỏe mạnh</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Cần theo dõi (A018)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          <span>Cảnh báo nấm (B024)</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          <span>Cảm biến / Van IoT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <span>Gateway Offline</span>
        </div>
      </div>

      {/* Interactive SVG Farm Spatial Canvas */}
      <div
        className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          background:
            mapMode === 'satellite'
              ? 'radial-gradient(ellipse at center, #1b3a2a 0%, #081d14 100%)'
              : '#0f292d',
        }}
      >
        <div
          className="transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            width="1000"
            height="620"
            viewBox="0 0 1000 620"
            className="select-none filter drop-shadow-2xl"
          >
            {/* Background Grid Pattern */}
            <defs>
              <pattern id="farmGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.07" />
              </pattern>
              {/* Canal Water Pattern */}
              <linearGradient id="canalGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            <rect width="1000" height="620" fill="url(#farmGrid)" />

            {/* Natural Water Canal System (Rạch nước tưới tự nhiên) */}
            <path
              d="M 50 180 Q 280 160 500 200 T 950 170"
              fill="none"
              stroke="url(#canalGradient)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 50 420 Q 300 450 500 410 T 950 430"
              fill="none"
              stroke="url(#canalGradient)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <text x="70" y="175" fill="#38bdf8" fontSize="10" fontWeight="bold">
              KÊNH DẪN NƯỚC TƯỚI BẮC
            </text>
            <text x="70" y="440" fill="#38bdf8" fontSize="10" fontWeight="bold">
              KÊNH DẪN NƯỚC TƯỚI NAM
            </text>

            {/* ZONE 1: KHU BẮC (KB) */}
            {layers.zones && (
              <g
                onClick={() => handleZoneClick('Khu Bắc')}
                className="cursor-pointer group"
              >
                <rect
                  x="80"
                  y="40"
                  width="840"
                  height="115"
                  rx="8"
                  fill="#10b981"
                  fillOpacity="0.12"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="group-hover:fill-opacity-25 transition-all"
                />
                <rect x="90" y="48" width="130" height="22" rx="4" fill="#047857" />
                <text x="98" y="63" fill="#ffffff" fontSize="11" fontWeight="bold">
                  KHU BẮC (KB) · 8.2 ha
                </text>
              </g>
            )}

            {/* ZONE 2: KHU TRUNG (KT) */}
            {layers.zones && (
              <g
                onClick={() => handleZoneClick('Khu Trung')}
                className="cursor-pointer group"
              >
                <rect
                  x="80"
                  y="225"
                  width="840"
                  height="165"
                  rx="8"
                  fill="#059669"
                  fillOpacity="0.1"
                  stroke="#059669"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="group-hover:fill-opacity-20 transition-all"
                />
                <rect x="90" y="235" width="145" height="22" rx="4" fill="#047857" />
                <text x="98" y="250" fill="#ffffff" fontSize="11" fontWeight="bold">
                  KHU TRUNG (KT) · 9.4 ha
                </text>
              </g>
            )}

            {/* ZONE 3: KHU NAM (KN) */}
            {layers.zones && (
              <g
                onClick={() => handleZoneClick('Khu Nam')}
                className="cursor-pointer group"
              >
                <rect
                  x="80"
                  y="460"
                  width="840"
                  height="125"
                  rx="8"
                  fill="#047857"
                  fillOpacity="0.1"
                  stroke="#047857"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="group-hover:fill-opacity-20 transition-all"
                />
                <rect x="90" y="470" width="130" height="22" rx="4" fill="#047857" />
                <text x="98" y="485" fill="#ffffff" fontSize="11" fontWeight="bold">
                  KHU NAM (KN) · 8.0 ha
                </text>
              </g>
            )}

            {/* GARDEN 01 / HÀNG A & HÀNG B ROWS INSIDE KHU BẮC */}
            {layers.rows && (
              <g>
                {/* Hàng A */}
                <line x1="120" y1="95" x2="880" y2="95" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <text x="120" y="88" fill="#6ee7b7" fontSize="10" fontWeight="bold">HÀNG A (VƯỜN 01)</text>

                {/* Hàng B */}
                <line x1="120" y1="130" x2="880" y2="130" stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <text x="120" y="123" fill="#6ee7b7" fontSize="10" fontWeight="bold">HÀNG B (VƯỜN 01)</text>
              </g>
            )}

            {/* INDIVIDUAL PLANTS (LAYER: PLANTS) */}
            {layers.plants && (
              <g>
                {/* Row A Plants (dots along Hàng A) */}
                {plants.map((plant, idx) => {
                  let cx = 170 + idx * 110;
                  let cy = plant.rowId === 'row-a' ? 95 : 130;

                  const isAlert = plant.health !== 'GOOD' && layers.alerts;
                  const isCritical = plant.health === 'CRITICAL';
                  const isWarning = plant.health === 'WARNING';

                  const fillColor = isCritical
                    ? '#e11d48'
                    : isWarning
                    ? '#f59e0b'
                    : '#10b981';

                  return (
                    <g
                      key={plant.id}
                      onClick={(e) => handlePlantClick(plant, e)}
                      className="cursor-pointer group"
                    >
                      {/* Pulse ring for warning trees */}
                      {isAlert && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="14"
                          fill={fillColor}
                          fillOpacity="0.25"
                          className="animate-ping"
                        />
                      )}

                      <circle
                        cx={cx}
                        cy={cy}
                        r="8"
                        fill={fillColor}
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="group-hover:r-10 transition-all shadow-lg"
                      />

                      {/* Tree code label */}
                      <text
                        x={cx}
                        y={cy + 18}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                        className="pointer-events-none drop-shadow-md"
                      >
                        {plant.code}
                      </text>
                    </g>
                  );
                })}

                {/* Additional simulated row dots for visual density */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <circle
                    key={`dense-${i}`}
                    cx={220 + i * 100}
                    cy={310}
                    r="6"
                    fill="#10b981"
                    opacity="0.8"
                  />
                ))}
                {Array.from({ length: 7 }).map((_, i) => (
                  <circle
                    key={`dense-south-${i}`}
                    cx={220 + i * 100}
                    cy={525}
                    r="6"
                    fill="#10b981"
                    opacity="0.8"
                  />
                ))}
              </g>
            )}

            {/* IOT SENSORS & GATEWAYS (LAYER: IOT) */}
            {layers.iot && (
              <g>
                {iotDevices.map((dev) => {
                  let x = 200;
                  let y = 145;
                  if (dev.code === 'GW-01') {
                    x = 840;
                    y = 70;
                  } else if (dev.code === 'GW-02') {
                    x = 880;
                    y = 175;
                  } else if (dev.code === 'SN-SOIL-01') {
                    x = 240;
                    y = 95;
                  } else if (dev.code === 'VALVE-A1') {
                    x = 110;
                    y = 95;
                  } else if (dev.code === 'PUMP-NORTH-01') {
                    x = 65;
                    y = 110;
                  } else if (dev.code === 'WS-ANPHU-01') {
                    x = 500;
                    y = 280;
                  }

                  const isOffline = dev.status === 'OFFLINE';
                  const isDevWarning = dev.status === 'WARNING';
                  const devColor = isOffline
                    ? '#f43f5e'
                    : isDevWarning
                    ? '#f59e0b'
                    : '#3b82f6';

                  return (
                    <g
                      key={dev.id}
                      onClick={(e) => handleDeviceClick(dev, e)}
                      className="cursor-pointer group"
                    >
                      {isOffline && (
                        <circle
                          cx={x}
                          cy={y}
                          r="16"
                          fill="#f43f5e"
                          fillOpacity="0.3"
                          className="animate-pulse"
                        />
                      )}
                      <rect
                        x={x - 9}
                        y={y - 9}
                        width="18"
                        height="18"
                        rx="4"
                        fill={devColor}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="group-hover:scale-125 transition-transform"
                      />
                      <text
                        x={x}
                        y={y + 19}
                        textAnchor="middle"
                        fill="#93c5fd"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                        className="pointer-events-none drop-shadow"
                      >
                        {dev.code}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Right Drawer Inspector: Plant Selected */}
      <RightDrawer
        isOpen={!!selectedPlant}
        onClose={() => setSelectedPlant(null)}
        title={selectedPlant ? `Hồ sơ cá thể cây: ${selectedPlant.code}` : ''}
        subtitle="Quản lý chi tiết từng cây dừa chuyên canh"
        footerActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPlant(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                navigate('/production');
                setSelectedPlant(null);
              }}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
            >
              Nhật ký vòng đời cây
            </button>
          </div>
        }
      >
        {selectedPlant && (
          <div className="space-y-5 text-xs">
            {/* Header Identity Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">MÃ QR & ĐỊNH DANH</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{selectedPlant.code}</span>
                <span className="text-slate-600 block">{selectedPlant.name}</span>
              </div>
              <StatusBadge status={selectedPlant.health} />
            </div>

            {/* Active Issue Warning Banner if present */}
            {selectedPlant.activeIssue && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Ghi nhận sâu bệnh:</span>
                  <p className="mt-0.5 text-amber-800">{selectedPlant.activeIssue}</p>
                </div>
              </div>
            )}

            {/* Growth Metrics */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Chỉ số sinh trưởng hiện tại:</h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded border border-slate-200 bg-white">
                  <span className="text-slate-400 text-[11px] block">Chiều cao</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {selectedPlant.heightMeters} m
                  </span>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-white">
                  <span className="text-slate-400 text-[11px] block">Đường kính thân</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {selectedPlant.trunkDiameterCm} cm
                  </span>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-white">
                  <span className="text-slate-400 text-[11px] block">Số tàu lá</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {selectedPlant.leavesCount} tàu
                  </span>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-white">
                  <span className="text-slate-400 text-[11px] block">Số trái trên cây</span>
                  <span className="text-base font-bold font-mono text-emerald-700">
                    {selectedPlant.fruitsCount} trái
                  </span>
                </div>
              </div>
            </div>

            {/* Location & Lifecycle History */}
            <div className="p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-semibold text-slate-800">Vị trí & Lịch sử chăm sóc:</h4>
              <div className="divide-y divide-slate-100 text-slate-700">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Giống cây:</span>
                  <span className="font-medium text-slate-900">{selectedPlant.variety}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Ngày trồng:</span>
                  <span className="font-mono">{selectedPlant.plantedDate} ({selectedPlant.ageMonths} tháng tuổi)</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Giai đoạn:</span>
                  <span className="font-medium">{selectedPlant.stage}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Tưới nước gần nhất:</span>
                  <span className="font-medium">{selectedPlant.lastWatered}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Bón phân gần nhất:</span>
                  <span className="font-medium">{selectedPlant.lastFertilized}</span>
                </div>
              </div>
            </div>

            {/* QR Code Spec */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="p-2 bg-white rounded border border-slate-200 shrink-0">
                <QrCode className="w-8 h-8 text-slate-800" />
              </div>
              <div className="text-[11px] text-slate-600">
                <span className="font-bold text-slate-900 block font-mono">
                  {selectedPlant.qrCode}
                </span>
                <span>Quét mã định danh ngoài vườn để truy xuất nhật ký và ghi nhận task.</span>
              </div>
            </div>
          </div>
        )}
      </RightDrawer>

      {/* Right Drawer Inspector: IoT Device Selected */}
      <RightDrawer
        isOpen={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        title={selectedDevice ? `Thiết bị: ${selectedDevice.name}` : ''}
        subtitle="Thông số kỹ thuật và viễn thám IoT"
      >
        {selectedDevice && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center p-3 rounded bg-slate-50 border border-slate-200">
              <div>
                <span className="font-mono text-slate-500 block text-[11px]">MÃ THIẾT BỊ</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedDevice.code}</span>
              </div>
              <StatusBadge status={selectedDevice.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Mức pin (Battery)</span>
                <span className="font-mono font-bold text-base text-slate-800">
                  {selectedDevice.batteryPercent}%
                </span>
              </div>
              <div className="p-3 rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Tín hiệu LoRaWAN</span>
                <span className="font-mono font-bold text-base text-slate-800">
                  {selectedDevice.signalDbm} dBm
                </span>
              </div>
            </div>

            {selectedDevice.telemetry && Object.keys(selectedDevice.telemetry).length > 0 && (
              <div className="p-3 rounded border border-slate-200 space-y-2">
                <h4 className="font-semibold text-slate-800">Số liệu cảm biến thời gian thực:</h4>
                <div className="space-y-1.5 text-slate-700">
                  {selectedDevice.telemetry.temp !== undefined && (
                    <div className="flex justify-between">
                      <span>Nhiệt độ môi trường:</span>
                      <strong className="font-mono">{selectedDevice.telemetry.temp} °C</strong>
                    </div>
                  )}
                  {selectedDevice.telemetry.soilMoisture !== undefined && (
                    <div className="flex justify-between">
                      <span>Độ ẩm đất:</span>
                      <strong className="font-mono">{selectedDevice.telemetry.soilMoisture} %</strong>
                    </div>
                  )}
                  {selectedDevice.telemetry.soilPh !== undefined && (
                    <div className="flex justify-between">
                      <span>pH Đất:</span>
                      <strong className="font-mono">{selectedDevice.telemetry.soilPh}</strong>
                    </div>
                  )}
                  {selectedDevice.telemetry.state !== undefined && (
                    <div className="flex justify-between">
                      <span>Trạng thái điều khiển:</span>
                      <strong className="font-mono text-emerald-700">{selectedDevice.telemetry.state}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </RightDrawer>

      {/* Right Drawer Inspector: Zone Selected */}
      <RightDrawer
        isOpen={!!selectedZoneName}
        onClose={() => setSelectedZoneName(null)}
        title={selectedZoneName || ''}
        subtitle="Tổng quan phân khu canh tác"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Bạn đang chọn phân khu <strong>{selectedZoneName}</strong> trực thuộc Trại Dừa An Phú.
          </p>
          <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
            <span className="font-semibold">Hoạt động bình thường</span>
            <p className="text-[11px] text-emerald-800">
              Độ che phủ tán dừa đạt chuẩn, hệ thống mương dẫn nước tưới được duy trì ổn định.
            </p>
          </div>
          <button
            onClick={() => {
              navigate('/system/areas');
              setSelectedZoneName(null);
            }}
            className="w-full py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700"
          >
            Quản lý cấu trúc chi tiết
          </button>
        </div>
      </RightDrawer>
    </div>
  );
};
