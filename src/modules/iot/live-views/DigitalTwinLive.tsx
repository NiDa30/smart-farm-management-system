import React from 'react';
import { Layers, Droplets, Thermometer, Waves } from 'lucide-react';
import { useLive } from './useLive';
import { parseRegistry, FRESHNESS_MS, type SensorArea, type SensorSummary } from '../realtime/telemetryApi';
import { parseMonitoring, type Monitoring } from '../devices/monitoringApi';
import { parseOverview, parseSequence, typeLabel, phaseLabel, type ActuatorOverview, type SequenceView } from '../actuators/actuatorApi';
import { parseNodes, tankState, tankLabels, type NodesSnapshot } from '../nodes/nodeApi';

interface Twin { areas: SensorArea[]; sensors: SensorSummary[]; monitoring: Monitoring; actuators: ActuatorOverview; sequence: SequenceView; nodes: NodesSnapshot; at: number }

const fmt = (v: number, unit: string) => `${Math.round(v * 10) / 10}${unit}`;

/** The farm as the devices last reported it: per area, sensors and actuators; nothing guessed. */
export const DigitalTwinLive: React.FC = () => {
  const { data, available, loaded } = useLive<Twin>(
    ['/api/v1/areas', '/api/v1/sensors', '/api/v1/monitoring', '/api/v1/actuators', '/api/v1/automation/zone-sequence', '/api/v1/nodes'],
    ([areas, sensors, m, a, s, n]) => ({ ...parseRegistry(areas, sensors), monitoring: parseMonitoring(m), actuators: parseOverview(a),
      sequence: parseSequence(s), nodes: parseNodes(n), at: Date.now() }),
    ['telemetry', 'actuators', 'automation', 'pump', 'nodes'], 5000);
  const pump = data?.monitoring.devices.find(d => d.deviceId === 'PUMP01');
  const pumpState = pump && pump.dataState === 'FRESH' && pump.reportedState ? pump.reportedState : 'UNKNOWN';
  const running = data?.sequence.current;
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Layers size={20} />Bản sao số (Digital Twin)</h1>
      <p role="status" className="text-sm text-slate-600">{!loaded ? 'Đang tải…' : !available ? 'Chưa đọc được trạng thái từ backend; đang hiện dữ liệu cũ nếu có.'
        : `Theo báo cáo gần nhất của thiết bị · ${new Date(data!.at).toLocaleTimeString('vi-VN')}`}</p>
      {data && <>
        <section aria-label="Hệ thống tưới" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Droplets size={16} />Hệ thống tưới</h2>
          <p className="text-sm">Bơm PUMP01: {pumpState === 'UNKNOWN' ? 'chưa xác định' : pumpState}{pump?.safetyLockout ? ' · đang khóa an toàn' : ''}</p>
          {data.nodes.nodes.filter(n => n.nodeType === 'WATER').map(n => <p key={n.nodeId} className="text-sm">Bồn {n.name}: {tankLabels[tankState(n, data.at)]}</p>)}
          <ul className="mt-2 grid gap-2 md:grid-cols-4">
            {data.actuators.actuators.filter(a => a.actuatorType === 'VALVE').map(v => (
              <li key={v.actuatorId} aria-label={`Zone ${v.zoneName}`} className={`rounded-lg border p-2 text-sm ${v.fresh && v.reportedState === 'ON' ? 'border-sky-400 bg-sky-50' : 'border-slate-200'}`}>
                <span className="font-medium">{v.zoneName}</span><br />{v.actuatorId}: {v.fresh ? v.reportedState : 'chưa xác định'}{v.safetyLockout ? ' · khóa' : ''}
              </li>))}
          </ul>
          {running && <p className="mt-2 text-sm">Đang tưới theo zone (lượt #{running.id}): bước {running.currentStep}/{running.steps.length} · {phaseLabel[running.steps[running.currentStep - 1]?.phase ?? 'WAITING']}</p>}
        </section>
        <div className="grid gap-3 md:grid-cols-2">
          {data.areas.map(area => {
            const sensors = data.sensors.filter(s => s.areaId === area.id);
            return (
              <section key={area.id} aria-label={`Khu ${area.name}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">{area.name}</h2>
                {sensors.length === 0 && <p className="text-sm text-slate-500">Chưa gắn cảm biến.</p>}
                {sensors.map(s => {
                  const fresh = !!s.latest && data.at - Date.parse(s.latest.receivedAt) <= FRESHNESS_MS;
                  return <div key={s.deviceId} className="mt-2 text-sm">
                    <p className="font-medium">{s.name} ({s.deviceId}) {!fresh && <span className="text-amber-700">· dữ liệu cũ hoặc chưa có</span>}</p>
                    {s.latest && <p className="flex flex-wrap gap-3 text-slate-700"><span><Thermometer size={12} className="inline" /> {fmt(s.latest.telemetry.temperature, '°C')}</span>
                      <span>Độ ẩm KK {fmt(s.latest.telemetry.humidity, '%')}</span><span><Waves size={12} className="inline" /> Đất {fmt(s.latest.telemetry.soilMoisture, '%')}</span></p>}
                  </div>;
                })}
              </section>);
          })}
        </div>
        <section aria-label="Vi khí hậu" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Quạt, đèn, phun sương</h2>
          <ul className="mt-1 flex flex-wrap gap-3 text-sm">
            {data.actuators.actuators.filter(a => a.actuatorType !== 'VALVE').map(a => <li key={a.actuatorId}>{typeLabel[a.actuatorType]} {a.actuatorId}: {a.fresh ? a.reportedState : 'chưa xác định'}{a.safetyLockout ? ' · khóa' : ''}</li>)}
          </ul>
        </section>
      </>}
    </div>
  );
};
