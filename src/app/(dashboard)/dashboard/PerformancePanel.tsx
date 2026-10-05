'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import { MdFileDownload } from 'react-icons/md';
import { api, downloadBlob } from '@/services/database';
import type {
  LawyerPerformanceResponse,
  LawyerPerformanceRow,
  PerformanceSortBy,
} from '@/types/api.types';
import {
  formatHours,
  formatPercent,
  formatSignedInt,
  periodToRange,
  trendToDirection,
} from '@/lib/metrics';
import { buildCsvBlob } from '@/lib/csv';
import {
  DataTable,
  TrendPill,
  type DataTableColumn,
  type SortDirection,
} from '@/components/ui';

type CellValue = string | number | Date | null | undefined;

// Mismo comparador que DataTable: el CSV sale en el mismo orden que la tabla.
const compareCells = (a: CellValue, b: CellValue): number => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
};

// Valor de cada columna en el CSV: el mismo texto que muestra la celda.
const CSV_VALUE: Record<string, (r: LawyerPerformanceRow) => CellValue> = {
  name: (r) => r.name,
  taken: (r) => r.taken,
  closed: (r) => r.closed,
  lost: (r) => r.lost,
  conversion_rate: (r) => formatPercent(r.conversion_rate),
  avg_response_hours: (r) => formatHours(r.avg_response_hours),
  active_assigned: (r) => r.active_assigned,
};

// Mismo estilo que los botones Export CSV de la Fase 1, con la altura del PeriodSelect.
const EXPORT_BUTTON_CLASS =
  'inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50';

// Fase 4 — filas ya cargadas por otra vista (Reports de la firma), con el
// rango del período (ISO) para el nombre del CSV.
export interface PerformancePanelData {
  lawyers: LawyerPerformanceRow[];
  from: string;
  to: string;
}

export interface PerformancePanelSource {
  data: PerformancePanelData | null;
  loading: boolean;
  error: string | null;
}

interface PerformancePanelProps {
  /** Ventana relativa del PeriodSelect. `null` = all time → backend default 30d. */
  days?: number | null;
  sortBy?: PerformanceSortBy;
  /** Control opcional en el header (p. ej. el PeriodSelect propio del panel). */
  action?: ReactNode;
  /**
   * Fase 4 — datos externos: si viene, el panel no llama a
   * /lawyers/metrics/performance y muestra estas filas. Sin `source` (dashboard
   * admin) el comportamiento es el de siempre.
   */
  source?: PerformancePanelSource;
}

