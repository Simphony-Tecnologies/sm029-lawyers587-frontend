'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import toast from 'react-hot-toast';
import { MdFileDownload, MdOutlineCases, MdReplay } from 'react-icons/md';
import { api, downloadBlob } from '@/services/database';
import type { LeadDTO, LeadStatus } from '@/types/api.types';
import { useAuth } from '@/store/useAuth.store';
import useLoadingStore from '@/store/useLoadingStore';
import { useAssignedLeads } from '@/store/useAssignedLeads.store';
import { useUrlQueryState } from '@/hooks/useUrlQueryState';
import {
  LAWYER_LEAD_FILTERS,
  statusFromSlug,
  canViewLeadContact,
} from '@/constants/leadFilters';
import {
  EMPTY_ADVANCED_FILTERS,
  SCORE_OPTIONS,
  countAdvancedFilters,
  formatFilterDay,
  isPossibleSpam,
  matchesAdvancedFilters,
  parseAdvancedFilters,
  readListParam,
  scoreSortValue,
  urgencyBucket,
  writeAdvancedFilters,
  type LeadAdvancedFilters,
} from '@/constants/leadAdvancedFilters';
import {
  ActiveFilterChips,
  Avatar,
  Badge,
  ConfirmationDialog,
  DataTable,
  EmptyStateBox,
  FilterButton,
  IconActionButton,
  LeadFiltersPanel,
  LeadInfoModal,
  OriginBadge,
  PageHead,
  ScoreBadge,
  SearchField,
  SourceBadge,
  StatusPill,
  channelKey,
  channelLabel,
  toneFromString,
  variantFromStatus,
  type ActiveFilterChip,
  type DataTableColumn,
  type LeadInfoSubmitPayload,
  type LeadStatusOption,
  type MultiSelectOption,
} from '@/components/ui';
import { sourceFilterValue, sourceLabel, SOURCE_FILTER_OPTIONS } from '@/lib/lead-source';
import { buildCsvBlob } from '@/lib/csv';
import CountdownTimer from '@/components/organisms/CountdownTimer';
import Loading from '../loading';

dayjs.extend(utc);

type LeadRow = {
  id: number;
  code: string;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  description: string;
  comments: string;
  status: LeadStatus;
  date_updated: Date;
  date: Date;
  channel?: string;
  source?: string;
  source_label?: string;
  // Fase 1 — score (urgencia IA + spam) y pull date.
  ai_urgency: number | null;
  spam_score: number;
  pull_date: string | null;
};

const MY_LEADS_PATH = '/all-leads';
const LEAD_NOT_AVAILABLE = 'This lead is not available or belongs to another firm.';
const formatId = (id: number | string) => String(id).padStart(5, '0');
const dateRangeText = (from: string, to: string) =>
  from && to
    ? `${formatFilterDay(from)} – ${formatFilterDay(to)}`
    : from
    ? `From ${formatFilterDay(from)}`
    : `To ${formatFilterDay(to)}`;
const scoreText = (r: { ai_urgency?: number | null; spam_score?: number | null }) => {
  const bucket = urgencyBucket(r.ai_urgency);
  return [
    bucket ? SCORE_OPTIONS.find((o) => o.value === bucket)?.label : null,
    isPossibleSpam(r.spam_score) ? 'Possible spam' : null,
  ]
    .filter(Boolean)
    .join('; ');
};

