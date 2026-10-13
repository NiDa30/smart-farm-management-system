import React, { useEffect, useState } from 'react';
import { Activity, Clock, Database, Droplets, History, RefreshCw, Thermometer, WifiOff } from 'lucide-react';
import { fetchHistory, fetchLatest, telemetryState, type NetworkState, type TelemetryReading } from './telemetryApi';

const dateTime = (value: string) => new Date(value).toLocaleString('vi-VN');
const number = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

export const SensorRealtime: React.FC = () => {
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
          fetchLatest(controller.signal), fetchHistory(controller.signal),
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
  }, [refresh]);

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
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" /> Cảm biến thời gian thực
          </h1>
          <p className="text-sm text-slate-500 mt-1">Trang trại FARM001 · Thiết bị ENV01 · Dữ liệu cảm biến đã lưu</p>
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
