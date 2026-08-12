'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MdSearch, MdRefresh } from 'react-icons/md';
import { api } from '@/services/database';
import {
  PageHead,
  DataTable,
  Pagination,
  fieldInputClass,
  type DataTableColumn,
} from '@/components/ui';
import { formatDate } from '@/utils/formatDate';
import { apiText } from '@/lib/apiText';
import type { FirmLeadsQuery, LeadDTO, LeadStatus } from '@/types/api.types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'ASSIGNED',
  'IN PROGRESS',
  'CLOSED',
  'LOST',
  'PROBLEMATIC',
  'EXPIRED',
  'DISABLED',
  'ARCHIVED',
  'SEND_BACK',
  'WAITING_ON_CLIENT',
  'REVIEW',
  'TRASHED',
];

type Filters = {
  search: string;
  status: string;
  service: string;
  source: string;
  date_from: string;
  date_to: string;
};

const EMPTY_FILTERS: Filters = {
  search: '',
  status: '',
  service: '',
  source: '',
  date_from: '',
  date_to: '',
};

const statusPillClass = (status: LeadStatus): string => {
  switch (status) {
    case 'NEW':
      return 'bg-sky-50 text-sky-700';
    case 'CLOSED':
      return 'bg-emerald-50 text-emerald-700';
    case 'LOST':
    case 'PROBLEMATIC':
    case 'TRASHED':
      return 'bg-rose-50 text-rose-700';
    case 'EXPIRED':
    case 'DISABLED':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const FirmLeads = () => {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<LeadDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    const query: FirmLeadsQuery = {
      search: applied.search || undefined,
      status: applied.status || undefined,
      service: applied.service || undefined,
      source: applied.source || undefined,
      date_from: applied.date_from || undefined,
      date_to: applied.date_to || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    };
    const res = await api.firms.leads(query);
    if (res.success && res.data) {
      setRows(res.data.data ?? []);
      setTotal(res.data.total ?? 0);
    } else {
      toast.error(apiText(res.message, 'Failed to load firm leads'));
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  }, [applied, page]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = () => {
    setPage(1);
    setApplied(draft);
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) return '0 leads';
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return `${start}–${end} of ${total}`;
  }, [page, total]);

  const columns: DataTableColumn<LeadDTO>[] = [
    {
      key: 'code',
      label: 'Code',
      render: (r) => (
        <span className='font-mono text-xs text-slate-600'>{r.code}</span>
      ),
    },
    {
      key: 'lead',
      label: 'Lead',
      render: (r) => (
        <div>
          <div className='font-semibold text-slate-800'>{r.fullName}</div>
          <div className='text-xs text-slate-400'>{r.email}</div>
        </div>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      render: (r) => <span className='text-slate-600'>{r.service || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${statusPillClass(
            r.status
          )}`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: 'assigned',
      label: 'Assigned to',
      render: (r) =>
        r.assigned_lawyer ? (
          <span className='text-slate-700'>
            {r.assigned_lawyer.firstName} {r.assigned_lawyer.lastName}
          </span>
        ) : (
          <span className='text-slate-400'>Unassigned</span>
        ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (r) => (
        <span className='text-slate-500'>
          {formatDate(new Date(r.created_at))}
        </span>
      ),
    },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Firm'
        title='Firm Leads'
        count={loading ? undefined : rangeLabel}
        subtitle='Leads assigned to any lawyer in your firm.'
      />

      <div className='flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4'>
        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold text-slate-500'>Search</span>
          <div className='relative'>
            <MdSearch
              className='absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400'
              size={16}
            />
            <input
              value={draft.search}
              onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              placeholder='Name, email, number'
              className={`${fieldInputClass()} pl-8`}
            />
          </div>
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold text-slate-500'>Status</span>
          <select
            value={draft.status}
            onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
            className={fieldInputClass()}
          >
            <option value=''>All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold text-slate-500'>Service</span>
          <input
            value={draft.service}
            onChange={(e) => setDraft((d) => ({ ...d, service: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            placeholder='e.g. Corporate'
            className={fieldInputClass()}
          />
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold text-slate-500'>Source</span>
          <input
            value={draft.source}
            onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && apply()}
            placeholder='e.g. web_form'
            className={fieldInputClass()}
          />
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold text-slate-500'>From</span>
          <input
            type='date'
            value={draft.date_from}
            onChange={(e) => setDraft((d) => ({ ...d, date_from: e.target.value }))}
            className={fieldInputClass()}
          />
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-[11px] font-semibold text-slate-500'>To</span>
          <input
            type='date'
            value={draft.date_to}
            onChange={(e) => setDraft((d) => ({ ...d, date_to: e.target.value }))}
            className={fieldInputClass()}
          />
        </label>

        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={apply}
            className='inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800'
          >
            <MdSearch size={16} /> Apply
          </button>
          <button
            type='button'
            onClick={reset}
            title='Reset filters'
            className='inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50'
          >
            <MdRefresh size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className='text-sm text-slate-400'>Loading…</p>
      ) : (
        <>
          <DataTable<LeadDTO>
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            emptyState={
              <div className='px-4 py-10 text-center text-sm text-slate-400'>
                No leads match these filters.
              </div>
            }
          />
          {pageCount > 1 ? (
            <div className='flex items-center justify-between'>
              <span className='text-xs text-slate-400'>{rangeLabel}</span>
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default FirmLeads;
