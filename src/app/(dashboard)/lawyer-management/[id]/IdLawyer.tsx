'use client';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {
  MdArrowBack,
  MdArrowForward,
  MdCircle,
  MdDownload,
  MdHistoryEdu,
  MdOutlineLogin,
  MdSquare,
} from 'react-icons/md';
import { useLeadsStore } from '@/store/useLead.store';
import { api, database, downloadBlob } from '@/services/database';
import type {
  ActionType,
  AuditEvent as AuditEventDTO,
  LawyerHistoryResponse,
  LeadDTO,
  LeadStatus,
} from '@/types/api.types';
import {
  Avatar,
  AuditEvent,
  DataTable,
  EmptyStateBox,
  FilterButton,
  KpiCard,
  LawyerIdentity,
  LeadInfoModal,
  SearchField,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type AuditEventTone,
  type DataTableColumn,
  type LeadInfoSubmitPayload,
  type LeadStatusOption,
  type KpiTone,
} from '@/components/ui';
import CountdownTimer from '@/components/organisms/CountdownTimer';
import ReLoading from '@/components/atoms/ReLoading';
import Button from '@/components/atoms/Button';

dayjs.extend(utc);
dayjs.extend(relativeTime);

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

type LawyerService = {
  id: number;
  max_leads: number;
  service_type_id: number;
};

type LawyerDetail = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  code?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string | null;
  law_firm?: string;
  profile_image_url?: string | null;
  pulled_count?: number;
  lost_count?: number;
  role?: { id: number; name: string };
  lawyersServices?: LawyerService[];
  service_type?: { id: number; name: string };
};

type AuditFilter = 'all' | 'assignments' | 'status' | 'edits' | 'comments' | 'logins';

const STATUS_OPTIONS_SELECT: LeadStatusOption[] = [
  { name: 'Assigned', value: 'ASSIGNED' },
  { name: 'In progress', value: 'IN PROGRESS' },
  { name: 'New', value: 'NEW' },
  { name: 'Problematic', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained', value: 'CLOSED' },
  { name: 'Disabled', value: 'DISABLED' },
];

const ACTIVE_STATUSES = new Set(['ASSIGNED', 'IN PROGRESS']);
const LOST_STATUSES = new Set(['LOST', 'EXPIRED']);

// Etiquetas legibles para los chips de status del lawyer detail.
const LEAD_STATUS_LABEL: Partial<Record<LeadStatus, string>> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  'IN PROGRESS': 'In progress',
  PROBLEMATIC: 'Problematic',
  CLOSED: 'Retained',
  LOST: 'Sent back',
  SEND_BACK: 'Sent back',
  EXPIRED: 'Expired',
  DISABLED: 'Disabled',
  ARCHIVED: 'Archived',
};

const formatLeadCode = (id: number | string) =>
  `#${String(id ?? '').padStart(5, '0')}`;

