'use client';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import toast from 'react-hot-toast';
import { MdOutlineCases } from 'react-icons/md';
import { api } from '@/services/database';
import type { LeadDTO, LeadStatus } from '@/types/api.types';
import { useAuth } from '@/store/useAuth.store';
import useLoadingStore from '@/store/useLoadingStore';
import { useSelectStatus } from '@/store/useSelectStatus';
import { statusSelectAll } from '@/constants/status';
import {
  Avatar,
  DataTable,
  EmptyStateBox,
  FilterButton,
  LeadInfoModal,
  PageHead,
  SearchField,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type DataTableColumn,
  type LeadInfoSubmitPayload,
  type LeadStatusOption,
} from '@/components/ui';
import CountdownTimer from '@/components/organisms/CountdownTimer';
import Loading from '../loading';

dayjs.extend(utc);

type LeadRow = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  description: string;
  comments: string;
  status: LeadStatus;
  date_updated: Date;
  date: Date;
};

const STATUS_OPTIONS: LeadStatusOption[] = [
  { name: 'In progress', value: 'IN PROGRESS' },
  { name: 'Problematic', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained', value: 'CLOSED' },
];

const STATUS_OPTIONS_CLOSED: LeadStatusOption[] = [
  { name: 'Retained', value: 'CLOSED' },
];

const ASSIGNED_FRESHNESS_HOURS = 48;

const isLeadExpired = (lead: LeadRow) => {
  if (lead.status !== 'ASSIGNED') return false;
  const hours = (Date.now() - lead.date_updated.getTime()) / 36e5;
  return hours > ASSIGNED_FRESHNESS_HOURS;
};

const toRow = (lead: LeadDTO): LeadRow => ({
  id: lead.id,
  fullName: lead.fullName ?? '',
  email: lead.email ?? '',
  phone: lead.phone ?? '',
  service: lead.service ?? '',
  description: lead.description ?? '',
  comments: lead.comments ?? '',
  status: lead.status,
  date_updated: new Date(lead.updated_at ?? lead.created_at ?? lead.entry_date),
  date: new Date(lead.created_at ?? lead.entry_date),
});

const AllLeads = () => {
  const { user } = useAuth();
  const { setLoading, isLoading } = useLoadingStore();
  const { selecArray, setSelecArray } = useSelectStatus();

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAssigned = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await api.leads.list({
      assigned_to: Number(user.id),
      limit: 1000,
    });
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not load assigned leads');
      setRows([]);
      return;
    }
    const next = res.data.data.map(toRow);
    setRows(next);
    // UX-L06: si hay leads ASSIGNED y aún no se fijó filtro, default a ASSIGNED
    // — son los más relevantes para el lawyer al entrar.
    if (statusFilter === null && next.some((r) => r.status === 'ASSIGNED')) {
      setStatusFilter('ASSIGNED');
    }
  };

  useEffect(() => {
    void fetchAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.status))),
    [rows]
  );

  const filtered = useMemo<LeadRow[]>(() => {
    let list = rows;
    if (selecArray.length > 0) {
      const set = new Set(selecArray.map((s) => s.toLowerCase()));
      list = list.filter((l) => set.has(l.status?.toLowerCase()));
    } else if (statusFilter) {
      list = list.filter((l) => l.status === statusFilter);
    }
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          String(l.id).includes(q)
      );
    }
    return list;
  }, [rows, statusFilter, searchText, selecArray]);

  const handleOpenLead = (row: LeadRow) => {
    if (isLeadExpired(row)) {
      toast.error('This lead has expired');
      return;
    }
    setSelectedLead(row);
    setIsOpenLead(true);
  };

  const handleStatusClick = (status: string | null) => {
    setSelecArray([]);
    setStatusFilter(status);
  };

  const handleSaveLead = async ({
    status,
    comments,
  }: LeadInfoSubmitPayload): Promise<void> => {
    if (!selectedLead) return;
    const upper = (status ?? '').toUpperCase() as LeadStatus;
    const reasonRequired =
      upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST';
    const reason = (comments ?? '').trim();
    if (reasonRequired && reason.length === 0) {
      toast.error('A reason is required for this status change');
      return;
    }
    setSubmitting(true);
    const unassignStatuses: LeadStatus[] = ['LOST', 'SEND_BACK'];
    const res = unassignStatuses.includes(upper)
      ? await api.leads.unassign(selectedLead.id, {
          status: upper,
          comment: reason,
        })
      : await api.leads.update(selectedLead.id, {
          status: upper,
          comment: reason || undefined,
          description: selectedLead.description,
        });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.message || 'Error updating Lead information');
      return;
    }
    toast.success('Lead information updated successfully');
    setIsOpenLead(false);
    void fetchAssigned();
  };

  const columns: DataTableColumn<LeadRow>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '80px',
      sortable: true,
      accessor: (r) => r.id,
      render: (r) => (
        <span className='font-mono text-xs text-slate-400'>
          #{String(r.id).padStart(5, '0')}
        </span>
      ),
    },
    {
      key: 'fullName',
      label: 'Lead',
      sortable: true,
      accessor: (r) => r.fullName,
      render: (r) => (
        <div className='flex items-center gap-2.5'>
          <Avatar
            initials={r.fullName.slice(0, 2).toUpperCase() || '·'}
            tone={toneFromString(r.fullName) as any}
            size='sm'
          />
          <div className='flex min-w-0 flex-col'>
            <span className='truncate text-[13px] font-bold text-slate-900'>
              {r.fullName || '—'}
            </span>
            <span className='truncate text-[11px] text-slate-400'>
              {r.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '160px',
      sortable: true,
      accessor: (r) => r.phone,
    },
    {
      key: 'service',
      label: 'Service',
      width: '180px',
      sortable: true,
      accessor: (r) => r.service,
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => (
        <StatusPill variant={variantFromStatus(r.status) as any} />
      ),
    },
    {
      key: 'date_updated',
      label: 'Updated',
      width: '130px',
      sortable: true,
      accessor: (r) => r.date_updated,
      render: (r) => (
        <span className='text-[12px] text-slate-500'>
          {dayjs.utc(r.date_updated).local().format('MMM DD, HH:mm')}
        </span>
      ),
    },
  ];

  if (isLoading && rows.length === 0) return <Loading />;

  return (
    <div className='flex flex-col gap-5'>
      <LeadInfoModal
        open={isOpenLead}
        onClose={() => setIsOpenLead(false)}
        lead={
          selectedLead
            ? {
                id: selectedLead.id,
                name: selectedLead.fullName,
                email: selectedLead.email,
                phone: selectedLead.phone,
                service: selectedLead.service,
                description: selectedLead.description,
                comments: selectedLead.comments,
                status: selectedLead.status,
              }
            : null
        }
        statusOptions={
          selectedLead?.status === 'CLOSED'
            ? STATUS_OPTIONS_CLOSED
            : STATUS_OPTIONS
        }
        onSubmit={handleSaveLead}
        loading={submitting}
        breadcrumb='My Leads'
        countdown={
          selectedLead?.status === 'ASSIGNED' ? (
            <CountdownTimer
              targetDate={dayjs(selectedLead.date_updated).toISOString()}
            />
          ) : undefined
        }
      />

      <PageHead
        title='My Leads'
        action={
          <span className='text-[13px] font-medium tabular-nums text-slate-400'>
            {filtered.length} leads
          </span>
        }
      />

      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          placeholder='Search by name, email, phone or ID...'
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        <FilterButton
          label='All'
          active={!statusFilter && selecArray.length === 0}
          onClick={() => handleStatusClick(null)}
        />
        {uniqueStatuses.map((s) => {
          const niceLabel =
            statusSelectAll.find((it) => it.value === s)?.name ?? s;
          return (
            <FilterButton
              key={s}
              label={niceLabel}
              active={statusFilter === s}
              onClick={() => handleStatusClick(s)}
            />
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        onRowClick={handleOpenLead}
        pagination={{
          enabled: true,
          initialPageSize: 20,
          pageSizes: [10, 25, 50],
        }}
        totalLabel='leads'
        emptyState={
          <EmptyStateBox
            icon={<MdOutlineCases size={18} />}
            title='No assigned leads yet'
            description="Here you will see your selected leads. Go to the 'Select Lead' section to get started."
          />
        }
      />
    </div>
  );
};

export default AllLeads;
