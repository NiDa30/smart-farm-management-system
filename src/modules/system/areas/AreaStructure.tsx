import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  MoreVertical,
  Layers,
  MapPin,
  TreePine,
  Cpu,
  Edit,
  Trash2,
  FolderPlus,
  Move,
  Ban,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { AreaNode, AreaType } from '../../../types';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

export const AreaStructure: React.FC = () => {
  const { areasTree, selectedAreaId, setSelectedAreaId, navigate, iotDevices } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<string[]>([
    'farm-001',
    'zone-north',
    'garden-01',
    'zone-center',
    'zone-south',
  ]);
  const [activeTab, setActiveTab] = useState<'info' | 'gardens' | 'map' | 'iot'>('info');
  const [actionMenuNodeId, setActionMenuNodeId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalParentNode, setModalParentNode] = useState<AreaNode | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaCode, setNewAreaCode] = useState('');

  // Find currently selected node in tree
  const findNode = (root: AreaNode, id: string): AreaNode | null => {
    if (root.id === id) return root;
    if (root.children) {
      for (const child of root.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = findNode(areasTree, selectedAreaId) || areasTree.children?.[0] || areasTree;

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Node Type Label & Color
  const getNodeTypeBadge = (type: AreaType) => {
    switch (type) {
      case 'FARM':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">FARM</span>;
      case 'ZONE':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">KHU</span>;
      case 'GARDEN':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">VƯỜN</span>;
      case 'ROW':
        return <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">HÀNG</span>;
      default:
        return null;
    }
  };

  // Render tree node recursively
  const renderTree = (node: AreaNode, depth = 0) => {
    const isExpanded = expandedNodes.includes(node.id);
    const isSelected = selectedNode.id === node.id;
    const hasChildren = node.children && node.children.length > 0;

    const matchesSearch =
      !searchFilter ||
      node.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      node.code.toLowerCase().includes(searchFilter.toLowerCase());

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => setSelectedAreaId(node.id)}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-2 rounded text-xs cursor-pointer transition-colors group relative ${
            isSelected
              ? 'bg-emerald-100 text-emerald-950 font-semibold'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 text-slate-400 hover:text-slate-700"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4.5" />
            )}

            {getNodeTypeBadge(node.type)}

            <span className="truncate">{node.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">({node.code})</span>
          </div>

          {/* Node Actions Trigger */}
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionMenuNodeId(actionMenuNodeId === node.id ? null : node.id);
              }}
              className="p-1 rounded hover:bg-slate-200 text-slate-500"
              title="Tác vụ"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {actionMenuNodeId === node.id && (
              <div
                className="absolute right-2 top-8 w-44 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-30 text-xs font-normal"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setModalParentNode(node);
                    setIsAddModalOpen(true);
                    setActionMenuNodeId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thêm cấp con</span>
                </button>
                <button
                  onClick={() => setActionMenuNodeId(null)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chỉnh sửa</span>
                </button>
                <button
                  onClick={() => setActionMenuNodeId(null)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Move className="w-3.5 h-3.5 text-slate-400" />
                  <span>Di chuyển vị trí</span>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => setActionMenuNodeId(null)}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-500" />
                  <span>Ngừng sử dụng</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children!.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Cấu trúc khu vực trang trại (Area Structure)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị mô hình phân cấp không gian: Trang trại → Khu → Vườn → Hàng → Cây
          </p>
        </div>

        <button
          onClick={() => {
            setModalParentNode(areasTree);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Thêm phân khu</span>
        </button>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Structure Tree Panel (col-span-4) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs space-y-3">
          {/* Tree search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm khu vực, vườn, hàng..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="overflow-y-auto max-h-[580px] space-y-0.5 pt-1">
            {renderTree(areasTree)}
          </div>
        </div>

        {/* Right: Detail Panel (col-span-8) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          {/* Detail Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{selectedNode.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                  {selectedNode.code}
                </span>
                <StatusBadge status={selectedNode.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cấp phân loại: {selectedNode.type} · Trực thuộc Trại Dừa An Phú
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/system/map')}
                className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Xem trên bản đồ</span>
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 border-b border-slate-200">
            <div className="bg-white p-3 rounded border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Diện tích</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {selectedNode.areaHa ?? 4.0} ha
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Cấp con trực thuộc</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {selectedNode.children?.length ?? 0} đơn vị
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Tổng số cây</span>
              <span className="text-base font-bold font-mono text-emerald-700">
                {selectedNode.plantsCount ?? 180} cây
              </span>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Thiết bị IoT</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {selectedNode.devicesCount ?? 6} nodes
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 px-4 bg-white">
            <nav className="flex space-x-6 text-xs font-medium">
              {[
                { id: 'info', label: 'Thông tin chung' },
                { id: 'gardens', label: `Danh sách phân cấp con (${selectedNode.children?.length || 0})` },
                { id: 'map', label: 'Sơ đồ hình học' },
                { id: 'iot', label: 'Thiết bị & Cảm biến' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-emerald-600 text-emerald-800 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Body */}
          <div className="p-5 text-xs">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-slate-500 block">Tên đơn vị:</span>
                    <input
                      type="text"
                      disabled
                      value={selectedNode.name}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-slate-500 block">Mã định danh:</span>
                    <input
                      type="text"
                      disabled
                      value={selectedNode.code}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1.5">
                  <h4 className="font-semibold text-slate-800">Chỉ số nông học hiện thời:</h4>
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div>pH Đất trung bình: <strong className="font-mono">{selectedNode.soilPh || 6.4}</strong></div>
                    <div>Độ ẩm đất: <strong className="font-mono">{selectedNode.soilMoisture || 42}%</strong></div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    {selectedNode.notes || 'Hệ sinh thái dừa phát triển đồng đều, không ghi nhận ngập úng.'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'gardens' && (
              <div className="space-y-3">
                {selectedNode.children && selectedNode.children.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {selectedNode.children.map((child) => (
                      <div
                        key={child.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{child.name}</span>
                            <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.2 bg-slate-100 rounded">
                              {child.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {child.plantsCount || 0} cây · {child.devicesCount || 0} thiết bị
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedAreaId(child.id)}
                          className="text-xs text-emerald-700 hover:underline font-medium"
                        >
                          Chọn xem
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 py-6 text-center">
                    Cấp đơn vị này chưa có phân cấp con trực thuộc.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'map' && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center space-y-2">
                <Compass className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-semibold text-slate-800">Sơ đồ tọa độ phân khu</p>
                <p className="text-slate-500 text-xs">
                  Xem chi tiết tọa độ ranh giới Polygon và liên kết hàng cây trên bản đồ trang trại.
                </p>
                <button
                  onClick={() => navigate('/system/map')}
                  className="px-3.5 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded font-medium transition-colors"
                >
                  Mở Farm Map
                </button>
              </div>
            )}

            {activeTab === 'iot' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-semibold">Thiết bị lắp đặt tại khu vực:</span>
                  <span className="text-slate-400">Tự động đồng bộ</span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {iotDevices
                    .filter((d) => d.zoneId === selectedNode.id || selectedNode.type === 'FARM')
                    .map((dev) => (
                      <div key={dev.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium text-slate-900">{dev.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {dev.code} · Pin: {dev.batteryPercent}%
                          </div>
                        </div>
                        <StatusBadge status={dev.status} size="sm" />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
