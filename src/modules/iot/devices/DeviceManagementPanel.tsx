import React, { useEffect, useState } from 'react';
import { createLiveLoop } from '../live/iotLive';
import { Settings as SettingsIcon, UploadCloud } from 'lucide-react';
import { parseConfig, parseOta, settingsError, configStateLabel, otaStateLabel, errorLabel, OTA_ACTIVE,
  type ConfigView, type OtaView, type Settings } from './deviceApi';

const FIELDS: { key: keyof Settings; label: string; unit: string }[] = [
  { key: 'telemetrySeconds', label: 'Chu kỳ gửi dữ liệu', unit: 'giây' },
  { key: 'heartbeatSeconds', label: 'Chu kỳ heartbeat', unit: 'giây' },
  { key: 'soilWetAdc', label: 'ADC đất ướt', unit: '' },
  { key: 'soilDryAdc', label: 'ADC đất khô', unit: '' },
  { key: 'pumpMaxSeconds', label: 'Giới hạn bơm mỗi lệnh', unit: 'giây' },
];

async function getJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}
async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(response.status === 409 ? 'Thiết bị chưa sẵn sàng: cần mọi bơm/van tắt, không chạy tưới theo zone, quy tắc tưới tắt, không còn yêu cầu chờ.'
    : response.status === 403 ? 'Backend chưa bật quản lý thiết bị hoặc chưa có khóa OTA.' : response.status === 400 ? 'Dữ liệu không hợp lệ.'
    : response.status === 503 ? 'MQTT chưa kết nối.' : 'Chưa xác nhận gửi; xem lịch sử trước khi thử lại.');
  return response.json();
}

