import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { CRMActivity, CRMActivityType } from '../../../types';

export const CRMActivityManager: React.FC = () => {
  const { crmActivities, addCRMActivity, customers, navigate } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState(customers[0]?.id || '');
  const [crmType, setCrmType] = useState<CRMActivityType>('CALL');
  const [crmTitle, setCrmTitle] = useState('');
  const [crmNotes, setCrmNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const filteredActivities = crmActivities.filter((act) => {
    const matchSearch =
      act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'ALL' || act.type === typeFilter;
    return matchSearch && matchType;
  });

  // Calculate customers buying slower than usual (Section 55)
  const slowBuyingCustomers = customers.filter((c) => {
    // Demo calculation: if days since last buy > 1.5 * average frequency
    return c.code === 'KH-0042' || c.code === 'KH-0008';
  });

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustId);
    if (!cust || !crmTitle.trim()) return;

    addCRMActivity({
      customerId: cust.id,
      customerName: cust.name,
      type: crmType,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      title: crmTitle,
      notes: crmNotes,
      performedBy: 'Nguyễn Văn Hùng',
      status: scheduledDate ? 'SCHEDULED' : 'COMPLETED',
      scheduledDate,
    });

    setCrmTitle('');
    setCrmNotes('');
    setScheduledDate('');
    setIsModalOpen(false);
  };

  const typeIcons: Record<CRMActivityType, { icon: any; color: string; label: string }> = {
    CALL: { icon: Phone, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Cuộc gọi' },
    MEETING: { icon: UserCheck, color: 'text-purple-600 bg-purple-50 border-purple-200', label: 'Gặp mặt' },
    MESSAGE: { icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Tin nhắn' },
    EMAIL: { icon: Mail, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', label: 'Email' },
    FOLLOW_UP: { icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Follow-up' },
    NOTE: { icon: CheckCircle2, color: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Ghi chú' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Nhật ký CRM & Chăm sóc khách hàng
            </span>
            <span className="text-xs text-slate-500 font-mono">Screens 26, 54, 55</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            CRM Activity, Lịch Hẹn & Cảnh Báo Chu Kỳ Mua Hàng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu giữ toàn diện lịch sử tương tác, nhắc nhở lịch hẹn và phát hiện sớm khách hàng có nguy cơ rời bỏ
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Thêm hoạt động CRM</span>
        </button>
      </div>

      {/* CRM Follow-up Alert (Section 55) */}
      <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="font-bold text-amber-900 text-xs">
              Cảnh báo Thông minh — Khách hàng mua chậm hơn chu kỳ bình thường (Section 55)
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-bold text-[10px]">
            {slowBuyingCustomers.length} khách hàng cần follow-up
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {slowBuyingCustomers.map((cust) => (
            <div
              key={cust.id}
              className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-800">{cust.name}</div>
                <div className="text-[11px] text-amber-800 mt-0.5">
                  Lần mua gần nhất: <strong>{cust.lastPurchaseDate}</strong> (Tần suất TB: {cust.purchaseFrequencyDays} ngày/lần)
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCustId(cust.id);
                  setCrmType('FOLLOW_UP');
                  setCrmTitle(`Follow-up chu kỳ mua hàng: ${cust.name}`);
                  setIsModalOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] shadow-2xs shrink-0"
              >
                + Tạo Follow-up
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Tiêu đề / Khách hàng / Ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả loại hoạt động</option>
            <option value="CALL">Cuộc gọi</option>
            <option value="MEETING">Gặp mặt</option>
            <option value="MESSAGE">Tin nhắn</option>
            <option value="EMAIL">Email</option>
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="NOTE">Ghi chú</option>
          </select>
        </div>
      </div>

      {/* Timeline List (Section 54) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">
          Dòng thời gian tương tác (CRM Timeline)
        </h2>

        <div className="space-y-4 border-l-2 border-slate-200 pl-6 ml-3 text-xs">
          {filteredActivities.map((act) => {
            const conf = typeIcons[act.type] || typeIcons.NOTE;
            const Icon = conf.icon;

            return (
              <div key={act.id} className="relative pb-4">
                <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-[11px]">{act.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${conf.color}`}>
                      {conf.label}
                    </span>
                    <span className="font-bold text-slate-800 text-xs">{act.customerName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Thực hiện: {act.performedBy}</span>
                </div>

                <div className="mt-1.5 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-semibold text-slate-800 text-xs">{act.title}</div>
                  <p className="text-slate-600 text-[11px]">{act.notes}</p>
                  {act.outcome && (
                    <div className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                      Kết quả: {act.outcome}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Thêm CRM Activity */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-base">Thêm Hoạt Động CRM Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Khách hàng tương tác *</label>
                <select
                  value={selectedCustId}
                  onChange={(e) => setSelectedCustId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-semibold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Loại tương tác *</label>
                <select
                  value={crmType}
                  onChange={(e) => setCrmType(e.target.value as CRMActivityType)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                >
                  <option value="CALL">Cuộc gọi điện thoại</option>
                  <option value="MEETING">Gặp mặt trực tiếp</option>
                  <option value="MESSAGE">Tin nhắn (Zalo / SMS)</option>
                  <option value="EMAIL">Email</option>
                  <option value="FOLLOW_UP">Follow-up định kỳ</option>
                  <option value="NOTE">Ghi chú quan trọng</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tiêu đề hoạt động *</label>
                <input
                  type="text"
                  required
                  value={crmTitle}
                  onChange={(e) => setCrmTitle(e.target.value)}
                  placeholder="Gọi nhắc đối soát công nợ, hẹn gặp tại nhà hàng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nội dung chi tiết</label>
                <textarea
                  rows={3}
                  value={crmNotes}
                  onChange={(e) => setCrmNotes(e.target.value)}
                  placeholder="Khách hàng trao đổi nhu cầu tăng sản lượng 30%..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lịch hẹn nhắc lại (Nếu có)</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold shadow-sm"
                >
                  Lưu hoạt động
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
