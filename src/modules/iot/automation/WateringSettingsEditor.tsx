import React, { useEffect, useState } from 'react';
import { validSettings, type WateringSettings } from './wateringSettings';

type Field = Exclude<keyof WateringSettings, 'revision'>;
const fields: { key: Field; label: string; min: number; max: number }[] = [
  { key: 'dryThreshold', label: 'Ngưỡng đất khô (%)', min: 1, max: 90 },
  { key: 'wetThreshold', label: 'Ngưỡng tắt sớm (%)', min: 6, max: 100 },
  { key: 'durationSeconds', label: 'Thời gian bật tự động (giây)', min: 1, max: 30 },
  { key: 'cooldownSeconds', label: 'Khoảng nghỉ sau OFF (giây)', min: 60, max: 3600 },
];
type Draft = Record<Field, string>;
function draftOf(settings: WateringSettings): Draft {
  return Object.fromEntries(fields.map(({ key }) => [key, String(settings[key])])) as Draft;
}
interface Props {
  settings: WateringSettings;
  editable: boolean;
  sending: boolean;
  error: string;
  unconfirmed: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (settings: WateringSettings) => Promise<WateringSettings | null>;
  onReload: () => Promise<WateringSettings | null>;
}
export const WateringSettingsEditor: React.FC<Props> = ({ settings, editable, sending, error, unconfirmed, onDirty, onSave, onReload }) => {
  const [draft, setDraft] = useState(() => draftOf(settings));
  const [revision, setRevision] = useState(settings.revision);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    // Polling may refresh the saved version; never replace an unsaved draft.
    if (!dirty) { setDraft(draftOf(settings)); setRevision(settings.revision); }
  }, [settings, dirty]);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  const candidate = { ...Object.fromEntries(fields.map(({ key }) => [key, draft[key] === '' ? NaN : Number(draft[key])])), revision } as WateringSettings;
  const valid = validSettings(candidate);
  const conflict = dirty && revision !== settings.revision;
  const adopt = (confirmed: WateringSettings) => {
    setDraft(draftOf(confirmed)); setRevision(confirmed.revision); setDirty(false);
  };
  return <section className="bg-white border rounded-xl p-5 space-y-3" aria-label="Cài đặt tưới">
    <h2 className="font-semibold">Cài đặt tưới · phiên bản {settings.revision}</h2>
    <p className="text-sm">Tắt quy tắc và chờ lần chạy kết thúc để sửa. Cài đặt áp dụng cho lần tưới tiếp theo; không đổi mốc nghỉ đang có. Ngưỡng cảnh báo cảm biến được giữ riêng.</p>
    <form onSubmit={event => { event.preventDefault(); if (!editable || sending || !dirty || !valid || conflict || unconfirmed) return; void onSave(candidate).then(confirmed => { if (confirmed) { adopt(confirmed); setSaved(true); } }); }} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">{fields.map(({ key, label, min, max }) => <label key={key} className="text-sm space-y-1">
        <span className="block">{label}</span>
        <input type="number" min={min} max={max} step="1" required disabled={!editable || sending} value={draft[key]}
          onChange={event => { setDraft(current => ({ ...current, [key]: event.target.value })); setDirty(true); setSaved(false); }}
          className="border rounded px-3 py-2 w-full disabled:bg-slate-100" />
      </label>)}</div>
      <p className="text-sm text-slate-500">Hai mẫu mới liên tiếp, dữ liệu không quá 15 giây. Ngưỡng tắt sớm phải cao hơn ngưỡng đất khô ít nhất 5 điểm %. Bật 1–30 giây, nghỉ 60–3600 giây.</p>
      {dirty && <p className="text-amber-800">Có thay đổi chưa lưu; chưa thể bật quy tắc.</p>}
      {dirty && !valid && <p className="text-rose-700">Nhập số nguyên trong giới hạn và giữ khoảng cách ngưỡng ít nhất 5 điểm %.</p>}
      {conflict && <p role="alert" className="text-rose-700">Cài đặt đã thay đổi ở phiên khác. Tải lại trước khi sửa tiếp.</p>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {saved && !error && !dirty && <p className="text-emerald-700">Đã lưu cài đặt.</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={!editable || sending || !dirty || !valid || conflict || unconfirmed} className="bg-emerald-600 text-white rounded px-4 py-2 disabled:opacity-40">Lưu cài đặt</button>
        <button type="button" disabled={sending} onClick={() => { void onReload().then(confirmed => { if (confirmed) { adopt(confirmed); setSaved(false); } }); }} className="border rounded px-4 py-2 disabled:opacity-40">Tải lại cài đặt (bỏ thay đổi)</button>
      </div>
    </form>
  </section>;
};
