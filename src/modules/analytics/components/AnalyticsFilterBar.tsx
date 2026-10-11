import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  Sparkles,
  Download,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Clock,
  ArrowRightLeft,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { GlobalFilterState, AnalyticsTimeRange, ComparisonType } from '../../../types/analytics';
import { useApp } from '../../../context/AppContext';

interface AnalyticsFilterBarProps {
  filters: GlobalFilterState;
  onFilterChange: (newFilters: GlobalFilterState) => void;
  lastUpdatedText?: string;
  onRefresh?: () => void;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filters,
  onFilterChange,
  lastUpdatedText = '15 giây trước',
  onRefresh,
}) => {
  const { activeFarm, farms, showToast } = useApp();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTimeChange = (timeRange: AnalyticsTimeRange) => {
    onFilterChange({ ...filters, timeRange });
  };

  const handleCompareChange = (comparisonType: ComparisonType) => {
    onFilterChange({ ...filters, comparisonType });
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (onRefresh) onRefresh();
      showToast('Đã đồng bộ chỉ số phân tích BI thời gian thực', 'success');
    }, 500);
  };

  const handleExport = (type: string) => {
    setShowExportMenu(false);
    showToast(`Đang xuất báo cáo định dạng ${type} với bộ lọc hiện tại...`, 'info');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Farm Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-slate-400 font-medium">Trang trại:</span>
            <select
              value={filters.farmId}
              onChange={(e) => onFilterChange({ ...filters, farmId: e.target.value })}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Area / Zone Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-slate-400 font-medium">Phân khu:</span>
            <select
              value={filters.zoneId}
              onChange={(e) => onFilterChange({ ...filters, zoneId: e.target.value })}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Toàn trang trại (3 khu)</option>
              <option value="zone-north">Khu Bắc (Vườn 01, 02)</option>
              <option value="zone-center">Khu Trung (Vườn 03)</option>
              <option value="zone-south">Khu Nam (Vườn 04, 05)</option>
            </select>
          </div>

          {/* Variety Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
            <span className="text-slate-400 font-medium">Cây/Giống:</span>
            <select
              value={filters.varietyId}
              onChange={(e) => onFilterChange({ ...filters, varietyId: e.target.value })}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả giống dừa</option>
              <option value="xiem-xanh">Dừa Xiêm Xanh Lùn</option>
              <option value="dua-thai">Dừa Dứa Thái Lan F1</option>
              <option value="dua-sap">Dừa Sáp Cầu Kè</option>
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50/60 border border-emerald-200 rounded-md text-emerald-950 font-medium">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kỳ phân tích:</span>
            <select
              value={filters.timeRange}
              onChange={(e) => handleTimeChange(e.target.value as AnalyticsTimeRange)}
              className="bg-transparent font-bold text-emerald-900 focus:outline-none cursor-pointer"
            >
              <option value="TODAY">Hôm nay</option>
              <option value="7_DAYS">7 ngày qua</option>
              <option value="30_DAYS">30 ngày qua</option>
              <option value="THIS_MONTH">Tháng 10/2026 (Hiện tại)</option>
              <option value="LAST_MONTH">Tháng trước (T09/2026)</option>
              <option value="THIS_QUARTER">Quý 4/2026</option>
              <option value="THIS_YEAR">Năm 2026 (YTD)</option>
            </select>
          </div>

          {/* Comparison Baseline */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50/60 border border-sky-200 rounded-md text-sky-950">
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-700" />
            <span className="text-slate-500 font-medium">So với:</span>
            <select
              value={filters.comparisonType}
              onChange={(e) => handleCompareChange(e.target.value as ComparisonType)}
              className="bg-transparent font-bold text-sky-900 focus:outline-none cursor-pointer"
            >
              <option value="PREVIOUS_PERIOD">Kỳ liền trước (-1 tháng)</option>
              <option value="SAME_PERIOD_LAST_YEAR">Cùng kỳ năm ngoái (T10/2025)</option>
              <option value="OTHER_ZONE">Khu khác (Đối sánh)</option>
              <option value="NONE">Không so sánh</option>
            </select>
          </div>
        </div>

        {/* Right Tools: Freshness & Export */}
        <div className="flex items-center gap-2">
          {/* Freshness Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-[11px] text-slate-600 border border-slate-200/80">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Cập nhật:</span>
            <span className="font-mono font-bold text-emerald-700">{lastUpdatedText}</span>
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="text-slate-500 hover:text-emerald-700 ml-1 p-0.5 rounded transition-colors"
              title="Đồng bộ lại dữ liệu"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất báo cáo</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-30 space-y-0.5 text-xs">
                <button
                  onClick={() => handleExport('PDF Executive')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Báo cáo PDF Executive</span>
                </button>
                <button
                  onClick={() => handleExport('Excel Tổng hợp')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sổ liệu Excel (XLSX)</span>
                </button>
                <button
                  onClick={() => handleExport('CSV Dữ liệu thô')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>CSV Dữ liệu thô</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
