import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
interface Alert { id: number; deviceId: string; type: 'LOW_SOIL' | 'HIGH_TEMPERATURE'; openedAt: string; openedValue: number; clearedAt: string | null; clearedValue: number | null }
export const IoTAlertCenter: React.FC = () => {
  const [alerts,setAlerts]=useState<Alert[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [filter,setFilter]=useState<'all'|'active'|'cleared'>('all');
  useEffect(() => {
    let active=true;
    let next: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    const poll=async () => {
      controller=new AbortController(); const timeout=setTimeout(() => controller.abort(),5000);
      try {
        const response=await fetch('/api/v1/alerts',{ signal:controller.signal,cache:'no-store' });
        if (!response.ok) throw new Error();
        const value: unknown=await response.json();
        if (!Array.isArray(value) || !value.every(a => a && Number.isInteger(a.id) && typeof a.deviceId==='string' && ['LOW_SOIL','HIGH_TEMPERATURE'].includes(a.type) && Number.isFinite(Date.parse(a.openedAt)) && Number.isFinite(a.openedValue) && (a.clearedAt===null || Number.isFinite(Date.parse(a.clearedAt))))) throw new Error();
        if (active) { setAlerts(value); setError(false); }
      } catch { if (active) setError(true); }
      finally { clearTimeout(timeout); if (active) { setLoading(false); next=setTimeout(poll,5000); } }
    };
    void poll(); return () => { active=false; controller?.abort(); clearTimeout(next); };
  },[refresh]);
  const shown=alerts.filter(a => filter==='all' || (filter==='active' ? a.clearedAt===null : a.clearedAt!==null));
  return <div className="max-w-6xl mx-auto space-y-4">
    <h1 className="text-xl font-bold flex gap-2 items-center"><AlertTriangle />Cảnh báo cảm biến</h1>
    <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
      <p>Độ ẩm đất thấp: dưới 30%; trở về bình thường khi đạt 35%.</p>
      <p>Nhiệt độ cao: trên 35°C; trở về bình thường khi xuống 33°C.</p>
      <p className="text-slate-500">Chỉ đánh giá mẫu mới trong 30 giây. Mất dữ liệu không tự xóa cảnh báo. Chưa tự điều khiển đèn hoặc gửi email.</p>
    </div>
    <div className="flex gap-3 items-center"><label>Lọc <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="border rounded p-2"><option value="all">Tất cả</option><option value="active">Đang cảnh báo</option><option value="cleared">Đã trở về bình thường</option></select></label><button onClick={() => setRefresh(v=>v+1)} className="border rounded p-2 flex gap-2"><RefreshCw size={18} />Làm mới</button></div>
    {loading && <p role="status">Đang tải cảnh báo…</p>}
    {error && <p role="alert" className="text-rose-700">Không tải được cảnh báo. Kiểm tra backend; dữ liệu trước đó có thể đã cũ.</p>}
    {!loading && !error && !shown.length && <p>Chưa có cảnh báo trong bộ lọc này.</p>}
    {!loading && <div className="space-y-3">{shown.map(a => <article key={a.id} className={`border rounded-xl p-4 ${a.clearedAt ? 'bg-white' : 'bg-amber-50'}`}>
      <div className="font-semibold">{a.deviceId} · {a.type==='LOW_SOIL' ? 'Độ ẩm đất thấp' : 'Nhiệt độ cao'} · {a.clearedAt ? 'Đã trở về bình thường' : 'Đang cảnh báo'}</div>
      <p className="text-sm mt-2">Phát sinh: {new Date(a.openedAt).toLocaleString('vi-VN')} · Giá trị {a.openedValue}{a.type==='LOW_SOIL' ? '%' : '°C'}</p>
      {a.clearedAt && <p className="text-sm">Trở về bình thường: {new Date(a.clearedAt).toLocaleString('vi-VN')} · Giá trị {a.clearedValue}{a.type==='LOW_SOIL' ? '%' : '°C'}</p>}
    </article>)}</div>}
    <p className="text-xs text-slate-500">Tự tải mỗi 5 giây. Tối đa 100 cảnh báo, ưu tiên cảnh báo đang hoạt động.</p>
  </div>;
};
