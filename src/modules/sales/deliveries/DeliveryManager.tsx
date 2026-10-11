import React, { useState } from 'react';
import {
  Truck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  PackageCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  Eye,
  X,
  FileText,
  AlertTriangle,
  PenTool,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { DeliveryNote, DeliveryStatus } from '../../../types';

export const DeliveryManager: React.FC = () => {
  const { deliveries, confirmPickingAndDispatch, confirmDeliverySuccess, navigate } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(deliveries[0]?.id || null);

  const selectedDelivery = deliveries.find((d) => d.id === selectedDeliveryId) || deliveries[0] || null;

  // Delivery confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('Nguyễn Văn Tuấn (Bếp trưởng)');
  const [confirmNotes, setConfirmNotes] = useState('Đã kiểm tra chất lượng dừa tươi cuống xanh, nước ngọt đạt chuẩn, không nứt vỡ.');

  const filteredDeliveries = deliveries.filter((d) => {
    const matchSearch =
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.driverName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColors: Record<DeliveryStatus, string> = {
    PLANNED: 'bg-slate-100 text-slate-700 border-slate-300',
    PICKING: 'bg-amber-50 text-amber-700 border-amber-200',
    READY: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold',
    SHIPPING: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const statusLabels: Record<DeliveryStatus, string> = {
    PLANNED: 'Lập kế hoạch',
    PICKING: 'Đang soạn hàng',
    READY: 'Sẵn sàng xuất',
    SHIPPING: 'Đang vận chuyển',
    DELIVERED: 'Đã giao thành công',
    FAILED: 'Giao thất bại',
    CANCELLED: 'Đã hủy',
  };

  const handleOpenConfirmModal = () => {
    setIsConfirmModalOpen(true);
  };

  const handleExecuteDeliveryConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDelivery || !recipientName.trim()) return;
    confirmDeliverySuccess(selectedDelivery.id, recipientName, confirmNotes);
    setIsConfirmModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Vận chuyển & Giao nhận
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 17, 18, 19</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Điều Phối Giao Hàng & Soạn Hàng (Picking)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi đội xe lạnh, xuất kho theo mã lô và ghi nhận chữ ký/ảnh giao nhận thực địa
          </p>
        </div>

        <button
          onClick={() => navigate('/sales/orders')}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <span>Tạo từ Đơn hàng</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã phiếu / Đơn hàng / Tài xế..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái vận chuyển</option>
            <option value="READY">Sẵn sàng xuất (READY)</option>
            <option value="SHIPPING">Đang trên đường (SHIPPING)</option>
            <option value="DELIVERED">Đã giao thành công (DELIVERED)</option>
            <option value="PLANNED">Lên kế hoạch (PLANNED)</option>
          </select>
        </div>
      </div>

      {/* Grid: Deliveries List + Detail Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Deliveries List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-500 px-1">
            Hiển thị {filteredDeliveries.length} phiếu giao hàng
          </div>

          <div className="space-y-3">
            {filteredDeliveries.map((del) => {
              const isSelected = selectedDelivery?.id === del.id;
              const totalQty = del.items.reduce((acc, curr) => acc + curr.quantityToDeliver, 0);

              return (
                <div
                  key={del.id}
                  onClick={() => setSelectedDeliveryId(del.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 hover:border-emerald-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800">
                          {del.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] border ${
                            statusColors[del.status]
                          }`}
                        >
                          {statusLabels[del.status] || del.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-xs mt-1">
                        {del.customerName}
                      </h3>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Đơn: {del.orderCode} • Hẹn: {del.plannedDate}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800">
                        {totalQty.toLocaleString('vi-VN')} trái
                      </span>
                      <div className="text-[10px] text-slate-400">{del.items.length} mặt hàng</div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[200px]">Xe: {del.vehicle}</span>
                    <span>Tài xế: {del.driverName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Delivery Detail (7 Cols - Screen 19) */}
        <div className="lg:col-span-7">
          {selectedDelivery ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 sticky top-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-lg">
                      {selectedDelivery.code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        statusColors[selectedDelivery.status]
                      }`}
                    >
                      ● {statusLabels[selectedDelivery.status] || selectedDelivery.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 mt-1">
                    Giao hàng: {selectedDelivery.customerName}
                  </h2>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center gap-2">
                  {selectedDelivery.status === 'READY' && (
                    <button
                      onClick={() => confirmPickingAndDispatch(selectedDelivery.id)}
                      className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Xuất bến (Shipping)</span>
                    </button>
                  )}

                  {selectedDelivery.status === 'SHIPPING' && (
                    <button
                      onClick={handleOpenConfirmModal}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Xác nhận giao thành công</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery Info Block */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400 text-[10px]">Đơn hàng liên kết:</div>
                  <div className="font-mono font-bold text-emerald-800">{selectedDelivery.orderCode}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Thời gian hẹn giao:</div>
                  <div className="font-semibold text-slate-800">{selectedDelivery.plannedDate}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Phương tiện vận chuyển:</div>
                  <div className="font-semibold text-slate-800">{selectedDelivery.vehicle}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Tài xế & Số điện thoại:</div>
                  <div className="font-semibold text-slate-800">
                    {selectedDelivery.driverName} ({selectedDelivery.driverPhone})
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <div className="text-slate-400 text-[10px]">Địa chỉ giao hàng thực tế:</div>
                  <div className="font-medium text-slate-800">{selectedDelivery.deliveryAddress}</div>
                </div>
              </div>

              {/* Item Picking Table (Section 38) */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sản phẩm & Chi tiết Lô xuất kho (Picking)</span>
                </h3>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Sản phẩm</th>
                        <th className="py-2.5 px-3 text-right">SL Giao</th>
                        <th className="py-2.5 px-3 text-left">Lô thành phẩm chỉ định</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDelivery.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {item.productName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                            {item.quantityToDeliver} {item.unit}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {item.lots.map((lot, lIdx) => (
                                <span
                                  key={lIdx}
                                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px]"
                                >
                                  {lot.lotCode}: {lot.qty} {item.unit}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Stepper / Timeline (Section 39) */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Hành trình giao nhận & Kiểm tra thực tế</span>
                </h3>

                <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-2 text-xs">
                  {selectedDelivery.timeline.map((step, sIdx) => (
                    <div key={sIdx} className="relative pb-2">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                      <div className="text-[10px] text-slate-400 font-mono">{step.time}</div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5">{step.stage}</div>
                      <div className="text-slate-600 text-[11px]">{step.note}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Proof Details if Delivered */}
              {selectedDelivery.status === 'DELIVERED' && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Chứng từ giao nhận hoàn tất</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      Người ký nhận: <strong>{selectedDelivery.recipientName}</strong>
                    </div>
                    <div>
                      Thời gian thực giao: <strong>{selectedDelivery.actualDate || selectedDelivery.plannedDate}</strong>
                    </div>
                  </div>
                  {selectedDelivery.notes && (
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-emerald-200">
                      <strong>Ghi chú nhận hàng:</strong> {selectedDelivery.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Chọn phiếu giao hàng để xem hành trình
            </div>
          )}
        </div>
      </div>

      {/* Modal Xác nhận giao hàng thành công */}
      {isConfirmModalOpen && selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">
                Xác nhận Giao Hàng Thành Công: {selectedDelivery.code}
              </h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteDeliveryConfirm} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Họ tên người nhận hàng (Khách hàng) *
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Anh Tuấn Bếp trưởng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Ghi chú kiểm tra số lượng & chất lượng
                </label>
                <textarea
                  rows={3}
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-500 italic">
                ✓ Sau khi xác nhận: Trạng thái đơn hàng sẽ cập nhật sang ĐÃ GIAO / HOÀN TẤT và công nợ khách hàng được đối soát tự động.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold shadow-sm"
                >
                  Xác nhận giao hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