const LEAD_TABLE_COLUMNS: DataTableColumn<LeadRow>[] = [
  {
    key: 'id',
    label: 'ID',
    width: '80px',
    sortable: true,
    accessor: (r) => r['lead id'],
    render: (r) => (
      <span className='font-mono text-xs text-slate-400'>
        {formatLeadCode(r['lead id'])}
      </span>
    ),
  },
  {
    key: 'lead name',
    label: 'Lead',
    sortable: true,
    accessor: (r) => r['lead name'],
    render: (r) => (
      <div className='flex items-center gap-2.5'>
        <Avatar
          initials={(r['lead name'] || '·').slice(0, 2).toUpperCase()}
          tone={toneFromString(r['lead name'] || 'X') as any}
          size='sm'
        />
        <div className='flex min-w-0 flex-col'>
          <span className='truncate text-[13px] font-bold text-slate-900'>
            {r['lead name'] || '—'}
          </span>
          <span className='truncate text-[11px] text-slate-400'>
            {r.email}
          </span>
        </div>
      </div>
    ),
  },
  {
    key: 'phone number',
    label: 'Phone',
    width: '150px',
    sortable: true,
    accessor: (r) => r['phone number'],
  },
  {
    key: 'service',
    label: 'Service',
    width: '160px',
    sortable: true,
    accessor: (r) => r.service,
  },
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    sortable: true,
    accessor: (r) => r.status,
    render: (r) => <StatusPill variant={variantFromStatus(r.status) as any} />,
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

const FILTER_TO_ACTION_TYPES: Record<AuditFilter, ActionType[] | null> = {
  all: null,
  assignments: ['assign', 'unassign'],
  status: ['status_change'],
  edits: ['update', 'edit_denied'],
  comments: [],
  logins: ['login'],
};

type AuditRow = {
  id: string;
  tone: AuditEventTone;
  type: string;
  detail: React.ReactNode;
  lead?: string;
  time: string;
  leadId: number | null;
};

const ACTION_META: Record<
  ActionType,
  { tone: AuditEventTone; label: string }
> = {
  assign: { tone: 'violet', label: 'Assigned' },
  unassign: { tone: 'rose', label: 'Unassigned' },
  status_change: { tone: 'amber', label: 'Status change' },
  update: { tone: 'sky', label: 'Update' },
  edit_denied: { tone: 'rose', label: 'Edit denied' },
  create: { tone: 'emerald', label: 'Created' },
  delete: { tone: 'rose', label: 'Deleted' },
  login: { tone: 'emerald', label: 'Login' },
};

const formatLeadId = (n: number | null) =>
  n != null ? `#${String(n).padStart(5, '0')}` : '—';

const renderAuditDetail = (ev: AuditEventDTO): React.ReactNode => {
  const idLabel = formatLeadId(ev.entity_type === 'lead' ? ev.entity_id : null);
  switch (ev.action_type) {
    case 'assign':
      return (
        <>
          Lead <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
          assigned
        </>
      );
    case 'unassign':
      return (
        <>
          Lead <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
          unassigned
          {ev.comment ? (
            <>
              :{' '}
              <strong className='font-bold text-slate-900'>
                &ldquo;{ev.comment.slice(0, 60)}
                {ev.comment.length > 60 ? '…' : ''}&rdquo;
              </strong>
            </>
          ) : null}
        </>
      );
    case 'status_change': {
      const from = ev.old_value?.status ?? '—';
      const to = ev.new_value?.status ?? '—';
      return (
        <>
          <strong className='font-bold text-slate-900'>{idLabel}</strong>:{' '}
          <strong className='font-bold text-slate-900'>{from}</strong> →{' '}
          <strong className='font-bold text-slate-900'>{to}</strong>
        </>
      );
    }
    case 'edit_denied':
      return (
        <>
          Edit on{' '}
          <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
          denied
        </>
      );
    case 'update':
      return (
        <>
          Updated{' '}
          <strong className='font-bold text-slate-900'>{idLabel}</strong>
        </>
      );
    case 'login':
      return <>Logged in</>;
    default:
      return (
        <>
          {ev.action_type} on{' '}
          <strong className='font-bold text-slate-900'>{idLabel}</strong>
        </>
      );
  }
};

const mapAuditEvent = (ev: AuditEventDTO): AuditRow => {
  const meta = ACTION_META[ev.action_type] ?? {
    tone: 'sky' as AuditEventTone,
    label: ev.action_type,
  };
  const leadId =
    ev.entity_type === 'lead' && typeof ev.entity_id === 'number'
      ? ev.entity_id
      : null;
  return {
    id: `${ev.entity_type}-${ev.entity_id}-${ev.id}`,
    tone: meta.tone,
    type: meta.label,
    detail: renderAuditDetail(ev),
    lead: leadId != null ? formatLeadId(leadId) : undefined,
    time: dayjs.utc(ev.timestamp).local().format('MMM DD, HH:mm'),
    leadId,
  };
};

const IdLawyer = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const { dataLeads, fetchLeads } = useLeadsStore();

  const [lawyer, setLawyer] = useState<LawyerDetail | null>(null);
  const [lawyerLeadsRaw, setLawyerLeadsRaw] = useState<LeadDTO[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');
  const [history, setHistory] = useState<LawyerHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const lawyerId = useMemo(() => parseInt(params.id, 10), [params.id]);

  const fetchLawyer = async () => {
    const res = await database.getLawyer(params.id);
    const dto = res?.data?.data ?? res?.data ?? null;
    setLawyer(dto);
  };

  // v2: traemos directamente los leads asignados al lawyer desde
  // GET /leads?assigned_to=<id>. Antes cruzábamos manualmente con el
  // endpoint legacy /leads-assigned. Esta vista es la "fuente de verdad"
  // de los casos del lawyer, así que la mantenemos independiente del
  // store global (que filtra solo activos del admin general).
  const fetchLawyerLeads = async () => {
    if (!Number.isFinite(lawyerId)) return;
    setLeadsLoading(true);
    const res = await api.leads.list({
      assigned_to: lawyerId,
      limit: 1000,
    });
    setLeadsLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not load lawyer leads');
      setLawyerLeadsRaw([]);
      return;
    }
    setLawyerLeadsRaw(res.data.data);
  };

  const fetchHistory = async (filter: AuditFilter) => {
    if (!Number.isFinite(lawyerId)) return;
    setHistoryLoading(true);
    const actionTypes = FILTER_TO_ACTION_TYPES[filter];
    // 'comments' filter no se sirve desde audit log → vaciamos eventos.
    if (actionTypes && actionTypes.length === 0) {
      setHistory((prev) =>
        prev ? { ...prev, events: { data: [], total: 0 } } : null
      );
      setHistoryLoading(false);
      return;
    }
    const params: Record<string, unknown> = { limit: 50 };
    if (actionTypes && actionTypes.length === 1) {
      params.action_type = actionTypes[0];
    }
    const res = await api.lawyers.history(lawyerId, params as any);
    setHistoryLoading(false);
    if (!res.success || !res.data) {
      // Si el filtro es múltiple (assignments = assign+unassign) hacemos
      // una segunda llamada y combinamos.
      return;
    }
    // assignments combinado: hacer un fetch extra y mergear
    if (actionTypes && actionTypes.length > 1) {
      const extra = await api.lawyers.history(lawyerId, {
        limit: 50,
        action_type: actionTypes[1],
      });
      const merged = [
        ...res.data.events.data,
        ...(extra.data?.events.data || []),
      ].sort(
        (a, b) =>
          +new Date(b.timestamp) - +new Date(a.timestamp)
      );
      setHistory({
        summary: res.data.summary,
        events: { data: merged, total: merged.length },
      });
      return;
    }
    setHistory(res.data);
  };

  useEffect(() => {
    fetchLawyer();
    fetchLawyerLeads();
    if (!dataLeads) fetchLeads();
    fetchHistory('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    fetchHistory(auditFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditFilter]);

  // Conversión DTO v2 → LeadRow (shape esperado por LeadInfoModal y otros
  // consumidores legacy con keys de espacio).
  const lawyerLeads = useMemo<LeadRow[]>(() => {
    return lawyerLeadsRaw.map((lead) => ({
      'lead id': lead.id,
      date: new Date(lead.created_at ?? lead.entry_date),
      date_updated: new Date(
        lead.updated_at ?? lead.created_at ?? lead.entry_date
      ),
      'lead name': lead.fullName ?? '',
      email: lead.email ?? '',
      'phone number': lead.phone ?? '',
      service: lead.service ?? '',
      'description lead': lead.description ?? '',
      comments: lead.comments ?? '',
      lawyer:
        `${lead.assigned_lawyer?.firstName ?? ''} ${
          lead.assigned_lawyer?.lastName ?? ''
        }`.trim() || '—',
      status: lead.status,
    }));
  }, [lawyerLeadsRaw]);

  // Statuses únicos presentes para los chips dinámicos (admin no quiere
  // ver chips vacíos para statuses sin leads).
  const uniqueStatuses = useMemo<LeadStatus[]>(() => {
    const set = new Set<LeadStatus>();
    lawyerLeads.forEach((l) => set.add(l.status as LeadStatus));
    return Array.from(set);
  }, [lawyerLeads]);

  // Lista filtrada por status chip + search.
  const filteredLeads = useMemo<LeadRow[]>(() => {
    let list = lawyerLeads;
    if (statusFilter !== 'all') {
      list = list.filter((l) => l.status === statusFilter);
    }
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l['lead name'].toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l['phone number'].toLowerCase().includes(q) ||
          String(l['lead id']).includes(q)
      );
    }
    return list;
  }, [lawyerLeads, statusFilter, searchText]);

  const capacity = useMemo(() => {
    if (!lawyer?.lawyersServices) return 0;
    return lawyer.lawyersServices.reduce(
      (acc, s) => acc + (s.max_leads || 0),
      0
    );
  }, [lawyer]);

  const stats = useMemo(() => {
    const total = lawyerLeads.length;
    const lost = lawyerLeads.filter((l) => LOST_STATUSES.has(l.status)).length;
    const active = lawyerLeads.filter((l) => ACTIVE_STATUSES.has(l.status))
      .length;
    return { total, lost, active };
  }, [lawyerLeads]);

  // Cuando el summary del audit log está disponible, lo preferimos por ser
  // server-side y no depender del store de leads.
  const kpis = useMemo(() => {
    const s = history?.summary;
    return {
      total: s?.leads_assigned ?? stats.total,
      unassigned: s?.leads_unassigned ?? stats.lost,
      active: stats.active,
      lastLogin: s?.last_login ?? lawyer?.last_login ?? null,
    };
  }, [history, stats, lawyer]);

  const auditRows = useMemo<AuditRow[]>(() => {
    const events = history?.events?.data ?? [];
    return events.map(mapAuditEvent);
  }, [history]);

  const handleExportHistory = async (format: 'csv' | 'pdf') => {
    if (!Number.isFinite(lawyerId)) return;
    const res = await api.lawyers.exportHistory(lawyerId, format);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not export history');
      return;
    }
    downloadBlob(
      res.data,
      `lawyer-${lawyerId}-history-${dayjs().format('YYYY-MM-DD')}.${format}`
    );
    toast.success(`History ${format.toUpperCase()} downloaded`);
  };

  const openLeadModal = (row: LeadRow) => {
    setSelectedLead(row);
    setIsOpenLead(true);
  };

  const handleAuditRowClick = (leadId: number | null) => {
    if (leadId == null) return;
    // Buscamos primero en los leads del lawyer, luego en el store global.
    const own = lawyerLeads.find((r) => r['lead id'] === leadId);
    const row =
      own ?? (dataLeads as LeadRow[] | null)?.find((r) => r['lead id'] === leadId);
    if (!row) {
      toast('Lead not in current view', { icon: 'ℹ️' });
      return;
    }
    openLeadModal(row);
  };

  const handleSave = async ({
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
    if (upper === 'ARCHIVED') {
      setLoading(true);
      const archived = await api.leads.archive(selectedLead['lead id']);
      setLoading(false);
      if (!archived.success) {
        toast.error(archived.message || 'Error archiving lead');
        return;
      }
      toast.success('Lead archived');
      setIsOpenLead(false);
      fetchLawyerLeads();
      fetchLeads();
      return;
    }
    setLoading(true);
    const unassignStatuses: LeadStatus[] = ['LOST', 'SEND_BACK'];
    const leadId = selectedLead['lead id'];
    const res = unassignStatuses.includes(upper)
      ? await api.leads.unassign(leadId, { status: upper, comment: reason })
      : await api.leads.update(leadId, {
          status: upper,
          comment: reason || undefined,
          description: selectedLead['description lead'] ?? '',
        });
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error updating Lead information');
      return;
    }
    toast.success('Lead information updated successfully');
    setIsOpenLead(false);
    fetchLawyerLeads();
    fetchLeads();
  };

  if (loading) return <ReLoading />;

  const displayName = lawyer
    ? `${lawyer.firstName ?? ''} ${lawyer.lastName ?? ''}`.trim() || '—'
    : '—';
  const codeLabel = lawyer?.code || String(lawyerId).padStart(5, '0');
  const serviceLabel = lawyer?.service_type?.name ?? '—';
  const lastLoginAt = kpis.lastLogin ? dayjs.utc(kpis.lastLogin).local() : null;

  return (
    <div className='flex flex-col gap-7 min-h-0 flex-1'>
      <LeadInfoModal
        open={isOpenLead}
        onClose={() => setIsOpenLead(false)}
        lead={
          selectedLead
            ? {
                id: selectedLead['lead id'],
                name: selectedLead['lead name'],
                email: selectedLead.email,
                phone: selectedLead['phone number'],
                service: selectedLead.service,
                description: selectedLead['description lead'],
                comments: selectedLead.comments,
                status: selectedLead.status,
              }
            : null
        }
        statusOptions={STATUS_OPTIONS_SELECT}
        onSubmit={handleSave}
        loading={loading}
        breadcrumb={`${displayName} · Audit`}
        countdown={
          selectedLead?.status === 'ASSIGNED' ? (
            <CountdownTimer
              targetDate={dayjs(selectedLead.date_updated).toISOString()}
            />
          ) : undefined
        }
      />

      {/* Back link */}
      <button
        type='button'
        onClick={() => router.push('/lawyer-management')}
        className='inline-flex w-fit items-center gap-1.5 bg-transparent text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 focus:outline-none'
      >
        <MdArrowBack size={14} />
        Back to Lawyer Management
      </button>

      {/* Identity header */}
      <LawyerIdentity
        name={displayName}
        code={codeLabel}
        service={serviceLabel}
        email={lawyer?.email}
        phone={lawyer?.phone}
        avatarSrc={lawyer?.profile_image_url}
        actions={
          <>
            <Button
              name='Export PDF'
              type='button'
              color='border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              onClick={() => handleExportHistory('pdf')}
            />
            <Button
              name='Export CSV'
              type='button'
              color='border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              onClick={() => handleExportHistory('csv')}
            />
          </>
        }
      />

      {/* KPI grid */}
      <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
        <KpiCard
          label='Total assigned'
          tone={'sky' as KpiTone}
          icon={<MdArrowForward size={14} />}
          value={kpis.total}
          caption={
            <span className='text-[11px] font-medium text-slate-400'>
              Across all statuses
            </span>
          }
        />
        <KpiCard
          label='Unassigned'
          tone={'amber' as KpiTone}
          icon={<MdArrowBack size={14} />}
          value={kpis.unassigned}
          caption={
            <span className='text-[11px] font-medium text-slate-400'>
              Sent back · expired
            </span>
          }
        />
        <KpiCard
          label='Last login'
          tone={'emerald' as KpiTone}
          icon={<MdCircle size={10} />}
          value={lastLoginAt ? lastLoginAt.format('MMM DD, HH:mm') : 'Never'}
          caption={
            <span className='text-[11px] font-medium text-slate-400'>
              {lastLoginAt ? lastLoginAt.fromNow() : 'Account pending'}
            </span>
          }
        />
        <KpiCard
          label='Active leads'
          tone={'violet' as KpiTone}
          icon={<MdSquare size={12} />}
          value={kpis.active}
          caption={
            <span className='text-[11px] font-medium text-slate-400'>
              of {capacity || '—'} capacity
            </span>
          }
        />
      </div>

      {/* ─── Tabla de leads del lawyer ──────────────────────────────
          Fuente principal: GET /leads?assigned_to=<lawyerId>.
          Filtros por status (chips) + búsqueda. Click row abre el
          LeadInfoModal con timeline/comments del lead. */}
      <section className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <h2 className='text-[15px] font-extrabold tracking-[-0.015em] text-slate-900'>
            Assigned leads
          </h2>
          <span className='text-[12px] font-medium tabular-nums text-slate-400'>
            {filteredLeads.length} of {lawyerLeads.length} leads
          </span>
        </div>

        <div className='flex flex-wrap items-center gap-2.5'>
          <SearchField
            placeholder='Search by name, email, phone or ID…'
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
          <FilterButton
            label='All'
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          {uniqueStatuses.map((s) => (
            <FilterButton
              key={s}
              label={LEAD_STATUS_LABEL[s] ?? s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>

        <DataTable
          columns={LEAD_TABLE_COLUMNS}
          data={filteredLeads}
          rowKey={(r) => r['lead id']}
          onRowClick={openLeadModal}
          pagination={{ enabled: true, initialPageSize: 10 }}
          totalLabel='leads'
          initialSort={{ key: 'date_updated', direction: 'desc' }}
          emptyState={
            <EmptyStateBox
              icon={<MdHistoryEdu size={18} />}
              title={
                leadsLoading
                  ? 'Loading leads…'
                  : lawyerLeads.length === 0
                  ? 'No leads assigned yet'
                  : 'No leads match the filters'
              }
              description={
                leadsLoading
                  ? 'Fetching from server.'
                  : lawyerLeads.length === 0
                  ? 'When this lawyer is assigned a lead, it will appear here.'
                  : 'Try a different status or clear the search.'
              }
            />
          }
        />
      </section>

      {/* ─── Activity log (audit log) ───────────────────────────────
          Sección secundaria — eventos del lawyer como actor.
          Filtros por action_type del audit. */}
      <section className='flex flex-col gap-3'>
        <h2 className='text-[15px] font-extrabold tracking-[-0.015em] text-slate-900'>
          Activity log
        </h2>
        <div className='flex flex-wrap items-center gap-2.5'>
          <FilterButton
            label='All'
            active={auditFilter === 'all'}
            onClick={() => setAuditFilter('all')}
          />
          <FilterButton
            label='Assignments'
            active={auditFilter === 'assignments'}
            onClick={() => setAuditFilter('assignments')}
          />
          <FilterButton
            label='Status changes'
            active={auditFilter === 'status'}
            onClick={() => setAuditFilter('status')}
          />
          <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
          <FilterButton
            label='Logins'
            active={auditFilter === 'logins'}
            onClick={() => setAuditFilter('logins')}
          />
        </div>
      </section>

      {/* Audit list or empty */}
      {auditRows.length === 0 ? (
        <EmptyStateBox
          icon={<MdHistoryEdu size={18} />}
          title={
            historyLoading
              ? 'Loading activity…'
              : auditFilter === 'comments'
              ? 'No comments view'
              : 'No matching events'
          }
          description={
            historyLoading
              ? 'Fetching audit log from server.'
              : auditFilter === 'comments'
              ? 'Comments live with each lead. Open a specific lead to view its notes.'
              : 'Try a different filter category, or wait until the lawyer performs new actions.'
          }
        />
      ) : (
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white'>
          <div className='grid grid-cols-[36px_140px_1fr_130px_120px] border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500'>
            <div />
            <div>Action</div>
            <div>Detail</div>
            <div>Lead</div>
            <div>Date</div>
          </div>
          {auditRows.map((ev) => (
            <button
              key={ev.id}
              type='button'
              onClick={() => handleAuditRowClick(ev.leadId)}
              className='block w-full bg-transparent text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50'
            >
              <AuditEvent
                tone={ev.tone}
                type={ev.type}
                detail={ev.detail}
                lead={ev.lead}
                time={ev.time}
              />
            </button>
          ))}
          <div className='flex items-center justify-between border-t border-slate-200 px-5 py-3 text-[11px] font-medium text-slate-500'>
            <span>
              Showing 1 – {auditRows.length} of {history?.events?.total ?? auditRows.length}{' '}
              events
            </span>
            <span className='inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400'>
              <MdOutlineLogin aria-hidden size={12} />
              Live audit log
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdLawyer;
