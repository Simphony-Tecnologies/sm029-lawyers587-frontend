'use client';
import { useMemo, useState, type ReactNode } from 'react';
import {
  MdArrowDownward,
  MdArrowUpward,
  MdUnfoldMore,
} from 'react-icons/md';
import { cn } from '@/lib/cn';
import { Checkbox } from '@/components/ui/atoms/Checkbox';
import { Pagination } from '@/components/ui/molecules/Pagination';
import { RowsPerPageSelect } from '@/components/ui/molecules/RowsPerPageSelect';

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T, rowIndex: number) => ReactNode;
  accessor?: (row: T) => string | number | Date | null | undefined;
  headerClassName?: string;
  cellClassName?: string;
}

export type SelectionKey = string | number;

export interface DataTableSelection<T> {
  getRowKey: (row: T) => SelectionKey;
  selectedKeys: Set<SelectionKey>;
  onChange: (next: Set<SelectionKey>) => void;
  isRowSelectable?: (row: T) => boolean;
  selectAllScope?: 'page' | 'filtered';
  ariaLabel?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  emptyState?: ReactNode;
  initialSort?: { key: string; direction: SortDirection };
  pagination?: {
    enabled: boolean;
    initialPageSize?: number;
    pageSizes?: number[];
  };
  totalLabel?: string;
  selection?: DataTableSelection<T>;
}

const SELECTION_COL_WIDTH = '40px';

const compareValues = (
  a: string | number | Date | null | undefined,
  b: string | number | Date | null | undefined
): number => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
};

