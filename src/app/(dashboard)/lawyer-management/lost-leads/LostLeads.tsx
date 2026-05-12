'use client';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useLeadsStore } from '@/store/useLead.store';
import {
  Avatar,
  DataTable,
  PageHead,
  SearchField,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type DataTableColumn,
} from '@/components/ui';

type LeadRow = {
  'lead id': number;
  date: Date;
  date_updated: Date;
  'lead name': string;
  email: string;
  'phone number': string;
  service: string;
  'description lead': string;
  comments: string;
  lawyer: string;
  status: string;
};

const LOST_STATUSES = new Set(['LOST', 'EXPIRED', 'DISABLED']);

const formatId = (id: number | string) => String(id).padStart(5, '0');
const formatDate = (d: Date | string) => dayjs(d).format('MMM DD, YYYY');
const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '·';

const LostLeads = () => {
  const { dataLeads, fetchLeads, error } = useLeadsStore();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!dataLeads) fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo<LeadRow[]>(() => {
    if (!dataLeads) return [];
    const list = (dataLeads as LeadRow[]).filter((l) =>
      LOST_STATUSES.has(l.status)
    );
    const q = searchText.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (l) =>
        l['lead name']?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l['phone number']?.toLowerCase().includes(q) ||
        l.lawyer?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q) ||
        String(l['lead id']).includes(q)
    );
  }, [dataLeads, searchText]);

  const columns: DataTableColumn<LeadRow>[] = [
    {
      key: 'lead id',
      label: 'ID',
      width: '68px',
      sortable: true,
      accessor: (r) => r['lead id'],
      render: (r) => (
        <span className='font-bold tabular-nums text-slate-900'>
          {formatId(r['lead id'])}
        </span>
      ),
    },
    {
      key: 'date_updated',
      label: 'Closed',
      width: '100px',
      sortable: true,
      accessor: (r) => r.date_updated,
      render: (r) => (
        <span className='text-[11px] tabular-nums text-slate-500'>
          {formatDate(r.date_updated)}
        </span>
      ),
    },
    {
      key: 'lead name',
      label: 'Lead',
      width: 'minmax(180px, 220px)',
      sortable: true,
      accessor: (r) => r['lead name'],
      render: (r) => (
        <div className='flex min-w-0 flex-col gap-0.5'>
          <span className='truncate text-[13px] font-bold tracking-[-0.005em] text-slate-900'>
            {r['lead name'] || '—'}
          </span>
          <span className='truncate text-[11px] font-medium text-slate-400'>
            {r.email || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone number',
      label: 'Phone',
      width: '130px',
      render: (r) => (
        <span className='text-[11px] tabular-nums text-slate-600'>
          {r['phone number'] || '—'}
        </span>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      width: '110px',
      sortable: true,
      accessor: (r) => r.service,
      render: (r) => (
        <span className='text-[11px] font-semibold text-slate-700'>
          {r.service || '—'}
        </span>
      ),
    },
    {
      key: 'comments',
      label: 'Reason',
      width: 'minmax(180px, 1fr)',
      render: (r) => (
        <span
          title={r.comments}
          className='block truncate pr-3 text-xs text-slate-500'
        >
          {r.comments || '—'}
        </span>
      ),
    },
    {
      key: 'lawyer',
      label: 'Was assigned to',
      width: '170px',
      sortable: true,
      accessor: (r) => r.lawyer,
      render: (r) => {
        const isAssigned = r.lawyer && !/no assigned|not assigned/i.test(r.lawyer);
        if (!isAssigned) {
          return (
            <span className='text-[11px] font-medium italic text-slate-400'>
              Unassigned
            </span>
          );
        }
        return (
          <div className='flex min-w-0 items-center gap-2'>
            <Avatar
              size='xs'
              tone={toneFromString(r.lawyer)}
              initials={initialsOf(r.lawyer)}
            />
            <span className='truncate text-xs font-semibold text-slate-700'>
              {r.lawyer}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => <StatusPill variant={variantFromStatus(r.status)} />,
    },
  ];

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <PageHead
        title='Lost Leads'
        action={
          <span className='text-[13px] font-medium tabular-nums text-slate-400'>
            {rows.length} leads
          </span>
        }
      />

      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          placeholder='Search by name, email, lawyer, status or ID...'
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {error ? (
        <div className='flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center'>
          <div className='flex flex-col gap-1'>
            <span className='text-[13px] font-semibold text-rose-700'>
              Failed to load leads
            </span>
            <span className='text-[11px] text-rose-500'>
              Try refreshing the page or check your connection
            </span>
          </div>
        </div>
      ) : (
        <DataTable<LeadRow>
          columns={columns}
          data={rows}
          rowKey={(row) => row['lead id']}
          pagination={{ enabled: true, initialPageSize: 10 }}
          totalLabel='leads'
          initialSort={{ key: 'date_updated', direction: 'desc' }}
          emptyState={
            <div className='flex flex-col items-center gap-1'>
              <span className='text-[13px] font-semibold text-slate-700'>
                No lost leads
              </span>
              <span className='text-[11px] text-slate-400'>
                Leads with status LOST, EXPIRED or DISABLED will appear here
              </span>
            </div>
          }
        />
      )}
    </div>
  );
};

export default LostLeads;
