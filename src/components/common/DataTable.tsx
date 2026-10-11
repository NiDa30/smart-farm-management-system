import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyField: keyof T;
  searchPlaceholder?: string;
  searchFilterFields?: (keyof T)[];
  filters?: React.ReactNode;
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => React.ReactNode;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  rowActions?: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  pageSizeDefault?: number;
  enableSelection?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  searchPlaceholder = 'Tìm kiếm dữ liệu...',
  searchFilterFields = [],
  filters,
  bulkActions,
  isLoading = false,
  emptyState,
  rowActions,
  onRowClick,
  pageSizeDefault = 10,
  enableSelection = true,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeDefault);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map((c) => c.key)
  );
  const [showColMenu, setShowColMenu] = useState(false);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) => {
      if (searchFilterFields.length > 0) {
        return searchFilterFields.some((field) =>
          String(item[field] ?? '')
            .toLowerCase()
            .includes(term)
        );
      }
      return Object.values(item).some((val) =>
        String(val ?? '')
          .toLowerCase()
          .includes(term)
      );
    });
  }, [data, searchTerm, searchFilterFields]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Selection
  const allCurrentPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedIds.includes(String(item[keyField])));

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const pageIds = paginatedData.map((d) => String(d[keyField]));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedData.map((d) => String(d[keyField]));
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {filters}

          {/* Column Visibility */}
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              title="Tùy chỉnh cột"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cột</span>
            </button>

            {showColMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-30 p-2 text-xs">
                <div className="font-semibold text-slate-700 mb-1 px-1">Hiển thị cột</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {columns.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(c.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColumns([...visibleColumns, c.key]);
                          } else if (visibleColumns.length > 1) {
                            setVisibleColumns(visibleColumns.filter((k) => k !== c.key));
                          }
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-slate-700 truncate">{c.header}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk actions banner if items selected */}
      {selectedIds.length > 0 && bulkActions && (
        <div className="bg-emerald-50/80 px-4 py-2 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-700 text-white text-[11px] font-mono tabular-nums">
              {selectedIds.length}
            </span>
            <span>mục đang được chọn</span>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions(selectedIds, () => setSelectedIds([]))}
            <button
              onClick={() => setSelectedIds([])}
              className="text-emerald-700 hover:text-emerald-900 text-xs underline underline-offset-2 ml-2"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto min-h-[320px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {enableSelection && (
                <th className="w-10 px-3.5 py-2.5">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
              )}

              {columns
                .filter((c) => visibleColumns.includes(c.key))
                .map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      className={`px-3.5 py-2.5 font-medium whitespace-nowrap ${
                        col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                      } ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === 'right' ? 'justify-end' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-slate-400">
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 opacity-60" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}

              {rowActions && (
                <th className="px-3.5 py-2.5 text-right font-medium text-slate-600 w-24">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {enableSelection && (
                    <td className="px-3.5 py-3">
                      <div className="w-4 h-4 bg-slate-200 rounded"></div>
                    </td>
                  )}
                  {columns
                    .filter((c) => visibleColumns.includes(c.key))
                    .map((col) => (
                      <td key={col.key} className="px-3.5 py-3">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      </td>
                    ))}
                  {rowActions && (
                    <td className="px-3.5 py-3 text-right">
                      <div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div>
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    columns.filter((c) => visibleColumns.includes(c.key)).length +
                    (enableSelection ? 1 : 0) +
                    (rowActions ? 1 : 0)
                  }
                  className="px-6 py-12 text-center text-slate-500"
                >
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Filter className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-medium text-slate-700">
                        Không tìm thấy dữ liệu phù hợp
                      </p>
                      <p className="text-xs text-slate-400">
                        Thử điều chỉnh lại bộ lọc tìm kiếm hoặc xóa từ khóa.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => {
                const id = String(item[keyField]);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors duration-100 ${
                      isSelected
                        ? 'bg-emerald-50/50 hover:bg-emerald-50'
                        : 'hover:bg-slate-50/80'
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {enableSelection && (
                      <td
                        className="px-3.5 py-2.5"
                        onClick={(e) => toggleSelectItem(id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                    )}

                    {columns
                      .filter((c) => visibleColumns.includes(c.key))
                      .map((col) => (
                        <td
                          key={col.key}
                          className={`px-3.5 py-2.5 text-slate-800 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                        </td>
                      ))}

                    {rowActions && (
                      <td
                        className="px-3.5 py-2.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rowActions(item)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="font-mono tabular-nums">
            trên tổng số <strong>{sortedData.length}</strong> bản ghi
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 mr-2 font-mono tabular-nums">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