export function DataTable<T>({
  columns,
  data,
  className,
  rowKey,
  onRowClick,
  emptyState,
  initialSort,
  pagination,
  totalLabel = 'items',
  selection,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<
    { key: string; direction: SortDirection } | undefined
  >(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    pagination?.initialPageSize ?? 10
  );

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const accessor = col.accessor ?? ((row: T) => (row as any)[sort.key]);
    const sorted = [...data].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      const cmp = compareValues(av, bv);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [data, sort, columns]);

  const pageCount = pagination?.enabled
    ? Math.max(1, Math.ceil(sortedData.length / pageSize))
    : 1;

  const pagedData = useMemo(() => {
    if (!pagination?.enabled) return sortedData;
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize, pagination]);

  const safePage = Math.min(page, pageCount);
  if (safePage !== page) setPage(safePage);

  const gridTemplate = useMemo(() => {
    const colTemplate = columns
      .map((c) => c.width ?? 'minmax(120px, 1fr)')
      .join(' ');
    return selection
      ? `${SELECTION_COL_WIDTH} ${colTemplate}`
      : colTemplate;
  }, [columns, selection]);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return undefined;
    });
  };

  const renderSortIcon = (col: DataTableColumn<T>) => {
    if (!col.sortable) return null;
    if (sort?.key !== col.key)
      return (
        <MdUnfoldMore
          size={12}
          className='text-slate-300 transition-colors group-hover:text-slate-500'
          aria-hidden
        />
      );
    return sort.direction === 'asc' ? (
      <MdArrowUpward size={12} className='text-slate-900' aria-hidden />
    ) : (
      <MdArrowDownward size={12} className='text-slate-900' aria-hidden />
    );
  };

  // ── selection helpers ────────────────────────────────────────────────
  const selectionScopeRows = useMemo<T[]>(() => {
    if (!selection) return [];
    const scope = selection.selectAllScope ?? 'page';
    const pool = scope === 'filtered' ? sortedData : pagedData;
    return selection.isRowSelectable
      ? pool.filter(selection.isRowSelectable)
      : pool;
  }, [selection, sortedData, pagedData]);

  const headerState = useMemo<'unchecked' | 'checked' | 'partial'>(() => {
    if (!selection || selectionScopeRows.length === 0) return 'unchecked';
    let selectedInScope = 0;
    for (const row of selectionScopeRows) {
      if (selection.selectedKeys.has(selection.getRowKey(row))) {
        selectedInScope += 1;
      }
    }
    if (selectedInScope === 0) return 'unchecked';
    if (selectedInScope === selectionScopeRows.length) return 'checked';
    return 'partial';
  }, [selection, selectionScopeRows]);

  const toggleHeader = () => {
    if (!selection) return;
    const next = new Set(selection.selectedKeys);
    if (headerState === 'checked') {
      for (const row of selectionScopeRows) {
        next.delete(selection.getRowKey(row));
      }
    } else {
      for (const row of selectionScopeRows) {
        next.add(selection.getRowKey(row));
      }
    }
    selection.onChange(next);
  };

  const toggleRow = (row: T) => {
    if (!selection) return;
    if (selection.isRowSelectable && !selection.isRowSelectable(row)) return;
    const key = selection.getRowKey(row);
    const next = new Set(selection.selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    selection.onChange(next);
  };

  const isEmpty = pagedData.length === 0;
  const showFooter =
    pagination?.enabled || (totalLabel && sortedData.length > 0);

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white',
        className
      )}
    >
      <div
        className='min-h-0 flex-1 overflow-y-auto'
        style={{ scrollbarGutter: 'stable' }}
      >
        <div
          role='table'
          aria-rowcount={pagedData.length + 1}
          className='min-w-full'
        >
          {/* Header */}
          <div
            role='row'
            className='sticky top-0 z-[3] grid items-center border-b border-slate-200 bg-slate-50 px-5 min-h-[42px]'
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {selection ? (
              <div role='columnheader' className='flex items-center'>
                <Checkbox
                  state={headerState}
                  size='md'
                  aria-label={selection.ariaLabel ?? 'Select all rows'}
                  onChange={toggleHeader}
                />
              </div>
            ) : null}
            {columns.map((col) => {
              const ariaSort: 'ascending' | 'descending' | 'none' | undefined =
                col.sortable
                  ? sort?.key === col.key
                    ? sort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                  : undefined;
              return (
                <div
                  key={col.key}
                  role='columnheader'
                  aria-sort={ariaSort}
                  className={cn(
                    'group flex items-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 select-none',
                    col.align === 'right' && 'justify-end',
                    col.align === 'center' && 'justify-center',
                    col.headerClassName
                  )}
                >
                  {col.sortable ? (
                    <button
                      type='button'
                      onClick={() => handleSort(col.key)}
                      className='inline-flex items-center gap-1 bg-transparent text-[10px] font-bold uppercase tracking-wider text-inherit transition-colors hover:text-slate-700 focus:outline-none'
                    >
                      {col.label}
                      {renderSortIcon(col)}
                    </button>
                  ) : (
                    <span>{col.label}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          {isEmpty ? (
            <div className='flex items-center justify-center py-16 text-center'>
              {emptyState ?? (
                <div className='flex flex-col items-center gap-1'>
                  <span className='text-[13px] font-semibold text-slate-700'>
                    No results
                  </span>
                  <span className='text-[11px] text-slate-400'>
                    Try adjusting your filters
                  </span>
                </div>
              )}
            </div>
          ) : (
            pagedData.map((row, idx) => {
              const k = rowKey ? rowKey(row, idx) : idx;
              const clickable = !!onRowClick;
              const selectable =
                !!selection &&
                (!selection.isRowSelectable || selection.isRowSelectable(row));
              const isSelected =
                !!selection &&
                selection.selectedKeys.has(selection.getRowKey(row));
              return (
                <div
                  key={k}
                  role='row'
                  aria-selected={selection ? isSelected : undefined}
                  onClick={clickable ? () => onRowClick(row, idx) : undefined}
                  className={cn(
                    'grid items-center border-b border-slate-100 px-5 transition-colors min-h-[52px] last:border-b-0',
                    clickable && 'cursor-pointer hover:bg-slate-50',
                    isSelected && 'bg-slate-50'
                  )}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  {selection ? (
                    <div
                      role='cell'
                      onClick={(e) => e.stopPropagation()}
                      className='flex items-center'
                    >
                      <Checkbox
                        state={isSelected ? 'checked' : 'unchecked'}
                        size='md'
                        disabled={!selectable}
                        aria-label='Select row'
                        onChange={() => toggleRow(row)}
                      />
                    </div>
                  ) : null}
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      role='cell'
                      className={cn(
                        'min-w-0 py-3.5 text-xs font-medium text-slate-700',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.cellClassName
                      )}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : String((row as any)[col.key] ?? '')}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showFooter ? (
        <div className='flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3'>
          <div className='flex items-center gap-2 text-[11px] font-medium text-slate-500'>
            {pagination?.enabled ? (
              <>
                Showing
                <RowsPerPageSelect
                  value={pageSize}
                  onChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                  }}
                  options={pagination.pageSizes ?? [10, 20, 50, 100]}
                />
                of {sortedData.length} {totalLabel}
              </>
            ) : (
              <>
                {sortedData.length} {totalLabel}
              </>
            )}
          </div>
          {pagination?.enabled ? (
            <Pagination
              page={safePage}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
DataTable.displayName = 'DataTable';
