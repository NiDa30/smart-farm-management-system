import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Layers,
  Lock,
  Play,
  Power,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Square,
  Wrench,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { IoTDevice } from '../../../types';

export const ControlCenter: React.FC = () => {
  const { iotDevices, controlActuator, navigate, showToast } = useApp();

  const actuators = iotDevices.filter((d) => d.type === 'ACTUATOR');
  const [selectedActuatorId, setSelectedActuatorId] = useState<string>(
    actuators[0]?.id || 'PUMP-P01'
  );

  const selectedDevice = actuators.find((d) => d.id === selectedActuatorId);

  // Command execution flow state: 'IDLE' | 'CONFIRMING' | 'SENDING' | 'WAITING_ACK' | 'SUCCESS' | 'FAILED'
  const [cmdFlowState, setCmdFlowState] = useState<
    'IDLE' | 'CONFIRMING' | 'SENDING' | 'WAITING_ACK' | 'SUCCESS' | 'FAILED'
  >('IDLE');
  const [pendingCommand, setPendingCommand] = useState<'START' | 'STOP' | 'OPEN' | 'CLOSE'>('START');

  // Manual Override Form
  const [overrideDuration, setOverrideDuration] = useState<number>(15);
  const [overrideReason, setOverrideReason] = useState<string>('Kiểm tra áp lực đường ống sau sửa chữa');

  const handleInitiateCommand = (cmd: 'START' | 'STOP' | 'OPEN' | 'CLOSE') => {
    setPendingCommand(cmd);
    setCmdFlowState('CONFIRMING');
  };

  const handleExecuteCommand = async () => {
    if (!selectedDevice) return;
    setCmdFlowState('SENDING');

    setTimeout(() => {
      setCmdFlowState('WAITING_ACK');
    }, 300);

    const success = await controlActuator(
      selectedDevice.id,
      pendingCommand,
      overrideDuration,
      overrideReason
    );

    if (success) {
      setCmdFlowState('SUCCESS');
      setTimeout(() => {
        setCmdFlowState('IDLE');
      }, 1800);
    } else {
      setCmdFlowState('FAILED');
    }
  };

  const isRunning =
    selectedDevice?.actuatorState?.state === 'ON' ||
    selectedDevice?.actuatorState?.state === 'OPEN';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Power className="w-5 h-5 text-emerald-600" />
            <span>Trung tâm Điều khiển Thiết bị Chấp hành (Actuator Control Center)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Điều khiển máy bơm, van tưới điện từ, hệ thống phun sương với cơ chế xác thực an toàn phần cứng (Fail-Safe)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/iot/digital-twin')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Sơ đồ Bản sao số (Digital Twin)</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Device List vs Selected Device Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Actuators List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <span className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                Thiết bị chấp hành ({actuators.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">LoRa / RS485</span>
            </div>

            <div className="divide-y divide-slate-100">
              {actuators.map((act) => {
                const actIsOn =
                  act.actuatorState?.state === 'ON' ||
                  act.actuatorState?.state === 'OPEN';
                const isSelected = act.id === selectedActuatorId;
                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setSelectedActuatorId(act.id);
                      setCmdFlowState('IDLE');
                    }}
                    className={`p-3.5 cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {act.id}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            actIsOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div className="text-xs font-medium text-slate-700 mt-0.5 line-clamp-1">
                        {act.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {act.location}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          actIsOn
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {act.actuatorState?.state || 'OFF'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        {act.actuatorState?.mode || 'AUTO'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Device Operation Panel (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedDevice && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Panel Header */}
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                      {selectedDevice.id}
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedDevice.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Vị trí: {selectedDevice.location} · Gateway: {selectedDevice.gatewayId}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                      isRunning
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    ● {selectedDevice.actuatorState?.state} ({selectedDevice.actuatorState?.mode})
                  </span>
                </div>
              </div>

              {/* Status & Telemetry Metrics Cards */}
              <div className="p-5 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block uppercase">Thời gian chạy hôm nay</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {selectedDevice.actuatorState?.runtimeTodayMinutes} phút
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block uppercase">Dòng điện tải</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {selectedDevice.actuatorState?.currentAmpere} A
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block uppercase">Lưu lượng đo (Flow)</span>
                  <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                    {selectedDevice.actuatorState?.flowRateLpm} L/min
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-400 block uppercase">Điện năng tiêu thụ</span>
                  <div className="text-xl font-bold font-mono text-amber-600 mt-1">
                    {selectedDevice.actuatorState?.energyKwh} kWh
                  </div>
                </div>
              </div>

              {/* Command State Machine Flow Box (Screen 22) */}
              <div className="p-5 space-y-4">
                {cmdFlowState === 'IDLE' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Thao tác điều khiển trực tiếp
                    </h3>

                    <div className="flex flex-wrap items-center gap-3">
                      {selectedDevice.actuatorType === 'PUMP' ? (
                        <>
                          <button
                            onClick={() => handleInitiateCommand('START')}
                            disabled={isRunning}
                            className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                              isRunning
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                            }`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Khởi động Bơm (START)</span>
                          </button>

                          <button
                            onClick={() => handleInitiateCommand('STOP')}
                            disabled={!isRunning}
                            className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                              !isRunning
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-md'
                            }`}
                          >
                            <Square className="w-4 h-4 fill-current" />
                            <span>Dừng Bơm (STOP)</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleInitiateCommand('OPEN')}
                            disabled={isRunning}
                            className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                              isRunning
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                            }`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Mở Van (OPEN)</span>
                          </button>

                          <button
                            onClick={() => handleInitiateCommand('CLOSE')}
                            disabled={!isRunning}
                            className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                              !isRunning
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-md'
                            }`}
                          >
                            <Square className="w-4 h-4 fill-current" />
                            <span>Đóng Van (CLOSE)</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Manual Override Configuration (Screen 23) */}
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-semibold text-slate-800">
                          Chế độ Can thiệp thủ công (Manual Override)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Tạm thời bỏ qua lịch trình tự động của Automation Rule trong một khoảng thời gian xác định. Sau khi hết thời gian, hệ thống sẽ tự động khôi phục chế độ AUTO an toàn.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-slate-600 block mb-1 font-medium">
                            Thời gian can thiệp:
                          </label>
                          <select
                            value={overrideDuration}
                            onChange={(e) => setOverrideDuration(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          >
                            <option value={15}>15 phút</option>
                            <option value={30}>30 phút</option>
                            <option value={60}>1 giờ</option>
                            <option value={120}>2 giờ</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-600 block mb-1 font-medium">
                            Lý do can thiệp:
                          </label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SAFETY CONFIRMATION MODAL (Screen 21) */}
                {cmdFlowState === 'CONFIRMING' && (
                  <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span>Xác nhận An toàn Thao tác Vận hành (Safety Confirmation)</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-amber-200 space-y-1.5 text-slate-700">
                      <p>
                        Bạn đang chuẩn bị thực hiện lệnh:{' '}
                        <strong className="text-rose-700 font-mono uppercase">
                          [{pendingCommand}]
                        </strong>{' '}
                        cho thiết bị <strong>{selectedDevice.name}</strong>.
                      </p>
                      <p>
                        • Phân khu phục vụ: <strong>{selectedDevice.location}</strong>
                      </p>
                      <p>
                        • Thời gian chạy dự kiến:{' '}
                        <strong>{overrideDuration} phút</strong>
                      </p>
                      <p>
                        • Hệ thống tự động kiểm tra lưu lượng bảo vệ chống chạy khô (Dry-Run: 30s)
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleExecuteCommand}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                      >
                        Xác nhận Gửi lệnh
                      </button>
                      <button
                        onClick={() => setCmdFlowState('IDLE')}
                        className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
                      >
                        Hủy bỏ
                      </button>
                    </div>
                  </div>
                )}

                {/* COMMAND SENDING & WAITING ACK (Screen 22) */}
                {(cmdFlowState === 'SENDING' || cmdFlowState === 'WAITING_ACK') && (
                  <div className="p-6 rounded-xl border border-indigo-200 bg-indigo-50/70 text-center space-y-2 text-xs">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
                    <div className="font-bold text-indigo-900 text-sm">
                      {cmdFlowState === 'SENDING'
                        ? 'Đang mã hóa và gửi bản tin MQTT...'
                        : 'Đã gửi lệnh qua Gateway → Đang chờ thiết bị phản hồi xác nhận (Waiting for ACK)...'}
                    </div>
                    <p className="text-indigo-700 font-mono text-[11px]">
                      Topic: {selectedDevice.mqttTopic} · Timeout: 5000ms
                    </p>
                  </div>
                )}

                {/* COMMAND SUCCESS CONFIRMATION */}
                {cmdFlowState === 'SUCCESS' && (
                  <div className="p-5 rounded-xl border border-emerald-300 bg-emerald-50 text-center space-y-2 text-xs animate-in fade-in">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="font-bold text-emerald-900 text-sm">
                      Thiết bị đã phản hồi xác nhận lệnh [{pendingCommand}] thành công!
                    </div>
                    <p className="text-emerald-700 font-mono text-[11px]">
                      ACK nhận được trong 14ms. Trạng thái phần cứng đã cập nhật.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
