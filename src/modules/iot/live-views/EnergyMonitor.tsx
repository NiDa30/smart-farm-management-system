import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useLive } from './useLive';
import { parseEnergy, hours, type Energy } from './liveApi';

const DAYS = [1, 7, 30];

/** Estimated energy: device-confirmed ON time x operator-declared rated power. Not a meter. */
export const EnergyMonitor: React.FC = () => {
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const { data, available, loaded } = useLive<Energy>([`/api/v1/iot/energy?days=${days}`], ([e]) => parseEnergy(e), ['actuators', 'pump'], 30000, refresh);
  const save = async (id: string) => {
    const raw = edit[id]?.trim() ?? '';
    const watts = raw === '' ? null : Number(raw);
    if (watts !== null && (!Number.isInteger(watts) || watts < 1 || watts > 20000)) { setError('Công suất 1–20000 W, hoặc để trống nếu chưa biết.'); return; }
    setError('');
    const response = await fetch(`/api/v1/iot/actuators/${id}/rated-power`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ratedWatts: watts }) }).catch(() => null);
    if (!response?.ok) setError('Không lưu được công suất.');
    else { setEdit(e => { const next = { ...e }; delete next[id]; return next; }); setRefresh(r => r + 1); }
  };
  const max = Math.max(1, ...(data?.actuators.map(a => a.seconds) ?? [1]));
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Zap size={20} />Điện năng (ước tính)</h1>
      <p className="text-xs text-slate-500">Chưa có công tơ: điện năng = thời gian thiết bị báo đang bật × công suất định mức bạn khai báo. Thiết bị chưa khai báo công suất không được tính.</p>
      <div className="flex gap-2 text-sm">{DAYS.map(d => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}
        className={`rounded border px-2 py-1 ${days === d ? 'bg-emerald-700 text-white' : ''}`}>{d === 1 ? 'Hôm nay' : `${d} ngày`}</button>)}</div>
      <p role="status" className="text-sm">{!loaded ? 'Đang tải…' : !available ? 'Chưa đọc được dữ liệu điện năng.'
        : data!.totalKilowattHours === null ? 'Chưa thiết bị nào có công suất định mức.' : `Tổng ước tính: ${data!.totalKilowattHours} kWh`}</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {data && <table className="w-full rounded-xl bg-white text-left text-sm"><thead><tr><th className="p-2">Thiết bị</th><th>Thời gian bật</th><th>Công suất (W)</th><th>Điện năng</th></tr></thead><tbody>
        {data.actuators.map(a => <tr key={a.actuatorId} aria-label={a.actuatorId} className="border-t">
          <td className="p-2">{a.actuatorId}</td>
          <td><div className="h-2 rounded bg-sky-500" style={{ width: `${Math.round(a.seconds / max * 100)}%`, minWidth: a.seconds ? 4 : 0 }} />{hours(a.seconds)}</td>
          <td><input aria-label={`Công suất ${a.actuatorId}`} className="w-20 rounded border px-1" value={edit[a.actuatorId] ?? (a.ratedWatts ?? '')}
            onChange={e => setEdit(v => ({ ...v, [a.actuatorId]: e.target.value }))} />
            {edit[a.actuatorId] !== undefined && <button type="button" className="ml-1 underline" onClick={() => save(a.actuatorId)}>Lưu</button>}</td>
          <td>{a.kilowattHours === null ? 'chưa khai báo công suất' : `${a.kilowattHours} kWh`}</td></tr>)}
      </tbody></table>}
    </div>
  );
};
