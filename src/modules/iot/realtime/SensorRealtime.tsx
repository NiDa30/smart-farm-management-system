import { WaterNodesPanel } from '../nodes/WaterNodesPanel';
import React, { useEffect, useRef, useState } from 'react';
import { Activity, Clock, Database, Droplets, History, RefreshCw, Thermometer, WifiOff, Plus, MapPin, X } from 'lucide-react';
import { fetchHistory, fetchLatest, telemetryState, type NetworkState, type TelemetryReading, fetchRegistry, registerItem, type SensorSummary, type SensorArea } from './telemetryApi';

const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN');
const number = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

const SensorDetail: React.FC<{ sensor: SensorSummary; areaName: string }> = ({ sensor, areaName }) => {
  const [latest, setLatest] = useState<TelemetryReading | null>(null);
  const [history, setHistory] = useState<TelemetryReading[]>([]);
  const [network, setNetwork] = useState<NetworkState>('loading');
  const [historyError, setHistoryError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let nextPoll: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      controller = new AbortController();
      setRefreshing(true);
      timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const [readingResult, historyResult] = await Promise.allSettled([
          fetchLatest(controller.signal, sensor.deviceId), fetchHistory(controller.signal, sensor.deviceId),
        ]);
        if (!active) return;
        if (readingResult.status === 'fulfilled') {
          setLatest(readingResult.value);
          setNetwork(readingResult.value ? 'ready' : 'empty');
        } else {
          // Keep the last successful reading visibly marked as unavailable/stale.
          setNetwork('error');
        }
        if (historyResult.status === 'fulfilled') {
          setHistory(historyResult.value);
          setHistoryError(false);
        } else {
          setHistoryError(true);
        }
        setNow(Date.now());
      } finally {
        clearTimeout(timeout);
        if (active) {
          setRefreshing(false);
          nextPoll = setTimeout(poll, 5000);
        }
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(nextPoll);
      clearTimeout(timeout);
      controller?.abort();
    };
  }, [refresh, sensor.deviceId]);

  const state = telemetryState(network, latest, now);
  const labels = {
    loading: 'Đang tải dữ liệu', live: 'Dữ liệu mới', stale: 'Dữ liệu đã cũ',
    empty: 'Chưa có reading', error: 'Không kết nối được backend',
  };
  const badge = state === 'live' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : state === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';
  const values = latest?.telemetry;
  const ageSeconds = latest ? Math.max(0, Math.floor((now - Date.parse(latest.telemetry.timestamp)) / 1000)) : null;
  const clockSkew = latest && (Date.parse(latest.telemetry.timestamp) > now + 60_000 || Date.parse(latest.receivedAt) > now + 60_000);
  const cards = [
    { label: 'Nhiệt độ', value: values?.temperature, unit: '°C', icon: Thermometer, color: 'text-orange-600 bg-orange-50' },
    { label: 'Độ ẩm không khí', value: values?.humidity, unit: '%', icon: Droplets, color: 'text-sky-600 bg-sky-50' },
    { label: 'Độ ẩm đất', value: values?.soilMoisture, unit: '%', icon: Droplets, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-5" data-testid="sensor-detail">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" /> {sensor.name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{areaName} · {sensor.deviceId} · Dữ liệu cảm biến đã lưu</p>
        </div>
        <button type="button" disabled={refreshing} onClick={() => setRefresh(value => value + 1)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </header>

      <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3" aria-label="Trạng thái dữ liệu">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 border px-3 py-1 rounded-full text-xs font-bold ${badge}`}>
            {state === 'error' ? <WifiOff className="w-3.5 h-3.5" /> : <span className={`w-2 h-2 rounded-full ${state === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} />}
            {labels[state]}
          </span>
          <span className="text-xs text-slate-500">Tự cập nhật sau mỗi 5 giây</span>
        </div>
        {state === 'error' && <p role="alert" className="text-sm text-rose-700">Không tải được dữ liệu mới. Kiểm tra backend đang chạy; reading còn hiển thị là dữ liệu đã tải trước đó.</p>}
        {state === 'empty' && <p className="text-sm text-slate-500">Chưa có dữ liệu cảm biến trong database. Hãy chạy thiết bị và chờ reading đầu tiên.</p>}
        {state === 'stale' && <p className="text-sm text-amber-800">{clockSkew ? 'Thời gian reading lệch so với đồng hồ máy. Kiểm tra đồng bộ giờ.' : 'Reading mới nhất đã quá 30 giây. Kiểm tra thiết bị và luồng nhận dữ liệu.'}</p>}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Đo lúc: {latest ? dateTime(latest.telemetry.timestamp) : '—'}</span>
          <span className="inline-flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Nhận lúc: {latest ? dateTime(latest.receivedAt) : '—'}</span>
          {ageSeconds !== null && <span>Tuổi reading: {ageSeconds} giây</span>}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(card => <section key={card.label} className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${state === 'live' ? '' : 'opacity-75'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600">{card.label}</h2>
            <span className={`p-2 rounded-lg ${card.color}`}><card.icon className="w-5 h-5" /></span>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums text-slate-900" data-testid={card.label}>{number(card.value)}</span>
            <span className="text-xl text-slate-400">{card.unit}</span>
          </div>
          <p className="mt-3 text-xs text-slate-400">{latest ? state === 'live' ? 'Reading mới nhất' : 'Giá trị đã ghi nhận trước đó' : 'Chờ dữ liệu thực tế'}</p>
        </section>)}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" aria-label="Lịch sử telemetry">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 inline-flex items-center gap-2"><History className="w-4 h-4 text-emerald-600" /> Lịch sử cảm biến</h2>
          <span className="text-xs text-slate-500">Tối đa 15 reading gần nhất trong 24 giờ</span>
        </div>
        {historyError && <p role="alert" className="px-4 py-3 text-sm text-amber-800 bg-amber-50">Chưa cập nhật được lịch sử. Các dòng đang hiển thị là dữ liệu đã tải trước đó.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs"><tr>
              <th className="px-4 py-3 font-semibold">Thời điểm đo</th><th className="px-4 py-3 font-semibold">Nhiệt độ (°C)</th>
              <th className="px-4 py-3 font-semibold">Độ ẩm (%)</th><th className="px-4 py-3 font-semibold">Độ ẩm đất (%)</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {history.map(reading => <tr key={reading.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{dateTime(reading.telemetry.timestamp)}</td>
                <td className="px-4 py-3 tabular-nums">{number(reading.telemetry.temperature)}</td>
                <td className="px-4 py-3 tabular-nums">{number(reading.telemetry.humidity)}</td>
                <td className="px-4 py-3 tabular-nums">{number(reading.telemetry.soilMoisture)}</td>
              </tr>)}
              {!history.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">{network === 'loading' ? 'Đang tải lịch sử…' : historyError ? 'Lịch sử chưa khả dụng.' : 'Chưa có reading trong khoảng thời gian này.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export const SensorRealtime: React.FC = () => {
  const [nodeView,setNodeView]=useState(false);
  const [areas, setAreas] = useState<SensorArea[]>([]);
  const [sensors, setSensors] = useState<SensorSummary[]>([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState('ENV01');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [form, setForm] = useState<'sensors' | 'areas' | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const submission = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); submission.current?.abort(); };
  }, []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let timeout: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    const load = async () => {
      controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const result = await fetchRegistry(controller.signal);
        if (active) {
          setAreas(result.areas); setSensors(result.sensors); setFailed(false);
          setSelected(current => result.sensors.some(sensor => sensor.deviceId === current) ? current : result.sensors[0]?.deviceId ?? '');
        }
      } catch {
        if (active) setFailed(true);
      } finally {
        clearTimeout(timeout);
        if (active) { setLoading(false); timer = setTimeout(load, 5000); }
      }
    };
    void load();
    return () => { active = false; clearTimeout(timer); clearTimeout(timeout); controller?.abort(); };
  }, [reload]);

  const visible = sensors.filter(sensor => filter === 'all' || sensor.areaId === filter);
  const current = visible.find(sensor => sensor.deviceId === selected) ?? visible[0];
  const areaName = (id: string) => areas.find(area => area.id === id)?.name ?? id;
  const openForm = (kind: 'sensors' | 'areas') => {
    setForm(kind); setCode(''); setName(''); setFormError('');
    setAreaId(filter === 'all' ? areas[0]?.id ?? '' : filter);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || saving) return;
    setSaving(true); setFormError('');
    const controller = new AbortController(); submission.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const id = code.trim();
      await registerItem(form, form === 'sensors' ? { deviceId: id, name: name.trim(), areaId } : { id, name: name.trim() }, controller.signal);
      if (form === 'sensors') { setSelected(id); setFilter('all'); }
      setForm(null); setReload(value => value + 1);
    } catch (error) {
      setFormError(error instanceof Error && error.name !== 'AbortError' ? error.message : 'Request quá thời gian. Tải lại danh sách để kiểm tra đã lưu hay chưa.');
    } finally { clearTimeout(timeout); setSaving(false); submission.current = null; }
  };
  const labels = { loading: 'Đang tải', live: 'Dữ liệu mới', stale: 'Dữ liệu cũ', empty: 'Chưa có dữ liệu', error: 'Backend chưa khả dụng' };

  if(nodeView)return <div className="max-w-6xl mx-auto space-y-5 pb-12"><button type="button" onClick={()=>setNodeView(false)} className="underline">Về sensor môi trường</button><WaterNodesPanel /></div>;
  return <div className="max-w-6xl mx-auto space-y-5 pb-12">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> Sensor Realtime</h1>
        <p className="text-sm text-slate-500 mt-1">Giám sát cảm biến theo khu vực · FARM001</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={()=>setNodeView(true)} className="border rounded-lg px-3 py-2 text-sm font-semibold">Node & trạm nước</button>
        <button type="button" onClick={() => openForm('areas')} className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Thêm khu vực</button>
        <button type="button" disabled={failed || loading || !areas.length} onClick={() => openForm('sensors')} className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Plus className="w-4 h-4" /> Thêm sensor</button>
      </div>
    </header>
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden" aria-label="Danh sách sensor">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm text-slate-600 flex items-center gap-2">Khu vực
          <select aria-label="Lọc khu vực" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 bg-white">
            <option value="all">Tất cả khu vực</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select></label>
        <span className="text-xs text-slate-500">{visible.length} sensor · Chọn thiết bị để xem lịch sử</span>
      </div>
      {failed && <p role="alert" className="p-4 bg-rose-50 text-rose-700 text-sm">Không cập nhật được danh sách sensor. Dữ liệu đang hiển thị có thể đã cũ. <button type="button" onClick={() => setReload(value => value + 1)} className="underline font-semibold">Thử lại</button></p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>
        <th className="px-4 py-3">Sensor</th><th className="px-4 py-3">Khu vực</th><th className="px-4 py-3">Nhiệt độ</th><th className="px-4 py-3">Độ ẩm</th><th className="px-4 py-3">Độ ẩm đất</th><th className="px-4 py-3">Trạng thái</th>
      </tr></thead><tbody className="divide-y divide-slate-100">
        {visible.map(sensor => {
          const status = telemetryState(failed ? 'error' : sensor.latest ? 'ready' : 'empty', sensor.latest, now);
          return <tr key={sensor.deviceId} className={current?.deviceId === sensor.deviceId ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}>
            <td className="px-4 py-3"><button type="button" aria-pressed={current?.deviceId === sensor.deviceId} onClick={() => setSelected(sensor.deviceId)} className="text-emerald-700 font-semibold text-left hover:underline">{sensor.name}<span className="block text-xs font-normal text-slate-400">{sensor.deviceId}</span></button></td>
            <td className="px-4 py-3">{areaName(sensor.areaId)}</td>
            <td className="px-4 py-3 tabular-nums">{number(sensor.latest?.telemetry.temperature)} °C</td>
            <td className="px-4 py-3 tabular-nums">{number(sensor.latest?.telemetry.humidity)} %</td>
            <td className="px-4 py-3 tabular-nums">{number(sensor.latest?.telemetry.soilMoisture)} %</td>
            <td className={`px-4 py-3 text-xs ${status === 'live' ? 'text-emerald-700' : status === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>{labels[status]}</td>
          </tr>;
        })}
        {!visible.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{loading ? 'Đang tải sensor…' : failed ? 'Danh sách chưa khả dụng.' : 'Khu vực chưa có sensor. Thêm sensor để bắt đầu theo dõi.'}</td></tr>}
      </tbody></table></div>
    </section>
    {current && <SensorDetail key={current.deviceId} sensor={current} areaName={areaName(current.areaId)} />}
    {form && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="registry-title" className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between"><h2 id="registry-title" className="text-lg font-bold">{form === 'sensors' ? 'Thêm sensor' : 'Thêm khu vực'}</h2>
          <button type="button" aria-label="Đóng" disabled={saving} onClick={() => setForm(null)}><X className="w-5 h-5" /></button></div>
        <label className="block text-sm font-semibold">{form === 'sensors' ? 'Mã thiết bị' : 'Mã khu vực'}
          <input autoFocus required maxLength={32} pattern="[A-Z][A-Z0-9_-]{1,31}" value={code} onChange={event => setCode(event.target.value.toUpperCase())} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" placeholder={form === 'sensors' ? 'ENV02' : 'AREA002'} />
          <span className="block text-xs text-slate-400 font-normal mt-1">2–32 ký tự, chữ in hoa, số, dấu _ hoặc -. Bắt đầu bằng chữ.</span></label>
        <label className="block text-sm font-semibold">Tên hiển thị<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
        {form === 'sensors' && <>
          <label className="block text-sm font-semibold">Khu vực<select aria-label="Khu vực sensor" required value={areaId} onChange={event => setAreaId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"><option value="">Chọn khu vực</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
          <p className="text-xs text-slate-500">Sensor môi trường: nhiệt độ, độ ẩm không khí và độ ẩm đất. Đăng ký xong, thiết bị cần được cấu hình kết nối AWS bằng đúng mã này. Sensor sẽ chờ dữ liệu đến.</p>
        </>}
        {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setForm(null)} className="px-4 py-2 border rounded-lg">Hủy</button><button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu'}</button></div>
      </form>
    </div>}
  </div>;
};
