import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  MapPin,
  Building,
  Settings,
  ShieldCheck,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Farm, FarmStatus } from '../../../types';

interface FarmWizardProps {
  editMode?: boolean;
  initialFarmId?: string;
}

export const FarmWizard: React.FC<FarmWizardProps> = ({
  editMode = false,
  initialFarmId,
}) => {
  const { farms, addFarm, updateFarm, navigate, activeFarm } = useApp();

  const existingFarm = editMode
    ? farms.find((f) => f.id === initialFarmId) || activeFarm
    : null;

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [formData, setFormData] = useState<Partial<Farm>>({
    id: existingFarm?.id || `farm-${Date.now()}`,
    code: existingFarm?.code || 'FARM-004',
    name: existingFarm?.name || '',
    type: existingFarm?.type || 'Trồng trọt chuyên canh cây ăn trái',
    areaHa: existingFarm?.areaHa || 15.0,
    mainCrop: existingFarm?.mainCrop || 'Dừa xiêm lùn Bến Tre',
    description: existingFarm?.description || '',
    status: (existingFarm?.status as FarmStatus) || 'ACTIVE',
    province: existingFarm?.province || 'Bến Tre',
    district: existingFarm?.district || 'Châu Thành',
    ward: existingFarm?.ward || 'Tân Thạch',
    address: existingFarm?.address || '',
    latitude: existingFarm?.latitude || 10.3345,
    longitude: existingFarm?.longitude || 106.3541,
    areaUnit: existingFarm?.areaUnit || 'Hecta (ha)',
    weightUnit: existingFarm?.weightUnit || 'Kilogram (kg)',
    volumeUnit: existingFarm?.volumeUnit || 'Lít (L)',
    currency: existingFarm?.currency || 'VNĐ (₫)',
    timezone: existingFarm?.timezone || 'Asia/Ho_Chi_Minh (GMT+7)',
    language: existingFarm?.language || 'Tiếng Việt',
    stats: existingFarm?.stats || {
      zonesCount: 1,
      gardensCount: 2,
      rowsCount: 10,
      plantsCount: 300,
      devicesCount: 8,
      usersCount: 3,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number) => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!formData.name?.trim()) errs.name = 'Vui lòng nhập tên trang trại';
      if (!formData.code?.trim()) errs.code = 'Vui lòng nhập mã định danh';
      if (!formData.type?.trim()) errs.type = 'Vui lòng chọn loại hình';
      if (!formData.areaHa || formData.areaHa <= 0)
        errs.areaHa = 'Diện tích phải lớn hơn 0';
    } else if (step === 2) {
      if (!formData.province?.trim()) errs.province = 'Vui lòng nhập tỉnh thành';
      if (!formData.district?.trim()) errs.district = 'Vui lòng nhập quận/huyện';
      if (!formData.address?.trim()) errs.address = 'Vui lòng nhập địa chỉ chi tiết';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;

    if (editMode && existingFarm) {
      updateFarm(existingFarm.id, formData);
      navigate(`/system/farms/${existingFarm.id}`);
    } else {
      addFarm(formData as Farm);
      navigate('/system/farms');
    }
  };

  const steps = [
    { num: 1, title: 'Thông tin chung', desc: 'Tên, mã & quy mô' },
    { num: 2, title: 'Địa chỉ & Vị trí', desc: 'GPS & Tọa độ bản đồ' },
    { num: 3, title: 'Cấu hình mặc định', desc: 'Đơn vị đo & Ngôn ngữ' },
    { num: 4, title: 'Xác nhận', desc: 'Kiểm tra & Lưu trữ' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/system/farms')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {editMode ? `Chỉnh sửa: ${existingFarm?.name}` : 'Thêm mới trang trại'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Thiết lập dữ liệu quy hoạch, tọa độ định vị và thông số vận hành
            </p>
          </div>
        </div>
      </div>

      {/* Main Wizard Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Step Sidebar (col-span-4) */}
        <div className="md:col-span-4 bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-3">
            Quy trình tạo trang trại
          </span>
          <nav className="space-y-2">
            {steps.map((st) => {
              const isPassed = currentStep > st.num;
              const isCurrent = currentStep === st.num;
              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    if (isPassed || isCurrent) setCurrentStep(st.num);
                  }}
                  className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                    isCurrent
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-2xs'
                      : isPassed
                      ? 'text-slate-700 hover:bg-slate-50 border border-transparent'
                      : 'text-slate-400 border border-transparent opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isPassed
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : st.num}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{st.title}</span>
                    <span className="text-[11px] text-slate-500 block">{st.desc}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Step Content Card (col-span-8) */}
        <div className="md:col-span-8 bg-white rounded-lg border border-slate-200 p-6 shadow-2xs">
          {/* STEP 1: Thông tin chung */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
                1. Thông tin chung trang trại
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tên trang trại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Nông trại Dừa Bến Tre Farm 04"
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.name && <p className="text-rose-600 text-[11px] mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mã trang trại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="FARM-004"
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none uppercase"
                  />
                  {errors.code && <p className="text-rose-600 text-[11px] mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Loại hình canh tác <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type || ''}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Trồng trọt chuyên canh cây ăn trái">
                      Trồng trọt chuyên canh cây ăn trái
                    </option>
                    <option value="Cây ăn trái có múi">Cây ăn trái có múi</option>
                    <option value="Cây công nghiệp lâu năm">Cây công nghiệp lâu năm</option>
                    <option value="Nông nghiệp hữu cơ công nghệ cao">
                      Nông nghiệp hữu cơ công nghệ cao
                    </option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Quy mô diện tích (ha) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.areaHa || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, areaHa: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono tabular-nums focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.areaHa && (
                    <p className="text-rose-600 text-[11px] mt-1">{errors.areaHa}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Giống cây trồng chủ lực
                  </label>
                  <input
                    type="text"
                    value={formData.mainCrop || ''}
                    onChange={(e) => setFormData({ ...formData, mainCrop: e.target.value })}
                    placeholder="Dừa xiêm lùn Bến Tre, Dừa dứa..."
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mô tả quy hoạch & Chứng nhận
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ghi chú về tiêu chuẩn VietGAP, chứng nhận hữu cơ, điều kiện tự nhiên..."
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trạng thái</label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as FarmStatus })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Đang hoạt động (Active)</option>
                    <option value="INACTIVE">Tạm ngưng (Inactive)</option>
                    <option value="MAINTENANCE">Bảo trì hệ thống (Maintenance)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Địa chỉ & Vị trí */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
                2. Địa chỉ hành chính & Tọa độ GPS
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tỉnh / Thành phố <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.province || ''}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.province && (
                    <p className="text-rose-600 text-[11px] mt-1">{errors.province}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Quận / Huyện <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.district || ''}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.district && (
                    <p className="text-rose-600 text-[11px] mt-1">{errors.district}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Xã / Phường</label>
                  <input
                    type="text"
                    value={formData.ward || ''}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Địa chỉ chi tiết (Ấp, số nhà, đường) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ấp 3, Xã Tân Thạch..."
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  {errors.address && (
                    <p className="text-rose-600 text-[11px] mt-1">{errors.address}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Latitude (Vĩ độ)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono tabular-nums focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Longitude (Kinh độ)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono tabular-nums focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Interactive Vector Coordinate Picker */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    Định vị điểm tâm trang trại trên sơ đồ
                  </span>
                  <span className="text-[11px] text-slate-500">Click trên bản đồ để cập nhật tọa độ</span>
                </div>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    const newLat = Number((10.33 + y * 0.02).toFixed(4));
                    const newLng = Number((106.35 + x * 0.02).toFixed(4));
                    setFormData((prev) => ({ ...prev, latitude: newLat, longitude: newLng }));
                  }}
                  className="h-44 w-full bg-emerald-950/90 rounded border border-emerald-800 relative cursor-crosshair overflow-hidden flex items-center justify-center select-none"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
                  <div className="absolute top-4 left-4 text-[10px] text-emerald-400 font-mono bg-black/40 px-2 py-0.5 rounded">
                    GPS: {formData.latitude}, {formData.longitude}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-emerald-300"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Cấu hình mặc định */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
                3. Đơn vị đo lường & Cấu hình cục bộ
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Đơn vị đo diện tích (Area Unit)
                  </label>
                  <select
                    value={formData.areaUnit || 'Hecta (ha)'}
                    onChange={(e) => setFormData({ ...formData, areaUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Hecta (ha)">Hecta (ha)</option>
                    <option value="Mét vuông (m²)">Mét vuông (m²)</option>
                    <option value="Mẫu Nam Bộ (10.000 m²)">Mẫu Nam Bộ (10.000 m²)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Đơn vị khối lượng (Weight Unit)
                  </label>
                  <select
                    value={formData.weightUnit || 'Kilogram (kg)'}
                    onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Kilogram (kg)">Kilogram (kg)</option>
                    <option value="Tấn (Ton)">Tấn (Ton)</option>
                    <option value="Tạ (100 kg)">Tạ (100 kg)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Đơn vị thể tích nước tưới (Volume Unit)
                  </label>
                  <select
                    value={formData.volumeUnit || 'Lít (L)'}
                    onChange={(e) => setFormData({ ...formData, volumeUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Lít (L)">Lít (L)</option>
                    <option value="Mét khối (m³)">Mét khối (m³)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Đơn vị tiền tệ (Currency)
                  </label>
                  <select
                    value={formData.currency || 'VNĐ (₫)'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="VNĐ (₫)">Việt Nam Đồng (VNĐ)</option>
                    <option value="USD ($)">US Dollar (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Múi giờ (Timezone)
                  </label>
                  <select
                    value={formData.timezone || 'Asia/Ho_Chi_Minh (GMT+7)'}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Asia/Ho_Chi_Minh (GMT+7)">Asia/Ho_Chi_Minh (GMT+7)</option>
                    <option value="Asia/Bangkok (GMT+7)">Asia/Bangkok (GMT+7)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Ngôn ngữ hiển thị (Language)
                  </label>
                  <select
                    value={formData.language || 'Tiếng Việt'}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="English">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Xác nhận & Tổng kết */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
                4. Xác nhận thông tin trang trại
              </h2>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-900 text-sm">{formData.name}</span>
                  <span className="font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {formData.code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-400 block">Loại hình:</span>
                    <span className="font-medium">{formData.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Quy mô diện tích:</span>
                    <span className="font-mono font-bold">{formData.areaHa} ha</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Cây trồng chính:</span>
                    <span className="font-medium text-emerald-800">{formData.mainCrop}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Trạng thái:</span>
                    <span className="font-medium">{formData.status}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Địa chỉ:</span>
                    <span>{formData.address}, {formData.district}, {formData.province}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tọa độ GPS:</span>
                    <span className="font-mono">{formData.latitude}, {formData.longitude}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tiền tệ & Đơn vị:</span>
                    <span>{formData.currency} · {formData.areaUnit}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Sticky Action Buttons */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                >
                  Quay lại
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/system/farms')}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
              >
                Hủy bỏ
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                >
                  Tiếp theo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition-colors"
                >
                  {editMode ? 'Lưu thay đổi' : 'Tạo trang trại'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
