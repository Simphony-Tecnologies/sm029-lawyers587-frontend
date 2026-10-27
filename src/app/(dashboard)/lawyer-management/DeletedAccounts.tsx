'use client';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '@/services/database';
import type { DeletedLawyer } from '@/types/api.types';
import { DataTable, type DataTableColumn } from '@/components/ui';

const PAGE_SIZE = 1000;
const fmtDate = (d?: string | null) => (d ? dayjs(d).format('MMM D, YYYY') : '—');

const columns: DataTableColumn<DeletedLawyer>[] = [
  {
    key: 'code',
    label: 'Code',
    width: '130px',
    sortable: true,
    // `||`: hay abogados viejos con `code` vacío ('') y `??` no lo cubre.
    accessor: (r) => r.code || String(r.id),
    render: (r) => (
      <span className='font-mono text-xs text-slate-500'>
        {r.code || `#${String(r.id).padStart(5, '0')}`}
      </span>
    ),
  },
  {
    key: 'name',
    label: 'Lawyer',
    width: 'minmax(200px, 2fr)',
    sortable: true,
    accessor: (r) => `${r.firstName} ${r.lastName}`.trim(),
    render: (r) => (
      <div className='flex min-w-0 flex-col pr-3'>
        <span className='truncate text-[13px] font-bold text-slate-700'>
          {`${r.firstName} ${r.lastName}`.trim() || '—'}
        </span>
        <span title={r.email ?? undefined} className='truncate text-[11px] text-slate-400'>
          {r.email ?? '—'}
        </span>
      </div>
    ),
  },
  {
    key: 'phone',
    label: 'Phone',
    width: '130px',
    render: (r) => <span className='text-slate-600'>{r.phone || '—'}</span>,
  },
  {
    key: 'firm',
    label: 'Firm',
    width: 'minmax(120px, 1fr)',
    sortable: true,
    accessor: (r) => r.firm?.name ?? '',
    render: (r) => <span className='truncate text-slate-600'>{r.firm?.name ?? '—'}</span>,
  },
  {
    key: 'created_at',
    label: 'Created',
    width: '120px',
    sortable: true,
    accessor: (r) => r.created_at ?? '',
    render: (r) => <span className='text-slate-600'>{fmtDate(r.created_at)}</span>,
  },
  {
    key: 'last_login',
    label: 'Last login',
    width: '120px',
    sortable: true,
    accessor: (r) => r.last_login ?? '',
    render: (r) => (
      <span className='text-slate-600'>{r.last_login ? fmtDate(r.last_login) : 'Never'}</span>
    ),
  },
  {
    key: 'deleted_at',
    label: 'Deleted',
    width: '150px',
    sortable: true,
    accessor: (r) => r.deleted_at,
    render: (r) => (
      <span className='font-semibold text-slate-700'>
        {dayjs(r.deleted_at).format('MMM D, YYYY, HH:mm')}
      </span>
    ),
  },
  {
    key: 'deleted_by',
    label: 'Deleted by',
    width: 'minmax(120px, 1fr)',
    sortable: true,
    accessor: (r) => r.deleted_by?.name ?? '',
    render: (r) => <span className='text-slate-600'>{r.deleted_by?.name ?? '—'}</span>,
  },
  {
    // Leads que tenía asignados en el momento del borrado, no el total histórico.
    key: 'leads_handled',
    label: 'Leads assigned at deletion',
    width: '120px',
    sortable: true,
    align: 'right',
    headerClassName: 'pr-6',
    cellClassName: 'pr-6',
    accessor: (r) => r.leads_handled,
    render: (r) => <span className='tabular-nums text-slate-700'>{r.leads_handled}</span>,
  },
];

interface DeletedAccountsProps {
  searchText: string;
  /** Cambia tras cada borrado para volver a cargar la lista. */
  reloadKey: number;
}

// "Deleted accounts": registro permanente de cuentas de abogado borradas
// (GET /lawyers/deleted). Solo lectura: la cuenta ya no existe.
export const DeletedAccounts = ({ searchText, reloadKey }: DeletedAccountsProps) => {
  const [rows, setRows] = useState<DeletedLawyer[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setFailed(false);
      const all: DeletedLawyer[] = [];
      let total = 0;
      do {
        const res = await api.lawyers.deleted({ limit: PAGE_SIZE, offset: all.length });
        if (!active) return;
        if (!res.success || !res.data) {
          setFailed(true);
          setRows([]);
          return;
        }
        const page = Array.isArray(res.data.data) ? res.data.data : [];
        total = Number(res.data.total ?? page.length);
        all.push(...page);
        if (page.length === 0) break;
      } while (all.length < total);
      if (active) setRows(all);
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const list = rows ?? [];
    const q = searchText.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.code ?? '').toLowerCase().includes(q) ||
        (r.deleted_by?.name ?? '').toLowerCase().includes(q)
    );
  }, [rows, searchText]);

  if (failed) {
    return (
      <div className='flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center'>
        <div className='flex flex-col gap-1'>
          <span className='text-[13px] font-semibold text-rose-700'>
            Couldn&apos;t load deleted accounts
          </span>
          <span className='text-[11px] text-rose-500'>
            Try refreshing the page or check your connection
          </span>
        </div>
      </div>
    );
  }

  return (
    <DataTable<DeletedLawyer>
      data={filtered}
      columns={columns}
      rowKey={(r) => r.id}
      pagination={{ enabled: true, initialPageSize: 10 }}
      totalLabel='accounts'
      initialSort={{ key: 'deleted_at', direction: 'desc' }}
      emptyState={
        <div className='flex flex-col items-center gap-1 py-6'>
          <span className='text-[13px] font-semibold text-slate-700'>
            {rows === null ? 'Loading…' : 'No deleted accounts'}
          </span>
          {rows !== null ? (
            <span className='text-[11px] text-slate-400'>
              Lawyer accounts deleted by an admin appear here
            </span>
          ) : null}
        </div>
      }
    />
  );
};