/** ENV01 remote configuration (with device ACK) and signed firmware updates. */
export const DeviceManagementPanel: React.FC = () => {
  const [config, setConfig] = useState<ConfigView | null>(null);
  const [ota, setOta] = useState<OtaView | null>(null);
  const [available, setAvailable] = useState(false);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true; let controller: AbortController | undefined;
    const loop = createLiveLoop(['devices', 'monitoring'], 5000);
    const poll = async () => {
      controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 5000);
      try {
        const [c, o] = await Promise.all([getJson('/api/v1/devices/ENV01/config', controller.signal), getJson('/api/v1/devices/ENV01/ota', controller.signal)]);
        const parsed = { c: parseConfig(c), o: parseOta(o) };
        if (active) { setConfig(parsed.c); setOta(parsed.o); setAvailable(true); setDraft(d => d ?? parsed.c.device?.settings ?? null); }
      } catch { if (active) setAvailable(false); }
      finally { clearTimeout(timeout); if (active) loop.next(poll); }
    };
    void poll();
    return () => { active = false; loop.dispose(); controller?.abort(); };
  }, [refresh]);

  const device = config?.device ?? null;
  const pendingConfig = config?.requests.some(r => ['PENDING', 'SENT', 'PUBLISH_UNCERTAIN'].includes(r.state)) ?? false;
  const activeJob = ota?.jobs.find(j => OTA_ACTIVE.includes(j.state)) ?? null;
  const draftError = draft ? settingsError(draft) : 'Chưa có cấu hình thiết bị.';

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi.'); }
    finally { setBusy(false); setRefresh(r => r + 1); }
  };

  return (
    <div className="space-y-6">
      <p role="status" className="text-sm text-slate-600">
        {!available ? 'Chưa đọc được trạng thái quản lý thiết bị từ backend.'
          : !config?.enabled ? 'Backend chưa bật quản lý thiết bị (SMARTFARM_DEVMGMT_ENABLED); chỉ xem.'
          : device ? `ENV01 chạy firmware ${device.firmwareVersion} (${device.partition}), cấu hình revision ${device.revision}${device.otaTrial ? ', đang khởi động thử bản mới' : ''}.`
          : 'ENV01 chưa báo cấu hình (firmware chưa bật FARM_DEVMGMT_ENABLED hoặc đang offline).'}
      </p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <section aria-label="Cấu hình từ xa" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><SettingsIcon size={18} />Cấu hình từ xa</h2>
        <p className="text-xs text-slate-500">Thiết bị áp dụng toàn bộ hoặc không gì cả, chỉ nhận revision mới hơn, rồi gửi ACK. Giới hạn bơm chỉ được giảm, không vượt mức biên dịch.</p>
        {draft && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {FIELDS.map(f => (
              <label key={f.key} className="text-sm">{f.label}{f.unit && ` (${f.unit})`}
                <input type="number" aria-label={f.label} value={draft[f.key]} onChange={e => setDraft(d => d && ({ ...d, [f.key]: Number(e.target.value) }))}
                  className="ml-2 w-24 rounded border px-1" />
                {device && device.settings[f.key] !== draft[f.key] && <span className="ml-2 text-xs text-amber-700">thiết bị: {device.settings[f.key]}</span>}
              </label>
            ))}
          </div>
        )}
        {draft && draftError && <p className="mt-2 text-sm text-amber-700">{draftError}</p>}
        <button type="button" disabled={!available || !config?.enabled || !device || busy || pendingConfig || !!draftError}
          onClick={() => run(() => post('/api/v1/devices/ENV01/config', draft))}
          className="mt-3 rounded bg-emerald-700 px-3 py-1 text-sm text-white disabled:opacity-40">Gửi cấu hình</button>
        {pendingConfig && <p className="mt-2 text-sm text-amber-700">Đang chờ ACK của yêu cầu trước.</p>}
        <h3 className="mt-4 text-sm font-semibold">Yêu cầu gần đây</h3>
        <ul className="text-sm">
          {config?.requests.map(r => <li key={r.configId}>Revision {r.revision}: {configStateLabel[r.state]}{errorLabel(r.errorCode)}</li>)}
        </ul>
      </section>

      <section aria-label="Cập nhật firmware OTA" className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><UploadCloud size={18} />Cập nhật firmware (OTA)</h2>
        <p className="text-xs text-slate-500">Bản firmware phải có chữ ký ECDSA hợp lệ. Thiết bị chỉ cập nhật khi mọi relay đang tắt, kiểm SHA-256 và chữ ký trước khi đổi phân vùng, rồi tự quay về bản cũ nếu bản mới không kết nối ổn định trong 2 phút hoặc khởi động lỗi 3 lần.</p>
        {ota && !ota.signingKeyConfigured && <p className="text-sm text-amber-700">Backend chưa có khóa công khai OTA (SMARTFARM_OTA_PUBLIC_KEY).</p>}
        {activeJob ? (
          <p className="mt-2 text-sm">Đang cập nhật {activeJob.fromVersion ?? '?'} → {activeJob.version}: {otaStateLabel[activeJob.state]}{activeJob.progress !== null ? ` ${activeJob.progress}%` : ''}</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <label>Bản firmware <select aria-label="Bản firmware" value={version} onChange={e => setVersion(e.target.value)} className="rounded border px-1">
              <option value="">— chọn —</option>
              {ota?.releases.map(r => <option key={r.version} value={r.version} disabled={r.version === device?.firmwareVersion}>{r.version}{r.version === device?.firmwareVersion ? ' (đang chạy)' : ''}</option>)}
            </select></label>
            <button type="button" disabled={!available || !ota?.enabled || !ota.signingKeyConfigured || !device || device.otaTrial || !version || busy}
              onClick={() => run(() => post('/api/v1/devices/ENV01/ota/jobs', { version }))}
              className="rounded bg-emerald-700 px-3 py-1 text-white disabled:opacity-40">Cập nhật ENV01</button>
          </div>
        )}
        <h3 className="mt-4 text-sm font-semibold">Lịch sử OTA</h3>
        <ul className="text-sm">
          {ota?.jobs.map(j => <li key={j.otaId}>{j.fromVersion ?? '?'} → {j.version}: {otaStateLabel[j.state]}{errorLabel(j.errorCode)}</li>)}
        </ul>
      </section>
    </div>
  );
};
