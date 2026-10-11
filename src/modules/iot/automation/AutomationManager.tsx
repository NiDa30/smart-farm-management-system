import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Droplets,
  Edit,
  ExternalLink,
  Filter,
  History,
  Info,
  Layers,
  Play,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  AutomationExecution,
  IoTAutomationRule,
  RuleAction,
  RuleCondition,
} from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const AutomationManager: React.FC = () => {
  const {
    automationRules,
    automationExecutions,
    iotDevices,
    toggleRuleStatus,
    createAutomationRule,
    deleteAutomationRule,
    navigate,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'RULES' | 'BUILDER' | 'SIMULATOR' | 'SCHEDULES' | 'HISTORY'
  >('RULES');

  // Search & Filter for Rules
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Rule for Details / Edit / Simulation
  const [selectedRule, setSelectedRule] = useState<IoTAutomationRule | null>(null);

  // Selected Execution for Timeline Drawer
  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null);

  // --- RULE BUILDER STATE (Screen 09) ---
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderZone, setBuilderZone] = useState('Khu Bắc - Lô Vườn 01');
  const [builderType, setBuilderType] = useState<IoTAutomationRule['type']>('IRRIGATION');
  const [builderMode, setBuilderMode] = useState<IoTAutomationRule['mode']>('AUTO');
  const [builderPriority, setBuilderPriority] = useState<number>(60);
  const [builderIsEdge, setBuilderIsEdge] = useState<boolean>(true);

  // Conditions builder
  const [conditions, setConditions] = useState<RuleCondition[]>([
    {
      id: 'c1',
      deviceId: 'SM-03',
      deviceName: 'Cảm biến độ ẩm đất SM-03',
      metric: 'Độ ẩm đất',
      operator: '<',
      threshold: 30,
      unit: '%',
      logicalOp: 'AND',
    },
    {
      id: 'c2',
      deviceId: 'TANK-01',
      deviceName: 'Mực nước hồ chứa',
      metric: 'Dung tích còn lại',
      operator: '>',
      threshold: 20,
      unit: '%',
    },
  ]);

  // Actions builder
  const [actions, setActions] = useState<RuleAction[]>([
    {
      id: 'a1',
      step: 1,
      targetDeviceId: 'VALVE-V01',
      targetDeviceName: 'Van điện từ V01 (Zone 1)',
      command: 'OPEN',
    },
    {
      id: 'a2',
      step: 2,
      targetDeviceId: 'PUMP-P01',
      targetDeviceName: 'Máy bơm chính 5.5HP',
      command: 'START',
    },
    {
      id: 'a3',
      step: 3,
      targetDeviceId: 'PUMP-P01',
      targetDeviceName: 'Máy bơm chính 5.5HP',
      command: 'WAIT',
      durationMinutes: 12,
    },
    {
      id: 'a4',
      step: 4,
      targetDeviceId: 'PUMP-P01',
      targetDeviceName: 'Máy bơm chính 5.5HP',
      command: 'STOP',
    },
    {
      id: 'a5',
      step: 5,
      targetDeviceId: 'VALVE-V01',
      targetDeviceName: 'Van điện từ V01 (Zone 1)',
      command: 'CLOSE',
    },
  ]);

  // Safety settings
  const [safetyRuntime, setSafetyRuntime] = useState<number>(15);
  const [safetyCooldown, setSafetyCooldown] = useState<number>(45);
  const [safetyMaxRuns, setSafetyMaxRuns] = useState<number>(4);

  // --- RULE SIMULATOR STATE (Screen 10) ---
  const [simPeriod, setSimPeriod] = useState<'7d' | '14d' | '30d'>('7d');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState<{
    triggersCount: number;
    avgRuntimeMinutes: number;
    estimatedWaterM3: number;
    conflictsCount: number;
    safetyViolations: number;
  } | null>({
    triggersCount: 14,
    avgRuntimeMinutes: 11.5,
    estimatedWaterM3: 4.8,
    conflictsCount: 0,
    safetyViolations: 0,
  });

  const handleCreateRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderName.trim()) {
      showToast('Vui lòng nhập tên quy tắc', 'warning');
      return;
    }

    const newRule: IoTAutomationRule = {
      id: `rule-${Date.now()}`,
      code: `RULE-IRR-0${automationRules.length + 1}`,
      name: builderName,
      description: builderDesc || 'Quy tắc tự động hóa mới thiết lập',
      zone: builderZone,
      zoneId: 'zone-north',
      type: builderType,
      mode: builderMode,
      priority: builderPriority,
      status: 'ACTIVE',
      isEdgeRule: builderIsEdge,
      conditions,
      actions,
      safety: {
        maxRuntimeMinutes: safetyRuntime,
        cooldownMinutes: safetyCooldown,
        maxRunsPerDay: safetyMaxRuns,
      },
      lastRun: 'Chưa chạy lần nào',
      totalRuns: 0,
      successRate: 100,
      runsToday: 0,
    };

    createAutomationRule(newRule);
    setActiveTab('RULES');
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setSimResults({
        triggersCount: 16,
        avgRuntimeMinutes: 12.0,
        estimatedWaterM3: 5.2,
        conflictsCount: 0,
        safetyViolations: 0,
      });
      showToast('Mô phỏng dữ liệu lịch sử hoàn tất!');
    }, 1200);
  };

  const filteredRules = automationRules.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.zone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Động cơ Tự động hóa & Quy tắc Vận hành (Rule Engine)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xây dựng kịch bản tưới thông minh, bảo vệ chống cạn hồ, kiểm thử mô phỏng và lưu vết lịch sử thực thi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBuilderName(`Tưới tự động Lô mới #${automationRules.length + 1}`);
              setActiveTab('BUILDER');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Rule Mới (Rule Builder)</span>
          </button>
        </div>
      </div>

      {/* Module Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
        {[
          { key: 'RULES', label: `Danh sách Quy tắc (${automationRules.length})` },
          { key: 'BUILDER', label: 'Thiết kế Quy tắc (Visual Builder)' },
          { key: 'SIMULATOR', label: 'Kiểm thử Mô phỏng (Simulator)' },
          { key: 'SCHEDULES', label: 'Lịch tự động cố định' },
          { key: 'HISTORY', label: `Nhật ký Thực thi (${automationExecutions.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#103E39] text-emerald-300 font-semibold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: RULES LIST (Screen 08) */}
      {/* ==================================================== */}
      {activeTab === 'RULES' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm quy tắc theo tên, mã rule, phân khu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">BẬT (Active)</option>
              <option value="PAUSED">TẠM DỪNG (Paused)</option>
            </select>
          </div>

          {/* Rules Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Mã / Tên Quy tắc</th>
                  <th className="py-3 px-4">Phân khu</th>
                  <th className="py-3 px-4">Điều kiện Kích hoạt (WHEN)</th>
                  <th className="py-3 px-4">Hành động thực thi (THEN)</th>
                  <th className="py-3 px-4">Ưu tiên</th>
                  <th className="py-3 px-4">Vị trí xử lý</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Lần chạy gần nhất</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRules.map((rule) => {
                  const isActive = rule.status === 'ACTIVE';
                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedRule(rule)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{rule.name}</span>
                          {rule.type === 'SAFETY' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-700">
                              SAFETY
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {rule.code} · Mode: {rule.mode}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">{rule.zone}</td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {rule.conditions.map((c) => (
                            <div
                              key={c.id}
                              className="inline-block text-[11px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded mr-1"
                            >
                              {c.metric} {c.operator} {c.threshold}
                              {c.unit || ''}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-700 line-clamp-2">
                          {rule.actions.map((a) => `${a.command} ${a.targetDeviceName}`).join(' → ')}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {rule.priority}
                      </td>

                      <td className="py-3 px-4">
                        {rule.isEdgeRule ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Cpu className="w-3 h-3" />
                            <span>Edge (Local)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">Cloud Server</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRuleStatus(rule.id);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isActive ? '● ĐANG BẬT' : '✕ TẠM DỪNG'}
                        </button>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {rule.lastRun}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRule(rule);
                              setActiveTab('SIMULATOR');
                            }}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                            title="Kiểm thử mô phỏng rule"
                          >
                            Mô phỏng
                          </button>
                          <button
                            onClick={() => deleteAutomationRule(rule.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Xóa rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: VISUAL RULE BUILDER (Screen 09) */}
      {/* ==================================================== */}
      {activeTab === 'BUILDER' && (
        <form onSubmit={handleCreateRuleSubmit} className="space-y-6 max-w-4xl bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Trình thiết kế Kịch bản Tự động hóa Trực quan (Visual Rule Builder)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo quy tắc vận hành liên kết điều kiện cảm biến thực địa và hành động điều khiển thiết bị chấp hành
            </p>
          </div>

          {/* SECTION 1: RULE METADATA */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Thông tin Quy tắc (Metadata)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên quy tắc (Rule Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tưới tự động Lô A3 khi độ ẩm < 30%"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Phân khu áp dụng (Zone)
                </label>
                <select
                  value={builderZone}
                  onChange={(e) => setBuilderZone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Khu Bắc - Lô Vườn 01">Khu Bắc - Lô Vườn 01 (Hàng A & B)</option>
                  <option value="Khu Bắc - Lô Vườn 02">Khu Bắc - Lô Vườn 02 (Hàng C & D)</option>
                  <option value="Khu Nam - Vườn 01">Khu Nam - Vườn 01</option>
                  <option value="Vườn Ươm">Vườn Ươm & Cây non</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chế độ vận hành (Rule Mode)
                </label>
                <select
                  value={builderMode}
                  onChange={(e) => setBuilderMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="AUTO">AUTO (Tự động kích hoạt khi đủ điều kiện)</option>
                  <option value="SEMI_AUTO">SEMI-AUTO (Yêu cầu kỹ thuật viên xác nhận trước khi chạy)</option>
                  <option value="NOTIFY_ONLY">NOTIFY ONLY (Chỉ gửi thông báo cảnh báo)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Mức độ ưu tiên (Priority 1–100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={builderPriority}
                  onChange={(e) => setBuilderPriority(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Quy tắc an toàn phần cứng có Priority = 100, quy tắc tưới thông thường = 50–60
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: TRIGGER CONDITIONS (WHEN) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Điều kiện kích hoạt (WHEN Condition Builder)</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {conditions.map((cond, idx) => (
                <div
                  key={cond.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-2 text-xs"
                >
                  <span className="font-bold text-indigo-700 w-12">
                    {idx === 0 ? 'IF' : 'AND'}
                  </span>

                  <select
                    value={cond.deviceId}
                    onChange={(e) => {
                      const targetId = e.target.value;
                      const dev = iotDevices.find((d) => d.id === targetId);
                      setConditions(
                        conditions.map((c) =>
                          c.id === cond.id
                            ? { ...c, deviceId: targetId, deviceName: dev?.name || targetId }
                            : c
                        )
                      );
                    }}
                    className="px-2 py-1 rounded border border-slate-300 bg-white"
                  >
                    <option value="SM-03">SM-03 (Độ ẩm đất Lô A3)</option>
                    <option value="TANK-01">TANK-01 (Mực nước hồ ngầm)</option>
                    <option value="WEATHER-01">WEATHER-01 (Nhiệt độ không khí)</option>
                    <option value="FLOW-01">FLOW-01 (Lưu lượng nước)</option>
                  </select>

                  <select
                    value={cond.operator}
                    onChange={(e) => {
                      const op = e.target.value as any;
                      setConditions(
                        conditions.map((c) =>
                          c.id === cond.id ? { ...c, operator: op } : c
                        )
                      );
                    }}
                    className="px-2 py-1 rounded border border-slate-300 bg-white font-mono font-bold"
                  >
                    <option value="<">&lt; (Nhỏ hơn)</option>
                    <option value="<=">&lt;= (Nhỏ hơn hoặc bằng)</option>
                    <option value=">">&gt; (Lớn hơn)</option>
                    <option value=">=">&gt;= (Lớn hơn hoặc bằng)</option>
                    <option value="==">== (Bằng)</option>
                    <option value="!=">!= (Khác)</option>
                  </select>

                  <input
                    type="number"
                    value={cond.threshold as number}
                    onChange={(e) => {
                      const numVal = Number(e.target.value);
                      setConditions(
                        conditions.map((c) =>
                          c.id === cond.id ? { ...c, threshold: numVal } : c
                        )
                      );
                    }}
                    className="w-20 px-2 py-1 rounded border border-slate-300 font-mono text-center"
                  />
                  <span className="text-slate-500 font-mono">{cond.unit || '%'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: SEQUENTIAL ACTIONS (THEN) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Chuỗi hành động chấp hành (THEN Sequential Action Pipeline)</span>
            </h3>

            <div className="space-y-2">
              {actions.map((act, index) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold font-mono flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-emerald-800 font-mono uppercase mr-2">
                        {act.command}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {act.targetDeviceName}
                      </span>
                      {act.durationMinutes && (
                        <span className="ml-2 font-mono text-slate-500">
                          (Chạy trong {act.durationMinutes} phút)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: SAFETY LIMITS & EDGE EXECUTION */}
          <div className="space-y-4 pt-4 border-t border-slate-100 text-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                4
              </span>
              <span>Giới hạn An toàn & Thực thi Cục bộ (Edge Execution)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-slate-50">
                <label className="text-slate-600 block mb-1">Thời gian chạy tối đa / lần</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={safetyRuntime}
                    onChange={(e) => setSafetyRuntime(Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                  <span className="text-slate-500">phút</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-slate-50">
                <label className="text-slate-600 block mb-1">Thời gian nghỉ (Cooldown)</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={safetyCooldown}
                    onChange={(e) => setSafetyCooldown(Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                  <span className="text-slate-500">phút</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-slate-50">
                <label className="text-slate-600 block mb-1">Số lần chạy tối đa / ngày</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={safetyMaxRuns}
                    onChange={(e) => setSafetyMaxRuns(Number(e.target.value))}
                    className="w-20 px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                  <span className="text-slate-500">lần/ngày</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
              <div>
                <span className="font-semibold text-emerald-950 block">
                  Kích hoạt Thực thi Cục bộ trên Gateway ESP32 (Edge Local Mode)
                </span>
                <span className="text-[11px] text-emerald-800">
                  Rule được tải trực tiếp xuống chip ESP32, tiếp tục tự động tưới ngay cả khi trang trại mất mạng Internet.
                </span>
              </div>
              <input
                type="checkbox"
                checked={builderIsEdge}
                onChange={(e) => setBuilderIsEdge(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-2xs"
            >
              Lưu & Kích hoạt Quy tắc
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RULES')}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
            >
              Hủy bỏ
            </button>
          </div>
        </form>
      )}

      {/* ==================================================== */}
      {/* TAB 3: RULE SIMULATOR (Screen 10) */}
      {/* ==================================================== */}
      {activeTab === 'SIMULATOR' && (
        <div className="space-y-5 max-w-4xl bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Kiểm thử Mô phỏng Quy tắc (Rule Simulator Engine)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mô phỏng chạy thử Rule dựa trên dữ liệu sensor thực tế trong quá khứ trước khi áp dụng ra vườn
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Quy tắc kiểm thử:</span>
              <select className="px-2.5 py-1 rounded border border-slate-300 bg-white font-medium">
                {automationRules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-600">Dữ liệu quá khứ:</span>
              <select
                value={simPeriod}
                onChange={(e) => setSimPeriod(e.target.value as any)}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white font-medium"
              >
                <option value="7d">7 ngày gần nhất</option>
                <option value="14d">14 ngày gần nhất</option>
                <option value="30d">30 ngày gần nhất</option>
              </select>
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-3.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
              >
                {isSimulating ? 'Đang phân tích...' : 'Chạy Mô phỏng'}
              </button>
            </div>
          </div>

          {/* Simulation KPI Results */}
          {simResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-slate-50">
                  <span className="text-slate-400 block text-[10px]">Số lần kích hoạt</span>
                  <div className="text-2xl font-bold font-mono text-indigo-700 mt-1">
                    {simResults.triggersCount} lần
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-slate-50">
                  <span className="text-slate-400 block text-[10px]">Thời gian tưới TB</span>
                  <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
                    {simResults.avgRuntimeMinutes} phút
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-slate-50">
                  <span className="text-slate-400 block text-[10px]">Lượng nước tiêu thụ</span>
                  <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                    {simResults.estimatedWaterM3} m³
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-slate-50">
                  <span className="text-slate-400 block text-[10px]">Xung đột bơm/van</span>
                  <div className="text-2xl font-bold font-mono text-slate-800 mt-1">
                    {simResults.conflictsCount}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-slate-50">
                  <span className="text-slate-400 block text-[10px]">Vi phạm an toàn</span>
                  <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                    {simResults.safetyViolations}
                  </div>
                </div>
              </div>

              {/* Simulation Timeline Entries */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2 text-xs">
                <h4 className="font-semibold text-slate-900 pb-2 border-b border-slate-100">
                  Dòng thời gian Kích hoạt Dự kiến (Simulation Timeline)
                </h4>
                <div className="space-y-2 pt-1 font-mono">
                  <div className="p-2 rounded bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                    <span>01/10 06:15: Thỏa mãn SM-03 = 28.5% & Bể chứa = 75%</span>
                    <span className="font-bold text-emerald-700">✓ Kích hoạt tưới 12m</span>
                  </div>
                  <div className="p-2 rounded bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                    <span>01/10 16:30: Thỏa mãn SM-03 = 29.1% & Bể chứa = 78%</span>
                    <span className="font-bold text-emerald-700">✓ Kích hoạt tưới 12m</span>
                  </div>
                  <div className="p-2 rounded bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                    <span>02/10 11:00: Đạt ngưỡng SM-03 &lt; 30% nhưng chặn bởi Khung giờ nắng gắt</span>
                    <span className="font-bold text-amber-700">▲ Blocked by Schedule Guard</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: SCHEDULES (Screen 11) */}
      {/* ==================================================== */}
      {activeTab === 'SCHEDULES' && (
        <div className="space-y-4 max-w-4xl bg-white p-6 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>Lịch Trình Tưới Tiêu Cố định (Time-based Automation Schedules)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kích hoạt theo khung giờ cố định trong ngày kèm điều kiện bảo vệ độ ẩm
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                name: 'Tưới sương sớm Khu Bắc (Morning Flush)',
                time: '06:00 Hàng ngày (T2, T3, T4, T5, T6, T7, CN)',
                condition: 'Chỉ chạy nếu Độ ẩm đất < 45%',
                duration: '15 phút',
                status: 'ACTIVE',
              },
              {
                name: 'Tưới bổ sung chiều mát Lô B (Evening Flush)',
                time: '17:00 (T2, T4, T6)',
                condition: 'Chỉ chạy nếu Dự báo không mưa trong 6h tới',
                duration: '10 phút',
                status: 'ACTIVE',
              },
            ].map((sch, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{sch.name}</h3>
                  <div className="text-slate-500 mt-0.5 font-mono">{sch.time}</div>
                  <div className="text-indigo-700 font-medium mt-1">Điều kiện: {sch.condition}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {sch.status}
                  </span>
                  <div className="text-slate-400 mt-1 font-mono">Thời lượng: {sch.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: AUTOMATION HISTORY (Screen 12) */}
      {/* ==================================================== */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Quy tắc kích hoạt</th>
                  <th className="py-3 px-4">Phân khu</th>
                  <th className="py-3 px-4">Điều kiện thỏa mãn</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Thời lượng</th>
                  <th className="py-3 px-4">Nước dùng</th>
                  <th className="py-3 px-4">Điện năng</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {automationExecutions.map((exec) => (
                  <tr
                    key={exec.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedExecution(exec)}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {exec.timestamp}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {exec.ruleName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{exec.zone}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      {exec.triggerSummary}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{exec.actionSummary}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {exec.durationMinutes} phút
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                      {exec.waterUsedLiters} L
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-600">
                      {exec.energyUsedKwh} kWh
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {exec.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedExecution(exec)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                      >
                        Timeline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Execution Timeline Drawer (Screen 12 & 35) */}
      <RightDrawer
        isOpen={Boolean(selectedExecution)}
        onClose={() => setSelectedExecution(null)}
        title={selectedExecution ? `Nhật ký Thực thi: ${selectedExecution.ruleName}` : ''}
        subtitle={selectedExecution ? `${selectedExecution.timestamp} (${selectedExecution.zone})` : ''}
        width="w-full sm:w-[540px]"
      >
        {selectedExecution && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg border bg-slate-50 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-slate-400 block text-[10px]">Thời lượng chạy</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {selectedExecution.durationMinutes} phút
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Lượng nước tiêu thụ</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">
                  {selectedExecution.waterUsedLiters} L
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Điện năng</span>
                <span className="font-bold text-amber-600 font-mono text-sm">
                  {selectedExecution.energyUsedKwh} kWh
                </span>
              </div>
            </div>

            <h4 className="font-bold text-slate-900 pt-2 border-t border-slate-100 uppercase tracking-wider text-[11px]">
              Dòng sự kiện từng bước (Step-by-Step Execution Trace)
            </h4>

            <div className="relative pl-6 space-y-4 border-l-2 border-emerald-200 ml-2">
              {selectedExecution.timeline.map((step, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white ring-2 ring-emerald-200" />
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{step.step}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{step.time}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">{step.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </RightDrawer>
    </div>
  );
};
