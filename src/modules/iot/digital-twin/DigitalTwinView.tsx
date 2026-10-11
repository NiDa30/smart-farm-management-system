import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Droplets,
  Layers,
  Power,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const DigitalTwinView: React.FC = () => {
  const { iotDevices, controlActuator, navigate } = useApp();

  const pumpP01 = iotDevices.find((d) => d.id === 'PUMP-P01');
  const valveV01 = iotDevices.find((d) => d.id === 'VALVE-V01');
  const valveV02 = iotDevices.find((d) => d.id === 'VALVE-V02');
  const tank = iotDevices.find((d) => d.id === 'TANK-01');
  const flowMeter = iotDevices.find((d) => d.id === 'FLOW-01');
  const sm03 = iotDevices.find((d) => d.id === 'SM-03');

  const pumpIsOn = pumpP01?.actuatorState?.state === 'ON';
  const v01IsOpen = valveV01?.actuatorState?.state === 'OPEN';
  const v02IsOpen = valveV02?.actuatorState?.state === 'OPEN';

  const [selectedNode, setSelectedNode] = useState<string>('PUMP-P01');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>Bản sao số Hệ thống Thủy lực & Tưới tiêu (Digital Twin)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mô phỏng trực quan trạng thái liên động giữa Hồ chứa → Bơm ly tâm → Đồng hồ lưu lượng → Van điện từ → Vườn cây
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/iot/control')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5 text-slate-500" />
            <span>Bảng Điều khiển Thủ công</span>
          </button>
        </div>
      </div>

      {/* Interactive Twin Canvas Schematic */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 text-white shadow-xl relative overflow-hidden">
        {/* Schematic Canvas Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              DIGITAL TWIN LIVE SYNC
            </span>
            <span className="text-slate-500">· Tần số quét SCADA: 500ms</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                pumpIsOn
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {pumpIsOn ? 'DÒNG CHẢY ÁP LỰC ĐANG HOẠT ĐỘNG (342 L/min)' : 'HỆ THỐNG ĐANG TĨNH'}
            </span>
          </div>
        </div>

        {/* Schematic Flow Graph */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-5 gap-4 items-center text-center">
          {/* Node 1: Tank */}
          <div
            onClick={() => setSelectedNode('TANK-01')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedNode === 'TANK-01'
                ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/30'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <Droplets className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-300">Hồ chứa ngầm</div>
            <div className="text-xl font-bold font-mono text-cyan-300 my-1">68.5%</div>
            <div className="text-[10px] text-slate-500">Dung tích: 342 m³</div>
          </div>

          {/* Pipe 1 */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div
              className={`w-full h-2 rounded-full ${
                pumpIsOn ? 'bg-cyan-500 animate-pulse' : 'bg-slate-800'
              }`}
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1">Ống hút DN80</span>
          </div>

          {/* Node 2: Pump P01 */}
          <div
            onClick={() => setSelectedNode('PUMP-P01')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedNode === 'PUMP-P01'
                ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-500/30'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <Power
              className={`w-8 h-8 mx-auto mb-2 ${
                pumpIsOn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
              }`}
            />
            <div className="text-xs font-semibold text-slate-300">Máy bơm chính 5.5HP</div>
            <div
              className={`text-xl font-bold font-mono my-1 ${
                pumpIsOn ? 'text-emerald-300' : 'text-slate-500'
              }`}
            >
              {pumpIsOn ? 'CHẠY (ON)' : 'DỪNG (OFF)'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {pumpIsOn ? 'Dòng tải: 14.2A' : '0.0 A'}
            </div>
          </div>

          {/* Pipe 2 */}
          <div className="hidden md:flex flex-col items-center justify-center">
            <div
              className={`w-full h-2 rounded-full ${
                pumpIsOn ? 'bg-cyan-500 animate-pulse' : 'bg-slate-800'
              }`}
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1">DN50 Flow</span>
          </div>

          {/* Node 3: Flow Meter & Valves Split */}
          <div className="space-y-3">
            <div
              onClick={() => setSelectedNode('VALVE-V01')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                v01IsOpen
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Van V01 (Lô A)</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    v01IsOpen ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {v01IsOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-400 text-left mt-1">
                Phục vụ: 40 cây dừa A001–A040
              </div>
            </div>

            <div
              onClick={() => setSelectedNode('VALVE-V02')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                v02IsOpen
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Van V02 (Lô B)</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    v02IsOpen ? 'bg-emerald-400/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {v02IsOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 text-left mt-1">
                Phục vụ: 40 cây dừa A041–A080
              </div>
            </div>
          </div>
        </div>

        {/* Selected Component Inspector Card */}
        <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-900/80 text-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-slate-400 text-[10px] block uppercase tracking-wider">
              Thành phần đang kiểm tra trên sơ đồ
            </span>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {selectedNode}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedNode === 'PUMP-P01' && (
              <button
                onClick={() =>
                  controlActuator(
                    'PUMP-P01',
                    pumpIsOn ? 'STOP' : 'START',
                    15,
                    'Thao tác từ Digital Twin'
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  pumpIsOn
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {pumpIsOn ? 'Tắt Bơm P01' : 'Khởi động Bơm P01'}
              </button>
            )}

            {selectedNode === 'VALVE-V01' && (
              <button
                onClick={() =>
                  controlActuator(
                    'VALVE-V01',
                    v01IsOpen ? 'CLOSE' : 'OPEN',
                    15,
                    'Thao tác từ Digital Twin'
                  )
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  v01IsOpen
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {v01IsOpen ? 'Đóng Van V01' : 'Mở Van V01'}
              </button>
            )}

            <button
              onClick={() => navigate('/iot/control')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Mở Control Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
