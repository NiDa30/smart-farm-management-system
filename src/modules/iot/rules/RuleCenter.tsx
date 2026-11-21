import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, FlaskConical } from 'lucide-react';
import { useLive } from '../live-views/useLive';
import { parseNodes } from '../nodes/nodeApi';
import { parseOverview } from '../actuators/actuatorApi';
import { parseRules, parseRuns, parseSimulation, definitionError, blankDefinition, outcomeLabel, skipLabel, comparatorLabel, send,
  type Catalog, type Definition, type Group, type Leaf, type Action, type Rule, type RulesView, type Run, type Simulation, type Comparator } from './ruleApi';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const input = 'rounded border px-1';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function newLeaf(type: Leaf['type'], c: Catalog): Leaf {
  if (type === 'TIME') return { type, start: '06:00', end: '18:00', days: [1, 2, 3, 4, 5, 6, 7] };
  if (type === 'ACTUATOR_STATE') return { type, actuatorId: c.actuators[0]?.actuatorId ?? 'PUMP01', state: 'OFF' };
  const ch = c.channels.find(x => x.metric !== 'WATER_PRESENT') ?? c.channels[0];
  return ch?.metric === 'WATER_PRESENT' ? { type: 'SENSOR', nodeId: ch.nodeId, channelId: ch.channelId, comparator: 'EQ', value: true, forSeconds: 0 }
    : { type: 'SENSOR', nodeId: ch?.nodeId ?? '', channelId: ch?.channelId ?? '', comparator: 'GT', value: 0, forSeconds: 60 };
}

const LeafEditor: React.FC<{ leaf: Leaf; c: Catalog; onChange: (l: Leaf) => void; label: string }> = ({ leaf, c, onChange, label }) => {
  if (leaf.type === 'SENSOR') {
    const ch = c.channels.find(x => x.nodeId === leaf.nodeId && x.channelId === leaf.channelId);
    const bool = ch?.metric === 'WATER_PRESENT';
    return <span className="flex flex-wrap items-center gap-1">
      <select aria-label={`${label} kênh`} className={input} value={`${leaf.nodeId}/${leaf.channelId}`} onChange={e => {
        const [nodeId, channelId] = e.target.value.split('/'); const m = c.channels.find(x => x.nodeId === nodeId && x.channelId === channelId)?.metric;
        onChange(m === 'WATER_PRESENT' ? { ...leaf, nodeId, channelId, comparator: 'EQ', value: true } : { ...leaf, nodeId, channelId, comparator: leaf.comparator === 'EQ' ? 'GT' : leaf.comparator, value: typeof leaf.value === 'number' ? leaf.value : 0 });
      }}>{c.channels.map(x => <option key={`${x.nodeId}/${x.channelId}`} value={`${x.nodeId}/${x.channelId}`}>{x.nodeId}/{x.channelId} ({x.metric})</option>)}</select>
      {bool ? <select aria-label={`${label} giá trị`} className={input} value={String(leaf.value)} onChange={e => onChange({ ...leaf, value: e.target.value === 'true' })}>
        <option value="true">có nước</option><option value="false">cạn</option></select>
        : <><select aria-label={`${label} so sánh`} className={input} value={leaf.comparator} onChange={e => onChange({ ...leaf, comparator: e.target.value as Comparator })}>
          {(['GT', 'GTE', 'LT', 'LTE'] as Comparator[]).map(k => <option key={k} value={k}>{comparatorLabel[k]}</option>)}</select>
          <input aria-label={`${label} ngưỡng`} type="number" className={`${input} w-20`} value={Number(leaf.value)} onChange={e => onChange({ ...leaf, value: Number(e.target.value) })} /></>}
      giữ <input aria-label={`${label} giữ giây`} type="number" className={`${input} w-16`} value={leaf.forSeconds} onChange={e => onChange({ ...leaf, forSeconds: Number(e.target.value) })} /> giây
    </span>;
  }
  if (leaf.type === 'TIME') return <span className="flex flex-wrap items-center gap-1">
    từ <input aria-label={`${label} bắt đầu`} type="time" className={input} value={leaf.start} onChange={e => onChange({ ...leaf, start: e.target.value })} />
    đến <input aria-label={`${label} kết thúc`} type="time" className={input} value={leaf.end} onChange={e => onChange({ ...leaf, end: e.target.value })} />
    {DAYS.map((d, i) => <label key={d} className="text-xs"><input type="checkbox" checked={leaf.days.includes(i + 1)}
      onChange={e => onChange({ ...leaf, days: e.target.checked ? [...leaf.days, i + 1].sort() : leaf.days.filter(x => x !== i + 1) })} />{d}</label>)}
  </span>;
  return <span className="flex items-center gap-1">
    <select aria-label={`${label} thiết bị`} className={input} value={leaf.actuatorId} onChange={e => onChange({ ...leaf, actuatorId: e.target.value })}>
      {['PUMP01', ...c.actuators.map(a => a.actuatorId)].map(a => <option key={a}>{a}</option>)}</select> đang
    <select aria-label={`${label} trạng thái`} className={input} value={leaf.state} onChange={e => onChange({ ...leaf, state: e.target.value as 'ON' | 'OFF' })}><option>ON</option><option>OFF</option></select>
  </span>;
};

