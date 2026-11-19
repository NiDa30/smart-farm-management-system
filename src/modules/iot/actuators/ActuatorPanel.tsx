import React, { useEffect, useMemo, useState } from 'react';
import { createLiveLoop } from '../live/iotLive';
import { Droplets, Fan, Lightbulb, CloudDrizzle, Play, Square } from 'lucide-react';
import { parseOverview, parseCommands, parseSequence, zoneRequest, typeLabel, phaseLabel, reasonLabel, resultLabel,
  type Actuator, type ActuatorCommand, type ActuatorOverview, type SequenceView } from './actuatorApi';

const icons = { VALVE: Droplets, FAN: Fan, LIGHT: Lightbulb, MIST: CloudDrizzle };
const PENDING = ['PENDING', 'SENT', 'PUBLISH_UNCERTAIN'];

async function getJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}
async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    let reason = '';
    try { reason = (await response.json())?.message ?? ''; } catch { /* body is optional */ }
    throw new Error(response.status === 409 ? `Thiết bị chưa sẵn sàng (${reason || 'cần trạng thái OFF mới, không khóa, không còn lệnh chờ'}).`
      : response.status === 403 ? 'Backend chưa bật điều khiển actuator (SMARTFARM_ACTUATORS_ENABLED).'
      : response.status === 400 ? 'Yêu cầu không hợp lệ.' : 'Chưa xác nhận gửi lệnh. Kiểm tra lịch sử; không tự gửi lại lệnh ON.');
  }
  return response.json();
}

