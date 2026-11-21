import React, { useState } from 'react';
import { Network, Radio, Server, Zap } from 'lucide-react';
import { useLive } from './useLive';
import { buildTopology, linkLabel, type Topology } from './liveApi';
import { parseNodes, metricLabels, type Metric } from '../nodes/nodeApi';
import { parseMonitoring } from '../devices/monitoringApi';
import { parseOverview } from '../actuators/actuatorApi';

const brokerLabel: Record<string, string> = { CONNECTED: 'Backend đang kết nối MQTT', DISCONNECTED: 'Backend mất kết nối MQTT', STARTING: 'Đang kết nối MQTT', STOPPED: 'MQTT đã dừng', DISABLED: 'MQTT tắt trên backend' };
const tone = (ok: boolean | null) => ok === null ? 'bg-slate-100 text-slate-600' : ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

/** Broker → nodes → channels/actuators, from the node registry and device reports only. */
export const TopologyView: React.FC = () => {
  const [now, setNow] = useState(Date.now());
  const { data, available, loaded } = useLive<Topology>(['/api/v1/nodes', '/api/v1/monitoring', '/api/v1/actuators'], ([n, m, a]) => {
    setNow(Date.now());
    return buildTopology(parseNodes(n), parseMonitoring(m), parseOverview(a), Date.now());
  }, ['nodes', 'monitoring', 'actuators', 'pump'], 5000);
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold"><Network size={20} />Sơ đồ mạng IoT</h1>
      <p role="status" className="text-sm text-slate-600">{!loaded ? 'Đang tải…' : !available ? 'Chưa đọc được sơ đồ từ backend; đang hiện dữ liệu cũ nếu có.' : `Cập nhật ${new Date(now).toLocaleTimeString('vi-VN')}`}</p>
      {data && (
        <>
          <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tone(data.broker === 'CONNECTED')}`} aria-label="MQTT broker">
            <Server size={16} />AWS IoT Core · {brokerLabel[data.broker] ?? data.broker}
          </div>
          <ul className="space-y-3 border-l-2 border-slate-200 pl-4">
            {data.nodes.map(node => (
              <li key={node.nodeId} aria-label={`Node ${node.nodeId}`} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2 font-medium"><Radio size={16} />{node.nodeId} · {node.name}
                  <span className={`rounded px-2 py-0.5 text-xs ${tone(node.link === 'CONNECTED' ? true : node.link === 'UNKNOWN' ? null : false)}`}>{linkLabel[node.link]}</span>
                  <span className="text-xs text-slate-500">{node.nodeType === 'WATER' ? 'Trạm nước' : 'Bộ điều khiển môi trường'} · khu {node.areaId}</span></div>
                {node.lastMessageAt && <p className="text-xs text-slate-500">Bản tin gần nhất: {new Date(node.lastMessageAt).toLocaleString('vi-VN')}</p>}
                {node.channels.length > 0 && <ul className="mt-2 grid gap-1 text-sm md:grid-cols-2">
                  {node.channels.map(c => <li key={c.channelId}>Kênh {c.channelId} · {metricLabels[c.metric as Metric] ?? c.metric}: {c.fresh ? String(c.value) : 'chưa có dữ liệu mới'}</li>)}
                </ul>}
                {node.actuators.length > 0 && <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                  {node.actuators.map(a => <li key={a.actuatorId} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${tone(a.state === 'UNKNOWN' ? null : !a.locked)}`}>
                    <Zap size={12} />{a.actuatorId}: {a.state === 'UNKNOWN' ? 'chưa xác định' : a.state}{a.locked ? ' · khóa' : ''}</li>)}
                </ul>}
              </li>
            ))}
          </ul>
          {data.nodes.length === 0 && <p className="text-sm text-slate-500">Chưa có node nào được đăng ký.</p>}
        </>
      )}
    </div>
  );
};
