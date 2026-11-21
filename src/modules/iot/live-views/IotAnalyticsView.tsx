import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useLive } from './useLive';
import { parseAnalytics, successRate, hours, type Analytics, type Commands } from './liveApi';
import { DeviceStatisticsPanel } from '../devices/DeviceStatisticsPanel';

const CommandCard: React.FC<{ title: string; c: Commands }> = ({ title, c }) => {
  const rate = successRate(c);
  return <section aria-label={title} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
    <h2 className="font-semibold">{title}</h2>
    <p>{c.total} lệnh · thành công {rate === null ? '—' : `${rate}%`}</p>
    <p className="text-slate-600">Thất bại {c.failed} · hết hạn {c.timedOut} · chưa xác nhận gửi {c.uncertain}</p>
    {Object.keys(c.errors).length > 0 && <p className="text-slate-600">Lỗi: {Object.entries(c.errors).map(([k, v]) => `${k} ×${v}`).join(', ')}</p>}
  </section>;
};

/** Command reliability, automation activity, alerts and device runtime over a period. */
export const IotAnalyticsView: React.FC = () => {
  const [days, setDays] = useState(7);
  const { data, available, loaded } = useLive<Analytics>([`/api/v1/iot/analytics?days=${days}`], ([a]) => parseAnalytics(a), ['automation', 'commands', 'alerts'], 30000);
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><BarChart3 size={20} />Phân tích IoT</h1>
      <div className="flex gap-2 text-sm">{[1, 7, 30].map(d => <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}
        className={`rounded border px-2 py-1 ${days === d ? 'bg-emerald-700 text-white' : ''}`}>{d === 1 ? 'Hôm nay' : `${d} ngày`}</button>)}</div>
      <p role="status" className="text-sm text-slate-600">{!loaded ? 'Đang tải…' : !available ? 'Chưa đọc được phân tích từ backend.' : `Từ ${new Date(data!.from).toLocaleDateString('vi-VN')}`}</p>
      {data && <>
        <div className="grid gap-3 md:grid-cols-2">
          <CommandCard title="Lệnh bơm PUMP01" c={data.pump} />
          <CommandCard title="Lệnh actuator (van, quạt, đèn, phun sương)" c={data.actuators} />
        </div>
        <section aria-label="Tự động hóa" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">Tự động hóa</h2>
          <p>Lượt tưới theo độ ẩm: {data.wateringRuns} · tưới theo zone hoàn tất {data.sequencesCompleted}, dừng {data.sequencesAborted}</p>
          <p>Cảnh báo mới: cảm biến {data.alertsOpened.SENSOR}, trạm nước {data.alertsOpened.WATER}, sức khỏe thiết bị {data.alertsOpened.DEVICE_HEALTH}</p>
        </section>
        <section aria-label="Thời gian chạy" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">Thời gian chạy (thiết bị xác nhận)</h2>
          <ul>{data.runtime.map(r => <li key={r.actuatorId}>{r.actuatorId}: {hours(r.seconds)}</li>)}</ul>
        </section>
      </>}
      <DeviceStatisticsPanel />
    </div>
  );
};
