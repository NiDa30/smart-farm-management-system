import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Cloud,
  Cpu,
  Layers,
  Network,
  Radio,
  RefreshCw,
  Server,
  Wifi,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { TopologyNode } from '../../../types';

export const IoTTopology: React.FC = () => {
  const { topologyNodes, iotDevices, navigate } = useApp();

  const [selectedNodeId, setSelectedNodeId] = useState<string>('GW-ESP32-01');

  const selectedNode = topologyNodes.find((n) => n.id === selectedNodeId);

  // Group nodes by gateway
  const gateways = topologyNodes.filter((n) => n.type === 'GATEWAY');
  const getSubNodes = (gwId: string) =>
    topologyNodes.filter((n) => n.parentId === gwId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-600" />
            <span>Sơ đồ Cấu trúc Mạng IoT (Network Topology Graph)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trực quan hóa luồng truyền dữ liệu từ Cảm biến thực địa → Trạm Gateway LoRaWAN/4G → EMQX Broker → Máy chủ Cloud
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="flex items-center gap-1 font-mono text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
            </span>
            <span className="flex items-center gap-1 font-mono text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Warning
            </span>
            <span className="flex items-center gap-1 font-mono text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Error
            </span>
            <span className="flex items-center gap-1 font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span> Offline
            </span>
          </div>
        </div>
      </div>

      {/* Visual Network Hierarchy Canvas */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 text-white shadow-xl space-y-8 overflow-x-auto">
        {/* Level 1: Cloud & MQTT Broker */}
        <div className="flex flex-col items-center space-y-3">
          <div
            onClick={() => setSelectedNodeId('cloud-01')}
            className="cursor-pointer p-4 rounded-xl border border-cyan-500/60 bg-cyan-950/40 text-center w-72 hover:border-cyan-400 transition-all shadow-lg shadow-cyan-900/20"
          >
            <Cloud className="w-8 h-8 text-cyan-400 mx-auto mb-1" />
            <div className="font-bold text-xs text-cyan-200">Smart Farm Cloud Platform</div>
            <div className="text-[10px] text-slate-400 font-mono">103.142.26.88 (REST / WS)</div>
          </div>

          <div className="w-0.5 h-6 bg-cyan-500/50" />

          <div
            onClick={() => setSelectedNodeId('broker-01')}
            className="cursor-pointer p-3 rounded-lg border border-indigo-500/60 bg-indigo-950/40 text-center w-64 hover:border-indigo-400 transition-all"
          >
            <Server className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
            <div className="font-bold text-xs text-indigo-200">EMQX Enterprise MQTT Broker</div>
            <div className="text-[10px] text-slate-400 font-mono">Port 8883 (SSL/TLS Active)</div>
          </div>

          <div className="w-0.5 h-6 bg-indigo-500/50" />
        </div>

        {/* Level 2: Gateways Row */}
        <div>
          <div className="text-center mb-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
              — LỚP TRẠM GATEWAY THU PHÁT THỰC ĐỊA (FIELD GATEWAY LAYER) —
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {gateways.map((gw) => {
              const isSelected = gw.id === selectedNodeId;
              const subNodes = getSubNodes(gw.id);
              return (
                <div key={gw.id} className="space-y-4">
                  {/* Gateway Box */}
                  <div
                    onClick={() => setSelectedNodeId(gw.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-950/50 ring-2 ring-emerald-500/40'
                        : gw.status === 'WARNING'
                        ? 'border-amber-500/60 bg-amber-950/30'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <Radio
                      className={`w-6 h-6 mx-auto mb-1.5 ${
                        gw.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    />
                    <div className="font-bold text-xs text-white line-clamp-1">{gw.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {gw.id} · IP: {gw.ip}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Sóng: {gw.signal}</span>
                      <span className="text-emerald-400">{subNodes.length} nodes con</span>
                    </div>
                  </div>

                  <div className="w-0.5 h-4 bg-slate-800 mx-auto" />

                  {/* Sub Nodes under this Gateway */}
                  <div className="space-y-2">
                    {subNodes.map((node) => {
                      const isNodeSelected = node.id === selectedNodeId;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`cursor-pointer p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                            isNodeSelected
                              ? 'border-emerald-400 bg-emerald-900/40'
                              : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                node.status === 'ONLINE'
                                  ? 'bg-emerald-400'
                                  : node.status === 'WARNING'
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span className="font-semibold text-slate-200 truncate">
                              {node.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 ml-1 shrink-0">
                            {node.id}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Node Details Box */}
      {selectedNode && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-mono block">
              Node đang chọn kiểm tra
            </span>
            <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
              {selectedNode.name} ({selectedNode.id})
            </div>
            <div className="text-slate-500 mt-0.5">
              Loại: <strong>{selectedNode.type}</strong> · Trạng thái: <strong>{selectedNode.status}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/iot/devices')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              Mở trong Device Monitor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
