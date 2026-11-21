import React from 'react';
import { Cpu } from 'lucide-react';
import { useLive } from './useLive';
import { parseMonitoring, currentDataState, type Monitoring } from '../devices/monitoringApi';
import { parseConfig, parseOta, otaStateLabel, OTA_ACTIVE, type ConfigView, type OtaView } from '../devices/deviceApi';
import { parseHealthAlerts, healthAlertTitle, type HealthAlert } from '../alerts/healthAlertApi';

interface Edge { monitoring: Monitoring; config: ConfigView; ota: OtaView; alerts: HealthAlert[]; at: number }
const dataLabel: Record<string, string> = { FRESH: 'Dữ liệu mới', STALE: 'Dữ liệu cũ', EMPTY: 'Chưa có dữ liệu', CLOCK_SKEW: 'Lệch đồng hồ' };

/** Controller health as reported: link, firmware/partition, config revision, trial boot, open health alerts. */
export const EdgeStatus: React.FC = () => {
  const { data, available, loaded } = useLive<Edge>(['/api/v1/monitoring', '/api/v1/devices/ENV01/config', '/api/v1/devices/ENV01/ota', '/api/v1/health-alerts'],
    ([m, c, o, h]) => ({ monitoring: parseMonitoring(m), config: parseConfig(c), ota: parseOta(o), alerts: parseHealthAlerts(h), at: Date.now() }),
    ['monitoring', 'devices'], 5000);
  const device = data?.config.device;
  const activeJob = data?.ota.jobs.find(j => OTA_ACTIVE.includes(j.state));
  const open = data?.alerts.filter(a => a.clearedAt === null) ?? [];
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Cpu size={20} />Trạng thái Edge (bộ điều khiển)</h1>
      <p role="status" className="text-sm text-slate-600">{!loaded ? 'Đang tải…' : !available ? 'Chưa đọc được trạng thái Edge từ backend.' : `MQTT backend: ${data!.monitoring.mqtt.state}`}</p>
      {data && <>
        <section aria-label="ENV01" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">ENV01</h2>
          {device ? <ul className="mt-1 space-y-1">
            <li>Firmware {device.firmwareVersion} · phân vùng {device.partition}{device.otaTrial ? ' · đang khởi động thử bản mới' : ''}</li>
            <li>Cấu hình revision {device.revision} · gửi mỗi {device.settings.telemetrySeconds} s · heartbeat {device.settings.heartbeatSeconds} s · giới hạn bơm {device.settings.pumpMaxSeconds} s</li>
            <li>Báo cấu hình lúc {new Date(device.observedAt).toLocaleString('vi-VN')}</li>
          </ul> : <p>ENV01 chưa báo cấu hình/firmware (quản lý thiết bị chưa bật hoặc thiết bị offline).</p>}
          {activeJob && <p className="mt-1 text-amber-700">Đang OTA {activeJob.fromVersion ?? '?'} → {activeJob.version}: {otaStateLabel[activeJob.state]}</p>}
        </section>
        <section aria-label="Kết nối thiết bị" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Kết nối thiết bị</h2>
          <table className="mt-2 w-full text-left text-sm"><thead><tr><th>Thiết bị</th><th>Dữ liệu</th><th>Bản tin gần nhất</th></tr></thead><tbody>
            {data.monitoring.devices.map(d => <tr key={d.deviceId} className="border-t"><td className="py-1">{d.deviceId}</td>
              <td>{dataLabel[currentDataState(d, data.at)] ?? d.dataState}</td><td>{d.lastMessageAt ? new Date(d.lastMessageAt).toLocaleString('vi-VN') : '—'}</td></tr>)}
          </tbody></table>
        </section>
        <section aria-label="Cảnh báo sức khỏe" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">Cảnh báo sức khỏe đang mở</h2>
          {open.length === 0 ? <p>Không có.</p> : <ul>{open.map(a => <li key={a.id}>{healthAlertTitle(a)}</li>)}</ul>}
        </section>
      </>}
    </div>
  );
};
