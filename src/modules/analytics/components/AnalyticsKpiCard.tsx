import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import { DataSourceType } from '../../../types/analytics';

interface AnalyticsKpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  changePercent?: number;
  isPositiveChange?: boolean;
  comparisonBaseline?: string;
  formulaTooltip?: string;
  dataSource?: DataSourceType;
  isEstimated?: boolean;
  statusColor?: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  onDrilldown?: () => void;
  drilldownHint?: string;
}

export const AnalyticsKpiCard: React.FC<AnalyticsKpiCardProps> = ({
  label,
  value,
  unit,
  changePercent,
  isPositiveChange = true,
  comparisonBaseline = 'so với kỳ trước',
  formulaTooltip,
  dataSource = 'IOT_SENSOR',
  isEstimated = false,
  statusColor = 'emerald',
  onDrilldown,
  drilldownHint = 'Xem chi tiết',
}) => {
  const getSourceLabel = (src: DataSourceType) => {
    switch (src) {
      case 'IOT_SENSOR':
        return 'IoT Sensor';
      case 'INVENTORY_TX':
        return 'Kho vận';
      case 'SALES_ORDER':
        return 'Đơn hàng';
      case 'HARVEST_LOG':
        return 'Thu hoạch';
      case 'FINANCIAL_LEDGER':
        return 'Sổ kế toán';
      case 'AI_INFERENCE':
        return 'Dự báo AI';
      default:
        return 'Thực địa';
    }
  };

  return (
    <div
      onClick={onDrilldown}
      className={`bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs space-y-2 transition-all relative ${
        onDrilldown ? 'cursor-pointer hover:border-emerald-500 hover:shadow-xs group' : ''
      }`}
    >
      {/* Header: Label + Tooltip + Source */}
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium truncate">
          <span className="truncate">{label}</span>
          {formulaTooltip && (
            <div className="relative group/tip cursor-help shrink-0" title={formulaTooltip}>
              <HelpCircle className="w-3 h-3 text-slate-400 group-hover/tip:text-slate-600" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isEstimated && (
            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200">
              Ước tính
            </span>
          )}
          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-medium border border-slate-200/60">
            {getSourceLabel(dataSource)}
          </span>
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-slate-500 font-sans">{unit}</span>}
      </div>

      {/* Trend & Comparison Baseline */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
        {changePercent !== undefined ? (
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                isPositiveChange ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {isPositiveChange ? (
                <TrendingUp className="w-3 h-3 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-600" />
              )}
              <span>{changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}</span>
            </span>
            <span className="text-slate-400 text-[10px] truncate">{comparisonBaseline}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[10px]">{comparisonBaseline}</span>
        )}

        {onDrilldown && (
          <span className="text-[10px] text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
            <span>{drilldownHint}</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
    </div>
  );
};
