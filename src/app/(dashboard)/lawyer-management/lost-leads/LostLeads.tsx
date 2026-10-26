'use client';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useLeadsStore } from '@/store/useLead.store';
import {
  Avatar,
  Badge,
  DataTable,
  OriginBadge,
  PageHead,
  SearchField,
  SourceBadge,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type DataTableColumn,
} from '@/components/ui';
import { sourceLabel } from '@/lib/lead-source';

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
  channel?: string;
  source?: string;
  source_label?: string;
  // Obs 25/36 — devolución: motivo, abogado que lo devolvió y contador.
  return_reason?: string | null;
  previous_lawyer?: {
    id: number;
    firstName: string;
    lastName: string;
    deleted?: boolean;
  } | null;
  return_count?: number;
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

// Obs 36 — el motivo y el abogado de la devolución vienen en el listado
// (return_reason / previous_lawyer); `comments` y el asignado actual quedan
// solo como respaldo para filas sin esos datos (p. ej. DISABLED).
const reasonOf = (r: LeadRow) => r.return_reason || r.comments;
const lawyerOf = (r: LeadRow) => {
  const prev = `${r.previous_lawyer?.firstName ?? ''} ${r.previous_lawyer?.lastName ?? ''}`.trim();
  if (!prev) return r.lawyer;
  // Cuenta borrada: el nombre viene del registro de borrados.
  return r.previous_lawyer?.deleted ? `${prev} (deleted account)` : prev;
};

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
    // El ID se muestra con ceros ("#00041"): se busca también sin "#" ni ceros.
    const qId = q.replace(/^#/, '').replace(/^0+(?=\d)/, '');
    if (!q) return list;
    return list.filter(
      (l) =>
        l['lead name']?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l['phone number']?.toLowerCase().includes(q) ||
        lawyerOf(l)?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q) ||
        (qId !== '' && /^\d+$/.test(qId) && String(l['lead id']).includes(qId))
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
          title={reasonOf(r)}
          className='block truncate pr-3 text-xs text-slate-500'
        >
          {reasonOf(r) || '—'}
        </span>
      ),
    },
    {
      key: 'lawyer',
      label: 'Was assigned to',
      width: '170px',
      sortable: true,
      accessor: (r) => lawyerOf(r),
      render: (r) => {
        const lawyer = lawyerOf(r);
        const isAssigned = lawyer && !/no assigned|not assigned/i.test(lawyer);
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
              tone={toneFromString(lawyer)}
              initials={initialsOf(lawyer)}
            />
            <span className='truncate text-xs font-semibold text-slate-700'>
              {lawyer}
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
      // Obs 25 — contador de devoluciones (R1, R2…) junto al status.
      render: (r) => (
        <div className='flex items-center gap-1'>
          <StatusPill variant={variantFromStatus(r.status)} />
          {(r.return_count ?? 0) >= 1 ? (
            <Badge variant='count' className='whitespace-nowrap'>
              R{r.return_count}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'channel',
      label: 'Channel',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.source_label || sourceLabel(r.source),
      render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
    },
  ];

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <PageHead
        title='Lost Leads'
        action={
          <span className='text-[13px] font-medium tabular-nums text-slate-400'>
            {rows.length} {rows.length === 1 ? 'lead' : 'leads'}
          </span>
        }
      />

      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          // Ancho para que el placeholder se lea completo (se cortaba en "...status or").
          containerClassName='w-full sm:w-[340px]'
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
