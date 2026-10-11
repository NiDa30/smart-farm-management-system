import React, { useState } from 'react';
import {
  TreePine,
  CheckCircle2,
  AlertTriangle,
  Bug,
  CalendarCheck,
  Wheat,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Compass,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { KpiCard } from '../../../components/common/KpiCard';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Plant } from '../../../types';

export const ProductionDashboard: React.FC = () => {
  const {
    activeFarm,
    plants,
    tasks,
    diseaseCases,
    harvestBatches,
    navigate,
    setSelectedPlant,
    completeTask,
  } = useApp();

  const [filterHealth, setFilterHealth] = useState<string | null>(null);

  // Stats calculation
  const totalPlants = 1250;
  const normalPlants = 1173;
  const watchPlants = 52;
  const sickPlants = 25;
  const todayTasks = tasks.filter((t) => t.status !== 'COMPLETED');
  const monthHarvestWeight = '3,250 kg';

  const warningPlantsList = plants.filter((p) => p.health === 'WATCH' || p.health === 'SICK');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Tổng quan sản xuất & Cây trồng
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              PHÂN HỆ 2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{activeFarm.name}</span>
            <span>·</span>
            <span>Quản lý định danh từng cá thể cây (A001 – A100)</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/production/map')}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors inline-flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Sơ đồ vườn trực quan</span>
          </button>
          <button
            onClick={() => navigate('/production/plants/new')}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
          >
            + Xuống giống cây mới
          </button>
        </div>
      </div>

      {/* 6 Clickable KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<TreePine className="w-4 h-4 text-emerald-700" />}
          label="Tổng cây"
          value={totalPlants.toLocaleString('vi-VN')}
          caption="Định danh cá thể QR"
          onClick={() => navigate('/production/plants')}
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          label="Khỏe mạnh"
          value={normalPlants.toLocaleString('vi-VN')}
          caption="93.8% đạt chuẩn"
          trend={{ value: 'Ổn định', isPositive: true }}
          onClick={() => navigate('/production/plants')}
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          label="Cần theo dõi"
          value={watchPlants}
          caption="A023, A018, A003..."
          trend={{ value: 'Cần chú ý', isPositive: false }}
          onClick={() => {
            setFilterHealth('WATCH');
            navigate('/production/plants');
          }}
          active={filterHealth === 'WATCH'}
        />
        <KpiCard
          icon={<Bug className="w-4 h-4 text-rose-600" />}
          label="Đang bệnh"
          value={sickPlants}
          caption="2 ca đang điều trị"
          onClick={() => navigate('/production/disease-cases')}
        />
        <KpiCard
          icon={<CalendarCheck className="w-4 h-4 text-blue-600" />}
          label="Việc hôm nay"
          value={todayTasks.length}
          caption="Bón phân & tưới ẩm"
          onClick={() => navigate('/production/tasks')}
        />
        <KpiCard
          icon={<Wheat className="w-4 h-4 text-amber-600" />}
          label="Thu hoạch tháng"
          value={monthHarvestWeight}
          caption="Đợt 2 Vườn 01"
          trend={{ value: '+14% so kỳ trước', isPositive: true }}
          onClick={() => navigate('/production/harvests')}
        />
      </div>

      {/* Main Grid Content: 2x2 Clean Balanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top-Left: Sơ đồ trạng thái vườn (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Sơ đồ trạng thái vườn (Garden Matrix Status)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Khu Bắc · Vườn 01 (Hàng A & Hàng B) — Nhấp vào cây để mở hồ sơ nhanh
              </p>
            </div>
            <button
              onClick={() => navigate('/production/map')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              <span>Mở đầy đủ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Matrix Representation */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
            {/* Hàng A */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700">HÀNG A (Vườn 01 - Dừa xiêm lùn)</span>
                <span className="text-[11px] text-slate-500 font-mono">100 cây</span>
              </div>
              <div className="grid grid-cols-10 sm:grid-cols-12 gap-1.5">
                {plants
                  .filter((p) => p.rowId === 'row-a')
                  .slice(0, 24)
                  .map((p) => {
                    const isWatch = p.health === 'WATCH';
                    const isSick = p.health === 'SICK' || p.health === 'CRITICAL';
                    const bgClass = isSick
                      ? 'bg-rose-500 text-white'
                      : isWatch
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-emerald-600 text-white';

                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/production/plants/${p.id}`)}
                        className={`h-7 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-transform hover:scale-110 shadow-2xs ${bgClass}`}
                        title={`${p.code}: ${p.name} (${p.health})`}
                      >
                        {p.code.replace('A0', '')}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Hàng B */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700">HÀNG B (Vườn 01 - Dừa dứa Thái Lan)</span>
                <span className="text-[11px] text-slate-500 font-mono">80 cây</span>
              </div>
              <div className="grid grid-cols-10 sm:grid-cols-12 gap-1.5">
                {plants
                  .filter((p) => p.rowId === 'row-b')
                  .slice(0, 12)
                  .map((p) => {
                    const isWatch = p.health === 'WATCH';
                    const isSick = p.health === 'SICK' || p.health === 'CRITICAL';
                    const bgClass = isSick
                      ? 'bg-rose-500 text-white'
                      : isWatch
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-emerald-600 text-white';

                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/production/plants/${p.id}`)}
                        className={`h-7 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-transform hover:scale-110 shadow-2xs ${bgClass}`}
                        title={`${p.code}: ${p.name} (${p.health})`}
                      >
                        {p.code}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span>
                <span>Bình thường</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-400"></span>
                <span>Cần theo dõi (A023, A018)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
                <span>Có vấn đề (B024)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right: Công việc hôm nay (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Công việc hôm nay ({todayTasks.length})
              </h2>
              <p className="text-xs text-slate-500">05/10/2026</p>
            </div>
            <button
              onClick={() => navigate('/production/tasks')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Xem lịch đầy đủ
            </button>
          </div>

          <div className="divide-y divide-slate-100 space-y-1">
            {todayTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="pt-2 pb-2 text-xs flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{task.title}</span>
                    {task.plantCode && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                        {task.plantCode}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>Phụ trách: {task.assigneeName}</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-medium">{task.zoneName}</span>
                  </div>
                </div>

                <button
                  onClick={() => completeTask(task.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shrink-0 inline-flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Xong</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom-Left: Sinh trưởng / Năng suất (col-span-7) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Theo dõi sinh trưởng & Năng suất (Growth Trends)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ số số trái bình quân trên cây qua các tháng
              </p>
            </div>
            <button
              onClick={() => navigate('/production/growth')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Xem bảng đo lường
            </button>
          </div>

          {/* Clean Vector Growth Chart */}
          <div className="h-44 w-full bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Số trái/cây bình quân</span>
              <span className="text-emerald-700 font-bold font-mono">Đạt 62 quả/cây (Khu Bắc)</span>
            </div>

            <div className="h-28 flex items-end justify-between gap-4 px-2 pt-2">
              {[
                { month: 'T05/26', val: 45, text: '45 quả' },
                { month: 'T06/26', val: 52, text: '52 quả' },
                { month: 'T07/26', val: 58, text: '58 quả' },
                { month: 'T08/26', val: 64, text: '64 quả' },
                { month: 'T09/26', val: 60, text: '60 quả' },
                { month: 'T10/26', val: 68, text: '68 quả (Hiện tại)' },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-mono text-slate-600 font-bold">{bar.val}</span>
                  <div
                    className="w-full bg-emerald-600 rounded-t transition-all hover:bg-emerald-500"
                    style={{ height: `${(bar.val / 80) * 100}%` }}
                  />
                  <span className="text-[10px] text-slate-500 font-mono">{bar.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom-Right: Cảnh báo sức khỏe cây (col-span-5) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Cảnh báo sức khỏe cây ({warningPlantsList.length})
              </h2>
              <p className="text-xs text-slate-500">Cây cần can thiệp chăm sóc khẩn</p>
            </div>
            <button
              onClick={() => navigate('/production/disease-cases')}
              className="text-xs font-semibold text-rose-700 hover:underline"
            >
              Xem ca bệnh
            </button>
          </div>

          <div className="divide-y divide-slate-100 space-y-2">
            {warningPlantsList.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/production/plants/${p.id}`)}
                className="pt-2 pb-2 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{p.code}</span>
                    <span className="font-medium text-slate-800">{p.variety}</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5 line-clamp-1">
                    {p.activeIssue}
                  </p>
                </div>
                <StatusBadge status={p.health} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
