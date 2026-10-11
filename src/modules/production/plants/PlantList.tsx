import React, { useState, useMemo } from 'react';
import {
  TreePine,
  Plus,
  Search,
  Compass,
  Eye,
  Edit,
  QrCode,
  Filter,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Plant } from '../../../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { DataTable, ColumnDef } from '../../../components/common/DataTable';

export const PlantList: React.FC = () => {
  const { plants, navigate } = useApp();

  const [searchCode, setSearchCode] = useState('');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [varietyFilter, setVarietyFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState('ALL');

  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      const matchSearch =
        !searchCode.trim() ||
        p.code.toLowerCase().includes(searchCode.toLowerCase()) ||
        p.name.toLowerCase().includes(searchCode.toLowerCase()) ||
        p.variety.toLowerCase().includes(searchCode.toLowerCase());
      const matchZone = zoneFilter === 'ALL' || p.zoneId === zoneFilter;
      const matchVariety = varietyFilter === 'ALL' || p.variety.includes(varietyFilter);
      const matchHealth =
        healthFilter === 'ALL' ||
        (healthFilter === 'NORMAL' && (p.health === 'NORMAL' || p.health === 'GOOD')) ||
        (healthFilter === 'WATCH' && (p.health === 'WATCH' || p.health === 'WARNING')) ||
        (healthFilter === 'SICK' && (p.health === 'SICK' || p.health === 'CRITICAL'));
      return matchSearch && matchZone && matchVariety && matchHealth;
    });
  }, [plants, searchCode, zoneFilter, varietyFilter, healthFilter]);

  const columns: ColumnDef<Plant>[] = [
    {
      key: 'code',
      header: 'Mã cây',
      width: '100px',
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
          {p.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Tên / Giống cây',
      sortable: true,
      render: (p) => (
        <div>
          <span className="font-semibold text-slate-900 block hover:text-emerald-700">
            {p.name}
          </span>
          <span className="text-[11px] text-slate-500">{p.variety}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Vị trí (Khu / Vườn / Hàng)',
      render: (p) => (
        <span className="text-slate-700 text-xs">
          {p.zoneName || 'Khu Bắc'} · {p.gardenName || 'Vườn 01'} · <strong>{p.rowName || 'Hàng A'}</strong>
        </span>
      ),
    },
    {
      key: 'ageYearsText',
      header: 'Tuổi cây',
      render: (p) => (
        <span className="font-mono text-slate-700 text-xs">{p.ageYearsText || `${p.ageMonths} tháng`}</span>
      ),
    },
    {
      key: 'stage',
      header: 'Giai đoạn sinh trưởng',
      render: (p) => <span className="text-slate-600 font-medium text-xs">{p.stage}</span>,
    },
    {
      key: 'health',
      header: 'Sức khỏe',
      sortable: true,
      render: (p) => <StatusBadge status={p.health} size="sm" />,
    },
    {
      key: 'latestYieldKg',
      header: 'Năng suất gần nhất',
      align: 'right',
      render: (p) => (
        <div className="text-right">
          <span className="font-mono tabular-nums font-bold text-slate-900 text-xs">
            {p.fruitsCount} quả
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            {p.latestYieldKg} kg
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý cá thể cây trồng (Plant Individual Registry)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hồ sơ riêng biệt, mã QR định danh và chỉ số phát triển cho từng cây dừa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/production/map')}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors inline-flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Sơ đồ định vị</span>
          </button>
          <button
            onClick={() => navigate('/production/plants/new')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm cá thể cây</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        data={filteredPlants}
        columns={columns}
        keyField="id"
        searchPlaceholder="Tìm theo mã cây (A023, A001), tên, giống..."
        searchFilterFields={['code', 'name', 'variety']}
        onRowClick={(p) => navigate(`/production/plants/${p.id}`)}
        filters={
          <div className="flex items-center gap-2">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium"
            >
              <option value="ALL">Tất cả khu vực</option>
              <option value="zone-north">Khu Bắc</option>
              <option value="zone-center">Khu Trung</option>
              <option value="zone-south">Khu Nam</option>
            </select>

            <select
              value={varietyFilter}
              onChange={(e) => setVarietyFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium"
            >
              <option value="ALL">Tất cả giống</option>
              <option value="Xiêm Xanh">Dừa Xiêm Xanh Lùn</option>
              <option value="Dứa">Dừa Dứa Thái Lan</option>
            </select>

            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium"
            >
              <option value="ALL">Tất cả sức khỏe</option>
              <option value="NORMAL">Bình thường</option>
              <option value="WATCH">Cần theo dõi</option>
              <option value="SICK">Có vấn đề / Bệnh</option>
            </select>
          </div>
        }
        rowActions={(p) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => navigate(`/production/plants/${p.id}`)}
              className="p-1 text-slate-400 hover:text-emerald-700"
              title="Xem hồ sơ chi tiết"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/production/plants/${p.id}/edit`)}
              className="p-1 text-slate-400 hover:text-blue-700"
              title="Chỉnh sửa thông số"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        )}
      />
    </div>
  );
};
