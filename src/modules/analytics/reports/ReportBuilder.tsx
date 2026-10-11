import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Play,
  Download,
  Calendar,
  Layers,
  BarChart3,
  Table as TableIcon,
  PieChart,
  Save,
  CheckCircle2,
  Trash2,
  Send,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';

export const ReportBuilder: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'builder' | 'saved'>('builder');

  // Step state
  const [dataSource, setDataSource] = useState('YIELD');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['yield_kg', 'water_liters']);
  const [selectedDimension, setSelectedDimension] = useState('by_area');
  const [chartType, setChartType] = useState<'BAR' | 'TABLE' | 'LINE' | 'PIE'>('BAR');

  // Schedule modal state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState('WEEKLY');
  const [recipientEmail, setRecipientEmail] = useState('management@smartfarm.vn');

  // Saved reports
  const [savedReports, setSavedReports] = useState([
    {
      id: 'rep-01',
      name: 'Báo cáo Hiệu quả Nước & Sản lượng theo Tuần',
      dataSource: 'Sản xuất + IoT Nước',
      createdBy: 'Lê Văn C',
      createdAt: '28/09/2026',
      scheduleText: 'Thứ Hai hàng tuần lúc 08:00 (PDF & Excel)',
    },
    {
      id: 'rep-02',
      name: 'Báo cáo Chi phí & Tiêu hao Vật tư Hàng tháng',
      dataSource: 'Kho vận & Kế toán',
      createdBy: 'Nguyễn Văn A',
      createdAt: '01/10/2026',
      scheduleText: 'Ngày 01 hàng tháng lúc 09:00',
    },
  ]);

  const toggleMetric = (key: string) => {
    if (selectedMetrics.includes(key)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter((m) => m !== key));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, key]);
    }
  };

  const handleSaveReport = () => {
    const newRep = {
      id: `rep-${Date.now()}`,
      name: `Báo cáo Tùy biến ${dataSource} (${selectedDimension})`,
      dataSource,
      createdBy: 'Quản lý Trang trại',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      scheduleText: scheduleEnabled ? `Gửi định kỳ: ${scheduleFreq} tới ${recipientEmail}` : 'Không lập lịch',
    };
    setSavedReports([newRep, ...savedReports]);
    showToast('Đã lưu mẫu báo cáo thành công vào danh bạ báo cáo!', 'success');
    setActiveTab('saved');
  };

  return (
    <div className="space-y-5 pb-16 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Trình Tạo Báo Cáo Tùy Biến Đa Chiều (Custom Report Builder)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
              SELF-SERVICE BI
            </span>
          </div>
          <p className="text-slate-500 mt-0.5">
            Tự do kéo thả, kết hợp nguồn dữ liệu từ cây trồng, vật tư, IoT đến bán hàng và lập lịch gửi tự động
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'builder' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Trình thiết kế (5 bước)
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'saved' ? 'bg-white text-emerald-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Báo cáo đã lưu ({savedReports.length})
          </button>
        </div>
      </div>

      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: 5 Config Steps (col-span-5) */}
          <div className="lg:col-span-5 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              Cấu Hình Báo Cáo
            </h3>

            {/* STEP 1: Data Source */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                1. Chọn Nguồn dữ liệu (Data Source)
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="YIELD">Năng suất Thu hoạch & Sản lượng</option>
                <option value="GROWTH">Chỉ số Sinh thái & Đo lường Cây</option>
                <option value="DISEASE">Sâu bệnh hại & Ca điều trị</option>
                <option value="IOT_WATER">IoT Cảm biến & Nước tưới</option>
                <option value="INVENTORY">Kho vận & Tiêu hao Vật tư</option>
                <option value="FINANCE">Doanh thu, Chi phí & Lợi nhuận</option>
              </select>
            </div>

            {/* STEP 2: Metrics */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                2. Chọn Chỉ số muốn phân tích (Metrics)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'yield_kg', label: 'Sản lượng (kg)' },
                  { id: 'water_liters', label: 'Lượng nước (Lít)' },
                  { id: 'cost_vnd', label: 'Chi phí (VNĐ)' },
                  { id: 'disease_count', label: 'Số ca bệnh' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMetric(m.id)}
                    className={`p-2 rounded border text-left transition-colors font-medium ${
                      selectedMetrics.includes(m.id)
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {selectedMetrics.includes(m.id) ? '☑ ' : '☐ '} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 3: Dimension */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                3. Chiều phân tích (Dimension)
              </label>
              <select
                value={selectedDimension}
                onChange={(e) => setSelectedDimension(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 font-semibold text-slate-800"
              >
                <option value="by_area">Phân nhóm theo Phân khu (Khu Bắc / Trung / Nam)</option>
                <option value="by_variety">Phân nhóm theo Giống cây (Xiêm xanh / Dừa dứa)</option>
                <option value="by_month">Phân nhóm theo Tháng (Chuỗi thời gian)</option>
                <option value="by_plant">Chi tiết từng Cá thể cây (A001 – A100)</option>
              </select>
            </div>

            {/* STEP 4 & 5: Visualization */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                4. Dạng biểu đồ trực quan (Visualization)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'BAR', label: 'Biểu đồ Cột', icon: BarChart3 },
                  { id: 'TABLE', label: 'Bảng Dữ liệu', icon: TableIcon },
                  { id: 'LINE', label: 'Đường Xu hướng', icon: Layers },
                  { id: 'PIE', label: 'Biểu đồ Tròn', icon: PieChart },
                ].map((viz) => {
                  const Icon = viz.icon;
                  return (
                    <button
                      key={viz.id}
                      onClick={() => setChartType(viz.id as any)}
                      className={`p-2 rounded border flex flex-col items-center gap-1 transition-colors ${
                        chartType === viz.id
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] text-center leading-tight">{viz.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule section */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Lập lịch gửi báo cáo tự động (Schedule)</span>
              </label>

              {scheduleEnabled && (
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <div className="flex gap-2">
                    <select
                      value={scheduleFreq}
                      onChange={(e) => setScheduleFreq(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                    >
                      <option value="DAILY">Hàng ngày lúc 07:00</option>
                      <option value="WEEKLY">Thứ Hai hàng tuần lúc 08:00</option>
                      <option value="MONTHLY">Ngày 01 hàng tháng</option>
                    </select>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="Email nhận báo cáo..."
                      className="flex-1 px-2.5 py-1 border border-slate-200 rounded text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveReport}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Mẫu Báo Cáo Này</span>
            </button>
          </div>

          {/* Right Column: Live Interactive Preview (col-span-7) */}
          <div className="lg:col-span-7 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Xem Trước Trực Tiếp (Live Report Preview)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Đang trực quan hóa: {dataSource} · {selectedDimension}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => showToast('Đang xuất tệp Excel với mẫu này...', 'info')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Tải Excel</span>
                </button>
              </div>
            </div>

            {/* Preview Box */}
            <div className="p-4 bg-slate-50/60 rounded-lg border border-slate-200/80 min-h-[260px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Dữ liệu phân tích tổng hợp:</span>
                  <span className="font-mono text-emerald-800 font-bold">3 nhóm đối tượng</span>
                </div>

                {/* Sample Live Bar Chart */}
                <div className="h-40 flex items-end justify-around gap-6 px-4 pt-4 border-b border-slate-200 pb-2">
                  {[
                    { label: 'Khu Bắc', val1: 1650, val2: 18.2 },
                    { label: 'Khu Trung', val1: 980, val2: 22.4 },
                    { label: 'Khu Nam', val1: 620, val2: 27.5 },
                  ].map((bar, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="font-mono font-bold text-slate-800 text-[10px]">
                        {bar.val1} kg
                      </span>
                      <div
                        className="w-12 bg-emerald-600 rounded-t transition-all"
                        style={{ height: `${(bar.val1 / 1800) * 100}%` }}
                      />
                      <span className="text-[11px] font-semibold text-slate-700">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2">
                <span>Trực quan: Biểu đồ cột thể hiện sản lượng (kg) theo phân khu</span>
                <span className="font-mono text-emerald-700 font-bold">Mẫu hợp lệ 100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVED REPORTS TAB */}
      {activeTab === 'saved' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tên báo cáo</th>
                  <th className="py-2.5 px-3">Nguồn dữ liệu</th>
                  <th className="py-2.5 px-3">Người tạo</th>
                  <th className="py-2.5 px-3">Ngày tạo</th>
                  <th className="py-2.5 px-3">Lịch gửi tự động</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {savedReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3 font-semibold text-slate-900">{rep.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{rep.dataSource}</td>
                    <td className="py-3 px-3">{rep.createdBy}</td>
                    <td className="py-3 px-3 font-mono">{rep.createdAt}</td>
                    <td className="py-3 px-3 text-emerald-800 font-medium">{rep.scheduleText}</td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => showToast(`Đang chạy báo cáo: ${rep.name}`, 'info')}
                        className="text-emerald-700 hover:underline font-bold"
                      >
                        Chạy ngay
                      </button>
                      <button
                        onClick={() => showToast(`Đang xuất tệp Excel: ${rep.name}`, 'success')}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        Xuất Excel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
