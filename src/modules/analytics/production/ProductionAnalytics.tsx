import React, { useState } from 'react';
import {
  TreePine,
  Wheat,
  Activity,
  Bug,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Filter,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AnalyticsFilterBar } from '../components/AnalyticsFilterBar';
import { AnalyticsKpiCard } from '../components/AnalyticsKpiCard';
import { GlobalFilterState, TreeRankingItem } from '../../../types/analytics';

export const ProductionAnalytics: React.FC = () => {
  const { navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'yield' | 'ranking' | 'growth' | 'disease' | 'nutrition'>('yield');

  const [filters, setFilters] = useState<GlobalFilterState>({
    farmId: 'farm-001',
    zoneId: 'ALL',
    cropId: 'ALL',
    varietyId: 'ALL',
    timeRange: 'THIS_MONTH',
    comparisonType: 'PREVIOUS_PERIOD',
  });

  // Top 5 & Bottom 5 Sample Data
  const topTrees: TreeRankingItem[] = [
    {
      id: 'plant-001',
      code: 'A001',
      name: 'Dừa Xiêm Xanh Lùn #A001',
      variety: 'Xiêm Xanh',
      ageYears: 4,
      zoneName: 'Khu Bắc',
      rowName: 'Hàng A',
      health: 'NORMAL',
      growthRateScore: 114,
      annualYieldFruits: 98,
      annualCostVnd: 410000,
      annualProfitVnd: 1550000,
    },
    {
      id: 'plant-005',
      code: 'A005',
      name: 'Dừa Xiêm Xanh Lùn #A005',
      variety: 'Xiêm Xanh',
      ageYears: 4,
      zoneName: 'Khu Bắc',
      rowName: 'Hàng A',
      health: 'NORMAL',
      growthRateScore: 108,
      annualYieldFruits: 92,
      annualCostVnd: 395000,
      annualProfitVnd: 1445000,
    },
    {
      id: 'plant-012',
      code: 'A012',
      name: 'Dừa Xiêm Xanh Lùn #A012',
      variety: 'Xiêm Xanh',
      ageYears: 4,
      zoneName: 'Khu Bắc',
      rowName: 'Hàng A',
      health: 'NORMAL',
      growthRateScore: 105,
      annualYieldFruits: 88,
      annualCostVnd: 400000,
      annualProfitVnd: 1360000,
    },
  ];

  const bottomTrees: TreeRankingItem[] = [
    {
      id: 'plant-023',
      code: 'A023',
      name: 'Dừa Xiêm Xanh Lùn #A023',
      variety: 'Xiêm Xanh',
      ageYears: 4,
      zoneName: 'Khu Bắc',
      rowName: 'Hàng A',
      health: 'WATCH',
      growthRateScore: 78,
      annualYieldFruits: 42,
      annualCostVnd: 450000,
      annualProfitVnd: 390000,
      isOutlier: true,
    },
    {
      id: 'plant-018',
      code: 'A018',
      name: 'Dừa Xiêm Xanh Lùn #A018',
      variety: 'Xiêm Xanh',
      ageYears: 4,
      zoneName: 'Khu Bắc',
      rowName: 'Hàng A',
      health: 'SICK',
      growthRateScore: 65,
      annualYieldFruits: 35,
      annualCostVnd: 520000,
      annualProfitVnd: 180000,
      isOutlier: true,
    },
    {
      id: 'plant-b024',
      code: 'B024',
      name: 'Dừa Dứa Thái Lan #B024',
      variety: 'Dừa Dứa',
      ageYears: 3,
      zoneName: 'Khu Trung',
      rowName: 'Hàng B',
      health: 'SICK',
      growthRateScore: 59,
      annualYieldFruits: 28,
      annualCostVnd: 490000,
      annualProfitVnd: 70000,
      isOutlier: true,
    },
  ];

  return (
    <div className="space-y-5 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Phân tích Chuyên sâu Nông học & Sản xuất (Production Analytics)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              CROP BI
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Giám sát năng suất cá thể, chuẩn mực sinh học, phác đồ điều trị sâu bệnh và hiệu suất bón phân
          </p>
        </div>

        <button
          onClick={() => navigate('/production')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <TreePine className="w-3.5 h-3.5 text-slate-600" />
          <span>Mở Workspace Vận hành</span>
        </button>
      </div>

      {/* Global Filter */}
      <AnalyticsFilterBar filters={filters} onFilterChange={setFilters} />

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <AnalyticsKpiCard
          label="Cây đang sản xuất"
          value="1.250"
          unit="cây"
          comparisonBaseline="100% định danh"
          dataSource="IOT_SENSOR"
        />
        <AnalyticsKpiCard
          label="Sinh trưởng chuẩn"
          value="92.0"
          unit="%"
          changePercent={1.5}
          isPositiveChange={true}
          comparisonBaseline="Đạt kỳ vọng VietGAP"
          dataSource="IOT_SENSOR"
        />
        <AnalyticsKpiCard
          label="Cần theo dõi"
          value="6.0"
          unit="%"
          changePercent={-0.8}
          isPositiveChange={true}
          comparisonBaseline="75 cây"
          dataSource="IOT_SENSOR"
          statusColor="amber"
        />
        <AnalyticsKpiCard
          label="Bất thường / Bệnh"
          value="2.0"
          unit="%"
          changePercent={-0.7}
          isPositiveChange={true}
          comparisonBaseline="25 cây"
          dataSource="IOT_SENSOR"
          statusColor="rose"
        />
        <AnalyticsKpiCard
          label="Thu hoạch tháng"
          value="3.2"
          unit="tấn"
          changePercent={8.5}
          isPositiveChange={true}
          comparisonBaseline="Vượt 6% kế hoạch"
          dataSource="HARVEST_LOG"
          statusColor="emerald"
        />
      </div>

      {/* Subsystem Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white px-2 rounded-t-lg">
        <nav className="flex space-x-6 font-medium">
          {[
            { id: 'yield', label: '1. Năng suất & Sản lượng (Yield)', icon: Wheat },
            { id: 'ranking', label: '2. Xếp hạng Cá thể Cây (Tree Ranking)', icon: TreePine },
            { id: 'growth', label: '3. Sinh thái & Tăng trưởng (Growth)', icon: Activity },
            { id: 'disease', label: '4. Sâu bệnh & Trị liệu (IPM)', icon: Bug },
            { id: 'nutrition', label: '5. Dinh dưỡng & Bón phân (Nutrition)', icon: FlaskConical },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: YIELD ANALYTICS */}
      {activeTab === 'yield' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Yield by Area & Variety */}
            <div className="lg:col-span-7 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Sản lượng theo Phân khu & Giống dừa
                  </h3>
                  <p className="text-[11px] text-slate-500">So sánh thực tế thu hoạch vs Kế hoạch mùa vụ</p>
                </div>
                <span className="font-mono text-emerald-800 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Tổng 3.250 kg
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { name: 'Khu Bắc (Vườn 01 - Dừa Xiêm Lùn)', actual: 1650, plan: 1500, pct: 110 },
                  { name: 'Khu Trung (Vườn 03 - Dừa Dứa)', actual: 980, plan: 1050, pct: 93 },
                  { name: 'Khu Nam (Vườn 04 - Dừa Xiêm + Sáp)', actual: 620, plan: 700, pct: 88 },
                ].map((row, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{row.name}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {row.actual.toLocaleString()} kg / {row.plan.toLocaleString()} kg ({row.pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.pct >= 100 ? 'bg-emerald-600' : row.pct >= 90 ? 'bg-sky-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(row.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Yield Distribution Across Trees */}
            <div className="lg:col-span-5 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Phân bố Năng suất Quả trên Đàn cây
                  </h3>
                  <p className="text-[11px] text-slate-500">Giúp nhận diện nhóm cây suy thoái bất thường</p>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                {[
                  { range: '< 50 quả/cây (Bất thường / Kém)', count: 24, pct: 2.4, color: 'bg-rose-500' },
                  { range: '50 – 70 quả/cây (Trung bình)', count: 280, pct: 28.0, color: 'bg-amber-400' },
                  { range: '70 – 90 quả/cây (Đạt chuẩn cao)', count: 620, pct: 62.0, color: 'bg-emerald-600' },
                  { range: '> 90 quả/cây (Cây đầu dòng vượt trội)', count: 76, pct: 7.6, color: 'bg-purple-600' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-md bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">{item.range}</span>
                      <strong className="font-mono text-slate-900">{item.count} cây ({item.pct}%)</strong>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color}`} style={{ width: `${item.pct * 1.3}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TREE PERFORMANCE RANKING */}
      {activeTab === 'ranking' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top 10 High Yield Trees */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <h3 className="font-bold text-slate-900 text-sm">Top Cây Năng Suất & Hiệu Quả Nhất</h3>
              </div>
              <span className="text-[11px] text-slate-400">Ứng viên nhân giống F1</span>
            </div>

            <div className="divide-y divide-slate-100">
              {topTrees.map((tree) => (
                <div
                  key={tree.id}
                  onClick={() => navigate(`/production/plants/${tree.id}`)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 p-2 rounded cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                        {tree.code}
                      </span>
                      <span className="font-semibold text-slate-800">{tree.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {tree.zoneName} · {tree.rowName} · Tuổi: {tree.ageYears} năm
                    </span>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="font-mono font-bold text-emerald-700 text-xs block">
                      {tree.annualYieldFruits} quả/năm
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Lãi: <strong className="font-mono text-slate-800">{(tree.annualProfitVnd / 1000).toLocaleString()}k</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 10 Low Yield Trees (Outliers) */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                <h3 className="font-bold text-slate-900 text-sm">Nhóm Cây Năng Suất Thấp Cần Xử Lý</h3>
              </div>
              <span className="text-[11px] text-rose-600 font-bold">Cần can thiệp nông học</span>
            </div>

            <div className="divide-y divide-slate-100">
              {bottomTrees.map((tree) => (
                <div
                  key={tree.id}
                  onClick={() => navigate(`/production/plants/${tree.id}`)}
                  className="py-2.5 flex items-center justify-between hover:bg-rose-50/40 p-2 rounded cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-800">
                        {tree.code}
                      </span>
                      <span className="font-semibold text-slate-800">{tree.name}</span>
                    </div>
                    <span className="text-[11px] text-amber-800">
                      {tree.health === 'SICK' ? '⚠️ Đang sâu bệnh nặng' : '⚠️ Suy dinh dưỡng lá'}
                    </span>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="font-mono font-bold text-rose-600 text-xs block">
                      {tree.annualYieldFruits} quả/năm (Kém)
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/production/plants/${tree.id}`);
                      }}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold inline-flex items-center gap-0.5"
                    >
                      <span>Mở hồ sơ cây</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GROWTH VS EXPECTED BENCHMARK */}
      {activeTab === 'growth' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                So sánh Tăng trưởng Thực tế vs Dải Chuẩn Nông học (Expected Growth Range)
              </h3>
              <p className="text-[11px] text-slate-500">
                Độ cao thân và vòng hoành theo chuẩn sinh học Dừa Xiêm Bến Tre 4 năm tuổi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-slate-500 font-semibold block text-xs">Độ tăng chiều cao trung bình</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">34.2 cm / năm</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                  Dưới kỳ vọng (Below Expected)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Dải chuẩn khuyến nghị VietGAP: 40.0 – 50.0 cm / năm</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-slate-500 font-semibold block text-xs">Chu kỳ ra phát hoa / buồng mới</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-800">27.5 ngày</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Đạt chuẩn tối ưu (Optimal)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Mục tiêu giống dừa xiêm lùn: 26 – 30 ngày / buồng</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-slate-500 font-semibold block text-xs">Tỷ lệ đậu trái bình quân</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-800">82.4%</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Vượt +4%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Tăng tỷ lệ thụ phấn nhờ nuôi bổ sung ong bản địa</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PEST & DISEASE ANALYTICS */}
      {activeTab === 'disease' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Hiệu Quả Điều Trị Sâu Bệnh & Tỷ Lệ Dứt Điểm (IPM Treatment Efficacy)
              </h3>
              <p className="text-[11px] text-slate-500">Theo dõi 18 ca phát hiện trong tháng</p>
            </div>
            <button
              onClick={() => navigate('/production/disease-cases')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px]"
            >
              Mở Case Manager →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">Thời gian khỏi bệnh trung bình:</span>
              <span className="text-xl font-bold font-mono text-slate-900">5.8 ngày</span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">Tỷ lệ chữa khỏi dứt điểm:</span>
              <span className="text-xl font-bold font-mono text-emerald-800">92.4%</span>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">Chi phí thuốc sinh học bình quân/ca:</span>
              <span className="text-xl font-bold font-mono text-slate-900">82.500 đ</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NUTRITION & FERTILIZATION */}
      {activeTab === 'nutrition' && (
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Đánh Giá Hiệu Suất Phân Bón vs Sản Lượng Thu Hoạch (Efficiency View)
              </h3>
              <p className="text-[11px] text-slate-500">Phân tích mối tương quan dinh dưỡng và năng suất thực tế</p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Quan sát lệch chuẩn tại Phân khu Nam:</span>
              <p className="text-[11px]">
                Lượng phân bón cấp tại Khu Nam tăng <strong>+20%</strong> trong quý 3 nhưng sản lượng thu hoạch chỉ tăng <strong>+4%</strong>. 
                Hệ thống đề xuất kiểm tra độ pH đất tại gốc (nguy cơ đất chua làm giảm hấp thu dinh dưỡng).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
