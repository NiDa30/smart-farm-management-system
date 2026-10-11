import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Maximize2,
  Layers,
  MapPin,
  TreePine,
  AlertTriangle,
  QrCode,
  Droplets,
  Calendar,
  Sparkles,
  ArrowRight,
  Bug,
  Compass,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { RightDrawer } from '../../../components/common/RightDrawer';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Plant } from '../../../types';

export const GardenMap: React.FC = () => {
  const { plants, iotDevices, diseaseCases, navigate } = useApp();

  // Search & Filter State
  const [searchCode, setSearchCode] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedGarden, setSelectedGarden] = useState('ALL');
  const [selectedHealth, setSelectedHealth] = useState('ALL');
  const [selectedVariety, setSelectedVariety] = useState('ALL');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Layers
  const [layers, setLayers] = useState({
    plants: true,
    rows: true,
    iot: true,
    diseases: true,
    irrigation: true,
  });
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Selected Plant Drawer
  const [drawerPlant, setDrawerPlant] = useState<Plant | null>(null);

  // Filtered Plants
  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      const matchSearch =
        !searchCode.trim() ||
        p.code.toLowerCase().includes(searchCode.toLowerCase()) ||
        p.name.toLowerCase().includes(searchCode.toLowerCase());
      const matchHealth =
        selectedHealth === 'ALL' ||
        (selectedHealth === 'NORMAL' && (p.health === 'NORMAL' || p.health === 'GOOD')) ||
        (selectedHealth === 'WATCH' && (p.health === 'WATCH' || p.health === 'WARNING')) ||
        (selectedHealth === 'SICK' && (p.health === 'SICK' || p.health === 'CRITICAL'));
      const matchVariety = selectedVariety === 'ALL' || p.variety.includes(selectedVariety);
      return matchSearch && matchHealth && matchVariety;
    });
  }, [plants, searchCode, selectedHealth, selectedVariety]);

  // Group by rows
  const rowA = filteredPlants.filter((p) => p.rowId === 'row-a');
  const rowB = filteredPlants.filter((p) => p.rowId === 'row-b');

  const handlePlantClick = (plant: Plant) => {
    setDrawerPlant(plant);
  };

  const getHealthDotColor = (health: Plant['health']) => {
    switch (health) {
      case 'NORMAL':
      case 'GOOD':
        return 'bg-emerald-600 border-emerald-700 text-white';
      case 'WATCH':
      case 'WARNING':
        return 'bg-amber-400 border-amber-500 text-slate-900';
      case 'SICK':
      case 'CRITICAL':
        return 'bg-rose-600 border-rose-700 text-white';
      case 'DEAD':
        return 'bg-slate-700 border-slate-900 text-white';
      default:
        return 'bg-emerald-600 border-emerald-700 text-white';
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Sơ đồ vườn & Định vị cá thể cây (Garden Plant Locator)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị không gian trực quan tới từng cây dừa: Hàng A, Hàng B (Trại Dừa An Phú)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Bình thường</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Cần theo dõi</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span>Có vấn đề</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
            <span>Ngừng khai thác</span>
          </span>
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          {/* Search Plant Code */}
          <div className="relative min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Tìm mã cây (A023, A001)..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Area / Garden filter */}
          <select
            value={selectedGarden}
            onChange={(e) => setSelectedGarden(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">Vườn 01 (Khu Bắc)</option>
            <option value="V02">Vườn 02 (Khu Bắc)</option>
            <option value="V03">Vườn 03 (Khu Trung)</option>
          </select>

          {/* Health filter */}
          <select
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả tình trạng</option>
            <option value="NORMAL">Bình thường 🟢</option>
            <option value="WATCH">Cần theo dõi 🟡</option>
            <option value="SICK">Có vấn đề / Bệnh 🔴</option>
          </select>

          {/* Variety filter */}
          <select
            value={selectedVariety}
            onChange={(e) => setSelectedVariety(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả giống dừa</option>
            <option value="Xiêm Xanh">Dừa Xiêm Xanh</option>
            <option value="Dứa">Dừa Dứa Thái Lan</option>
          </select>
        </div>

        {/* Right Tools: Layers & Zoom */}
        <div className="flex items-center gap-2">
          {/* Layer toggles */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium inline-flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lớp hiển thị</span>
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-xl p-2.5 z-30 space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 block text-[11px] uppercase pb-1 border-b border-slate-100">
                  Bật / Tắt lớp
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers.plants}
                    onChange={(e) => setLayers({ ...layers, plants: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>☑ Cá thể cây</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers.rows}
                    onChange={(e) => setLayers({ ...layers, rows: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>☑ Hàng / Luống</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers.iot}
                    onChange={(e) => setLayers({ ...layers, iot: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>☑ Cảm biến IoT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layers.diseases}
                    onChange={(e) => setLayers({ ...layers, diseases: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>☑ Cảnh báo bệnh</span>
                </label>
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
              className="p-1 text-slate-600 hover:text-slate-900"
              title="Phóng to"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.8))}
              className="p-1 text-slate-600 hover:text-slate-900"
              title="Thu nhỏ"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 text-slate-600 hover:text-slate-900"
              title="Mặc định"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Garden Grid Canvas */}
      <div className="bg-[#0b2427] rounded-lg border border-slate-300 p-6 overflow-x-auto min-h-[520px] shadow-sm select-none relative">
        <div
          className="transition-transform duration-200 origin-top-left space-y-8 min-w-[900px]"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Water canal header banner */}
          <div className="h-6 w-full rounded bg-sky-900/40 border border-sky-500/30 flex items-center justify-between px-3 text-[11px] text-sky-300 font-mono">
            <span>KÊNH NƯỚC DẪN TỰ NHIÊN PHÍA BẮC (ĐỘ MẶN 0.2‰ — NƯỚC NGỌT AN TOÀN)</span>
            <span>LƯU LƯỢNG: 14.2 m³/h</span>
          </div>

          {/* HÀNG A ROW */}
          {layers.rows && (
            <div className="bg-[#12363b]/70 border border-[#1d5258] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-800 text-white font-bold">
                    HÀNG A
                  </span>
                  <span className="text-emerald-200 text-xs font-semibold">
                    Dừa Xiêm Xanh Lùn Bến Tre (100 cây · A001 – A100)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Ống tưới nhỏ giọt D20 · Van A1 (Online)
                </span>
              </div>

              {/* Plant Grid Dots */}
              {layers.plants && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {rowA.map((plant) => {
                    const isWatch = plant.health === 'WATCH';
                    const isSick = plant.health === 'SICK' || plant.health === 'CRITICAL';
                    const isSearched =
                      searchCode.trim() &&
                      plant.code.toLowerCase().includes(searchCode.trim().toLowerCase());

                    const colorClass = getHealthDotColor(plant.health);

                    return (
                      <div
                        key={plant.id}
                        onClick={() => handlePlantClick(plant)}
                        className={`group relative flex flex-col items-center cursor-pointer transition-transform ${
                          isSearched ? 'scale-125 z-20' : 'hover:scale-110'
                        }`}
                      >
                        {/* Ping indicator for warning plants */}
                        {((isWatch || isSick) && layers.diseases) && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-75"></span>
                        )}

                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border-2 shadow-sm ${colorClass} ${
                            isSearched ? 'ring-4 ring-yellow-400' : ''
                          }`}
                        >
                          {plant.code}
                        </div>

                        <span className="text-[9px] text-emerald-200 font-mono mt-0.5 opacity-80 group-hover:opacity-100">
                          {plant.fruitsCount}q
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Inter-row path */}
          <div className="h-4 border-y border-dashed border-emerald-800/40 flex items-center justify-center">
            <span className="text-[10px] text-emerald-600 font-mono uppercase tracking-widest">
              ĐƯỜNG BÊ TÔNG NỘI BỘ VƯỜN 01 (XE THU HÁI MINI)
            </span>
          </div>

          {/* HÀNG B ROW */}
          {layers.rows && (
            <div className="bg-[#12363b]/70 border border-[#1d5258] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-800 text-white font-bold">
                    HÀNG B
                  </span>
                  <span className="text-emerald-200 text-xs font-semibold">
                    Dừa Dứa Thái Lan (80 cây · B001 – B080)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Ống tưới nhỏ giọt D20 · Cảm biến ẩm SN-SOIL-01
                </span>
              </div>

              {layers.plants && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {rowB.map((plant) => {
                    const isWatch = plant.health === 'WATCH';
                    const isSick = plant.health === 'SICK' || plant.health === 'CRITICAL';
                    const colorClass = getHealthDotColor(plant.health);

                    return (
                      <div
                        key={plant.id}
                        onClick={() => handlePlantClick(plant)}
                        className="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
                      >
                        {isSick && layers.diseases && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-ping opacity-75"></span>
                        )}

                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border-2 shadow-sm ${colorClass}`}
                        >
                          {plant.code}
                        </div>

                        <span className="text-[9px] text-emerald-200 font-mono mt-0.5 opacity-80 group-hover:opacity-100">
                          {plant.fruitsCount}q
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Drawer Quick Inspect (Matching prompt Section 6) */}
      <RightDrawer
        isOpen={!!drawerPlant}
        onClose={() => setDrawerPlant(null)}
        title={drawerPlant ? `Cá thể: Dừa ${drawerPlant.code}` : ''}
        subtitle={drawerPlant ? `${drawerPlant.variety} · ${drawerPlant.ageYearsText}` : ''}
        footerActions={
          drawerPlant && (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setDrawerPlant(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  navigate(`/production/plants/${drawerPlant.id}`);
                  setDrawerPlant(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
              >
                <span>Xem hồ sơ cá thể đầy đủ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        }
      >
        {drawerPlant && (
          <div className="space-y-5 text-xs">
            {/* Header Badge */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block">VỊ TRÍ ĐỊNH DANH</span>
                <span className="font-bold text-slate-900 text-sm">
                  {drawerPlant.zoneName} / {drawerPlant.gardenName} / {drawerPlant.rowName}
                </span>
              </div>
              <StatusBadge status={drawerPlant.health} />
            </div>

            {/* Micro KPI */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 text-[11px] block">Số buồng quả</span>
                <span className="text-xl font-bold font-mono text-slate-900">
                  {drawerPlant.bunchCount} buồng
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 text-[11px] block">Số trái trên cây</span>
                <span className="text-xl font-bold font-mono text-emerald-800">
                  {drawerPlant.fruitsCount} trái
                </span>
              </div>
            </div>

            {/* History Details */}
            <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 text-slate-700">
              <h4 className="font-semibold text-slate-900">Lịch sử chăm sóc & Vi khí hậu:</h4>
              <div className="divide-y divide-slate-100">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Lần bón phân gần nhất:</span>
                  <span className="font-medium text-slate-900">{drawerPlant.lastFertilized}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Lần tưới gần nhất:</span>
                  <span className="font-medium text-slate-900">{drawerPlant.lastWatered}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Độ ẩm đất đo lường:</span>
                  <span className="font-mono text-slate-900">{drawerPlant.soilMoisture || 35}%</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">pH Đất:</span>
                  <span className="font-mono text-slate-900">{drawerPlant.soilPh || 6.2}</span>
                </div>
              </div>
            </div>

            {/* Pest Notice */}
            {drawerPlant.activeIssue ? (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Bug className="w-4 h-4 text-amber-600" />
                  Sâu bệnh đang theo dõi:
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {drawerPlant.activeIssue}
                </p>
                <button
                  onClick={() => {
                    navigate('/production/disease-cases');
                    setDrawerPlant(null);
                  }}
                  className="mt-1 text-xs text-amber-900 font-semibold underline"
                >
                  Xem ca điều trị CASE-2026-0127 →
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                Cây sinh trưởng khỏe mạnh, không ghi nhận dấu hiệu sâu bệnh bất thường.
              </div>
            )}

            {/* QR Code Card */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3">
              <QrCode className="w-8 h-8 text-slate-800 shrink-0" />
              <div className="text-[11px] text-slate-600">
                <span className="font-mono font-bold text-slate-900 block">{drawerPlant.qrCode}</span>
                <span>Quét mã định danh ngoài vườn bằng điện thoại di động</span>
              </div>
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