const GroupEditor: React.FC<{ group: Group; c: Catalog; nested?: boolean; onChange: (g: Group) => void; path: string }> = ({ group, c, nested, onChange, path }) => {
  const set = (i: number, item: Leaf | Group) => onChange({ ...group, items: group.items.map((x, k) => k === i ? item : x) });
  return <div className={`space-y-2 ${nested ? 'ml-4 border-l-2 border-sky-200 pl-3' : ''}`}>
    <select aria-label={`Nhóm ${path}`} className={input} value={group.op} onChange={e => onChange({ ...group, op: e.target.value as 'ALL' | 'ANY' })}>
      <option value="ALL">Tất cả điều kiện (AND)</option><option value="ANY">Một trong các điều kiện (OR)</option></select>
    {group.items.map((item, i) => <div key={i} className="flex items-start gap-2 text-sm">
      {'op' in item ? <GroupEditor group={item} c={c} nested onChange={g => set(i, g)} path={`${path}.${i + 1}`} />
        : <LeafEditor leaf={item} c={c} onChange={l => set(i, l)} label={`Điều kiện ${path}.${i + 1}`} />}
      <button type="button" aria-label={`Xóa ${path}.${i + 1}`} onClick={() => onChange({ ...group, items: group.items.filter((_, k) => k !== i) })}><Trash2 size={14} /></button>
    </div>)}
    <div className="flex flex-wrap gap-2 text-xs">
      <button type="button" className="underline" onClick={() => onChange({ ...group, items: [...group.items, newLeaf('SENSOR', c)] })}>+ Cảm biến</button>
      <button type="button" className="underline" onClick={() => onChange({ ...group, items: [...group.items, newLeaf('TIME', c)] })}>+ Khung giờ</button>
      <button type="button" className="underline" onClick={() => onChange({ ...group, items: [...group.items, newLeaf('ACTUATOR_STATE', c)] })}>+ Trạng thái thiết bị</button>
      {!nested && <button type="button" className="underline" onClick={() => onChange({ ...group, items: [...group.items, { op: 'ANY', items: [] }] })}>+ Nhóm con</button>}
    </div>
  </div>;
};

