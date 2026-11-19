import React,{useSyncExternalStore} from 'react';
import {Radio,RefreshCw,WifiOff} from 'lucide-react';
import {getLive,type LiveStatus} from './iotLive';

export function useLiveStatus():LiveStatus {
  const live=getLive();
  return useSyncExternalStore(fn=>live.onStatus(fn),()=>live.status,()=>'idle');
}

/** Says how fresh the IoT screens are kept: pushed changes, reconnecting, or plain polling. */
export const LiveStatusBadge:React.FC=()=>{
  const status=useLiveStatus();
  const view=status==='open'
    ?{icon:<Radio size={13}/>,text:'Cập nhật tức thì',hint:'Màn hình tải lại ngay khi backend ghi dữ liệu mới.',tone:'border-emerald-200 bg-emerald-50 text-emerald-800'}
    :status==='connecting'||status==='reconnecting'
      ?{icon:<RefreshCw size={13} className="animate-spin"/>,text:status==='connecting'?'Đang kết nối realtime…':'Mất kết nối realtime, đang thử lại…',hint:'Trong lúc chờ, màn hình vẫn tự tải lại theo chu kỳ cũ.',tone:'border-amber-200 bg-amber-50 text-amber-800'}
      :{icon:<WifiOff size={13}/>,text:'Cập nhật định kỳ',hint:'Trình duyệt không mở được kênh realtime; dữ liệu tải lại theo chu kỳ.',tone:'border-slate-200 bg-slate-50 text-slate-600'};
  return <div role="status" aria-live="polite" title={view.hint} data-testid="iot-live-status" data-status={status}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${view.tone}`}>{view.icon}<span>{view.text}</span></div>;
};
