import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit,
  QrCode,
  MapPin,
  Calendar,
  Compass,
  TreePine,
  Bug,
  Droplets,
  FlaskConical,
  Wheat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { GrowthMeasurement, Plant } from '../../../types';

interface PlantDetailProps {
  plantId?: string;
}

export const PlantDetail: React.FC<PlantDetailProps> = ({ plantId }) => {
  const {
    plants,
    growthMeasurements,
    tasks,
    diseaseCases,
    fertilizationLogs,
    lifecycleEvents,
    navigate,
    addGrowthMeasurement,
    completeTask,
    activeUser,
  } = useApp();

  const plant =
    plants.find((p) => p.id === plantId || p.code === plantId) ||
    plants.find((p) => p.code === 'A023') ||
    plants[0];

  const [activeTab, setActiveTab] = useState<
    'overview' | 'growth' | 'tasks' | 'nutrition' | 'irrigation' | 'disease' | 'harvest' | 'timeline'
  >('overview');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddMeasureModal, setShowAddMeasureModal] = useState(false);

  // New measurement form state
  const [newMeasure, setNewMeasure] = useState({
    date: new Date().toLocaleDateString('vi-VN'),
    heightMeters: plant.heightMeters,
    trunkDiameterCm: plant.trunkDiameterCm,
    leavesCount: plant.leavesCount,
    fruitsCount: plant.fruitsCount,
    bunchCount: plant.bunchCount,
    notes: '',
  });

  // Filtered records for this plant
  const plantGrowth = growthMeasurements.filter(
    (g) => g.plantId === plant.id || g.plantCode === plant.code
  );
  const plantTasks = tasks.filter(
    (t) => t.plantId === plant.id || t.plantCode === plant.code
  );
  const plantFert = fertilizationLogs.filter((f) => f.plantCode === plant.code);
  const plantCases = diseaseCases.filter((c) => c.plantCode === plant.code);
  const plantLifeEvents = lifecycleEvents.filter(
    (e) => e.plantId === plant.id || e.plantId.includes(plant.code.toLowerCase())
  );

  const [timelineFilter, setTimelineFilter] = useState('ALL');

  const filteredTimeline = plantLifeEvents.filter((e) => {
    if (timelineFilter === 'ALL') return true;
    if (timelineFilter === 'CARE' && (e.type === 'FERTILIZED' || e.type === 'WATERED')) return true;
    if (timelineFilter === 'PEST' && (e.type === 'PEST_DETECTED' || e.type === 'TREATED')) return true;
    if (timelineFilter === 'HARVEST' && e.type === 'HARVESTED') return true;
    return true;
  });

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const record: GrowthMeasurement = {
      id: `growth-${Date.now()}`,
      plantId: plant.id,
      plantCode: plant.code,
      date: newMeasure.date,
      heightMeters: Number(newMeasure.heightMeters),
      trunkDiameterCm: Number(newMeasure.trunkDiameterCm),
      leavesCount: Number(newMeasure.leavesCount),
      flowersCount: 4,
      bunchCount: Number(newMeasure.bunchCount),
      fruitsCount: Number(newMeasure.fruitsCount),
      notes: newMeasure.notes,
      recordedBy: activeUser.name,
    };
    addGrowthMeasurement(record);
    setShowAddMeasureModal(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/production/plants')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Quay lại danh sách cây"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {plant.name}
              </h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                MÃ: {plant.code}
              </span>
              <StatusBadge status={plant.health} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{plant.zoneName || 'Khu Bắc'}</span>
              <span>/</span>
              <span>{plant.gardenName || 'Vườn 01'}</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">{plant.rowName || 'Hàng A'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-600" />
            <span>Mã QR cá thể</span>
          </button>
          <button
            onClick={() => navigate('/production/map')}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors inline-flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Định vị trên sơ đồ</span>
          </button>
          <button
            onClick={() => navigate(`/production/plants/${plant.id}/edit`)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Chỉnh sửa hồ sơ</span>
          </button>
        </div>
      </div>

      {/* Header 5 Key Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Tuổi cây</span>
          <span className="text-xl font-bold font-mono text-slate-900 block">
            {plant.ageYearsText || `${plant.ageMonths} tháng`}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Trồng: {plant.plantedDate}</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Giai đoạn</span>
          <span className="text-base font-bold text-emerald-800 block truncate mt-0.5">
            {plant.stage}
          </span>
          <span className="text-[11px] text-slate-500">Kinh doanh lứa 2</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Số buồng</span>
          <span className="text-xl font-bold font-mono text-slate-900 block">
            {plant.bunchCount} buồng
          </span>
          <span className="text-[11px] text-slate-500">Đậu quả đều</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Số trái trên cây</span>
          <span className="text-xl font-bold font-mono text-emerald-800 block">
            {plant.fruitsCount} trái
          </span>
          <span className="text-[11px] text-amber-600 font-mono font-medium">↓ 27% do sâu bệnh</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 block uppercase font-medium">Năng suất gần nhất</span>
          <span className="text-xl font-bold font-mono text-slate-900 block">
            {plant.latestYieldKg} kg
          </span>
          <span className="text-[11px] text-slate-500">Đợt 1 tháng 09/26</span>
        </div>
      </div>

      {/* 8 Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg shadow-2xs">
        <nav className="flex space-x-6 text-xs font-medium overflow-x-auto">
          {[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'growth', label: `Sinh trưởng (${plantGrowth.length})` },
            { id: 'tasks', label: `Công việc (${plantTasks.length})` },
            { id: 'nutrition', label: `Dinh dưỡng (${plantFert.length})` },
            { id: 'irrigation', label: 'Tưới tiêu' },
            { id: 'disease', label: `Sâu bệnh (${plantCases.length})` },
            { id: 'harvest', label: 'Thu hoạch' },
            { id: 'timeline', label: `Nhật ký vòng đời (${plantLifeEvents.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-b-lg border border-slate-200 p-6 shadow-2xs text-xs space-y-6">
        {/* TAB 1: TỔNG QUAN (4-card / 6-section balanced layout) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Thông tin cây & Giống */}
            <div className="p-4 rounded-lg border border-slate-200 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm">Hồ sơ định danh cá thể</h3>
              <div className="divide-y divide-slate-100 text-slate-700">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Giống cây:</span>
                  <span className="font-bold text-slate-900">{plant.variety}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Ngày trồng:</span>
                  <span className="font-mono">{plant.plantedDate}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Tọa độ GPS:</span>
                  <span className="font-mono">{plant.lat}, {plant.lng}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Mã QR Code:</span>
                  <span className="font-mono text-emerald-800 font-semibold">{plant.qrCode}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <StatusBadge status={plant.health} size="sm" />
                </div>
              </div>
            </div>

            {/* Box 2: Chỉ số sinh trưởng gần nhất */}
            <div className="p-4 rounded-lg border border-slate-200 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Chỉ số sinh học đo lường</h3>
                <button
                  onClick={() => setActiveTab('growth')}
                  className="text-xs text-emerald-700 hover:underline font-semibold"
                >
                  Xem chi tiết →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded bg-white border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 block">Chiều cao thân</span>
                  <span className="font-mono font-bold text-base text-slate-900">{plant.heightMeters} m</span>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 block">Đường kính gốc</span>
                  <span className="font-mono font-bold text-base text-slate-900">{plant.trunkDiameterCm} cm</span>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 block">Số tàu lá</span>
                  <span className="font-mono font-bold text-base text-slate-900">{plant.leavesCount} tàu</span>
                </div>
                <div className="p-2.5 rounded bg-white border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 block">Số quả trên cây</span>
                  <span className="font-mono font-bold text-base text-emerald-800">{plant.fruitsCount} quả</span>
                </div>
              </div>
            </div>

            {/* Box 3: Sức khỏe & Sâu bệnh */}
            <div className="p-4 rounded-lg border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Sức khỏe & Ca sâu bệnh</h3>
              {plant.activeIssue ? (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Cảnh báo sâu bệnh đang hoạt động</span>
                  </div>
                  <p className="text-[11px] text-amber-800">{plant.activeIssue}</p>
                  <button
                    onClick={() => setActiveTab('disease')}
                    className="text-xs text-amber-900 font-bold underline inline-flex items-center gap-1"
                  >
                    <span>Xem phác đồ điều trị CASE-2026-0127</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className="text-emerald-700 bg-emerald-50 p-3 rounded border border-emerald-200 font-medium">
                  Cây khỏe mạnh, không ghi nhận triệu chứng sâu bệnh.
                </p>
              )}
            </div>

            {/* Box 4: Công việc sắp tới & Môi trường */}
            <div className="p-4 rounded-lg border border-slate-200 space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Công việc chăm sóc sắp tới</h3>
              <div className="space-y-2">
                {plantTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{t.title}</span>
                      <span className="text-[11px] text-slate-500">Hạn: {t.dueDate}</span>
                    </div>
                    {t.status === 'COMPLETED' ? (
                      <span className="text-emerald-700 text-xs font-semibold">Đã xong</span>
                    ) : (
                      <button
                        onClick={() => completeTask(t.id)}
                        className="px-2.5 py-1 text-[11px] bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                      >
                        Hoàn thành
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SINH TRƯỞNG */}
        {activeTab === 'growth' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Lịch sử đo lường chỉ số sinh trưởng ({plant.code})
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi chiều cao, tán lá và biến động số trái qua các tháng
                </p>
              </div>
              <button
                onClick={() => setShowAddMeasureModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ghi nhận chỉ số mới</span>
              </button>
            </div>

            {/* Growth Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ngày đo</th>
                    <th className="py-2.5 px-3">Chiều cao</th>
                    <th className="py-2.5 px-3">Đường kính</th>
                    <th className="py-2.5 px-3">Số tàu lá</th>
                    <th className="py-2.5 px-3">Số buồng</th>
                    <th className="py-2.5 px-3 font-bold text-emerald-800">Số quả trái</th>
                    <th className="py-2.5 px-3">Biến động</th>
                    <th className="py-2.5 px-3">Người ghi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plantGrowth.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-medium">{g.date}</td>
                      <td className="py-2.5 px-3 font-mono">{g.heightMeters} m</td>
                      <td className="py-2.5 px-3 font-mono">{g.trunkDiameterCm} cm</td>
                      <td className="py-2.5 px-3 font-mono">{g.leavesCount} tàu</td>
                      <td className="py-2.5 px-3 font-mono">{g.bunchCount} buồng</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {g.fruitsCount} quả
                      </td>
                      <td className="py-2.5 px-3">
                        {g.trendPercentage !== undefined && (
                          <span
                            className={`font-mono text-[11px] font-bold inline-flex items-center gap-0.5 ${
                              g.trendPercentage < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {g.trendPercentage < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5" />
                            )}
                            {g.trendPercentage}%
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{g.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CÔNG VIỆC CHĂM SÓC */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Lịch chăm sóc & Task của cây</h3>
            <div className="space-y-3">
              {plantTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{t.title}</span>
                      <StatusBadge status={t.status} size="sm" />
                    </div>
                    <p className="text-slate-600">{t.description}</p>
                    <div className="text-[11px] text-slate-500">
                      Hạn: <strong>{t.dueDate}</strong> · Người thực hiện: {t.assigneeName}
                      {t.plannedSupply && ` · Vật tư: ${t.plannedSupply.plannedQty} ${t.plannedSupply.unit} ${t.plannedSupply.supplyName}`}
                    </div>
                  </div>
                  {t.status !== 'COMPLETED' && (
                    <button
                      onClick={() => completeTask(t.id)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                    >
                      Xác nhận hoàn thành
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DINH DƯỠNG & BÓN PHÂN */}
        {activeTab === 'nutrition' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Lịch sử bón phân & Quy trình dinh dưỡng cây {plant.code}
              </h3>
              <span className="text-emerald-800 font-semibold">
                Lần bón gần nhất: {plant.lastFertilized}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ngày bón</th>
                    <th className="py-2.5 px-3">Loại phân bón</th>
                    <th className="py-2.5 px-3">Liều lượng</th>
                    <th className="py-2.5 px-3">Người bón</th>
                    <th className="py-2.5 px-3">Chi phí (VNĐ)</th>
                    <th className="py-2.5 px-3">Ghi chú kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plantFert.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-medium">{f.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{f.fertilizerName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {f.dosage} {f.unit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{f.applicatorName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{f.costVnd.toLocaleString('vi-VN')} ₫</td>
                      <td className="py-2.5 px-3 text-slate-600">{f.resultNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TƯỚI TIÊU */}
        {activeTab === 'irrigation' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Chế độ nước tưới & Ẩm độ rễ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block mb-1">Độ ẩm đất hiện thời</span>
                <span className="text-2xl font-bold font-mono text-slate-900">{plant.soilMoisture || 35}%</span>
                <span className="text-[11px] text-amber-700 block mt-1">Dưới ngưỡng mục tiêu 45%</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block mb-1">Lần tưới gần nhất</span>
                <span className="text-base font-bold text-slate-900">{plant.lastWatered}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Định lượng: 35 Lít/gốc</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block mb-1">Hệ thống van điều khiển</span>
                <span className="text-base font-bold text-emerald-800">Van Solenoid A1</span>
                <span className="text-[11px] text-emerald-600 block mt-1">Kích hoạt tự động qua LoRaWAN</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SÂU BỆNH & CASE ĐIỀU TRỊ */}
        {activeTab === 'disease' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Ca sâu bệnh & Phác đồ điều trị ({plantCases.length} ca)
              </h3>
              <button
                onClick={() => navigate('/production/disease-cases')}
                className="text-xs text-emerald-700 hover:underline font-semibold"
              >
                Mở trung tâm quản lý bệnh →
              </button>
            </div>

            {plantCases.map((cs) => (
              <div key={cs.id} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{cs.code}</span>
                    <span className="font-bold text-slate-900 text-sm">{cs.diseaseName}</span>
                  </div>
                  <StatusBadge status={cs.status} />
                </div>
                <p className="text-slate-600 leading-relaxed">{cs.diagnosisNotes}</p>
                {cs.selectedTreatment && (
                  <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-800">Phương án điều trị đã chọn:</span>
                    <p className="text-slate-700">{cs.selectedTreatment.pesticideName} — {cs.selectedTreatment.dosage}</p>
                    <p className="text-[11px] text-slate-500">Kết quả: {cs.selectedTreatment.resultNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 7: THU HOẠCH */}
        {activeTab === 'harvest' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Lịch sử thu hoạch từ cây {plant.code}</h3>
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block text-sm">Đợt thu hoạch 02/10/2026</span>
                <span className="text-slate-500 text-[11px]">Mã lô xuất khẩu: LOT-COC-20261002-KB</span>
              </div>
              <span className="font-mono font-bold text-emerald-800 text-base">{plant.latestYieldKg} kg quả</span>
            </div>
          </div>
        )}

        {/* TAB 8: TIMELINE NHẬT KÝ VÒNG ĐỜI (Screen 18) */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Nhật ký vòng đời cây {plant.code} (Lifecycle Timeline)
              </h3>

              {/* Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                {['ALL', 'CARE', 'PEST', 'HARVEST'].map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setTimelineFilter(flt)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      timelineFilter === flt
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {flt === 'ALL'
                      ? 'Tất cả'
                      : flt === 'CARE'
                      ? 'Chăm sóc'
                      : flt === 'PEST'
                      ? 'Sâu bệnh'
                      : 'Thu hoạch'}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Timeline */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {filteredTimeline.map((ev) => (
                <div key={ev.id} className="relative group">
                  <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white shadow-2xs"></div>
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{ev.title}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{ev.date}</span>
                    </div>
                    <p className="text-slate-600 text-xs">{ev.description}</p>
                    <div className="text-[10px] text-slate-400 font-medium">Ghi nhận: {ev.actor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowQrModal(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Thẻ QR Định danh Cá thể</h3>
            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg inline-block">
              <QrCode className="w-32 h-32 text-slate-900 mx-auto" />
            </div>
            <div className="font-mono font-bold text-emerald-800 text-sm">{plant.qrCode}</div>
            <p className="text-xs text-slate-500">
              Gắn tại thân cây {plant.code} (Hàng A - Vườn 01 - Trại Dừa An Phú)
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Add Measurement Modal */}
      {showAddMeasureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddMeasureModal(false)} />
          <form
            onSubmit={handleAddMeasurement}
            className="relative bg-white rounded-lg p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="font-bold text-slate-900 text-sm">Ghi nhận chỉ số sinh trưởng: {plant.code}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Chiều cao (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMeasure.heightMeters}
                  onChange={(e) => setNewMeasure({ ...newMeasure, heightMeters: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Đường kính thân (cm):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newMeasure.trunkDiameterCm}
                  onChange={(e) => setNewMeasure({ ...newMeasure, trunkDiameterCm: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số buồng quả:</label>
                <input
                  type="number"
                  value={newMeasure.bunchCount}
                  onChange={(e) => setNewMeasure({ ...newMeasure, bunchCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số quả trái:</label>
                <input
                  type="number"
                  value={newMeasure.fruitsCount}
                  onChange={(e) => setNewMeasure({ ...newMeasure, fruitsCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú phát triển:</label>
                <input
                  type="text"
                  value={newMeasure.notes}
                  onChange={(e) => setNewMeasure({ ...newMeasure, notes: e.target.value })}
                  placeholder="Tán lá xòe đều, không có dấu hiệu bọ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddMeasureModal(false)}
                className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700"
              >
                Lưu chỉ số
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
