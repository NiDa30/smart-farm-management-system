import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Lock,
  Shield,
  Wifi,
  WifiOff,
  Activity,
  AlertOctagon,
  Skull,
  CheckCheck,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  customLabel?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  customLabel,
}) => {
  const norm = (status || '').toUpperCase();

  let colorClasses = 'text-slate-600 bg-slate-100 border-slate-200';
  let icon = <Clock className="w-3.5 h-3.5" />;
  let label = customLabel || status;

  switch (norm) {
    case 'ACTIVE':
    case 'ONLINE':
    case 'GOOD':
    case 'NORMAL':
    case 'SUCCESS':
    case 'COMPLETED':
    case 'RESOLVED':
    case 'CLOSED':
      colorClasses = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      if (!customLabel) {
        if (norm === 'ACTIVE') label = 'Đang hoạt động';
        if (norm === 'ONLINE') label = 'Trực tuyến';
        if (norm === 'GOOD' || norm === 'NORMAL') label = 'Bình thường';
        if (norm === 'COMPLETED') label = 'Đã hoàn thành';
        if (norm === 'RESOLVED') label = 'Đã xử lý';
        if (norm === 'CLOSED') label = 'Đã đóng case';
      }
      break;

    case 'WARNING':
    case 'WATCH':
    case 'MONITORING':
    case 'MAINTENANCE':
    case 'MEDIUM':
      colorClasses = 'text-amber-800 bg-amber-50 border-amber-200';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      if (!customLabel) {
        if (norm === 'WARNING' || norm === 'WATCH') label = 'Cần theo dõi';
        if (norm === 'MONITORING') label = 'Đang theo dõi';
        if (norm === 'MAINTENANCE') label = 'Bảo trì định kỳ';
        if (norm === 'MEDIUM') label = 'Mức trung bình';
      }
      break;

    case 'SICK':
    case 'DIAGNOSING':
    case 'TREATING':
    case 'IN_PROGRESS':
    case 'HIGH':
      colorClasses = 'text-orange-800 bg-orange-50 border-orange-200';
      icon = <Activity className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
      if (!customLabel) {
        if (norm === 'SICK') label = 'Bị bệnh';
        if (norm === 'DIAGNOSING') label = 'Đang chẩn đoán';
        if (norm === 'TREATING') label = 'Đang điều trị';
        if (norm === 'IN_PROGRESS') label = 'Đang thực hiện';
        if (norm === 'HIGH') label = 'Mức cao';
      }
      break;

    case 'OFFLINE':
    case 'CRITICAL':
    case 'LOCKED':
    case 'SUSPENDED':
    case 'INACTIVE':
    case 'FAILED':
    case 'OVERDUE':
    case 'URGENT':
    case 'DETECTED':
      colorClasses = 'text-rose-800 bg-rose-50 border-rose-200';
      icon =
        norm === 'LOCKED' ? (
          <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        ) : norm === 'OFFLINE' ? (
          <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        ) : norm === 'OVERDUE' ? (
          <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        ) : (
          <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        );
      if (!customLabel) {
        if (norm === 'OFFLINE') label = 'Ngoại tuyến';
        if (norm === 'CRITICAL') label = 'Nghiêm trọng';
        if (norm === 'LOCKED') label = 'Bị khóa';
        if (norm === 'INACTIVE') label = 'Tạm ngưng';
        if (norm === 'OVERDUE') label = 'Quá hạn';
        if (norm === 'URGENT') label = 'Khẩn cấp';
        if (norm === 'DETECTED') label = 'Mới phát hiện';
      }
      break;

    case 'DEAD':
      colorClasses = 'text-slate-800 bg-slate-200 border-slate-300';
      icon = <Skull className="w-3.5 h-3.5 text-slate-700 shrink-0" />;
      label = customLabel || 'Đã chết';
      break;

    case 'TODO':
      colorClasses = 'text-blue-800 bg-blue-50 border-blue-200';
      icon = <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      label = customLabel || 'Đang chờ';
      break;

    case 'SYSTEM':
      colorClasses = 'text-blue-800 bg-blue-50 border-blue-200';
      icon = <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      label = customLabel || 'Hệ thống';
      break;

    case 'CUSTOM':
      colorClasses = 'text-purple-800 bg-purple-50 border-purple-200';
      icon = <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
      label = customLabel || 'Tùy chỉnh';
      break;

    default:
      break;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border ${padding} ${colorClasses} whitespace-nowrap`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
