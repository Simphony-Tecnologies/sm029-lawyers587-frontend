'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/database';
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
import { DataTable, TrendPill, type DataTableColumn } from '@/components/ui';

interface PerformancePanelProps {
  /** Ventana relativa del PeriodSelect. `null` = all time → backend default 30d. */
  days: number | null;
  sortBy?: PerformanceSortBy;
}

export const PerformancePanel = ({
  days,
  sortBy = 'conversion_rate',
}: PerformancePanelProps) => {
  const [data, setData] = useState<LawyerPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.lawyers.metrics
      // limit alto: traemos todos los abogados de la firma para que el conteo
      // del header (data.total) no diverja de las filas paginadas en cliente.
      .performance({ ...periodToRange(days), sort_by: sortBy, limit: 100 })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Unable to load performance');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, sortBy]);

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

  if (error) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500'>
        {error}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5'>
      <div className='flex items-baseline justify-between'>
        <h2 className='text-sm font-bold text-slate-800'>Lawyer performance</h2>
        {data ? (
          <span className='text-[11px] font-semibold text-slate-400'>
            {data.total} lawyer{data.total === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>
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
    </div>
  );
};
