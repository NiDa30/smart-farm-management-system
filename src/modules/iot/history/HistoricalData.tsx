import React, { useEffect, useState } from 'react';
import { Download, History, RefreshCw } from 'lucide-react';
import { fetchRegistry, parseReading, SensorSummary, TelemetryReading } from '../realtime/telemetryApi';

export const HistoricalData: React.FC = () => {
  const [sensors, setSensors] = useState<SensorSummary[]>([]);
  const [device, setDevice] = useState('');
  const [hours, setHours] = useState(1);
  const [metric, setMetric] = useState<'temperature' | 'humidity' | 'soilMoisture'>('temperature');
  const [rows, setRows] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetchRegistry(controller.signal).then(value => { if (!active) return; setSensors(value.sensors); setDevice(value.sensors[0]?.deviceId ?? ''); setLoading(false); })
      .catch(() => { if (!active) return; setError('Không tải được danh sách cảm biến. Kiểm tra backend và tải lại trang.'); setLoading(false); });
    return () => { active=false; clearTimeout(timeout); controller.abort(); };
  }, []);
  useEffect(() => {
    if (!device) return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    setLoading(true); setError(''); setRows([]);
    const end = Date.now(), start = end - hours * 3600000;
    const query = new URLSearchParams({ from: new Date(start).toISOString(), to: new Date(end).toISOString(), limit: '1000' });
    fetch(`/api/v1/devices/${encodeURIComponent(device)}/telemetry?${query}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error();
        const value: unknown = await response.json();
        if (!Array.isArray(value)) throw new Error();
        const readings = value.map(parseReading);
        if (readings.some(row => row.telemetry.deviceId !== device || Date.parse(row.telemetry.timestamp) < start || Date.parse(row.telemetry.timestamp) > end)) throw new Error();
        const unique = [...new Map(readings.map(row => [row.id, row])).values()].sort((a,b) => Date.parse(a.telemetry.timestamp)-Date.parse(b.telemetry.timestamp) || a.id-b.id);
        if (active) { setRows(unique); setRange({ start, end }); }
      }).catch(() => { if (active) setError('Không tải được lịch sử. Kiểm tra backend rồi nhấn Làm mới.'); })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [device, hours, refresh]);
  const titles = { temperature: 'Nhiệt độ (°C)', humidity: 'Độ ẩm không khí (%)', soilMoisture: 'Độ ẩm đất (%)' };
  const values = rows.map(row => row.telemetry[metric]);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const average = values.length ? values.reduce((sum,v) => sum+v,0)/values.length : 0;
  const exportCsv = () => {
    const csv = ['deviceId,timestamp,receivedAt,temperature,humidity,soilMoisture,bootId,sequence', ...rows.map(({ telemetry: t, receivedAt }) => [t.deviceId,t.timestamp,receivedAt,t.temperature,t.humidity,t.soilMoisture,t.bootId,t.sequence].join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href=url; link.download=`${device}-${hours}h.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  const low = min-1, high=max+1;
  const x = (row: TelemetryReading) => 50 + (Date.parse(row.telemetry.timestamp)-(range?.start ?? 0))/((range?.end ?? 1)-(range?.start ?? 0))*900;
  const y = (row: TelemetryReading) => 210-(row.telemetry[metric]-low)/(high-low)*180;
  const path = rows.map((row,index) => `${index === 0 || Date.parse(row.telemetry.timestamp)-Date.parse(rows[index-1].telemetry.timestamp)>30000 ? 'M' : 'L'} ${x(row)} ${y(row)}`).join(' ');
  return <div className="max-w-6xl mx-auto space-y-5">
    <h1 className="text-xl font-bold flex items-center gap-2"><History /> Lịch sử cảm biến</h1>
    <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-4 items-end">
      <label>Cảm biến<select aria-label="Cảm biến" value={device} onChange={event => setDevice(event.target.value)} className="block border rounded p-2">{sensors.map(sensor => <option key={sensor.deviceId} value={sensor.deviceId}>{sensor.name} · {sensor.deviceId}</option>)}</select></label>
      <label>Khoảng thời gian<select aria-label="Khoảng thời gian" value={hours} onChange={event => setHours(Number(event.target.value))} className="block border rounded p-2"><option value={1}>1 giờ</option><option value={24}>24 giờ</option></select></label>
      <label>Chỉ số<select aria-label="Chỉ số" value={metric} onChange={event => setMetric(event.target.value as typeof metric)} className="block border rounded p-2">{Object.entries(titles).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <button disabled={loading || !device} onClick={() => setRefresh(v => v+1)} className="border rounded p-2 disabled:opacity-40 flex gap-2"><RefreshCw size={18} />Làm mới</button>
      <button disabled={loading || !!error || !rows.length} onClick={exportCsv} className="border rounded p-2 disabled:opacity-40 flex gap-2"><Download size={18} />Xuất CSV</button>
    </div>
    {loading && <p role="status">Đang tải lịch sử…</p>}
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {!loading && !error && !rows.length && <p>Chưa có dữ liệu trong khoảng đã chọn.</p>}
    {!loading && !error && rows.length > 0 && <>
      <p>{rows.length} mẫu · Thấp nhất {min.toFixed(1)} · Trung bình {average.toFixed(1)} · Cao nhất {max.toFixed(1)} ({titles[metric]})</p>
      {rows.length >= 1000 && <p className="text-amber-800">Đang hiển thị tối đa 1000 mẫu mới nhất trong khoảng đã chọn. Thống kê và CSV chỉ gồm các mẫu này, chưa phải toàn bộ khoảng thời gian.</p>}
      <div className="bg-white border rounded-xl p-4">
        <svg viewBox="0 0 1000 250" role="img" aria-label={`Biểu đồ ${titles[metric]}`} className="w-full">
          <line x1="50" y1="210" x2="950" y2="210" stroke="#94a3b8" /><text x="0" y="35" fontSize="12">{high.toFixed(1)}</text><text x="0" y="210" fontSize="12">{low.toFixed(1)}</text>
          <path d={path} fill="none" stroke="#059669" strokeWidth="2" />
          {rows.map(row => <circle key={row.id} cx={x(row)} cy={y(row)} r="2" fill="#059669"><title>{new Date(row.telemetry.timestamp).toLocaleString('vi-VN')}: {row.telemetry[metric]}</title></circle>)}
          <text x="50" y="240" fontSize="12">{range && new Date(range.start).toLocaleString('vi-VN')}</text><text x="950" y="240" fontSize="12" textAnchor="end">{range && new Date(range.end).toLocaleString('vi-VN')}</text>
        </svg>
        <p className="text-xs text-slate-500">Trục thời gian theo timestamp thiết bị. Khoảng cách trên 30 giây không nối đường; không nội suy dữ liệu bị thiếu. Nhấn Làm mới để lấy dữ liệu mới.</p>
      </div>
      <div className="bg-white border rounded-xl max-h-96 overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th className="p-3">Thời gian thiết bị</th><th>Nhiệt độ °C</th><th>Độ ẩm %</th><th>Độ ẩm đất %</th></tr></thead><tbody>{[...rows].reverse().map(row => <tr key={row.id} className="border-t"><td className="p-3">{new Date(row.telemetry.timestamp).toLocaleString('vi-VN')}</td><td>{row.telemetry.temperature}</td><td>{row.telemetry.humidity}</td><td>{row.telemetry.soilMoisture}</td></tr>)}</tbody></table></div>
    </>}
  </div>;
};
