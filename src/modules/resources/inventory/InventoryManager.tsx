import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  Repeat,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  Package,
  Calendar,
  Building,
  CheckCircle2,
  Trash2,
  Plus,
  Eye,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  InventoryCount,
  MaterialBatch,
  StockIssue,
  StockTransfer,
  Warehouse,
} from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const InventoryManager: React.FC = () => {
  const {
    materials,
    materialBatches,
    warehouses,
    stockIssues,
    stockTransfers,
    inventoryCounts,
    plants,
    tasks,
    issueStock,
    transferStock,
    submitInventoryCount,
    navigate,
    showToast,
  } = useApp();

  // Active view: 'STOCK' | 'ISSUES' | 'TRANSFERS' | 'COUNTS'
  const [activeTab, setActiveTab] = useState<'STOCK' | 'ISSUES' | 'TRANSFERS' | 'COUNTS'>(
    'STOCK'
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals / Drawers
  const [selectedBatch, setSelectedBatch] = useState<MaterialBatch | null>(null);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isCountOpen, setIsCountOpen] = useState(false);

  // Issue Form State (Screen 13)
  const [issueWh, setIssueWh] = useState('wh-main');
  const [issueType, setIssueType] = useState<
    'TASK' | 'PLANT' | 'ZONE' | 'EQUIPMENT' | 'DISPOSAL'
  >('PLANT');
  const [issueTargetPlant, setIssueTargetPlant] = useState('plant-a023');
  const [issueTargetTask, setIssueTargetTask] = useState(tasks[0]?.id || '');
  const [issueTargetZone, setIssueTargetZone] = useState('Khu Bắc (Vườn 01)');
  const [issueMaterialId, setIssueMaterialId] = useState('mat-fert-01');
  const [issueBatchNumber, setIssueBatchNumber] = useState('LOT-NPK-251005');
  const [issueQty, setIssueQty] = useState<number>(1.5);
  const [issueNotes, setIssueNotes] = useState('');

  // Transfer Form State (Screen 14)
  const [transferFromWh, setTransferFromWh] = useState('wh-main');
  const [transferToWh, setTransferToWh] = useState('wh-north');
  const [transferMaterialId, setTransferMaterialId] = useState('mat-fert-01');
  const [transferBatch, setTransferBatch] = useState('LOT-NPK-251005');
  const [transferQty, setTransferQty] = useState<number>(50);

  // Count Form State (Screen 15)
  const [countItems, setCountItems] = useState<
    { materialId: string; batchNumber: string; systemQty: number; actualQty: number; reason: string }[]
  >([
    {
      materialId: 'mat-fert-01',
      batchNumber: 'LOT-NPK-251005',
      systemQty: 320,
      actualQty: 318,
      reason: 'Hao hụt tự nhiên khi chia lẻ',
    },
    {
      materialId: 'mat-fert-02',
      batchNumber: 'LOT-TRICHO-250810',
      systemQty: 80,
      actualQty: 80,
      reason: 'Đủ 100%',
    },
  ]);

  // Filtered Batches
  const filteredBatches = materialBatches.filter((b) => {
    const matchSearch =
      b.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.materialCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchWh = selectedWarehouseId === 'ALL' || b.warehouseId === selectedWarehouseId;
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchSearch && matchWh && matchStatus;
  });

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find((m) => m.id === issueMaterialId);
    const batch = materialBatches.find((b) => b.batchNumber === issueBatchNumber);

    if (batch && issueQty > batch.currentQty) {
      showToast(`Số lượng xuất (${issueQty}) vượt quá tồn lô (${batch.currentQty})`, 'warning');
      return;
    }

    let targetName = 'Khu vực sản xuất';
    let targetId: string | undefined = undefined;

    if (issueType === 'PLANT') {
      const pl = plants.find((p) => p.id === issueTargetPlant) || plants[0];
      targetName = `Cá thể Cây #${pl.code}`;
      targetId = pl.id;
    } else if (issueType === 'TASK') {
      const t = tasks.find((tk) => tk.id === issueTargetTask);
      targetName = t ? t.title : 'Công việc nông vụ';
      targetId = t?.id;
    } else {
      targetName = issueTargetZone;
    }

    const unitCost = batch?.unitPrice || mat?.latestPrice || 18000;
    const totalCost = issueQty * unitCost;
    const issueCode = `ISSUE-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newIssue: StockIssue = {
      id: `issue-${Date.now()}`,
      code: issueCode,
      date: new Date().toLocaleDateString('vi-VN'),
      warehouseId: issueWh,
      warehouseName:
        issueWh === 'wh-main'
          ? 'Kho tổng An Phú'
          : issueWh === 'wh-north'
          ? 'Kho phân bón Khu Bắc'
          : 'Kho thiết bị IoT',
      issueType,
      issueTypeLabel:
        issueType === 'PLANT'
          ? 'Cá thể cây trồng'
          : issueType === 'TASK'
          ? 'Công việc chăm sóc'
          : 'Khu vực / Lô',
      targetId,
      targetName,
      items: [
        {
          materialId: issueMaterialId,
          materialName: mat ? mat.name : 'Vật tư',
          materialCode: mat ? mat.code : '',
          batchId: batch ? batch.id : 'batch-default',
          batchNumber: issueBatchNumber,
          qty: issueQty,
          unit: mat ? mat.unit : 'kg',
          unitCost,
          totalCost,
        },
      ],
      totalCost,
      issuedBy: 'Lê Văn C',
      receiver: targetName,
      notes: issueNotes || `Xuất phục vụ ${targetName}`,
    };

    issueStock(newIssue);
    setIsIssueOpen(false);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromWh === transferToWh) {
      showToast('Kho nguồn và kho đích không được trùng nhau', 'warning');
      return;
    }

    const mat = materials.find((m) => m.id === transferMaterialId);
    const fromWhObj = warehouses.find((w) => w.id === transferFromWh);
    const toWhObj = warehouses.find((w) => w.id === transferToWh);

    const newTransfer: StockTransfer = {
      id: `trans-${Date.now()}`,
      code: `TRANS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toLocaleDateString('vi-VN'),
      fromWarehouseId: transferFromWh,
      fromWarehouseName: fromWhObj ? fromWhObj.name : 'Kho xuất',
      toWarehouseId: transferToWh,
      toWarehouseName: toWhObj ? toWhObj.name : 'Kho nhận',
      items: [
        {
          materialId: transferMaterialId,
          materialName: mat ? mat.name : 'Vật tư',
          batchNumber: transferBatch,
          qty: transferQty,
          unit: mat ? mat.unit : 'kg',
        },
      ],
      transferredBy: 'Lê Văn C',
    };

    transferStock(newTransfer);
    setIsTransferOpen(false);
  };

  const handleCountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const countItemsMapped = countItems.map((it) => {
      const mat = materials.find((m) => m.id === it.materialId);
      return {
        materialId: it.materialId,
        materialName: mat ? mat.name : 'Vật tư',
        batchNumber: it.batchNumber,
        unit: mat ? mat.unit : 'kg',
        systemQty: it.systemQty,
        actualQty: it.actualQty,
        diffQty: it.actualQty - it.systemQty,
        reason: it.reason || 'Kiểm kê định kỳ',
      };
    });

    const newCount: InventoryCount = {
      id: `count-${Date.now()}`,
      code: `COUNT-2026-${Math.floor(10 + Math.random() * 90)}`,
      date: new Date().toLocaleDateString('vi-VN'),
      warehouseName: 'Kho tổng An Phú',
      status: 'COMPLETED',
      items: countItemsMapped,
      conductedBy: 'Trần Thị B',
      approvedBy: 'Trần Thị B (Chủ trang trại)',
    };

    submitInventoryCount(newCount);
    setIsCountOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Kho & Tồn Kho Theo Lô Hàng
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
              Warehouse Management
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị tồn kho đa điểm, kiểm soát hạn sử dụng (FEFO), xuất kho trực tiếp cho từng cá thể cây và điều chuyển
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Repeat className="w-3.5 h-3.5 text-slate-500" />
            <span>Điều chuyển kho</span>
          </button>
          <button
            onClick={() => setIsCountOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Kiểm kê kho</span>
          </button>
          <button
            onClick={() => setIsIssueOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Xuất kho sử dụng</span>
          </button>
        </div>
      </div>

      {/* Warehouse Selector & Sub Tabs (Screen 11 Header) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Điểm kho:</span>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-hidden"
          >
            <option value="ALL">Tất cả kho ({warehouses.length} kho)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
          {[
            { key: 'STOCK', label: 'Tồn kho theo lô' },
            { key: 'ISSUES', label: `Lịch sử xuất (${stockIssues.length})` },
            { key: 'TRANSFERS', label: `Điều chuyển (${stockTransfers.length})` },
            { key: 'COUNTS', label: `Kiểm kê (${inventoryCounts.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row (Screen 11 KPI) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">Tổng SKU vật tư</span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">320</span>
          <span className="text-[10px] text-slate-400">Đang lưu hành</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 font-medium block">Giá trị tồn kho</span>
          <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block">182.5 tr</span>
          <span className="text-[10px] text-emerald-600">Theo giá vốn FIFO/Bình quân</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-amber-700 font-medium block">Vật tư sắp hết</span>
          <span className="text-2xl font-bold font-mono text-amber-800 mt-1 block">8</span>
          <span className="text-[10px] text-amber-600">Cần mua bổ sung</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-rose-700 font-medium block">Lô sắp hết hạn</span>
          <span className="text-2xl font-bold font-mono text-rose-800 mt-1 block">5</span>
          <span className="text-[10px] text-rose-600">Ưu tiên xuất trước (FEFO)</span>
        </div>
      </div>

      {/* TAB 1: STOCK INVENTORY TABLE (Screen 11 Table) */}
      {activeTab === 'STOCK' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã lô (LOT-NPK-...), tên vật tư..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
              >
                <option value="ALL">Tất cả lô</option>
                <option value="ACTIVE">Đang sử dụng</option>
                <option value="EXPIRING">Sắp hết hạn</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Vật tư & Mã</th>
                    <th className="py-3 px-3">Mã Lô (Batch)</th>
                    <th className="py-3 px-3">Tồn thực tế</th>
                    <th className="py-3 px-3">Khả dụng (Available)</th>
                    <th className="py-3 px-3">Tạm giữ (Reserved)</th>
                    <th className="py-3 px-3">Hạn sử dụng</th>
                    <th className="py-3 px-3">Kho & Vị trí kệ</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBatch(b)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 group-hover:text-emerald-700">
                          {b.materialName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">{b.materialCode}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {b.batchNumber}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {b.currentQty} {b.unit}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-800 font-semibold">
                        {b.currentQty - b.reservedQty} {b.unit}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {b.reservedQty} {b.unit}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span
                          className={`${
                            b.status === 'EXPIRING'
                              ? 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                              : 'text-slate-800'
                          }`}
                        >
                          {b.expiryDate}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{b.warehouseName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.locationRack}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            b.status === 'EXPIRING'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {b.status === 'EXPIRING' ? 'Sắp hết hạn' : 'Bình thường'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-slate-400 group-hover:text-emerald-700 text-xs font-medium inline-flex items-center gap-0.5">
                          Xem lô <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK ISSUES LOG (Screen 13 Log) */}
      {activeTab === 'ISSUES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Mã phiếu</th>
                  <th className="py-3 px-3">Ngày xuất</th>
                  <th className="py-3 px-3">Kho xuất</th>
                  <th className="py-3 px-3">Loại xuất & Đối tượng sử dụng</th>
                  <th className="py-3 px-3">Vật tư & Số lượng</th>
                  <th className="py-3 px-3">Tổng chi phí</th>
                  <th className="py-3 px-3">Người xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{issue.code}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{issue.date}</td>
                    <td className="py-3 px-3 text-slate-800">{issue.warehouseName}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{issue.targetName}</div>
                      <div className="text-[10px] text-slate-400">{issue.issueTypeLabel}</div>
                    </td>
                    <td className="py-3 px-3">
                      {issue.items.map((it, idx) => (
                        <div key={idx} className="font-mono">
                          {it.materialName}: <strong>{it.qty} {it.unit}</strong>
                          <span className="text-[10px] text-slate-400 ml-1">({it.batchNumber})</span>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                      {issue.totalCost.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-3 text-slate-700">{issue.issuedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK TRANSFERS LOG (Screen 14 Log) */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Mã điều chuyển</th>
                  <th className="py-3 px-3">Ngày</th>
                  <th className="py-3 px-3">Từ kho</th>
                  <th className="py-3 px-3">Đến kho</th>
                  <th className="py-3 px-3">Vật tư & Số lượng</th>
                  <th className="py-3 px-3">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockTransfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{tr.code}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{tr.date}</td>
                    <td className="py-3 px-3 text-slate-800 font-medium">{tr.fromWarehouseName}</td>
                    <td className="py-3 px-3 text-emerald-800 font-medium">{tr.toWarehouseName}</td>
                    <td className="py-3 px-3 font-mono">
                      {tr.items.map((it, idx) => (
                        <div key={idx}>
                          {it.materialName}: <strong>{it.qty} {it.unit}</strong>
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{tr.transferredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY COUNTS (Screen 15) */}
      {activeTab === 'COUNTS' && (
        <div className="space-y-3">
          {inventoryCounts.map((count) => (
            <div key={count.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Đợt kiểm kê {count.code} • {count.warehouseName}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Ngày: {count.date} • Duyệt bởi: {count.approvedBy}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Đã hoàn tất kiểm kê & đồng bộ tồn
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Vật tư & Lô</th>
                      <th className="py-2 px-3">Tồn hệ thống</th>
                      <th className="py-2 px-3">Tồn thực tế</th>
                      <th className="py-2 px-3">Chênh lệch</th>
                      <th className="py-2 px-3">Lý do điều chỉnh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {count.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">
                          {it.materialName} ({it.batchNumber})
                        </td>
                        <td className="py-2 px-3 text-slate-600">{it.systemQty} {it.unit}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{it.actualQty} {it.unit}</td>
                        <td className="py-2 px-3 font-bold">
                          {it.diffQty === 0 ? (
                            <span className="text-emerald-700">Khớp</span>
                          ) : (
                            <span className="text-rose-700">{it.diffQty} {it.unit}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600">{it.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screen 12: Batch Detail Modal / Drawer */}
      <RightDrawer
        isOpen={!!selectedBatch}
        onClose={() => setSelectedBatch(null)}
        title={selectedBatch?.batchNumber || 'Chi tiết Lô hàng'}
        subtitle={selectedBatch?.materialName}
        width="w-full sm:w-[540px]"
      >
        {selectedBatch && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Ngày nhập kho:</span>
                <span className="font-mono font-bold text-slate-900">{selectedBatch.importDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Hạn sử dụng:</span>
                <span className="font-mono font-bold text-rose-700">{selectedBatch.expiryDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Số lượng ban đầu:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedBatch.initialQty} {selectedBatch.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Còn lại hiện tại:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {selectedBatch.currentQty} {selectedBatch.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kho & Vị trí:</span>
                <span className="font-semibold text-slate-800">
                  {selectedBatch.warehouseName} ({selectedBatch.locationRack})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Nhà cung cấp:</span>
                <span className="font-medium text-slate-800">{selectedBatch.supplierName}</span>
              </div>
            </div>

            {/* Timeline (Screen 12 Timeline) */}
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider block mb-2">
                Nhật ký biến động lô ({selectedBatch.transactions.length})
              </span>
              <div className="relative border-l-2 border-slate-200 pl-4 space-y-4 ml-1">
                {selectedBatch.transactions.map((tx, idx) => (
                  <div key={idx} className="relative">
                    <span
                      className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        tx.type === 'IMPORT' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                    ></span>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{tx.date}</span>
                      <span>{tx.actor}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold mt-0.5">
                      <span className="text-slate-900">
                        {tx.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'} ({tx.refCode})
                      </span>
                      <span
                        className={`font-mono ${
                          tx.qtyChange > 0 ? 'text-emerald-700' : 'text-blue-700'
                        }`}
                      >
                        {tx.qtyChange > 0 ? `+${tx.qtyChange}` : tx.qtyChange} {selectedBatch.unit}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Tồn sau giao dịch: {tx.remainingQty} {selectedBatch.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </RightDrawer>

      {/* Screen 13: Stock Issue Modal */}
      {isIssueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Xuất Kho Vật Tư Nông Nghiệp</h3>
              </div>
              <button
                onClick={() => setIsIssueOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kho xuất *:</label>
                  <select
                    value={issueWh}
                    onChange={(e) => setIssueWh(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    <option value="wh-main">Kho tổng An Phú</option>
                    <option value="wh-north">Kho phân bón Khu Bắc</option>
                    <option value="wh-iot">Kho thiết bị kỹ thuật & IoT</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loại xuất *:</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    <option value="PLANT">Cá thể cây trồng (Trực tiếp)</option>
                    <option value="TASK">Công việc nông vụ (Task)</option>
                    <option value="ZONE">Phân khu / Lô vườn</option>
                    <option value="EQUIPMENT">Bảo trì thiết bị</option>
                    <option value="DISPOSAL">Hủy hỏng hóc</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Target Selector */}
              {issueType === 'PLANT' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Cá thể cây thụ hưởng * (Tự cập nhật nhật ký & chi phí cây):
                  </label>
                  <select
                    value={issueTargetPlant}
                    onChange={(e) => setIssueTargetPlant(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        Cây #{p.code} - {p.variety} ({p.zoneName}, {p.rowName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {issueType === 'TASK' && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Công việc tiếp nhận *:</label>
                  <select
                    value={issueTargetTask}
                    onChange={(e) => setIssueTargetTask(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.zoneName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Material & Batch Selector (FEFO Auto Recommend) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vật tư xuất *:</label>
                  <select
                    value={issueMaterialId}
                    onChange={(e) => {
                      setIssueMaterialId(e.target.value);
                      const matchingBatch = materialBatches.find(
                        (b) => b.materialId === e.target.value && b.currentQty > 0
                      );
                      if (matchingBatch) setIssueBatchNumber(matchingBatch.batchNumber);
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Lô hàng (Đề xuất FEFO) *:
                  </label>
                  <select
                    value={issueBatchNumber}
                    onChange={(e) => setIssueBatchNumber(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 uppercase"
                  >
                    {materialBatches
                      .filter((b) => b.materialId === issueMaterialId && b.currentQty > 0)
                      .map((b) => (
                        <option key={b.id} value={b.batchNumber}>
                          {b.batchNumber} (Tồn {b.currentQty} {b.unit} - HSD {b.expiryDate})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số lượng xuất *:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={issueQty}
                    onChange={(e) => setIssueQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    {materials.find((m) => m.id === issueMaterialId)?.unit || 'kg'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 leading-relaxed">
                ✓ <strong>Tự động hóa:</strong> Tồn kho sẽ giảm ngay, chi phí sẽ phân bổ vào mục tiêu và cập nhật trực tiếp vào nhật ký cá thể cây.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIssueOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Xác nhận xuất kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screen 14: Stock Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Điều Chuyển Kho Vật Tư</h3>
              </div>
              <button
                onClick={() => setIsTransferOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kho nguồn *:</label>
                  <select
                    value={transferFromWh}
                    onChange={(e) => setTransferFromWh(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="wh-main">Kho tổng An Phú</option>
                    <option value="wh-north">Kho phân bón Khu Bắc</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kho đích *:</label>
                  <select
                    value={transferToWh}
                    onChange={(e) => setTransferToWh(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="wh-north">Kho phân bón Khu Bắc</option>
                    <option value="wh-main">Kho tổng An Phú</option>
                    <option value="wh-iot">Kho thiết bị IoT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vật tư chuyển:</label>
                <select
                  value={transferMaterialId}
                  onChange={(e) => setTransferMaterialId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lô hàng:</label>
                  <input
                    type="text"
                    value={transferBatch}
                    onChange={(e) => setTransferBatch(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số lượng chuyển:</label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Xác nhận điều chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screen 15: Inventory Count Modal */}
      {isCountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-base">Tạo Đợt Kiểm Kê Kho Thực Tế</h3>
              </div>
              <button
                onClick={() => setIsCountOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCountSubmit} className="space-y-4 text-xs">
              <div className="space-y-2">
                {countItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>{materials.find((m) => m.id === item.materialId)?.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{item.batchNumber}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Tồn hệ thống:</span>
                        <span className="font-bold text-slate-800">{item.systemQty}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Tồn thực đếm:</span>
                        <input
                          type="number"
                          value={item.actualQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setCountItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, actualQty: val } : it))
                            );
                          }}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Chênh lệch:</span>
                        <span
                          className={`font-bold ${
                            item.actualQty - item.systemQty < 0
                              ? 'text-rose-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {item.actualQty - item.systemQty}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                Sau khi xác nhận duyệt, hệ thống sẽ tự động cập nhật số lượng tồn kho và ghi nhật ký kiểm toán (Audit Log).
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCountOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Duyệt kết quả & Điều chỉnh tồn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
