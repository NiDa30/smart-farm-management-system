import React, { useState } from 'react';
import { ArrowLeft, TreePine, Save } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Plant, PlantHealth } from '../../../types';

interface PlantFormProps {
  editMode?: boolean;
  plantId?: string;
}

export const PlantForm: React.FC<PlantFormProps> = ({ editMode = false, plantId }) => {
  const { plants, addPlant, updatePlant, navigate } = useApp();

  const existingPlant = editMode ? plants.find((p) => p.id === plantId || p.code === plantId) : null;

  const [formData, setFormData] = useState<Partial<Plant>>({
    id: existingPlant?.id || `plant-${Date.now()}`,
    code: existingPlant?.code || 'A026',
    name: existingPlant?.name || 'Dừa Xiêm Xanh Lùn #A026',
    rowId: existingPlant?.rowId || 'row-a',
    rowName: existingPlant?.rowName || 'Hàng A',
    gardenId: existingPlant?.gardenId || 'garden-01',
    gardenName: existingPlant?.gardenName || 'Vườn 01',
    zoneId: existingPlant?.zoneId || 'zone-north',
    zoneName: existingPlant?.zoneName || 'Khu Bắc',
    farmId: existingPlant?.farmId || 'farm-001',
    variety: existingPlant?.variety || 'Dừa Xiêm Xanh Lùn Bến Tre',
    plantedDate: existingPlant?.plantedDate || new Date().toISOString().split('T')[0],
    ageMonths: existingPlant?.ageMonths || 48,
    ageYearsText: existingPlant?.ageYearsText || '4 năm 0 tháng',
    stage: existingPlant?.stage || 'Đang cho trái kinh doanh',
    heightMeters: existingPlant?.heightMeters || 4.5,
    trunkDiameterCm: existingPlant?.trunkDiameterCm || 31.0,
    leavesCount: existingPlant?.leavesCount || 24,
    bunchCount: existingPlant?.bunchCount || 6,
    fruitsCount: existingPlant?.fruitsCount || 60,
    latestYieldKg: existingPlant?.latestYieldKg || 45,
    health: (existingPlant?.health as PlantHealth) || 'NORMAL',
    lat: existingPlant?.lat || 10.3356,
    lng: existingPlant?.lng || 106.3553,
    qrCode: existingPlant?.qrCode || 'SMARTFARM:PLANT:A026:FARM001',
    lastWatered: existingPlant?.lastWatered || 'Hôm nay, 06:30',
    lastFertilized: existingPlant?.lastFertilized || 'Chưa bón',
    soilMoisture: existingPlant?.soilMoisture || 40,
    soilPh: existingPlant?.soilPh || 6.3,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editMode && existingPlant) {
      updatePlant(existingPlant.id, formData);
      navigate(`/production/plants/${existingPlant.id}`);
    } else {
      addPlant(formData as Plant);
      navigate('/production/plants');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/production/plants')}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {editMode ? `Chỉnh sửa cá thể cây: ${existingPlant?.code}` : 'Đăng ký xuống giống cây mới'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Khởi tạo hồ sơ định danh, gắn mã QR và vị trí trên sơ đồ vườn
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border border-slate-200 shadow-2xs text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Mã định danh cây (Code) *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => {
                const code = e.target.value.toUpperCase();
                setFormData({
                  ...formData,
                  code,
                  qrCode: `SMARTFARM:PLANT:${code}:FARM001`,
                });
              }}
              placeholder="A026"
              className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold uppercase focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Giống cây trồng *</label>
            <select
              value={formData.variety}
              onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded font-medium"
            >
              <option value="Dừa Xiêm Xanh Lùn Bến Tre">Dừa Xiêm Xanh Lùn Bến Tre</option>
              <option value="Dừa Dứa Thái Lan">Dừa Dứa Thái Lan</option>
              <option value="Dừa Mã Lai Đỏ">Dừa Mã Lai Đỏ</option>
              <option value="Dừa Sáp Cầu Kè">Dừa Sáp Cầu Kè</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Vị trí: Phân khu *</label>
            <select
              value={formData.zoneId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  zoneId: e.target.value,
                  zoneName: e.target.value === 'zone-north' ? 'Khu Bắc' : 'Khu Trung',
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded"
            >
              <option value="zone-north">Khu Bắc (8.2 ha)</option>
              <option value="zone-center">Khu Trung (9.4 ha)</option>
              <option value="zone-south">Khu Nam (8.0 ha)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Hàng / Luống *</label>
            <select
              value={formData.rowId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rowId: e.target.value,
                  rowName: e.target.value === 'row-a' ? 'Hàng A' : 'Hàng B',
                })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded"
            >
              <option value="row-a">Hàng A (Vườn 01)</option>
              <option value="row-b">Hàng B (Vườn 01)</option>
              <option value="row-c">Hàng C (Vườn 02)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Ngày xuống giống *</label>
            <input
              type="date"
              value={formData.plantedDate}
              onChange={(e) => setFormData({ ...formData, plantedDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Giai đoạn sinh trưởng *</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded"
            >
              <option value="Cây con (1–2 năm)">Cây con (1–2 năm)</option>
              <option value="Bắt đầu trổ hoa (3–4 năm)">Bắt đầu trổ hoa (3–4 năm)</option>
              <option value="Đang cho trái kinh doanh">Đang cho trái kinh doanh</option>
              <option value="Cần phục hồi sau bệnh">Cần phục hồi sau bệnh</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Chiều cao thân (m):</label>
            <input
              type="number"
              step="0.1"
              value={formData.heightMeters}
              onChange={(e) => setFormData({ ...formData, heightMeters: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Số trái ước tính:</label>
            <input
              type="number"
              value={formData.fruitsCount}
              onChange={(e) => setFormData({ ...formData, fruitsCount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded font-mono"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/production/plants')}
            className="px-4 py-2 border border-slate-200 rounded hover:bg-slate-50 text-slate-700"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
          >
            {editMode ? 'Lưu thay đổi' : 'Đăng ký cá thể cây'}
          </button>
        </div>
      </form>
    </div>
  );
};