/** Zone valves, fan, grow light, misting (contract v3) and the sequential zone run. */
export const ActuatorPanel: React.FC = () => {
  const [overview, setOverview] = useState<ActuatorOverview | null>(null);
  const [commands, setCommands] = useState<ActuatorCommand[]>([]);
  const [sequence, setSequence] = useState<SequenceView | null>(null);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [zones, setZones] = useState<Record<string, { selected: boolean; minutes: number }>>({});

  useEffect(() => {
    let active = true; let controller: AbortController | undefined;
    const loop = createLiveLoop(['actuators', 'automation', 'commands'], 3000);
    const poll = async () => {
      controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 5000);
      try {
        const [o, c, s] = await Promise.all([getJson('/api/v1/actuators', controller.signal), getJson('/api/v1/actuators/v3/commands', controller.signal),
          getJson('/api/v1/automation/zone-sequence', controller.signal)]);
        const parsed = { o: parseOverview(o), c: parseCommands(c), s: parseSequence(s) };
        if (active) { setOverview(parsed.o); setCommands(parsed.c); setSequence(parsed.s); setAvailable(true); }
      } catch { if (active) setAvailable(false); }
      finally { clearTimeout(timeout); if (active) loop.next(poll); }
    };
    void poll();
    return () => { active = false; loop.dispose(); controller?.abort(); };
  }, [refresh]);

  const valves = useMemo(() => overview?.actuators.filter(a => a.actuatorType === 'VALVE') ?? [], [overview]);
  const running = sequence?.current ?? null;
  const pendingFor = (id: string) => commands.some(c => c.actuatorId === id && PENDING.includes(c.state));
  const enabled = available && !!overview?.enabled;

  const send = async (actuator: Actuator, action: 'ON' | 'OFF' | 'RESET_LOCKOUT') => {
    setBusy(true); setError('');
    try {
      const seconds = Math.round((durations[actuator.actuatorId] ?? 1) * 60);
      await post(`/api/v1/actuators/v3/${actuator.actuatorId}/commands`, action === 'ON' ? { action, durationSeconds: seconds } : { action });
    } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi gửi lệnh.'); }
    finally { setBusy(false); setRefresh(r => r + 1); }
  };
  const startSequence = async () => {
    const body = zoneRequest(valves.map(v => ({ valveId: v.actuatorId, selected: zones[v.actuatorId]?.selected ?? false, minutes: zones[v.actuatorId]?.minutes ?? 5 })), valves);
    if (typeof body === 'string') { setError(body); return; }
    setBusy(true); setError('');
    try { await post('/api/v1/automation/zone-sequence', body); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không bắt đầu được.'); }
    finally { setBusy(false); setRefresh(r => r + 1); }
  };
  const cancel = async () => {
    setBusy(true); setError('');
    try { await post('/api/v1/automation/zone-sequence/cancel', {}); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không hủy được.'); }
    finally { setBusy(false); setRefresh(r => r + 1); }
  };

  return (
    <div className="mt-6 space-y-6">
      <section aria-label="Actuator v3" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Van zone, quạt, đèn, phun sương</h2>
        <p role="status" className="text-sm text-slate-600">
          {!available ? 'Chưa đọc được trạng thái actuator từ backend.' : overview?.enabled ? 'Điều khiển actuator đang bật.' : 'Backend chưa bật điều khiển actuator; chỉ xem.'}
        </p>
        <p className="text-xs text-slate-500">Bơm chỉ chạy khi có van zone mở; đóng van cuối cùng thì bơm tắt. Mất mạng: mọi relay tắt và khóa. Phun sương dùng chung bể nên cạn nước cũng khóa.</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {overview?.actuators.map(a => {
            const Icon = icons[a.actuatorType];
            const pending = pendingFor(a.actuatorId);
            const canOn = enabled && a.fresh && a.reportedState === 'OFF' && !a.safetyLockout && !pending && !busy && !running;
            const minutes = durations[a.actuatorId] ?? 1;
            return (
              <article key={a.actuatorId} aria-label={a.actuatorId} className="rounded-lg border border-slate-200 p-3">
                <header className="flex items-center gap-2 font-medium"><Icon size={16} />{a.actuatorId} · {typeLabel[a.actuatorType]}{a.zoneName ? ` · ${a.zoneName}` : ''}</header>
                <p className="text-sm">Trạng thái: {a.fresh ? a.reportedState : 'Chưa xác định'} · Khóa: {a.fresh ? (a.safetyLockout ? 'Có' : 'Không') : 'Chưa xác định'} · Lý do: {reasonLabel(a.stateReason)}</p>
                {pending && <p className="text-sm text-amber-700">Còn lệnh chờ ACK.</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-sm">Phút <input aria-label={`Thời gian ${a.actuatorId}`} type="number" min={1} max={Math.floor(a.maxSeconds / 60)} value={minutes}
                    onChange={e => setDurations(d => ({ ...d, [a.actuatorId]: Number(e.target.value) }))} className="w-20 rounded border px-1" /></label>
                  <button type="button" disabled={!canOn || !Number.isInteger(minutes * 60) || minutes * 60 < 1 || minutes * 60 > a.maxSeconds} onClick={() => send(a, 'ON')} className="rounded bg-emerald-600 px-2 py-1 text-sm text-white disabled:opacity-40">Bật {a.actuatorId}</button>
                  <button type="button" disabled={!enabled || busy} onClick={() => send(a, 'OFF')} className="rounded bg-slate-700 px-2 py-1 text-sm text-white disabled:opacity-40">Tắt {a.actuatorId}</button>
                  {a.safetyLockout && <button type="button" disabled={!enabled || busy || !a.fresh || a.reportedState !== 'OFF'} onClick={() => send(a, 'RESET_LOCKOUT')} className="rounded border px-2 py-1 text-sm disabled:opacity-40">Mở khóa {a.actuatorId}</button>}
                </div>
                <p className="text-xs text-slate-500">Giới hạn mỗi lệnh: {Math.floor(a.maxSeconds / 60)} phút.</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label="Tưới lần lượt theo zone" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Tưới lần lượt theo zone (một bơm chung)</h2>
        <p className="text-xs text-slate-500">Mỗi zone: mở van → bơm chạy đúng thời gian → bơm tự tắt → đóng van → zone kế tiếp. Lỗi, khóa hoặc cạn nước ở bất kỳ bước nào sẽ dừng cả lượt và gửi lệnh tắt.</p>
        {running ? (
          <div className="mt-3">
            <p className="text-sm font-medium">Lượt #{running.id} đang chạy</p>
            <ol className="mt-2 space-y-1">
              {running.steps.map(s => <li key={s.stepNo} className="text-sm">{s.stepNo}. {s.zoneName} ({s.valveId}) · bơm {Math.round(s.pumpSeconds / 60 * 10) / 10} phút · {phaseLabel[s.phase]}</li>)}
            </ol>
            <button type="button" disabled={busy} onClick={cancel} className="mt-2 inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-40"><Square size={14} />Dừng lượt tưới</button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {valves.map(v => (
              <div key={v.actuatorId} className="flex items-center gap-2 text-sm">
                <label><input type="checkbox" aria-label={`Chọn ${v.zoneName}`} checked={zones[v.actuatorId]?.selected ?? false}
                  onChange={e => setZones(z => ({ ...z, [v.actuatorId]: { minutes: z[v.actuatorId]?.minutes ?? 5, selected: e.target.checked } }))} /> {v.zoneName} ({v.actuatorId})</label>
                <input type="number" aria-label={`Phút bơm ${v.zoneName}`} min={1} max={30} value={zones[v.actuatorId]?.minutes ?? 5}
                  onChange={e => setZones(z => ({ ...z, [v.actuatorId]: { selected: z[v.actuatorId]?.selected ?? false, minutes: Number(e.target.value) } }))} className="w-20 rounded border px-1" /> phút
              </div>
            ))}
            <button type="button" disabled={!enabled || busy || !sequence?.enabled} onClick={startSequence} className="inline-flex items-center gap-1 rounded bg-emerald-700 px-3 py-1 text-sm text-white disabled:opacity-40"><Play size={14} />Bắt đầu tưới theo zone</button>
          </div>
        )}
        <h3 className="mt-4 text-sm font-semibold">Lượt gần đây</h3>
        {sequence && sequence.recent.length ? (
          <ul className="text-sm">
            {sequence.recent.filter(r => r.state !== 'RUNNING').map(r => <li key={r.id}>#{r.id} · {r.state === 'COMPLETED' ? 'Hoàn tất' : 'Đã dừng'} · {resultLabel(r.result)} · {r.steps.map(s => `${s.valveId}: ${phaseLabel[s.phase]}`).join(', ')}</li>)}
          </ul>
        ) : <p className="text-sm text-slate-500">Chưa có lượt nào.</p>}
      </section>
    </div>
  );
};
