import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Zap,
  Package,
  Calendar,
  Building,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { PurchaseOrder, PurchaseOrderStatus } from '../../../types';
import { RightDrawer } from '../../../components/common/RightDrawer';

export const PurchaseManager: React.FC = () => {
  const {
    purchaseOrders,
    suppliers,
    materials,
    createPurchaseOrder,
    receivePurchaseOrder,
    quickDirectPurchase,
    showToast,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);

  // Create PO Form State
  const [createSupplierId, setCreateSupplierId] = useState(suppliers[0]?.id || 'sup-01');
  const [createWarehouse, setCreateWarehouse] = useState('wh-main');
  const [createExpectedDate, setCreateExpectedDate] = useState(
    new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [createItems, setCreateItems] = useState<
    { materialId: string; qty: number; unitPrice: number }[]
  >([{ materialId: materials[0]?.id || 'mat-fert-01', qty: 200, unitPrice: 18000 }]);
  const [createShipping, setCreateShipping] = useState<number>(250000);
  const [createTaxRate, setCreateTaxRate] = useState<number>(10);

  // Receiving Form State (For selected PO)
  const [receivingItems, setReceivingItems] = useState<{
    [materialId: string]: { qty: number; lotNumber: string; expiryDate: string };
  }>({});
  const [receivingInvoice, setReceivingInvoice] = useState('');
  const [receivingNotes, setReceivingNotes] = useState('');

  // Quick Purchase Form State
  const [quickSupplierId, setQuickSupplierId] = useState(suppliers[0]?.id || 'sup-01');
  const [quickMaterialId, setQuickMaterialId] = useState(materials[0]?.id || 'mat-fert-01');
  const [quickQty, setQuickQty] = useState<number>(100);
  const [quickPrice, setQuickPrice] = useState<number>(18000);
  const [quickLot, setQuickLot] = useState(`LOT-${Date.now().toString().slice(-6)}`);
  const [quickExpiry, setQuickExpiry] = useState('2027-05-20');
  const [quickWh, setQuickWh] = useState('Kho tổng An Phú');

  // Filtered POs
  const filteredPOs = purchaseOrders.filter((po) => {
    const matchSearch =
      po.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Create PO Calculations
  const createSubtotal = createItems.reduce(
    (sum, it) => sum + it.qty * it.unitPrice,
    0
  );
  const createTaxAmount = Math.round(createSubtotal * (createTaxRate / 100));
  const createTotal = createSubtotal + createTaxAmount + createShipping;

  const handleAddItemRow = () => {
    setCreateItems((prev) => [
      ...prev,
      { materialId: materials[0]?.id || 'mat-fert-01', qty: 50, unitPrice: 15000 },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setCreateItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === createSupplierId) || suppliers[0];
    const poCode = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const itemsMapped = createItems.map((it) => {
      const mat = materials.find((m) => m.id === it.materialId);
      return {
        materialId: it.materialId,
        materialName: mat ? mat.name : 'Vật tư',
        materialCode: mat ? mat.code : '',
        unit: mat ? mat.unit : 'kg',
        orderedQty: it.qty,
        receivedQty: 0,
        unitPrice: it.unitPrice,
        discountPercent: 0,
        subtotal: it.qty * it.unitPrice,
      };
    });

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      code: poCode,
      supplierId: sup.id,
      supplierName: sup.name,
      orderDate: new Date().toLocaleDateString('vi-VN'),
      expectedDeliveryDate: createExpectedDate,
      warehouseId: createWarehouse,
      warehouseName:
        createWarehouse === 'wh-main'
          ? 'Kho tổng An Phú'
          : createWarehouse === 'wh-north'
          ? 'Kho phân bón Khu Bắc'
          : 'Kho thiết bị kỹ thuật & IoT',
      items: itemsMapped,
      subtotal: createSubtotal,
      taxAmount: createTaxAmount,
      shippingFee: createShipping,
      totalAmount: createTotal,
      status: 'ORDERED',
      receipts: [],
    };

    createPurchaseOrder(newPO);
    setIsCreateOpen(false);
    setSelectedPO(newPO);
  };

  // Open Receiving Modal for PO
  const handleOpenReceiving = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialRecState: any = {};
    po.items.forEach((it) => {
      const remaining = it.orderedQty - it.receivedQty;
      initialRecState[it.materialId] = {
        qty: remaining > 0 ? remaining : 0,
        lotNumber: `LOT-${po.code.replace(/\D/g, '')}-${Date.now().toString().slice(-4)}`,
        expiryDate: '2027-05-20',
      };
    });
    setReceivingItems(initialRecState);
    setIsReceivingOpen(true);
  };

  const handleConfirmReceiving = () => {
    if (!selectedPO) return;

    const receiptPayload = Object.entries(receivingItems)
      .filter(([_, data]) => data.qty > 0)
      .map(([materialId, data]) => ({
        materialId,
        qty: data.qty,
        lotNumber: data.lotNumber || `LOT-${Date.now().toString().slice(-6)}`,
        expiryDate: data.expiryDate || '2027-12-31',
      }));

    if (receiptPayload.length === 0) {
      showToast('Vui lòng nhập số lượng nhận > 0', 'warning');
      return;
    }

    receivePurchaseOrder(
      selectedPO.id,
      receiptPayload,
      selectedPO.warehouseName,
      receivingInvoice,
      receivingNotes
    );

    setIsReceivingOpen(false);
    setSelectedPO(null);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    quickDirectPurchase(
      quickSupplierId,
      quickMaterialId,
      quickQty,
      quickPrice,
      quickLot,
      quickExpiry,
      quickWh
    );
    setIsQuickOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Đơn Mua Hàng & Tiến Độ Giao Nhận
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Procurement & Receiving
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý quy trình đặt hàng từ đối tác, nhận hàng tự động tăng tồn kho và đối soát công nợ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQuickOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Mua nhanh trực tiếp</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo đơn mua (PO)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã PO (PO-2026-00125...), nhà cung cấp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-slate-500 mr-2 font-medium">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ORDERED">Đã đặt</option>
              <option value="SHIPPING">Đang giao</option>
              <option value="PARTIALLY_RECEIVED">Nhận một phần</option>
              <option value="COMPLETED">Hoàn tất (Đã nhận đủ)</option>
              <option value="DRAFT">Bản nháp</option>
            </select>
          </div>
          <span className="text-slate-400 font-mono text-xs pl-2">
            {filteredPOs.length} đơn hàng
          </span>
        </div>
      </div>

      {/* Purchase Orders Table (Screen 06) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Mã PO</th>
                <th className="py-3 px-3">Nhà cung cấp</th>
                <th className="py-3 px-3">Ngày đặt</th>
                <th className="py-3 px-3">Dự kiến giao</th>
                <th className="py-3 px-3">Tổng giá trị</th>
                <th className="py-3 px-3">Tiến độ nhận hàng</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.map((po) => {
                const totalOrdered = po.items.reduce((s, it) => s + it.orderedQty, 0);
                const totalReceived = po.items.reduce((s, it) => s + it.receivedQty, 0);
                const progressPct =
                  totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

                return (
                  <tr
                    key={po.id}
                    onClick={() => setSelectedPO(po)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 group-hover:text-emerald-700">
                      {po.code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 group-hover:text-emerald-700">
                        {po.supplierName}
                      </div>
                      <div className="text-[10px] text-slate-400">{po.warehouseName}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{po.orderDate}</td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-medium">
                      {po.expectedDeliveryDate}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {po.totalAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] mb-1">
                        <span className="font-bold text-slate-900">{totalReceived}</span>
                        <span className="text-slate-400">/ {totalOrdered}</span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-28 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            progressPct === 100 ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                          po.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : po.status === 'PARTIALLY_RECEIVED'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : po.status === 'SHIPPING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {po.status === 'COMPLETED'
                          ? 'Đã nhận đủ'
                          : po.status === 'PARTIALLY_RECEIVED'
                          ? 'Nhận một phần'
                          : po.status === 'SHIPPING'
                          ? 'Đang giao'
                          : 'Đã đặt'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {po.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenReceiving(po)}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-2xs"
                          >
                            Nhận hàng
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPO(po)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded text-[11px]"
                        >
                          Chi tiết
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

      {/* Screen 08: Purchase Order Detail Drawer */}
      <RightDrawer
        isOpen={!!selectedPO && !isReceivingOpen}
        onClose={() => setSelectedPO(null)}
        title={selectedPO?.code || 'Chi tiết đơn mua hàng'}
        subtitle={`Nhà cung cấp: ${selectedPO?.supplierName}`}
        width="w-full sm:w-[600px]"
        footerActions={
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setSelectedPO(null)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Đóng
            </button>
            {selectedPO && selectedPO.status !== 'COMPLETED' && (
              <button
                onClick={() => handleOpenReceiving(selectedPO)}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5" /> Xác nhận nhận hàng vào kho
              </button>
            )}
          </div>
        }
      >
        {selectedPO && (
          <div className="space-y-4 text-xs">
            {/* Progress Bar (Screen 08 Progress) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-2">
                Quy trình xử lý đơn hàng
              </span>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã đặt hàng
                </div>
                <div className="w-8 h-0.5 bg-emerald-400"></div>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đang giao
                </div>
                <div className="w-8 h-0.5 bg-emerald-400"></div>
                <div
                  className={`flex items-center gap-1.5 font-semibold ${
                    selectedPO.status === 'COMPLETED' || selectedPO.status === 'PARTIALLY_RECEIVED'
                      ? 'text-emerald-800'
                      : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      selectedPO.status === 'COMPLETED' || selectedPO.status === 'PARTIALLY_RECEIVED'
                        ? 'text-emerald-600'
                        : 'text-slate-300'
                    }`}
                  />
                  Đã nhận hàng
                </div>
                <div className="w-8 h-0.5 bg-slate-200"></div>
                <div
                  className={`flex items-center gap-1.5 font-semibold ${
                    selectedPO.status === 'COMPLETED' ? 'text-emerald-800' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      selectedPO.status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  />
                  Hoàn tất
                </div>
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Ngày đặt hàng:</span>
                <span className="font-mono font-semibold text-slate-800">{selectedPO.orderDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Dự kiến giao hàng:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedPO.expectedDeliveryDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kho tiếp nhận:</span>
                <span className="font-semibold text-slate-900">{selectedPO.warehouseName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tổng thanh toán:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {selectedPO.totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Items Table (Screen 08 Item Table) */}
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider block mb-2">
                Chi tiết vật tư đặt mua
              </span>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Vật tư</th>
                      <th className="py-2.5 px-3">Đặt</th>
                      <th className="py-2.5 px-3">Đã nhận</th>
                      <th className="py-2.5 px-3">Còn lại</th>
                      <th className="py-2.5 px-3">Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedPO.items.map((it, idx) => {
                      const rem = it.orderedQty - it.receivedQty;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                            {it.materialName}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {it.orderedQty} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700 font-bold">
                            {it.receivedQty} {it.unit}
                          </td>
                          <td className="py-2.5 px-3 text-amber-700 font-bold">
                            {rem > 0 ? `${rem} ${it.unit}` : '0 (Đủ)'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {it.unitPrice.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Receipts Log */}
            {selectedPO.receipts && selectedPO.receipts.length > 0 && (
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wider block mb-2">
                  Lịch sử các đợt nhận hàng ({selectedPO.receipts.length})
                </span>
                <div className="space-y-2">
                  {selectedPO.receipts.map((rc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-semibold text-emerald-950 font-mono">
                          Đợt {idx + 1} • {rc.receivedDate}
                        </span>
                        <span className="text-[10px] text-slate-500">Người nhận: {rc.receivedBy}</span>
                      </div>
                      <div className="text-slate-600">
                        {rc.items.map((it, i) => (
                          <div key={i} className="font-mono text-[11px]">
                            ✓ Nhận {it.qty} {materials.find((m) => m.id === it.materialId)?.unit || 'kg'} • Lô:{' '}
                            <strong>{it.lotNumber}</strong> (HSD: {it.expiryDate})
                          </div>
                        ))}
                      </div>
                      {rc.invoiceNumber && (
                        <div className="text-[10px] text-slate-500 italic">
                          Số hóa đơn GTGT: {rc.invoiceNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </RightDrawer>

      {/* Screen 09: Goods Receiving Modal (Nghiệp vụ quan trọng nhất) */}
      {isReceivingOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Nhận hàng từ đơn mua {selectedPO.code}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Kho tự động tăng tồn & sinh lô hàng ngay sau khi xác nhận
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsReceivingOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Purchase Information */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Nhà cung cấp:</span>
                <span className="font-semibold text-slate-900">{selectedPO.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kho tiếp nhận:</span>
                <span className="font-semibold text-slate-900">{selectedPO.warehouseName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Ngày thực nhận:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {new Date().toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Receive Table (Screen 09) */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 text-xs block">
                Xác nhận số lượng thực nhận lần này:
              </span>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Vật tư</th>
                      <th className="py-2.5 px-3">Đặt mua</th>
                      <th className="py-2.5 px-3">Đã nhận</th>
                      <th className="py-2.5 px-3">Còn lại</th>
                      <th className="py-2.5 px-3">Nhận lần này *</th>
                      <th className="py-2.5 px-3">Mã Lô *</th>
                      <th className="py-2.5 px-3">Hạn sử dụng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedPO.items.map((it) => {
                      const rem = it.orderedQty - it.receivedQty;
                      const cur = receivingItems[it.materialId] || {
                        qty: rem,
                        lotNumber: `LOT-${selectedPO.code.replace(/\D/g, '')}`,
                        expiryDate: '2027-05-20',
                      };
                      return (
                        <tr key={it.materialId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                            {it.materialName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{it.orderedQty}</td>
                          <td className="py-2.5 px-3 text-emerald-700">{it.receivedQty}</td>
                          <td className="py-2.5 px-3 text-amber-700 font-bold">{rem}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              max={rem}
                              value={cur.qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReceivingItems((prev) => ({
                                  ...prev,
                                  [it.materialId]: { ...cur, qty: val },
                                }));
                              }}
                              className="w-16 px-2 py-1 border border-emerald-300 rounded font-bold text-emerald-800 bg-white"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={cur.lotNumber}
                              onChange={(e) => {
                                setReceivingItems((prev) => ({
                                  ...prev,
                                  [it.materialId]: { ...cur, lotNumber: e.target.value },
                                }));
                              }}
                              className="w-28 px-2 py-1 border border-slate-200 rounded text-xs uppercase"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={cur.expiryDate}
                              onChange={(e) => {
                                setReceivingItems((prev) => ({
                                  ...prev,
                                  [it.materialId]: { ...cur, expiryDate: e.target.value },
                                }));
                              }}
                              className="w-24 px-2 py-1 border border-slate-200 rounded text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Số hóa đơn / Phiếu xuất kho:</label>
                <input
                  type="text"
                  placeholder="HD-ABC-..."
                  value={receivingInvoice}
                  onChange={(e) => setReceivingInvoice(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú tình trạng hàng:</label>
                <input
                  type="text"
                  placeholder="Hàng nguyên đai nguyên kiện..."
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-emerald-700 font-medium">
                ✓ Kho sẽ tự động tăng và công nợ NCC sẽ được hạch toán ngay.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsReceivingOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmReceiving}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
                >
                  Xác nhận nhận hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 07: Create Purchase Order Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">Tạo Đơn Mua Hàng Mới (PO)</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Section 1: Supplier & Date */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nhà cung cấp *:</label>
                  <select
                    value={createSupplierId}
                    onChange={(e) => setCreateSupplierId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kho nhận *:</label>
                  <select
                    value={createWarehouse}
                    onChange={(e) => setCreateWarehouse(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 bg-white"
                  >
                    <option value="wh-main">Kho tổng An Phú</option>
                    <option value="wh-north">Kho phân bón Khu Bắc</option>
                    <option value="wh-iot">Kho thiết bị IoT</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dự kiến giao:</label>
                  <input
                    type="date"
                    value={createExpectedDate}
                    onChange={(e) => setCreateExpectedDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Section 2: Items Table (Editable lines) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider">Danh mục đặt mua</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm dòng
                  </button>
                </div>

                <div className="space-y-2">
                  {createItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-slate-50/70 border border-slate-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <select
                          value={item.materialId}
                          onChange={(e) => {
                            const newMat = materials.find((m) => m.id === e.target.value);
                            setCreateItems((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? {
                                      ...it,
                                      materialId: e.target.value,
                                      unitPrice: newMat?.latestPrice || it.unitPrice,
                                    }
                                  : it
                              )
                            );
                          }}
                          className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="SL"
                          value={item.qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setCreateItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, qty: val } : it))
                            );
                          }}
                          className="w-full px-2 py-1 font-mono border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="Đơn giá"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setCreateItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, unitPrice: val } : it))
                            );
                          }}
                          className="w-full px-2 py-1 font-mono border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>

                      <div className="w-28 text-right font-mono font-bold text-slate-800 text-xs">
                        {(item.qty * item.unitPrice).toLocaleString('vi-VN')} đ
                      </div>

                      {createItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Tạm tính tiền hàng:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {createSubtotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Thuế GTGT ({createTaxRate}%):</span>
                  <span className="font-mono text-slate-800">
                    {createTaxAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Cước vận chuyển:</span>
                  <span className="font-mono text-slate-800">
                    {createShipping.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 font-bold text-emerald-950 text-sm">
                  <span>Tổng giá trị đơn hàng:</span>
                  <span className="font-mono text-emerald-800">
                    {createTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Đặt hàng (Phát hành PO)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screen 10: Quick Direct Purchase Modal */}
      {isQuickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">Mua Nhanh Trực Tiếp Tại Đại Lý</h3>
              </div>
              <button
                onClick={() => setIsQuickOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nhà cung cấp:</label>
                <select
                  value={quickSupplierId}
                  onChange={(e) => setQuickSupplierId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vật tư mua:</label>
                <select
                  value={quickMaterialId}
                  onChange={(e) => {
                    setQuickMaterialId(e.target.value);
                    const mat = materials.find((m) => m.id === e.target.value);
                    if (mat && mat.latestPrice) setQuickPrice(mat.latestPrice);
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Số lượng:</label>
                  <input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={(e) => setQuickQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Đơn giá thực mua:</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={quickPrice}
                    onChange={(e) => setQuickPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mã Lô in trên bao:</label>
                  <input
                    type="text"
                    value={quickLot}
                    onChange={(e) => setQuickLot(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hạn sử dụng:</label>
                  <input
                    type="date"
                    value={quickExpiry}
                    onChange={(e) => setQuickExpiry(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kho nhập vào:</label>
                <select
                  value={quickWh}
                  onChange={(e) => setQuickWh(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                >
                  <option value="Kho tổng An Phú">Kho tổng An Phú</option>
                  <option value="Kho phân bón Khu Bắc">Kho phân bón Khu Bắc</option>
                  <option value="Kho thiết bị kỹ thuật & IoT">Kho thiết bị kỹ thuật & IoT</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg font-mono flex items-center justify-between">
                <span className="text-slate-700 font-sans">Tổng tiền thanh toán:</span>
                <span className="font-bold text-amber-900 text-sm">
                  {(quickQty * quickPrice).toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs"
                >
                  Hoàn tất mua & Tăng kho ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
