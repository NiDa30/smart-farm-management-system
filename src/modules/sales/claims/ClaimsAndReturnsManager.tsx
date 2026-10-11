import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  TreePine,
  Search,
  Filter,
  Plus,
  Eye,
  X,
  FileText,
  ShieldCheck,
  Building,
  Image,
  QrCode,
  Layers,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { CustomerClaim, SalesReturn, ReturnReason, ReturnResolution } from '../../../types';

export const ClaimsAndReturnsManager: React.FC = () => {
  const {
    customerClaims,
    salesReturns,
    createCustomerClaim,
    updateClaimStatus,
    createSalesReturn,
    customers,
    salesOrders,
    commercialProducts,
    finishedGoodsLots,
    navigate,
    setSelectedPlant,
    plants,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'CLAIMS' | 'RETURNS'>('CLAIMS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Drawer State (Screen 24)
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(customerClaims[0]?.id || null);
  const selectedClaim = customerClaims.find((c) => c.id === selectedClaimId) || customerClaims[0] || null;
  const [claimDetailTab, setClaimDetailTab] = useState<'INFO' | 'TRACE' | 'RESOLUTION'>('TRACE');

  // New Claim Modal
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [formCustId, setFormCustId] = useState(customers[0]?.id || '');
  const [formOrderId, setFormOrderId] = useState(salesOrders[0]?.id || '');
  const [formProductId, setFormProductId] = useState(commercialProducts[0]?.id || '');
  const [formLotCode, setFormLotCode] = useState(finishedGoodsLots[0]?.lotCode || '');
  const [formDefectQty, setFormDefectQty] = useState(20);
  const [formSeverity, setFormSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [formIssue, setFormIssue] = useState('Trái dừa bị nứt cuống và nước vị chua nhẹ');

  // New Return Modal
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState(salesOrders[0]?.id || '');
  const [returnQty, setReturnQty] = useState(10);
  const [returnReason, setReturnReason] = useState<ReturnReason>('DAMAGED');
  const [returnResolution, setReturnResolution] = useState<ReturnResolution>('CREDIT_NOTE');
  const [returnRefund, setReturnRefund] = useState(150000);
  const [returnNotes, setReturnNotes] = useState('Dập vỏ trong quá trình bốc dỡ tại nhà hàng');

  const filteredClaims = customerClaims.filter((c) => {
    const matchSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSaveClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === formCustId);
    const ord = salesOrders.find((o) => o.id === formOrderId);
    const prod = commercialProducts.find((p) => p.id === formProductId);
    const lot = finishedGoodsLots.find((l) => l.lotCode === formLotCode) || finishedGoodsLots[0];

    createCustomerClaim({
      customerId: cust?.id || 'CUST-0023',
      customerName: cust?.name || 'Khách hàng',
      orderId: ord?.id || 'SO-1028',
      orderCode: ord?.code || 'SO-2026-1028',
      deliveryId: 'DEL-0221',
      deliveryCode: 'DEL-2026-0221',
      productId: prod?.id || 'PROD-COC-A',
      productName: prod?.name || 'Dừa xiêm xanh loại A',
      lotId: lot.id,
      lotCode: lot.lotCode,
      harvestBatchId: lot.harvestBatchCode,
      farmArea: lot.farmArea,
      plantCodes: lot.plantCodes,
      quantityDefected: Number(formDefectQty),
      unit: 'trái',
      issueDescription: formIssue,
      severity: formSeverity,
      photos: ['https://images.unsplash.com/photo-1544860707-c352cc5a92e3?w=500&auto=format&fit=crop&q=60'],
      investigationNotes: 'Hệ thống đã tự động liên kết mã lô thành phẩm và cá thể cây trồng tương ứng để đối soát.',
      rootCause: 'Đang tiến hành kiểm tra nhật ký thời tiết và lịch tưới nước.',
      correctiveAction: 'Thêm đệm mút bảo vệ khi vận chuyển và kiểm tra áp suất vỏ trước xuất.',
      resolutionOutcome: 'Dự kiến đổi bù miễn phí 20 trái vào chuyến hàng kế tiếp.',
    });

    setIsNewClaimOpen(false);
  };

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const ord = salesOrders.find((o) => o.id === returnOrderId);
    if (!ord) return;

    createSalesReturn({
      orderId: ord.id,
      orderCode: ord.code,
      deliveryId: 'DEL-0221',
      customerId: ord.customerId,
      customerName: ord.customerName,
      items: [
        {
          productId: ord.items[0]?.productId || 'PROD-COC-A',
          productName: ord.items[0]?.productName || 'Dừa xiêm loại A',
          lotCode: ord.items[0]?.allocatedLots[0]?.lotCode || 'LOT-COC-A-20261005',
          returnQty: Number(returnQty),
          unit: 'trái',
          reason: returnReason,
          resolution: returnResolution,
          refundAmountVnd: Number(returnRefund),
        },
      ],
      returnDate: new Date().toISOString().split('T')[0],
      notes: returnNotes,
    });

    setIsNewReturnOpen(false);
  };

  const handleInspectPlant = (plantCode: string) => {
    const found = plants.find((p) => p.code === plantCode);
    if (found) {
      setSelectedPlant(found);
      navigate(`/production/plants/${found.id}`);
    } else {
      navigate('/production/plants');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
              QC & Hậu mãi
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 22, 23, 24: Claims & Returns</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            Khiếu Nại Chất Lượng, Trả Hàng & Truy Xuất Nguồn Gốc Cây
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Truy vết ngược từ sự cố khách hàng phản ánh → Đơn hàng → Lô thành phẩm → Đợt thu hoạch → Cá thể cây trồng cụ thể
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewClaimOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>+ Tạo khiếu nại (Claim)</span>
          </button>
          <button
            onClick={() => setIsNewReturnOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>+ Lập phiếu trả hàng</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('CLAIMS')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'CLAIMS'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Hồ sơ khiếu nại chất lượng ({customerClaims.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RETURNS')}
          className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'RETURNS'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Phiếu hàng trả lại ({salesReturns.length})</span>
        </button>
      </div>

      {/* Tab 1: Claims List & Detail (Screen 23 & 24) */}
      {activeTab === 'CLAIMS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Claims List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã khiếu nại / Khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              {filteredClaims.map((claim) => {
                const isSelected = selectedClaim?.id === claim.id;

                const severityBadges: Record<string, string> = {
                  LOW: 'bg-slate-100 text-slate-700',
                  MEDIUM: 'bg-amber-100 text-amber-800',
                  HIGH: 'bg-orange-100 text-orange-800',
                  CRITICAL: 'bg-red-100 text-red-800 font-bold',
                };

                return (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaimId(claim.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                        : 'border-slate-200 hover:border-emerald-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-900">
                            {claim.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${severityBadges[claim.severity]}`}>
                            {claim.severity}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-xs mt-1">
                          {claim.customerName}
                        </h3>
                        <div className="text-[11px] text-slate-500">
                          {claim.productName} • Lỗi: <strong>{claim.quantityDefected} {claim.unit}</strong>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {claim.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                      {claim.issueDescription}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Lô: {claim.lotCode}</span>
                      <span>Thu hoạch: {claim.harvestBatchId}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Claim Detail & Root Cause Trace (7 Cols - Screen 24 & 51) */}
          <div className="lg:col-span-7">
            {selectedClaim ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 sticky top-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-lg">
                        {selectedClaim.code}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        ● {selectedClaim.status}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mt-1">
                      {selectedClaim.customerName}
                    </h2>
                    <div className="text-xs text-slate-500">
                      Đơn hàng: <strong className="font-mono">{selectedClaim.orderCode}</strong> • Phiếu giao:{' '}
                      <strong className="font-mono">{selectedClaim.deliveryCode}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedClaim.status !== 'RESOLVED' && selectedClaim.status !== 'CLOSED' && (
                      <button
                        onClick={() => updateClaimStatus(selectedClaim.id, 'RESOLVED')}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Xác nhận giải quyết</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setClaimDetailTab('TRACE')}
                    className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 ${
                      claimDetailTab === 'TRACE'
                        ? 'border-emerald-600 text-emerald-700 font-bold'
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    <TreePine className="w-3.5 h-3.5" />
                    <span>Cây truy xuất ngược nguồn gốc (Section 51)</span>
                  </button>
                  <button
                    onClick={() => setClaimDetailTab('RESOLUTION')}
                    className={`pb-2 px-3 border-b-2 flex items-center gap-1.5 ${
                      claimDetailTab === 'RESOLUTION'
                        ? 'border-emerald-600 text-emerald-700 font-bold'
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Nguyên nhân & Khắc phục</span>
                  </button>
                </div>

                {/* Tab: Trace from Complaint (Section 51) */}
                {claimDetailTab === 'TRACE' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-900">
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Truy vết chuỗi cung ứng khép kín từ Khách hàng về Cây trồng:</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        Từ khiếu nại của khách, hệ thống đối chiếu chính xác mã lô đóng gói, đợt thu hoạch tại vườn và
                        các cá thể cây dừa thu hái ngày hôm đó để kiểm tra nhật ký bón phân, tưới nước IoT.
                      </p>
                    </div>

                    {/* Step-by-step Trace Hierarchy Tree (Section 51) */}
                    <div className="space-y-2 border-l-2 border-emerald-400 pl-4 ml-2">
                      {/* Step 1: Claim */}
                      <div className="relative pb-3">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-white" />
                        <div className="text-[10px] text-slate-400 font-bold">1. KHIẾU NẠI KHÁCH HÀNG</div>
                        <div className="font-bold text-slate-800">{selectedClaim.customerName}</div>
                        <p className="text-slate-600 text-[11px] mt-0.5">{selectedClaim.issueDescription}</p>
                      </div>

                      {/* Step 2: Order & Delivery */}
                      <div className="relative pb-3">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-white" />
                        <div className="text-[10px] text-slate-400 font-bold">2. ĐƠN HÀNG & PHIẾU GIAO</div>
                        <div className="font-mono text-slate-800 font-semibold">
                          Đơn {selectedClaim.orderCode} → Phiếu {selectedClaim.deliveryCode}
                        </div>
                      </div>

                      {/* Step 3: Product Lot */}
                      <div className="relative pb-3">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                        <div className="text-[10px] text-slate-400 font-bold">3. LÔ THÀNH PHẨM XUẤT KHO</div>
                        <div className="font-mono font-bold text-emerald-800">
                          {selectedClaim.lotCode}
                        </div>
                        <div className="text-slate-500 text-[11px]">Sản phẩm: {selectedClaim.productName}</div>
                      </div>

                      {/* Step 4: Harvest Batch */}
                      <div className="relative pb-3">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white" />
                        <div className="text-[10px] text-slate-400 font-bold">4. ĐỢT THU HOẠCH PHÂN HỆ 2</div>
                        <div className="font-mono font-bold text-slate-800">
                          {selectedClaim.harvestBatchId}
                        </div>
                        <div className="text-slate-600 text-[11px]">Vùng trồng: {selectedClaim.farmArea}</div>
                      </div>

                      {/* Step 5: Individual Plants */}
                      <div className="relative">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                        <div className="text-[10px] text-emerald-800 font-bold">
                          5. CÁ THỂ CÂY TRỒNG NGUỒN GỐC ({selectedClaim.plantCodes.length} cây)
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {selectedClaim.plantCodes.map((plantCode) => (
                            <button
                              key={plantCode}
                              onClick={() => handleInspectPlant(plantCode)}
                              className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded font-mono font-bold text-[11px] transition-colors"
                              title="Bấm để xem nhật ký dinh dưỡng và tưới nước ở Phân hệ 2"
                            >
                              Cây {plantCode} →
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                          Bấm vào từng mã cây để chuyển thẳng sang Phân hệ 2 đối soát độ ẩm đất IoT, sâu bệnh và phân bón.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Resolution & Root Cause */}
                {claimDetailTab === 'RESOLUTION' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-xs">Nguyên nhân gốc rễ (Root Cause):</div>
                      <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                        {selectedClaim.rootCause}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 text-xs">Hành động khắc phục & Phòng ngừa (CAPA):</div>
                      <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                        {selectedClaim.correctiveAction}
                      </p>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                      <div className="font-bold text-emerald-900 text-xs">Phương án xử lý cho khách hàng:</div>
                      <p className="text-emerald-800 bg-white p-2.5 rounded border border-emerald-200 font-medium">
                        {selectedClaim.resolutionOutcome}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                Chọn hồ sơ khiếu nại để xem cây truy xuất nguồn gốc
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Returns (Screen 22) */}
      {activeTab === 'RETURNS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-800 text-xs">
              Sổ Quản Lý Hàng Bị Trả Lại & Đổi Trả (Sales Returns)
            </h3>
            <span className="text-[11px] text-slate-500">
              Quy trình: Đơn hàng → Giao hàng → Số lượng trả → Lý do → Phương án xử lý
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Mã phiếu trả</th>
                  <th className="py-3 px-4 font-semibold">Khách hàng</th>
                  <th className="py-3 px-4 font-semibold">Đơn hàng</th>
                  <th className="py-3 px-4 font-semibold">Mặt hàng / Lô</th>
                  <th className="py-3 px-4 font-semibold text-right">Số lượng trả</th>
                  <th className="py-3 px-4 font-semibold">Lý do trả</th>
                  <th className="py-3 px-4 font-semibold">Phương án xử lý</th>
                  <th className="py-3 px-4 font-semibold text-right">Số tiền cấn trừ</th>
                  <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReturns.map((ret) => {
                  const reasonLabels: Record<ReturnReason, string> = {
                    DAMAGED: 'Hư hỏng vận chuyển',
                    QUALITY_MISMATCH: 'Sai chất lượng',
                    WRONG_ITEM: 'Sai sản phẩm',
                    SUB_STANDARD: 'Thiếu tiêu chuẩn',
                    OTHER: 'Khác',
                  };

                  const resolutionLabels: Record<ReturnResolution, string> = {
                    EXCHANGE: 'Đổi hàng mới',
                    REFUND: 'Hoàn tiền',
                    CREDIT_NOTE: 'Credit Note cấn trừ',
                    PRICE_REDUCTION: 'Giảm giá lô',
                    REJECT: 'Từ chối nhận lại',
                  };

                  const item = ret.items[0];

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                        {ret.code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{ret.customerName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{ret.orderCode}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{item.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">Lô: {item.lotCode}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-red-600">
                        {item.returnQty} {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                          {reasonLabels[item.reason] || item.reason}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-700">
                        {resolutionLabels[item.resolution] || item.resolution}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        {item.refundAmountVnd.toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {ret.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tạo khiếu nại mới */}
      {isNewClaimOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">Tạo Hồ Sơ Khiếu Nại Chất Lượng Mới</h3>
              <button onClick={() => setIsNewClaimOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClaim} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Khách hàng khiếu nại *</label>
                  <select
                    value={formCustId}
                    onChange={(e) => setFormCustId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-semibold"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Đơn hàng liên quan *</label>
                  <select
                    value={formOrderId}
                    onChange={(e) => setFormOrderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  >
                    {salesOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} ({o.totalAmountVnd.toLocaleString('vi-VN')}đ)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Mã Lô thành phẩm xuất *</label>
                  <select
                    value={formLotCode}
                    onChange={(e) => setFormLotCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                  >
                    {finishedGoodsLots.map((l) => (
                      <option key={l.id} value={l.lotCode}>
                        {l.lotCode} ({l.farmArea})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số lượng quả lỗi *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formDefectQty}
                    onChange={(e) => setFormDefectQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-red-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mức độ nghiêm trọng</label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                >
                  <option value="LOW">Thấp (Trầy vỏ nhẹ)</option>
                  <option value="MEDIUM">Trung bình (Nứt cuống, nước chua nhẹ)</option>
                  <option value="HIGH">Cao (Hư hỏng nhiều quả)</option>
                  <option value="CRITICAL">Khẩn cấp (Sai chất lượng toàn bộ lô)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mô tả sự cố chi tiết *</label>
                <textarea
                  rows={2}
                  required
                  value={formIssue}
                  onChange={(e) => setFormIssue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewClaimOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold"
                >
                  Kích hoạt điều tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lập phiếu trả hàng mới */}
      {isNewReturnOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">Lập Phiếu Hàng Bị Trả Lại</h3>
              <button onClick={() => setIsNewReturnOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReturn} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Đơn hàng gốc *</label>
                <select
                  value={returnOrderId}
                  onChange={(e) => setReturnOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono"
                >
                  {salesOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} — {o.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số lượng trả (trái) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={returnQty}
                    onChange={(e) => setReturnQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-red-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Lý do trả lại</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  >
                    <option value="DAMAGED">Hư hỏng vận chuyển</option>
                    <option value="QUALITY_MISMATCH">Sai chất lượng</option>
                    <option value="WRONG_ITEM">Sai sản phẩm</option>
                    <option value="SUB_STANDARD">Thiếu tiêu chuẩn</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phương án xử lý</label>
                  <select
                    value={returnResolution}
                    onChange={(e) => setReturnResolution(e.target.value as ReturnResolution)}
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  >
                    <option value="CREDIT_NOTE">Credit Note cấn trừ đơn sau</option>
                    <option value="EXCHANGE">Đổi hàng mới</option>
                    <option value="REFUND">Hoàn tiền mặt</option>
                    <option value="PRICE_REDUCTION">Giảm giá lô</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Số tiền cấn trừ (VNĐ)</label>
                  <input
                    type="number"
                    value={returnRefund}
                    onChange={(e) => setReturnRefund(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ghi chú xác nhận đổi trả</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewReturnOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold"
                >
                  Lưu phiếu trả hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
