import React from 'react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  caption?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  subBadges?: { label: string; count: number; colorClass?: string }[];
  onClick?: () => void;
  active?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  caption,
  trend,
  subBadges,
  onClick,
  active = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg p-4 border transition-all duration-150 text-left ${
        active
          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className="p-2 rounded bg-slate-50 text-slate-600 border border-slate-100">
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.isPositive ? 'text-emerald-600' : 'text-slate-500'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {caption && <p className="text-xs text-slate-500 mt-1">{caption}</p>}

      {subBadges && subBadges.length > 0 && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
          {subBadges.map((badge, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${
                badge.colorClass || 'bg-slate-100 text-slate-700'
              }`}
            >
              <span className="font-semibold">{badge.count}</span> {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
