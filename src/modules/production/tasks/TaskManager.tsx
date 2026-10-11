import React, { useState } from 'react';
import {
  CalendarCheck,
  Plus,
  LayoutList,
  Calendar as CalendarIcon,
  Kanban,
  Check,
  Clock,
  MapPin,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { FarmTask, TaskStatus, TaskType } from '../../../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const TaskManager: React.FC = () => {
  const { tasks, completeTask, createTask, activeUser, navigate } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'board'>('list');
  const [selectedTask, setSelectedTask] = useState<FarmTask | null>(null);
  const [completeModalTask, setCompleteModalTask] = useState<FarmTask | null>(null);
  const [actualQty, setActualQty] = useState<number>(1.5);
  const [completeNotes, setCompleteNotes] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Task form state
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'FERTILIZING' as TaskType,
    plantCode: 'A023',
    zoneName: 'Khu Bắc',
    dueDate: new Date().toLocaleDateString('vi-VN'),
    priority: 'HIGH' as any,
    assigneeName: 'Lê Văn C',
    description: '',
    plannedSupplyName: 'Phân bón NPK 16-16-8 Hữu cơ',
    plannedSupplyQty: 1.5,
  });

  const handleOpenCompleteModal = (task: FarmTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompleteModalTask(task);
    setActualQty(task.plannedSupply?.plannedQty || 1.5);
    setCompleteNotes('');
  };

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (completeModalTask) {
      completeTask(completeModalTask.id, actualQty, completeNotes);
      setCompleteModalTask(null);
      setSelectedTask(null);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const task: FarmTask = {
      id: `task-${Date.now()}`,
      code: `TSK-0${Date.now().toString().slice(-3)}`,
      title: newTask.title,
      type: newTask.type,
      typeLabel:
        newTask.type === 'FERTILIZING'
          ? 'Bón phân'
          : newTask.type === 'WATERING'
          ? 'Tưới nước'
          : newTask.type === 'PEST_CHECK'
          ? 'Kiểm tra sâu bệnh'
          : 'Cắt tỉa',
      plantCode: newTask.plantCode,
      zoneId: 'zone-north',
      zoneName: newTask.zoneName,
      dueDate: newTask.dueDate,
      status: 'TODO',
      priority: newTask.priority,
      assigneeId: activeUser.id,
      assigneeName: newTask.assigneeName,
      description: newTask.description || 'Thực hiện chăm sóc định kỳ.',
      plannedSupply: {
        supplyId: 'sup-01',
        supplyName: newTask.plannedSupplyName,
        plannedQty: newTask.plannedSupplyQty,
        unit: 'kg',
      },
    };
    createTask(task);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý công việc & Lịch chăm sóc nông nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Nguyên tắc cốt lõi: Hoàn thành 1 lần → Tự động trừ kho vật tư, cập nhật chi phí và nhật ký cây
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lịch biểu</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded flex items-center gap-1 font-medium transition-colors ${
                viewMode === 'board' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban Board</span>
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Giao việc mới</span>
          </button>
        </div>
      </div>

      {/* VIEW: LIST */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs divide-y divide-slate-100 text-xs">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="space-y-1 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-500">{task.code}</span>
                  <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                  {task.plantCode && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-800 border border-slate-200">
                      {task.plantCode}
                    </span>
                  )}
                  <StatusBadge status={task.status} size="sm" />
                </div>
                <p className="text-slate-600 text-xs">{task.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700">Hạn: {task.dueDate}</span>
                  <span>Người thực hiện: {task.assigneeName}</span>
                  <span>Vị trí: {task.zoneName}</span>
                  {task.plannedSupply && (
                    <span className="text-emerald-800 font-medium">
                      Vật tư: {task.plannedSupply.plannedQty} {task.plannedSupply.unit} {task.plannedSupply.supplyName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {task.status !== 'COMPLETED' ? (
                  <button
                    onClick={(e) => handleOpenCompleteModal(task, e)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Hoàn thành task</span>
                  </button>
                ) : (
                  <span className="text-emerald-700 text-xs font-semibold inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Đã ghi nhận</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: CALENDAR */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4 text-xs">
          <h2 className="text-sm font-bold text-slate-900">Lịch trình công việc tuần này (05/10 – 12/10/2026)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/50 space-y-2">
              <span className="font-bold text-emerald-900 block text-xs">05/10 (Hôm nay)</span>
              <div className="space-y-1.5">
                <div className="p-2 bg-white rounded border border-slate-200 font-medium text-slate-800">
                  Kiểm tra bẫy A001–A020
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 font-medium text-slate-800">
                  Bón phân cây A023 (1.5 kg NPK)
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 font-medium text-slate-800">
                  Phun nấm xanh cây B024
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-700 block text-xs">08/10 (Thứ Năm)</span>
              <div className="p-2 bg-white rounded border border-slate-200 font-medium text-slate-800">
                Cắt tỉa tàu lá già Hàng C & D
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-700 block text-xs">10/10 (Thứ Bảy)</span>
              <div className="p-2 bg-white rounded border border-slate-200 font-medium text-slate-800">
                Bón phân toàn bộ Khu Bắc đợt 2
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 font-medium text-slate-800">
                Thu hoạch dừa lứa 2 Vườn 01
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-700 block text-xs">12/10 (Thứ Hai tới)</span>
              <div className="p-2 bg-white rounded border border-slate-200 font-medium text-slate-800">
                Tái kiểm tra ca sâu bệnh cây A023
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: BOARD / KANBAN */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* TODO column */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-3">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Đang chờ thực hiện ({tasks.filter((t) => t.status === 'TODO').length})
            </span>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === 'TODO')
                .map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="p-3 bg-white rounded border border-slate-200 shadow-2xs space-y-1.5 cursor-pointer hover:border-emerald-500"
                  >
                    <span className="font-bold text-slate-900 block">{t.title}</span>
                    <p className="text-slate-500 text-[11px]">{t.description}</p>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{t.dueDate}</span>
                      <span className="font-semibold text-slate-700">{t.assigneeName}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* IN_PROGRESS column */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-3">
            <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px] block">
              Đang tiến hành ({tasks.filter((t) => t.status === 'IN_PROGRESS').length})
            </span>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === 'IN_PROGRESS')
                .map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="p-3 bg-white rounded border border-slate-200 shadow-2xs space-y-1.5 cursor-pointer hover:border-amber-500"
                  >
                    <span className="font-bold text-slate-900 block">{t.title}</span>
                    <p className="text-slate-500 text-[11px]">{t.description}</p>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{t.dueDate}</span>
                      <span className="font-semibold text-slate-700">{t.assigneeName}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* COMPLETED column */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-3">
            <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px] block">
              Đã hoàn thành ({tasks.filter((t) => t.status === 'COMPLETED').length})
            </span>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === 'COMPLETED')
                .map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="p-3 bg-emerald-50/50 rounded border border-emerald-200 shadow-2xs space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 block">{t.title}</span>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                    </div>
                    <p className="text-slate-600 text-[11px]">{t.completedNotes || t.description}</p>
                    <span className="text-[10px] text-emerald-700 font-mono block">
                      Hoàn thành: {t.completedAt}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Drawer */}
      <RightDrawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask ? selectedTask.title : ''}
        subtitle={selectedTask ? `${selectedTask.code} · ${selectedTask.typeLabel}` : ''}
        footerActions={
          selectedTask && selectedTask.status !== 'COMPLETED' ? (
            <button
              onClick={() => handleOpenCompleteModal(selectedTask)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Ghi nhận hoàn thành công việc</span>
            </button>
          ) : undefined
        }
      >
        {selectedTask && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center p-3 rounded bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-800">Trạng thái công việc:</span>
              <StatusBadge status={selectedTask.status} />
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã cá thể cây:</span>
                <strong className="font-mono text-slate-900">{selectedTask.plantCode || 'Theo khu vực'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khu vực:</span>
                <span className="font-medium">{selectedTask.zoneName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn hoàn thành:</span>
                <span className="font-bold text-slate-900">{selectedTask.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Người thực hiện:</span>
                <span className="font-medium text-slate-900">{selectedTask.assigneeName}</span>
              </div>
            </div>

            {selectedTask.plannedSupply && (
              <div className="p-3.5 rounded-lg border border-slate-200 bg-emerald-50/40 space-y-1.5">
                <span className="font-bold text-emerald-900 block">Vật tư nông nghiệp dự kiến:</span>
                <div className="flex justify-between text-slate-700">
                  <span>Tên vật tư:</span>
                  <strong>{selectedTask.plannedSupply.supplyName}</strong>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Định lượng chuẩn:</span>
                  <strong className="font-mono">{selectedTask.plannedSupply.plannedQty} {selectedTask.plannedSupply.unit}</strong>
                </div>
              </div>
            )}

            <div className="p-3 rounded border border-slate-200 bg-slate-50 space-y-1">
              <span className="font-semibold text-slate-800 block">Hướng dẫn kỹ thuật:</span>
              <p className="text-slate-600 leading-relaxed">{selectedTask.description}</p>
            </div>
          </div>
        )}
      </RightDrawer>

      {/* Complete Task Modal (Section 12 - One Action Updates All) */}
      {completeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setCompleteModalTask(null)} />
          <form
            onSubmit={handleConfirmComplete}
            className="relative bg-white rounded-lg p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-xs"
          >
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Xác nhận hoàn thành: {completeModalTask.title}
              </h3>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Hệ thống sẽ tự động trừ kho, tính chi phí và ghi nhận vào timeline cây.
              </p>
            </div>

            {completeModalTask.plannedSupply && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Số lượng vật tư thực tế đã dùng ({completeModalTask.plannedSupply.unit}):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={actualQty}
                  onChange={(e) => setActualQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold text-slate-900"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Định lượng dự kiến: {completeModalTask.plannedSupply.plannedQty} {completeModalTask.plannedSupply.unit} ({completeModalTask.plannedSupply.supplyName})
                </span>
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ghi chú thực hiện:</label>
              <textarea
                rows={3}
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Đã bón đều quanh tán, đất đủ ẩm, không có sự cố..."
                className="w-full px-3 py-2 border border-slate-200 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompleteModalTask(null)}
                className="px-3.5 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 shadow-xs"
              >
                Xác nhận hoàn thành & Đồng bộ kho
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create New Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowCreateModal(false)} />
          <form
            onSubmit={handleCreateSubmit}
            className="relative bg-white rounded-lg p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="font-bold text-slate-900 text-sm">Giao công việc chăm sóc mới</h3>
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên công việc *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Ví dụ: Bón phân bổ sung cho Hàng A"
                  className="w-full px-3 py-2 border border-slate-200 rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại việc *</label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded"
                  >
                    <option value="FERTILIZING">Bón phân</option>
                    <option value="WATERING">Tưới nước</option>
                    <option value="PEST_CHECK">Kiểm tra sâu bệnh</option>
                    <option value="PRUNING">Cắt tỉa tàu lá</option>
                    <option value="HARVEST">Thu hoạch</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã cá thể cây</label>
                  <input
                    type="text"
                    value={newTask.plantCode}
                    onChange={(e) => setNewTask({ ...newTask, plantCode: e.target.value })}
                    placeholder="A023 hoặc để trống"
                    className="w-full px-3 py-2 border border-slate-200 rounded font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Người phụ trách *</label>
                  <select
                    value={newTask.assigneeName}
                    onChange={(e) => setNewTask({ ...newTask, assigneeName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded"
                  >
                    <option value="Lê Văn C">Lê Văn C (Kỹ thuật viên)</option>
                    <option value="Đặng Thu F">Đặng Thu F (Nông học)</option>
                    <option value="Vũ Quốc G">Vũ Quốc G (Quản lý)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hạn thực hiện *</label>
                  <input
                    type="text"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
              >
                Tạo task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
