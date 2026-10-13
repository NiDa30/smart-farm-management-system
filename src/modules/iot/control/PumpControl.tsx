import React, { useEffect, useState } from 'react';
import { Power, ShieldCheck, RefreshCw } from 'lucide-react';

interface PumpStatus { deviceId: 'PUMP01'; reportedState: 'ON' | 'OFF' | 'UNKNOWN'; safetyLockout: boolean; fresh: boolean; controlEnabled: boolean; observedAt: string | null }
interface Command { commandId: string; action: string; durationSeconds: number | null; issuedAt: string; state: string; reportedState: string | null; errorCode: string | null }
const API = '/api/v1/actuators/PUMP01';
export const PumpControl: React.FC = () => {
  const [status, setStatus] = useState<PumpStatus | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(false);
  const [duration, setDuration] = useState(5);
  const [sending, setSending] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true;
    let next: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      controller = new AbortController(); timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const responses = await Promise.all([fetch(`${API}/status`, { signal: controller.signal, cache: 'no-store' }), fetch(`${API}/commands`, { signal: controller.signal, cache: 'no-store' })]);
        if (responses.some(response => !response.ok)) throw new Error();
        const [value, history] = await Promise.all(responses.map(response => response.json()));
        if (!value || value.deviceId !== 'PUMP01' || !['ON','OFF','UNKNOWN'].includes(value.reportedState)
          || typeof value.fresh !== 'boolean' || typeof value.safetyLockout !== 'boolean' || typeof value.controlEnabled !== 'boolean'
          || (value.observedAt !== null && (typeof value.observedAt !== 'string' || !Number.isFinite(Date.parse(value.observedAt)))) || !Array.isArray(history) || !history.every(command => command && typeof command.commandId === 'string'
            && ['ON','OFF','RESET_LOCKOUT'].includes(command.action) && typeof command.state === 'string'
            && typeof command.issuedAt === 'string' && Number.isFinite(Date.parse(command.issuedAt)))) throw new Error();
        if (active) { setStatus(value); setCommands(history); setAvailable(true); }
      } catch { if (active) setAvailable(false); }
      finally { clearTimeout(timeout); if (active) next = setTimeout(poll, 2000); }
    };
    void poll(); return () => { active = false; clearTimeout(next); clearTimeout(timeout); controller?.abort(); };
  }, [refresh]);
  const age = status?.observedAt ? now - Date.parse(status.observedAt) : Infinity;
  const fresh = available && status?.fresh && age >= -2000 && age <= 15000;
  const state = fresh ? status?.reportedState : 'UNKNOWN';
  const pending = commands.some(command => ['PENDING','SENT','PUBLISH_UNCERTAIN'].includes(command.state));
  const canOn = !!fresh && status?.controlEnabled && state === 'OFF' && !status.safetyLockout && !pending && !sending && Number.isInteger(duration) && duration >= 1 && duration <= 30;
  const send = async (action: 'ON' | 'OFF' | 'RESET_LOCKOUT') => {
    setSending(true); setError('');
    try {
      const response = await fetch(`${API}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'ON' ? { action, durationSeconds: duration } : { action }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(response.status === 409 ? 'Thiết bị chưa sẵn sàng, đang khóa hoặc còn lệnh chờ ACK.' : response.status === 403 ? 'Backend chưa bật chế độ điều khiển Wokwi.' : 'Chưa xác nhận gửi lệnh. Kiểm tra lịch sử và trạng thái; không tự gửi lại lệnh ON.');
      const command = await response.json();
      if (command && typeof command.commandId === 'string') setCommands(previous => [command, ...previous.filter(item => item.commandId !== command.commandId)].slice(0,20));
    } catch (error) { setError(error instanceof Error ? error.message : 'Không gửi được lệnh.'); }
    finally { setSending(false); setRefresh(value => value + 1); }
  };
  const labels: Record<string,string> = { PENDING: 'Đang gửi', SENT: 'Đã gửi, chờ ACK', EXECUTED: 'Thiết bị đã ACK', FAILED: 'Thiết bị từ chối', TIMED_OUT: 'Quá hạn ACK', PUBLISH_UNCERTAIN: 'Chưa xác nhận gửi' };
  return <div className="max-w-5xl mx-auto space-y-5">
    <header><h1 className="text-xl font-bold flex gap-2 items-center"><Power className="w-5 h-5 text-emerald-600" /> Điều khiển PUMP01</h1><p className="text-sm text-slate-500 mt-1">Demo GPIO26 trên Wokwi · FARM001 / ENV01</p></header>
    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm">Chỉ dùng mô phỏng Wokwi với LED. ACK xác nhận GPIO đã áp dụng, không chứng minh bơm vật lý đang chạy.</div>
    <section className="bg-white border rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-center"><h2 className="font-semibold">Trạng thái thiết bị: <span role="status">{state === 'UNKNOWN' ? 'Chưa xác định' : state === 'ON' ? 'Đang bật' : 'Đang tắt'}</span></h2><button type="button" onClick={() => setRefresh(value => value + 1)} aria-label="Làm mới trạng thái"><RefreshCw className="w-4 h-4" /></button></div>
      <p className="text-sm text-slate-500">{status?.observedAt ? `Báo lúc: ${new Date(status.observedAt).toLocaleString('vi-VN')}` : 'Chưa nhận status từ thiết bị.'}</p>
      {!available && <p role="alert" className="text-rose-700 text-sm">Backend chưa khả dụng; không thể xác nhận trạng thái relay.</p>}
      {status && !status.controlEnabled && <p className="text-amber-800 text-sm">Chế độ điều khiển chưa bật trên backend.</p>}
      {status?.safetyLockout && <p className="text-rose-700 text-sm">Khóa an toàn đang bật. Chỉ reset khi thiết bị báo OFF mới.</p>}
      <label className="block text-sm font-semibold">Thời gian bật (giây)<input type="number" min={1} max={30} step={1} value={Number.isFinite(duration) ? duration : ''} onChange={event => setDuration(event.target.valueAsNumber)} className="block mt-1 border rounded-lg px-3 py-2 w-32" /></label>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={!canOn} onClick={() => void send('ON')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-40">Bật có thời hạn</button>
        <button type="button" disabled={!available || !status?.controlEnabled || sending} onClick={() => void send('OFF')} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-40">Gửi lệnh tắt</button>
        <button type="button" disabled={!fresh || state !== 'OFF' || !status?.safetyLockout || !status?.controlEnabled || sending} onClick={() => void send('RESET_LOCKOUT')} className="border px-4 py-2 rounded-lg disabled:opacity-40">Reset khóa</button>
      </div>
      <p className="text-xs text-slate-500 flex gap-2"><ShieldCheck className="w-4 h-4" /> Bật 1–30 giây; chưa có status mới hoặc ACK thì không tự coi lệnh đã thực thi.</p>
      {error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}
    </section>
    <section className="bg-white border rounded-xl overflow-x-auto"><h2 className="p-4 font-semibold border-b">20 lệnh gần nhất</h2><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Thời điểm</th><th className="p-3">Lệnh</th><th className="p-3">Kết quả</th><th className="p-3">ACK / lỗi</th></tr></thead><tbody>{commands.map(command => <tr key={command.commandId} className="border-t"><td className="p-3">{new Date(command.issuedAt).toLocaleString('vi-VN')}</td><td className="p-3">{command.action}{command.durationSeconds ? ` ${command.durationSeconds}s` : ''}</td><td className="p-3">{labels[command.state] ?? command.state}</td><td className="p-3">{command.errorCode ?? command.reportedState ?? '—'}</td></tr>)}{!commands.length && <tr><td colSpan={4} className="p-8 text-center text-slate-400">Chưa có lệnh.</td></tr>}</tbody></table></section>
  </div>;
};