const ActionsEditor: React.FC<{ actions: Action[]; c: Catalog; onChange: (a: Action[]) => void }> = ({ actions, c, onChange }) => {
  const v3 = c.actuators; const valves = v3.filter(a => a.actuatorType === 'VALVE');
  const set = (i: number, a: Action) => onChange(actions.map((x, k) => k === i ? a : x));
  return <div className="space-y-2 text-sm">
    {actions.map((a, i) => <div key={i} className="flex flex-wrap items-center gap-2" aria-label={`Hành động ${i + 1}`}>
      <span>{i + 1}.</span>
      {a.type === 'ACTUATOR' ? <>
        <select aria-label={`Hành động ${i + 1} thiết bị`} className={input} value={a.actuatorId} onChange={e => set(i, { ...a, actuatorId: e.target.value })}>{v3.map(x => <option key={x.actuatorId}>{x.actuatorId}</option>)}</select>
        <select aria-label={`Hành động ${i + 1} lệnh`} className={input} value={a.action} onChange={e => set(i, e.target.value === 'ON' ? { ...a, action: 'ON', durationSeconds: 600 } : { type: 'ACTUATOR', actuatorId: a.actuatorId, action: 'OFF' })}><option value="ON">Bật</option><option value="OFF">Tắt</option></select>
        {a.action === 'ON' && <>trong <input aria-label={`Hành động ${i + 1} giây`} type="number" className={`${input} w-20`} value={a.durationSeconds} onChange={e => set(i, { ...a, durationSeconds: Number(e.target.value) })} /> giây</>}
      </> : <>Tưới theo zone: {a.zones.map((z, k) => <span key={k} className="inline-flex items-center gap-1">
        <select aria-label={`Zone ${k + 1}`} className={input} value={z.valveId} onChange={e => set(i, { ...a, zones: a.zones.map((x, j) => j === k ? { ...x, valveId: e.target.value } : x) })}>{valves.map(v => <option key={v.actuatorId}>{v.actuatorId}</option>)}</select>
        <input aria-label={`Zone ${k + 1} giây bơm`} type="number" className={`${input} w-16`} value={z.pumpSeconds} onChange={e => set(i, { ...a, zones: a.zones.map((x, j) => j === k ? { ...x, pumpSeconds: Number(e.target.value) } : x) })} />s</span>)}
        <button type="button" className="text-xs underline" onClick={() => set(i, { ...a, zones: [...a.zones, { valveId: valves[0]?.actuatorId ?? '', pumpSeconds: 120 }] })}>+ zone</button></>}
      <button type="button" aria-label={`Xóa hành động ${i + 1}`} onClick={() => onChange(actions.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
    </div>)}
    <div className="flex gap-2 text-xs">
      <button type="button" className="underline" onClick={() => onChange([...actions.filter(a => a.type === 'ACTUATOR'), { type: 'ACTUATOR', actuatorId: v3.find(a => a.actuatorType !== 'VALVE')?.actuatorId ?? v3[0]?.actuatorId ?? '', action: 'ON', durationSeconds: 600 }, ...actions.filter(a => a.type === 'ZONE_SEQUENCE')])}>+ Bật/tắt thiết bị</button>
      {!actions.some(a => a.type === 'ZONE_SEQUENCE') && <button type="button" className="underline" onClick={() => onChange([...actions, { type: 'ZONE_SEQUENCE', zones: [{ valveId: valves[0]?.actuatorId ?? '', pumpSeconds: 120 }] }])}>+ Tưới theo zone (bơm)</button>}
    </div>
  </div>;
};

interface Data { view: RulesView; runs: Run[]; catalog: Catalog }

/** Rule list + general rule builder (AND/OR conditions, ordered actions), simulation, history. */
export const RuleCenter: React.FC = () => {
  const [refresh, setRefresh] = useState(0);
  const { data, available, loaded } = useLive<Data>(['/api/v1/automation/rules', '/api/v1/automation/rules/runs', '/api/v1/nodes', '/api/v1/actuators'],
    ([r, runs, n, a]) => ({ view: parseRules(r), runs: parseRuns(runs),
      catalog: { channels: parseNodes(n).nodes.flatMap(x => x.channels.map(ch => ({ nodeId: x.nodeId, channelId: ch.channelId, metric: ch.metric }))),
        actuators: parseOverview(a).actuators.map(x => ({ actuatorId: x.actuatorId, actuatorType: x.actuatorType, maxSeconds: x.maxSeconds })) } }),
    ['automation', 'actuators'], 5000, refresh);
  const [editing, setEditing] = useState<{ id: number | null; name: string; definition: Definition } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [hours, setHours] = useState(24);
  const catalog = data?.catalog;
  const problem = editing && catalog ? (editing.name.trim() ? definitionError(editing.definition, catalog) : 'Đặt tên quy tắc.') : null;

  const act = async (job: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await job(); } catch (e) { setError(e instanceof Error ? e.message : 'Lỗi.'); }
    finally { setBusy(false); setRefresh(r => r + 1); }
  };
  const save = () => act(async () => {
    const body = { name: editing!.name.trim(), definition: editing!.definition };
    await send(editing!.id === null ? '/api/v1/automation/rules' : `/api/v1/automation/rules/${editing!.id}`, editing!.id === null ? 'POST' : 'PUT', body);
    setEditing(null); setSimulation(null);
  });
  const simulate = () => act(async () => { setSimulation(parseSimulation(await send('/api/v1/automation/rules/simulation', 'POST', { definition: editing!.definition, hours }))); });
  const describe = (r: Rule) => r.lastOutcome === null ? 'chưa đánh giá' : `${outcomeLabel[r.lastOutcome]}${r.lastSkip ? ` · không chạy: ${skipLabel[r.lastSkip] ?? r.lastSkip}` : ''}`;

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Sparkles size={20} />Quy tắc tự động hóa</h1>
      <p role="status" className="text-sm text-slate-600">{!loaded ? 'Đang tải…' : !available ? 'Chưa đọc được quy tắc từ backend.'
        : data!.view.enabled ? 'Bộ máy quy tắc đang hoạt động (đánh giá mỗi 5 giây khi có kết nối MQTT).' : 'Backend chưa bật điều khiển actuator; quy tắc không chạy.'}</p>
      <p className="text-xs text-slate-500">Quy tắc chỉ chạy khi điều kiện chắc chắn Đúng (thiếu hoặc cũ dữ liệu thì không làm gì), sau thời gian nghỉ, dưới giới hạn số lần/ngày, và không ai vừa điều khiển tay. Bơm chỉ chạy qua tưới theo zone; hai quy tắc đang bật không được điều khiển cùng một thiết bị.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {data && !editing && <section aria-label="Danh sách quy tắc" className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex justify-between"><h2 className="font-semibold">Danh sách</h2>
          <button type="button" disabled={!available} onClick={() => { setEditing({ id: null, name: '', definition: blankDefinition() }); setSimulation(null); }}
            className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-sm text-white disabled:opacity-40"><Plus size={14} />Quy tắc mới</button></div>
        <table className="mt-2 w-full text-left text-sm"><thead><tr><th>Tên</th><th>Thiết bị</th><th>Lần đánh giá gần nhất</th><th>Hôm nay</th><th /></tr></thead><tbody>
          <tr className="border-t text-slate-600"><td className="py-1">{data.view.wateringRule.name}</td><td>PUMP01</td><td>{data.view.wateringRule.enabled ? 'đang bật' : 'đang tắt'} · cấu hình ở trang Tưới tự động</td><td>—</td><td /></tr>
          {data.view.rules.map(r => <tr key={r.id} aria-label={`Quy tắc ${r.name}`} className="border-t">
            <td className="py-1">{r.name} <span className="text-xs text-slate-500">rev {r.revision}</span></td><td>{r.targets.join(', ')}</td><td>{describe(r)}</td><td>{r.runsToday}/{r.definition.maxRunsPerDay}</td>
            <td className="space-x-2 whitespace-nowrap">
              <label className="text-xs"><input type="checkbox" aria-label={`Bật ${r.name}`} checked={r.enabled} disabled={busy} onChange={e => act(() => send(`/api/v1/automation/rules/${r.id}/enabled`, 'PUT', { enabled: e.target.checked }))} /> bật</label>
              <button type="button" className="underline" onClick={() => { setEditing({ id: r.id, name: r.name, definition: clone(r.definition) }); setSimulation(null); }}>Sửa</button>
              <button type="button" className="underline text-red-700" disabled={busy} onClick={() => { if (window.confirm(`Xóa quy tắc "${r.name}"?`)) void act(() => send(`/api/v1/automation/rules/${r.id}`, 'DELETE')); }}>Xóa</button>
            </td></tr>)}
        </tbody></table>
      </section>}

      {editing && catalog && <section aria-label="Bộ dựng quy tắc" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">{editing.id === null ? 'Quy tắc mới' : 'Sửa quy tắc'}</h2>
        <label className="block text-sm">Tên <input aria-label="Tên quy tắc" className={`${input} w-72`} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
        <div><h3 className="text-sm font-semibold">Khi</h3>
          <GroupEditor group={editing.definition.conditions} c={catalog} path="1" onChange={g => setEditing({ ...editing, definition: { ...editing.definition, conditions: g } })} /></div>
        <div><h3 className="text-sm font-semibold">Thì (theo thứ tự)</h3>
          <ActionsEditor actions={editing.definition.actions} c={catalog} onChange={a => setEditing({ ...editing, definition: { ...editing.definition, actions: a } })} /></div>
        <div className="flex flex-wrap gap-3 text-sm">
          <label>Nghỉ giữa hai lần <input aria-label="Thời gian nghỉ phút" type="number" className={`${input} w-20`} value={editing.definition.cooldownSeconds / 60}
            onChange={e => setEditing({ ...editing, definition: { ...editing.definition, cooldownSeconds: Math.round(Number(e.target.value) * 60) } })} /> phút</label>
          <label>Tối đa <input aria-label="Số lần mỗi ngày" type="number" className={`${input} w-16`} value={editing.definition.maxRunsPerDay}
            onChange={e => setEditing({ ...editing, definition: { ...editing.definition, maxRunsPerDay: Number(e.target.value) } })} /> lần/ngày</label>
          <label>Tạm dừng sau điều khiển tay <input aria-label="Tạm dừng phút" type="number" className={`${input} w-16`} value={editing.definition.manualHoldSeconds / 60}
            onChange={e => setEditing({ ...editing, definition: { ...editing.definition, manualHoldSeconds: Math.round(Number(e.target.value) * 60) } })} /> phút</label>
        </div>
        {problem && <p className="text-sm text-amber-700">{problem}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!!problem || busy} onClick={save} className="rounded bg-emerald-700 px-3 py-1 text-sm text-white disabled:opacity-40">Lưu (quy tắc mới để tắt)</button>
          <button type="button" disabled={!!problem || busy} onClick={simulate} className="inline-flex items-center gap-1 rounded border px-3 py-1 text-sm disabled:opacity-40"><FlaskConical size={14} />Mô phỏng</button>
          <select aria-label="Số giờ mô phỏng" className={input} value={hours} onChange={e => setHours(Number(e.target.value))}>{[6, 24, 72].map(h => <option key={h} value={h}>{h} giờ qua</option>)}</select>
          <button type="button" className="text-sm underline" onClick={() => { setEditing(null); setSimulation(null); setError(''); }}>Hủy</button>
        </div>
        {simulation && <div role="region" aria-label="Kết quả mô phỏng" className="rounded bg-slate-50 p-2 text-sm">
          Trong {simulation.hours} giờ qua: quy tắc sẽ chạy {simulation.fires.length}{simulation.truncated ? '+' : ''} lần · điều kiện Đúng {simulation.trueMinutes} phút, Sai {simulation.falseMinutes} phút, chưa đủ dữ liệu {simulation.unknownMinutes} phút.
          {simulation.fires.length > 0 && <ul className="mt-1 text-xs">{simulation.fires.slice(0, 10).map(f => <li key={f}>{new Date(f).toLocaleString('vi-VN')}</li>)}</ul>}
          <p className="text-xs text-slate-500">Mô phỏng dùng dữ liệu đã lưu, không gửi lệnh.</p>
        </div>}
      </section>}

      {data && <section aria-label="Lịch sử chạy quy tắc" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h2 className="font-semibold">Lịch sử chạy</h2>
        {data.runs.length === 0 ? <p className="text-slate-500">Chưa có lượt nào.</p> : <ul>{data.runs.map(r => <li key={r.id}>
          {new Date(r.firedAt).toLocaleString('vi-VN')} · {r.ruleName} (rev {r.ruleRevision}) · {r.result === 'FIRED' ? 'đã gửi lệnh' : r.result === 'PARTIAL' ? 'gửi một phần' : 'bị từ chối'} · {r.detail}</li>)}</ul>}
      </section>}
    </div>
  );
};