const STATUS_OPTIONS: LeadStatusOption[] = [
  { name: 'In progress', value: 'IN PROGRESS' },
  { name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' },
  { name: 'Flagged', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained', value: 'CLOSED' },
];

// Completed solo se alcanza desde Retained y no se reabre: un lead Completed
// solo ofrece Completed.
const STATUS_OPTIONS_CLOSED: LeadStatusOption[] = [
  { name: 'Retained', value: 'CLOSED' },
  { name: 'Completed', value: 'COMPLETED' },
];

const STATUS_OPTIONS_COMPLETED: LeadStatusOption[] = [
  { name: 'Completed', value: 'COMPLETED' },
];

const ASSIGNED_FRESHNESS_HOURS = 48;

// Backend is the authority on expiration (cron moves ASSIGNED→EXPIRED after 48h).
// Frontend never blocks based on local timestamp calculation.
const isLeadExpired = (_lead: LeadRow) => false;

// Filtros que abren las cards "Work right now" del dashboard del abogado.
const URGENT_FIRST_STATUSES = new Set<LeadStatus>([
  'ASSIGNED',
  'IN PROGRESS',
  'WAITING_ON_CLIENT',
  'PROBLEMATIC',
]);

const toRow = (lead: LeadDTO): LeadRow => ({
  id: lead.id,
  code: lead.code ?? '',
  fullName: lead.fullName ?? '',
  email: lead.email ?? '',
  phone: lead.phone ?? '',
  service: lead.service ?? '',
  description: lead.description ?? '',
  comments: lead.comments ?? '',
  status: lead.status,
  date_updated: new Date(lead.updated_at ?? lead.created_at ?? lead.entry_date),
  date: new Date(lead.created_at ?? lead.entry_date),
  channel: lead.channel,
  source: lead.source,
  source_label: lead.source_label,
  ai_urgency: lead.ai_urgency ?? null,
  spam_score: lead.spam_score ?? 0,
  pull_date: lead.pull_date ?? null,
});

const AllLeads = () => {
  const { user } = useAuth();
  const { setLoading, isLoading } = useLoadingStore();
  const { count: assignedCount, setCount: setAssignedCount } = useAssignedLeads();
  // Fase 1 — ?status (uno o varios slugs), filtros avanzados, ?search y ?lead
  // viven en la URL (estado optimista, ver hook). Los links del sidebar y del
  // dashboard (?status=<slug>) siguen funcionando igual.
  const { params, updateParams, getQuery } = useUrlQueryState(MY_LEADS_PATH);
  const activeSlugs = useMemo(
    () => readListParam(params, 'status').filter((sl) => sl !== 'all'),
    [params]
  );
  const activeStatuses = useMemo(
    () =>
      activeSlugs
        .map((sl) => statusFromSlug(sl))
        .filter((st): st is LeadStatus => !!st),
    [activeSlugs]
  );
  // Clave de la tabla: remonta al cambiar de filtro para aplicar su orden.
  const activeSlug = activeSlugs.length === 0 ? 'all' : activeSlugs.join(',');
  const isAdmin = String(user?.role?.name ?? '').toLowerCase() === 'admin';
  // Assigned to / Firm no aplican a la lista propia del abogado (no hay control
  // para ellos aquí): un ?assigned_to= o ?firm_id= heredado no filtra.
  const advanced = useMemo<LeadAdvancedFilters>(
    () => ({ ...parseAdvancedFilters(params), assigned: [], firms: [] }),
    [params]
  );
  const hasAdvanced = countAdvancedFilters(advanced) > 0;
  const urlSearch = params.get('search') ?? '';
  const leadParam = params.get('lead');

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);
  const [searchText, setSearchText] = useState(urlSearch);
  const lastSearchRef = useRef(urlSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // UX-L12: quick send-back action — confirm dialog inline sin abrir el
  // modal completo del lead.
  const [sendBackTarget, setSendBackTarget] = useState<LeadRow | null>(null);
  const [sendBackReason, setSendBackReason] = useState('');
  const [sendBackLoading, setSendBackLoading] = useState(false);

  const fetchAssigned = async () => {
    if (!user?.id) return;
    setLoading(true);
    // El origen (?source) se filtra en el cliente como el resto de filtros.
    const res = await api.leads.list({
      assigned_to: Number(user.id),
      limit: 1000,
    });
    setLoading(false);
    setRowsLoaded(true);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not load assigned leads');
      setRows([]);
      return;
    }
    const next = res.data.data.map(toRow);
    setRows(next);
    // L587-02: mantener el conteo global de ASSIGNED en sync (badge sidebar + filter bar).
    setAssignedCount(next.filter((r) => r.status === 'ASSIGNED').length);
  };

  useEffect(() => {
    void fetchAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo<LeadRow[]>(() => {
    let list = rows;
    if (activeStatuses.length > 0) {
      const set = new Set<string>(activeStatuses);
      list = list.filter((l) => set.has(l.status));
    }
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          String(l.id).includes(q) ||
          formatId(l.id).includes(q) ||
          l.code.toLowerCase().includes(q)
      );
    }
    if (hasAdvanced) {
      list = list.filter((l) =>
        matchesAdvancedFilters(
          {
            service: l.service,
            assignedId: null,
            source: sourceFilterValue(l.source, l.source_label),
            channel: channelKey(l.channel),
            entryDate: l.date,
            pullDate: l.pull_date,
            ai_urgency: l.ai_urgency,
            spam_score: l.spam_score,
          },
          advanced
        )
      );
    }
    return list;
  }, [rows, activeStatuses, searchText, advanced, hasAdvanced]);

  // ── Link directo (?lead=<id>) ──
  const linkedLeadRef = useRef<string | null>(null);
  const showLead = (row: LeadRow) => {
    setSelectedLead(row);
    setIsOpenLead(true);
  };

  const handleOpenLead = (row: LeadRow) => {
    if (isLeadExpired(row)) {
      toast.error('This lead has expired');
      return;
    }
    linkedLeadRef.current = String(row.id);
    updateParams((p) => p.set('lead', String(row.id)));
    showLead(row);
  };

  useEffect(() => {
    if (!leadParam) {
      linkedLeadRef.current = null;
      return;
    }
    if (linkedLeadRef.current === leadParam) return;
    const id = Number(leadParam);
    if (!Number.isInteger(id) || id <= 0) {
      linkedLeadRef.current = leadParam;
      toast.error(LEAD_NOT_AVAILABLE);
      updateParams((p) => p.delete('lead'));
      return;
    }
    if (!rowsLoaded) return;
    linkedLeadRef.current = leadParam;
    const row = rows.find((r) => r.id === id);
    if (row) {
      showLead(row);
      return;
    }
    void api.leads.get(id).then((res) => {
      if (!res.success || !res.data) {
        toast.error(LEAD_NOT_AVAILABLE);
        updateParams((p) => p.delete('lead'));
        return;
      }
      showLead(toRow(res.data));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadParam, rowsLoaded, rows]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpenLead) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    if (new URLSearchParams(getQuery()).has('lead')) {
      updateParams((p) => p.delete('lead'));
    }
  }, [isOpenLead, updateParams, getQuery]);

  const leadHref = (id: number) => {
    const p = new URLSearchParams(getQuery());
    p.set('lead', String(id));
    return `${MY_LEADS_PATH}?${p.toString()}`;
  };

  // Chips de status: un clic = ese status (conserva búsqueda y filtros avanzados).
  const goToFilter = (slug: string) => {
    updateParams((p) => {
      p.delete('status');
      if (slug !== 'all') p.set('status', slug);
    });
  };

  // Panel: status múltiple, sincronizado con los chips.
  const handlePanelStatus = (next: string[]) => {
    updateParams((p) => {
      p.delete('status');
      next.forEach((sl) => p.append('status', sl));
    });
  };

  const setAdvanced = (next: LeadAdvancedFilters) =>
    updateParams((p) => writeAdvancedFilters(p, next));

  // Chips de origen: leen y escriben ?source (un solo control con la URL).
  const setSourceFilter = (source: string) =>
    setAdvanced({ ...advanced, sources: source ? [source] : [] });

  // Búsqueda ↔ URL (?search=), con retardo para no navegar en cada tecla.
  useEffect(() => {
    if (urlSearch === lastSearchRef.current) return;
    lastSearchRef.current = urlSearch;
    setSearchText(urlSearch);
  }, [urlSearch]);
  useEffect(() => {
    const q = searchText.trim();
    if (q === lastSearchRef.current) return;
    const t = setTimeout(() => {
      lastSearchRef.current = q;
      updateParams((p) => (q ? p.set('search', q) : p.delete('search')));
    }, 350);
    return () => clearTimeout(t);
  }, [searchText, updateParams]);

  const handleSaveLead = async ({
    status,
    comments,
  }: LeadInfoSubmitPayload): Promise<void> => {
    if (!selectedLead) return;
    const upper = (status ?? '').toUpperCase() as LeadStatus;
    const reasonRequired =
      upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST' || upper === 'WAITING_ON_CLIENT' ||
      upper === 'COMPLETED';
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

  const handleSendBackConfirm = async () => {
    if (!sendBackTarget) return;
    const reason = sendBackReason.trim();
    if (reason.length === 0) {
      toast.error('A reason is required to send a lead back');
      return;
    }
    setSendBackLoading(true);
    const res = await api.leads.unassign(sendBackTarget.id, {
      status: 'SEND_BACK',
      comment: reason,
    });
    setSendBackLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Could not send lead back');
      return;
    }
    toast.success(`Lead #${sendBackTarget.id} sent back`);
    setSendBackTarget(null);
    setSendBackReason('');
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
            <span className='flex min-w-0 items-center gap-1.5'>
              <span
                title={r.fullName || undefined}
                className='truncate text-[13px] font-bold text-slate-900'
              >
                {r.fullName || '—'}
              </span>
              {/* Fase 1 — "New Lead": link directo al detalle (?lead=<id>). */}
              {r.status === 'ASSIGNED' ? (
                <Link
                  href={leadHref(r.id)}
                  replace
                  scroll={false}
                  onClick={(e) => e.stopPropagation()}
                  className='shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40'
                >
                  <Badge variant='new' size='sm' className='whitespace-nowrap'>
                    New Lead
                  </Badge>
                </Link>
              ) : null}
            </span>
            <span className='truncate text-[11px] text-slate-400'>
              {canViewLeadContact(r.status, isAdmin) ? r.email : '—'}
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
      // L587-06 — el contacto solo se muestra al abogado en In Progress/
      // Waiting/Retained. El accessor también se enmascara para no ordenar por
      // valores ocultos.
      accessor: (r) => (canViewLeadContact(r.status, isAdmin) ? r.phone : ''),
      render: (r) => (canViewLeadContact(r.status, isAdmin) ? r.phone || '—' : '—'),
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
      // Fase 1 — Score: urgencia IA (High/Medium/Low) y marca de posible spam.
      key: 'score',
      label: 'Score',
      width: '96px',
      sortable: true,
      accessor: (r) => scoreSortValue(r),
      render: (r) => <ScoreBadge urgency={r.ai_urgency} spamScore={r.spam_score} />,
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
    {
      // UX-L05: para leads ASSIGNED muestra countdown 48h con urgency
      // visual (rojo cuando < 6h). Para otros statuses → updated_at normal.
      key: 'expires',
      label: 'Expires / Updated',
      width: '140px',
      sortable: true,
      accessor: (r) => r.date_updated,
      render: (r) => {
        if (r.status === 'ASSIGNED') {
          const deadline = r.date_updated.getTime() + ASSIGNED_FRESHNESS_HOURS * 36e5;
          const remainingMs = deadline - Date.now();
          if (remainingMs <= 0) {
            // Backend is the authority on expiration. If it still says ASSIGNED,
            // show the assigned date — don't show "Expired" label.
            return (
              <span className='text-[12px] text-slate-500'>
                {dayjs.utc(r.date_updated).local().format('MMM DD, HH:mm')}
              </span>
            );
          }
          const hours = Math.floor(remainingMs / 36e5);
          const minutes = Math.floor((remainingMs % 36e5) / 6e4);
          const urgent = hours < 6;
          const colorClass = urgent ? 'text-customRed' : 'text-slate-700';
          const label =
            hours >= 24
              ? `in ${Math.floor(hours / 24)}d ${hours % 24}h`
              : hours > 0
              ? `in ${hours}h ${minutes}m`
              : `in ${minutes}m`;
          return (
            <span className={`text-[12px] font-bold tabular-nums ${colorClass}`}>
              {label}
            </span>
          );
        }
        return (
          <span className='text-[12px] text-slate-500'>
            {dayjs.utc(r.date_updated).local().format('MMM DD, HH:mm')}
          </span>
        );
      },
    },
    {
      // UX-L12: quick action "Send back" para leads ASSIGNED / IN PROGRESS.
      key: 'actions',
      label: '',
      width: '60px',
      align: 'right',
      render: (r) => {
        if (r.status !== 'ASSIGNED' && r.status !== 'IN PROGRESS') {
          return <span />;
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <IconActionButton
              label='Send back'
              icon={<MdReplay size={12} />}
              tone='warning'
              onClick={() => {
                setSendBackTarget(r);
                setSendBackReason('');
              }}
            />
          </div>
        );
      },
    },
  ];

  // ── Fase 1: export CSV de las filas visibles ──
  const handleExportLeads = () => {
    const header = ['ID', 'Created', 'Lead', 'Email', 'Phone', 'Service', 'Status', 'Last update', 'Code', 'Channel', 'Pull date', 'Score', 'AI urgency'];
    const lines = [...filtered]
      .sort((a, b) => b.date_updated.getTime() - a.date_updated.getTime())
      .map((r) => {
        // L587-05/06 — el contacto solo sale si el lead ya está en curso.
        const contact = canViewLeadContact(r.status, isAdmin);
        return [
          r.id, r.date, r.fullName, contact ? r.email : '', contact ? r.phone : '',
          r.service, r.status, r.date_updated, r.code, channelLabel(r.channel),
          r.pull_date ? new Date(r.pull_date) : '', scoreText(r), r.ai_urgency ?? '',
        ];
      });
    downloadBlob(buildCsvBlob(header, lines), `my-leads-${dayjs().format('YYYY-MM-DD')}.csv`);
    toast.success('Leads CSV downloaded');
  };

  // ── Fase 1: panel de filtros y chips activos ──
  const statusPanelOptions: MultiSelectOption[] = LAWYER_LEAD_FILTERS.filter(
    (f) => f.slug !== 'all'
  ).map((f) => ({ value: f.slug, label: f.label }));
  const serviceOptions: MultiSelectOption[] = Array.from(
    new Set(rows.map((r) => r.service).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
  const channelOptions: MultiSelectOption[] = Array.from(
    new Set(rows.map((r) => channelKey(r.channel)))
  )
    .map((key) => ({ value: key, label: channelLabel(key) }))
    .sort((a, b) =>
      a.value === 'unknown' ? 1 : b.value === 'unknown' ? -1 : a.label.localeCompare(b.label)
    );
  const removeValue = (key: 'services' | 'sources' | 'channels' | 'scores', value: string) =>
    setAdvanced({
      ...advanced,
      [key]: (advanced[key] as string[]).filter((v) => v !== value),
    } as LeadAdvancedFilters);
  const activeChips: ActiveFilterChip[] = [
    ...activeSlugs.map((sl) => ({
      key: `status-${sl}`,
      label: 'Status',
      value: LAWYER_LEAD_FILTERS.find((f) => f.slug === sl)?.label ?? sl,
      onRemove: () => handlePanelStatus(activeSlugs.filter((x) => x !== sl)),
    })),
    ...advanced.services.map((v) => ({
      key: `service-${v}`,
      label: 'Area of Law',
      value: v,
      onRemove: () => removeValue('services', v),
    })),
    ...advanced.sources.map((v) => ({
      key: `source-${v}`,
      label: 'Source',
      value: sourceLabel(v),
      onRemove: () => removeValue('sources', v),
    })),
    ...advanced.channels.map((v) => ({
      key: `channel-${v}`,
      label: 'Channel',
      value: channelLabel(v),
      onRemove: () => removeValue('channels', v),
    })),
    ...(advanced.entryFrom || advanced.entryTo
      ? [
          {
            key: 'entry-date',
            label: 'Entry date',
            value: dateRangeText(advanced.entryFrom, advanced.entryTo),
            onRemove: () => setAdvanced({ ...advanced, entryFrom: '', entryTo: '' }),
          },
        ]
      : []),
    ...(advanced.pullFrom || advanced.pullTo
      ? [
          {
            key: 'pull-date',
            label: 'Pull date',
            value: dateRangeText(advanced.pullFrom, advanced.pullTo),
            onRemove: () => setAdvanced({ ...advanced, pullFrom: '', pullTo: '' }),
          },
        ]
      : []),
    ...advanced.scores.map((v) => ({
      key: `score-${v}`,
      label: 'Score',
      value: SCORE_OPTIONS.find((o) => o.value === v)?.label ?? v,
      onRemove: () => removeValue('scores', v),
    })),
  ];
  const activeFilterCount = countAdvancedFilters(advanced) + (activeSlugs.length > 0 ? 1 : 0);
  const clearAllFilters = () => {
    setSearchText('');
    lastSearchRef.current = '';
    updateParams((p) => {
      writeAdvancedFilters(p, EMPTY_ADVANCED_FILTERS);
      p.delete('search');
      p.delete('status');
    });
  };

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
                // Fase 1 (1.2) — Entry date + Pull date también para el abogado.
                entryDate: dayjs(selectedLead.date).format('MMM D, YYYY'),
                pullDate: selectedLead.pull_date
                  ? dayjs(selectedLead.pull_date).format('MMM D, YYYY')
                  : null,
                status: selectedLead.status,
              }
            : null
        }
        linkBasePath={MY_LEADS_PATH}
        statusOptions={
          selectedLead?.status === 'CLOSED'
            ? STATUS_OPTIONS_CLOSED
            : selectedLead?.status === 'COMPLETED'
            ? STATUS_OPTIONS_COMPLETED
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
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={handleExportLeads}
              className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300'
            >
              <MdFileDownload size={14} />
              Export CSV
            </button>
            <span className='text-[13px] font-medium tabular-nums text-slate-400'>
              {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        }
      />

      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          placeholder='Search by name, email, phone or ID...'
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {/* Fase 1 — filtros avanzados (panel inline) con contador de activos. */}
        <FilterButton
          label='Filters'
          glow
          dropdown
          active={filtersOpen}
          count={activeFilterCount > 0 ? activeFilterCount : undefined}
          aria-expanded={filtersOpen}
          aria-controls='my-leads-filters-panel'
          onClick={() => setFiltersOpen((o) => !o)}
        />
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        {LAWYER_LEAD_FILTERS.map((f) => (
          <FilterButton
            key={f.slug}
            label={f.label}
            active={f.slug === 'all' ? activeSlugs.length === 0 : activeSlugs.includes(f.slug)}
            count={
              f.slug === 'assigned' && assignedCount > 0
                ? assignedCount
                : undefined
            }
            onClick={() => goToFilter(f.slug)}
          />
        ))}
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        {SOURCE_FILTER_OPTIONS.map((opt) => (
          <FilterButton
            key={opt.value || 'all-sources'}
            label={opt.label}
            active={
              opt.value === ''
                ? advanced.sources.length === 0
                : advanced.sources.includes(opt.value)
            }
            onClick={() => setSourceFilter(opt.value)}
          />
        ))}
      </div>

      {filtersOpen ? (
        <LeadFiltersPanel
          id='my-leads-filters-panel'
          idPrefix='ml-filters'
          status={{
            options: statusPanelOptions,
            value: activeSlugs,
            onChange: handlePanelStatus,
          }}
          value={advanced}
          onChange={setAdvanced}
          serviceOptions={serviceOptions}
          showSource={false}
          channelOptions={channelOptions}
        />
      ) : null}

      <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />

      <DataTable
        columns={isAdmin ? columns : columns.filter((c) => c.key !== 'source')}
        data={filtered}
        rowKey={(r) => r.id}
        onRowClick={handleOpenLead}
        // Remonta por filtro para aplicar su orden: en las colas de trabajo lo más
        // urgente primero (deadline más cercano / más tiempo sin actividad).
        key={activeSlug}
        initialSort={{
          key: 'expires',
          direction:
            activeStatuses.length > 0 &&
            activeStatuses.every((st) => URGENT_FIRST_STATUSES.has(st))
              ? 'asc'
              : 'desc',
        }}
        pagination={{
          enabled: true,
          initialPageSize: 20,
          pageSizes: [10, 25, 50],
        }}
        totalLabel='leads'
        emptyState={
          rows.length > 0 ? (
            <EmptyStateBox
              icon={<MdOutlineCases size={18} />}
              title='No leads match this filter'
              description='Try another status or source, or clear the search.'
            />
          ) : (
            <EmptyStateBox
              icon={<MdOutlineCases size={18} />}
              title='No assigned leads yet'
              description="Here you will see your selected leads. Go to the 'Select Lead' section to get started."
            />
          )
        }
      />

      {/* UX-L12: quick send-back dialog. Activado desde la columna actions. */}
      <ConfirmationDialog
        open={sendBackTarget !== null}
        onClose={() => {
          if (sendBackLoading) return;
          setSendBackTarget(null);
          setSendBackReason('');
        }}
        variant='danger'
        title='Send lead back'
        subtitle={
          sendBackTarget
            ? `${sendBackTarget.fullName} · #${String(sendBackTarget.id).padStart(5, '0')}`
            : undefined
        }
        confirmLabel='Send back'
        loading={sendBackLoading}
        onConfirm={handleSendBackConfirm}
        confirmDisabled={sendBackReason.trim().length === 0}
      >
        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='send-back-reason'
            className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-600'
          >
            Reason (required)
          </label>
          <textarea
            id='send-back-reason'
            value={sendBackReason}
            onChange={(e) => setSendBackReason(e.target.value)}
            rows={3}
            placeholder='Why are you sending this lead back? Super admin will see this comment.'
            disabled={sendBackLoading}
            className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:opacity-60'
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
};

export default AllLeads;