export const PerformancePanel = ({
  days = null,
  sortBy = 'conversion_rate',
  action,
  source,
}: PerformancePanelProps) => {
  const [fetched, setFetched] = useState<LawyerPerformanceResponse | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const external = source !== undefined;

  useEffect(() => {
    if (external) return;
    let active = true;
    setFetchLoading(true);
    setFetchError(null);
    api.lawyers.metrics
      // limit alto: traemos todos los abogados de la firma para que el conteo
      // del header (data.total) no diverja de las filas paginadas en cliente.
      .performance({ ...periodToRange(days), sort_by: sortBy, limit: 100 })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setFetched(res.data);
        else setFetchError(res.message || 'Unable to load performance');
      })
      .finally(() => {
        if (active) setFetchLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, sortBy, external]);

  // Misma forma para ambos orígenes: filas, total del header y rango del CSV.
  const data = useMemo(() => {
    if (external) {
      return source.data
        ? { ...source.data, total: source.data.lawyers.length }
        : null;
    }
    return fetched
      ? {
          lawyers: fetched.lawyers,
          total: fetched.total,
          from: fetched.range.from,
          to: fetched.range.to,
        }
      : null;
  }, [external, source?.data, fetched]);
  const loading = external ? source.loading : fetchLoading;
  const error = external ? source.error : fetchError;

  const columns = useMemo<DataTableColumn<LawyerPerformanceRow>[]>(
    () => [
      {
        key: 'name',
        label: 'Lawyer',
        sortable: true,
        accessor: (r) => r.name,
        render: (r) => (
          <div className='flex flex-col'>
            <span className='text-[13px] font-semibold text-slate-800'>{r.name}</span>
            <span className='text-[11px] text-slate-400'>{r.email}</span>
          </div>
        ),
      },
      {
        key: 'taken',
        label: 'Taken',
        align: 'right',
        sortable: true,
        accessor: (r) => r.taken,
        render: (r) => <span className='tabular-nums'>{r.taken}</span>,
      },
      {
        key: 'closed',
        label: 'Closed',
        align: 'right',
        sortable: true,
        accessor: (r) => r.closed,
        render: (r) => <span className='tabular-nums'>{r.closed}</span>,
      },
      {
        key: 'lost',
        label: 'Lost',
        align: 'right',
        sortable: true,
        accessor: (r) => r.lost,
        render: (r) => <span className='tabular-nums'>{r.lost}</span>,
      },
      {
        key: 'conversion_rate',
        label: 'Conversion',
        align: 'right',
        sortable: true,
        // null ordena al fondo (accessor -1); render sigue mostrando '—'.
        accessor: (r) => r.conversion_rate ?? -1,
        render: (r) => (
          <div className='flex items-center justify-end gap-1.5'>
            <span className='tabular-nums'>{formatPercent(r.conversion_rate)}</span>
            <TrendPill
              direction={trendToDirection(r.delta.trend)}
              value={formatSignedInt(r.delta.closed)}
            />
          </div>
        ),
      },
      {
        key: 'avg_response_hours',
        label: 'Avg. Response',
        align: 'right',
        sortable: true,
        accessor: (r) => r.avg_response_hours ?? -1,
        render: (r) => <span className='tabular-nums'>{formatHours(r.avg_response_hours)}</span>,
      },
      {
        key: 'active_assigned',
        label: 'Active Now',
        align: 'right',
        sortable: true,
        accessor: (r) => r.active_assigned,
        render: (r) => <span className='tabular-nums'>{r.active_assigned}</span>,
      },
    ],
    []
  );

  // Fase 3 (3.1) — Lawyer Ranking a CSV: mismas filas (todas las páginas),
  // orden, columnas y etiquetas que la tabla, sin llamar al backend.
  // DataTable no expone su orden actual: se lee del aria-sort de su encabezado
  // (mismo orden que `columns`) y se aplica el mismo comparador.
  const panelRef = useRef<HTMLDivElement>(null);

  const currentSort = (): {
    col: DataTableColumn<LawyerPerformanceRow>;
    direction: SortDirection;
  } | null => {
    const headers = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="columnheader"]') ?? []
    );
    for (let idx = 0; idx < headers.length; idx += 1) {
      const aria = headers[idx].getAttribute('aria-sort');
      if (columns[idx] && (aria === 'ascending' || aria === 'descending')) {
        return { col: columns[idx], direction: aria === 'ascending' ? 'asc' : 'desc' };
      }
    }
    return null;
  };

  const handleExportCsv = () => {
    if (!data) return;
    let rows = data.lawyers;
    const sort = currentSort();
    if (sort?.col.accessor) {
      const { accessor } = sort.col;
      const sign = sort.direction === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => sign * compareCells(accessor(a), accessor(b)));
    }
    downloadBlob(
      buildCsvBlob(
        columns.map((c) => c.label),
        rows.map((r) => columns.map((c) => CSV_VALUE[c.key]?.(r) ?? ''))
      ),
      `lawyer-ranking-${dayjs(data.from).format('YYYY-MM-DD')}-${dayjs(
        data.to
      ).format('YYYY-MM-DD')}.csv`
    );
  };

  return (
    <div
      ref={panelRef}
      className='flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-baseline gap-2'>
          <h2 className='text-sm font-bold text-slate-800'>Lawyer performance</h2>
          {data && !error ? (
            <span className='text-[11px] font-semibold text-slate-400'>
              {data.total} lawyer{data.total === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
        {/* El selector sigue visible si la carga falla, para poder cambiar de período. */}
        <div className='flex shrink-0 items-center gap-2'>
          {action}
          <button
            type='button'
            onClick={handleExportCsv}
            disabled={loading || !!error || !data}
            className={EXPORT_BUTTON_CLASS}
          >
            <MdFileDownload size={14} />
            Export CSV
          </button>
        </div>
      </div>
      {error ? (
        <p className='text-sm text-slate-500'>{error}</p>
      ) : (
        <DataTable<LawyerPerformanceRow>
          columns={columns}
          data={data?.lawyers ?? []}
          rowKey={(r) => r.lawyer_id}
          totalLabel='lawyers'
          initialSort={{ key: sortBy, direction: 'desc' }}
          emptyState={
            loading ? 'Loading performance…' : 'No performance data for this period'
          }
          pagination={{ enabled: true, initialPageSize: 10 }}
        />
      )}
    </div>
  );
};
