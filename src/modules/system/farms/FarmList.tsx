import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  TreePine,
  Layers,
  Cpu,
  Users,
  MoreVertical,
  ExternalLink,
  Edit,
  Eye,
  Archive,
  Compass,
  Building,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { Farm, FarmStatus } from '../../../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { DataTable, ColumnDef } from '../../../components/common/DataTable';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

export const FarmList: React.FC = () => {
  const { farms, navigate, setActiveFarmId, archiveFarm } = useApp();

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'areaHa' | 'plants'>('areaHa');
  const [activeMenuFarmId, setActiveMenuFarmId] = useState<string | null>(null);
  const [farmToArchive, setFarmToArchive] = useState<Farm | null>(null);

  // Filter & Sort
  const filteredFarms = useMemo(() => {
    return farms
      .filter((f) => {
        const matchSearch =
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.province.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'areaHa') return b.areaHa - a.areaHa;
        if (sortBy === 'plants') return b.stats.plantsCount - a.stats.plantsCount;
        return 0;
      });
  }, [farms, searchTerm, statusFilter, sortBy]);

  const handleSelectFarm = (farm: Farm) => {
    setActiveFarmId(farm.id);
    navigate(`/system/farms/${farm.id}`);
  };

  // Table columns
  const columns: ColumnDef<Farm>[] = [
    {
      key: 'code',
      header: 'Mã trang trại',
      width: '120px',
      sortable: true,
      render: (f) => <span className="font-mono font-bold text-slate-700">{f.code}</span>,
    },
    {
      key: 'name',
      header: 'Tên trang trại',
      sortable: true,
      render: (f) => (
        <div>
          <span className="font-semibold text-slate-900 block hover:text-emerald-700">
            {f.name}
          </span>
          <span className="text-[11px] text-slate-500">{f.address}</span>
        </div>
      ),
    },
    {
      key: 'mainCrop',
      header: 'Cây trồng chính',
      render: (f) => <span className="text-slate-700">{f.mainCrop}</span>,
    },
    {
      key: 'areaHa',
      header: 'Diện tích (ha)',
      align: 'right',
      sortable: true,
      render: (f) => (
        <span className="font-mono tabular-nums font-semibold text-slate-800">
          {f.areaHa} ha
        </span>
      ),
    },
    {
      key: 'plantsCount',
      header: 'Số cây trồng',
      align: 'right',
      render: (f) => (
        <span className="font-mono tabular-nums font-semibold text-slate-800">
          {f.stats.plantsCount.toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'devicesCount',
      header: 'Thiết bị IoT',
      align: 'right',
      render: (f) => (
        <span className="font-mono tabular-nums text-slate-700">
          {f.stats.devicesCount}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (f) => <StatusBadge status={f.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý trang trại
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thông tin chung và cấu hình các trang trại trực thuộc hệ thống
          </p>
        </div>

        <button
          onClick={() => navigate('/system/farms/new')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm trang trại</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, mã trang trại, tỉnh thành..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Dropdowns & View Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm ngưng</option>
            <option value="MAINTENANCE">Bảo trì</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="areaHa">Sắp xếp: Diện tích lớn nhất</option>
            <option value="plants">Sắp xếp: Số cây nhiều nhất</option>
            <option value="name">Sắp xếp: Tên A-Z</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-emerald-700 shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Dạng thẻ"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Dạng bảng"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content: Cards vs Table */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFarms.map((farm) => (
            <div
              key={farm.id}
              className="bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all overflow-hidden flex flex-col"
            >
              {/* Card Visual Banner / SVG Illustration */}
              <div className="h-32 bg-gradient-to-br from-emerald-800 to-teal-950 p-4 relative text-white flex flex-col justify-between overflow-hidden">
                {/* Background Vector Texture */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id={`grid-${farm.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#grid-${farm.id})`} />
                  <circle cx="85%" cy="30%" r="40" fill="currentColor" opacity="0.2" />
                </svg>

                <div className="flex items-center justify-between z-10">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/30 backdrop-blur-xs font-semibold text-emerald-300 border border-white/10">
                    {farm.code}
                  </span>
                  <StatusBadge status={farm.status} size="sm" />
                </div>

                <div className="z-10">
                  <h3 className="font-bold text-base tracking-tight truncate text-white">
                    {farm.name}
                  </h3>
                  <p className="text-[11px] text-emerald-200 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{farm.province} ({farm.district})</span>
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Quy mô diện tích:</span>
                    <span className="font-mono tabular-nums font-bold text-slate-800 text-sm">
                      {farm.areaHa} ha
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Cây trồng chính:</span>
                    <span className="font-medium text-emerald-800 truncate max-w-[170px]">
                      {farm.mainCrop}
                    </span>
                  </div>

                  {/* Micro stats grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Khu / Vườn</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {farm.stats.zonesCount} / {farm.stats.gardensCount}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Tổng cây</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {farm.stats.plantsCount.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="block text-[10px] text-slate-400">Thiết bị IoT</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {farm.stats.devicesCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between relative">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSelectFarm(farm)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => navigate(`/system/farms/${farm.id}/edit`)}
                      className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      title="Chỉnh sửa"
                    >
                      Chỉnh sửa
                    </button>
                  </div>

                  {/* Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenuFarmId(
                          activeMenuFarmId === farm.id ? null : farm.id
                        )
                      }
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuFarmId === farm.id && (
                      <div className="absolute right-0 bottom-8 w-44 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-30 text-xs text-slate-700">
                        <button
                          onClick={() => {
                            handleSelectFarm(farm);
                            setActiveMenuFarmId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Xem tổng quan</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveFarmId(farm.id);
                            navigate('/system/map');
                            setActiveMenuFarmId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Compass className="w-3.5 h-3.5 text-slate-400" />
                          <span>Xem bản đồ</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveFarmId(farm.id);
                            navigate('/system/areas');
                            setActiveMenuFarmId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>Cấu trúc khu vực</span>
                        </button>
                        <div className="border-t border-slate-100 my-1"></div>
                        <button
                          onClick={() => {
                            setFarmToArchive(farm);
                            setActiveMenuFarmId(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-700 flex items-center gap-2"
                        >
                          <Archive className="w-3.5 h-3.5 text-rose-500" />
                          <span>Tạm ngưng / Archive</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          data={filteredFarms}
          columns={columns}
          keyField="id"
          onRowClick={(f) => handleSelectFarm(f)}
          rowActions={(f) => (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleSelectFarm(f)}
                className="p-1 text-slate-500 hover:text-emerald-700"
                title="Xem chi tiết"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/system/farms/${f.id}/edit`)}
                className="p-1 text-slate-500 hover:text-blue-700"
                title="Chỉnh sửa"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      )}

      {/* Confirmation Modal for Archiving Farm */}
      <ConfirmModal
        isOpen={!!farmToArchive}
        onClose={() => setFarmToArchive(null)}
        onConfirm={() => {
          if (farmToArchive) {
            archiveFarm(farmToArchive.id);
            setFarmToArchive(null);
          }
        }}
        variant="warning"
        title={`Xác nhận tạm ngưng: ${farmToArchive?.name}`}
        description={
          <div>
            <p>
              Hệ thống tuân thủ nguyên tắc <strong>không xóa vật lý (hard delete)</strong> đối
              với trang trại đã phát sinh dữ liệu cá thể cây và thiết bị IoT.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Trang trại sẽ chuyển trạng thái sang <strong>Tạm ngưng (Inactive)</strong> và được
              lưu trữ an toàn phục vụ truy xuất nguồn gốc.
            </p>
          </div>
        }
        confirmLabel="Tạm ngưng hoạt động"
      />
    </div>
  );
};
