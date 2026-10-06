'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { MdFileDownload } from 'react-icons/md';
import { api, downloadBlob } from '@/services/database';
import {
  ActiveFilterChips,
  PageHead,
  DataTable,
  FilterButton,
  LeadFiltersPanel,
  ScoreBadge,
  SearchField,
  channelKey,
  channelLabel,
  type ActiveFilterChip,
  type DataTableColumn,
  type MultiSelectOption,
} from '@/components/ui';
import { formatDate } from '@/utils/formatDate';
import { apiText } from '@/lib/apiText';
import { sourceFilterValue, sourceLabel } from '@/lib/lead-source';
import { buildCsvBlob } from '@/lib/csv';
import { useAuth } from '@/store/useAuth.store';
import { useUrlQueryState } from '@/hooks/useUrlQueryState';
import {
  ADMIN_LEAD_FILTERS,
  LAWYER_LEAD_FILTERS,
  canViewLeadContact,
} from '@/constants/leadFilters';
import {
  EMPTY_ADVANCED_FILTERS,
  SCORE_OPTIONS,
  UNASSIGNED_VALUE,
  countAdvancedFilters,
  formatFilterDay,
  isPossibleSpam,
  matchesAdvancedFilters,
  parseAdvancedFilters,
  readListParam,
  urgencyBucket,
  writeAdvancedFilters,
  type AdvancedFilterRow,
  type LeadAdvancedFilters,
} from '@/constants/leadAdvancedFilters';
import type { FirmLawyer, LeadDTO, LeadStatus } from '@/types/api.types';

const PAGE_SIZE = 20;
const FIRM_LEADS_PATH = '/my-firm/leads';
// Fase 1 — la firma es chica: se cargan todos sus leads una vez (el backend ya
// limita a los abogados de la firma) y se filtra en el cliente, igual que en
// Lead Management / My Leads (fechas en el día local del navegador).
const LOAD_LIMIT = 1000;

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW',
  'ASSIGNED',
  'IN PROGRESS',
  'CLOSED',
  'COMPLETED',
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

// ?status=<slug> (uno o varios): mismos slugs que Lead Management; los status
// sin slug propio usan su código en minúsculas. También acepta el código crudo.
const statusSlug = (st: LeadStatus): string =>
  ADMIN_LEAD_FILTERS.find((f) => f.status === st)?.slug ??
  st.toLowerCase().replace(/[\s_]+/g, '-');
const statusFromParam = (value: string): LeadStatus | null =>
  STATUS_OPTIONS.find(
    (st) => statusSlug(st) === value.toLowerCase() || st === value.toUpperCase()
  ) ?? null;

// Nombre visible del status en el panel y las chips: los mismos de My Leads
// (y, si no está ahí, los de Lead Management).
const statusLabel = (st: string): string =>
  LAWYER_LEAD_FILTERS.find((f) => f.status === st)?.label ??
  ADMIN_LEAD_FILTERS.find((f) => f.status === st)?.label ??
  st;

const formatId = (id: number | string) => String(id).padStart(5, '0');
const lawyerName = (l: { id: number; firstName?: string; lastName?: string }) =>
  `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || `#${l.id}`;
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

const toFilterRow = (r: LeadDTO): AdvancedFilterRow => ({
  service: r.service ?? '',
  assignedId: r.assigned_lawyer_id ?? r.assigned_lawyer?.id ?? null,
  source: sourceFilterValue(r.source, r.source_label),
  channel: channelKey(r.channel),
  entryDate: r.created_at ?? r.entry_date,
  pullDate: r.pull_date ?? null,
  ai_urgency: r.ai_urgency ?? null,
  spam_score: r.spam_score ?? 0,
});

const statusPillClass = (status: LeadStatus): string => {
  switch (status) {
    case 'NEW':
      return 'bg-sky-50 text-sky-700';
    case 'CLOSED':
      return 'bg-emerald-50 text-emerald-700';
    case 'COMPLETED':
      return 'bg-indigo-50 text-indigo-700';
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
  const { user } = useAuth();
  const isAdmin = String(user?.role?.name ?? '').toLowerCase() === 'admin';
  // Fase 1 — ?status, filtros avanzados y ?search viven en la URL (estado
  // optimista, ver hook): mismos nombres de parámetros que las otras listas.
  const { params, updateParams } = useUrlQueryState(FIRM_LEADS_PATH);
  const activeStatuses = useMemo(
    () =>
      Array.from(
        new Set(
          readListParam(params, 'status')
            .map(statusFromParam)
            .filter((st): st is LeadStatus => !!st)
        )
      ),
    [params]
  );
  // Sin campo Firm en esta vista: un ?firm_id= heredado no filtra.
  const advanced = useMemo<LeadAdvancedFilters>(
    () => ({ ...parseAdvancedFilters(params), firms: [] }),
    [params]
  );
  const hasAdvanced = countAdvancedFilters(advanced) > 0;
  const urlSearch = params.get('search') ?? '';

  const [rows, setRows] = useState<LeadDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<FirmLawyer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [searchText, setSearchText] = useState(urlSearch);
  const lastSearchRef = useRef(urlSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Abogados de la firma para "Assigned to" y áreas de derecho para el panel.
  useEffect(() => {
    void api.firms.listLawyers().then((res) => {
      if (res.success && Array.isArray(res.data)) setMembers(res.data);
    });
    void api.serviceTypes.list().then((res) => {
      if (res.success && res.data) setServiceTypes(res.data.map((t) => t.name).filter(Boolean));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api.firms.leads({ limit: LOAD_LIMIT }).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        // api.firms.leads normaliza `{ data, total }` crudo y envuelto.
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        toast.error(apiText(res.message, 'Failed to load firm leads'));
        setRows([]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Búsqueda (nombre, email, teléfono, ID y código LD-000xx) + status +
  // filtros avanzados, combinados con AND.
  const filtered = useMemo<LeadDTO[]>(() => {
    let list = rows;
    if (activeStatuses.length > 0) {
      const set = new Set<string>(activeStatuses);
      list = list.filter((r) => set.has(r.status));
    }
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.fullName ?? '').toLowerCase().includes(q) ||
          (r.email ?? '').toLowerCase().includes(q) ||
          (r.phone ?? '').toLowerCase().includes(q) ||
          String(r.id).includes(q) ||
          formatId(r.id).includes(q) ||
          (r.code ?? '').toLowerCase().includes(q)
      );
    }
    if (hasAdvanced) {
      list = list.filter((r) => matchesAdvancedFilters(toFilterRow(r), advanced));
    }
    return list;
  }, [rows, activeStatuses, searchText, advanced, hasAdvanced]);

  // Panel: status múltiple.
  const handlePanelStatus = (next: string[]) => {
    updateParams((p) => {
      p.delete('status');
      next.forEach((st) => p.append('status', statusSlug(st as LeadStatus)));
    });
  };

  const setAdvanced = (next: LeadAdvancedFilters) =>
    updateParams((p) => writeAdvancedFilters(p, next));

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
          {/* L587-05/06 — misma regla de contacto que My Leads y el export. */}
          <div className='text-xs text-slate-400'>
            {canViewLeadContact(r.status, isAdmin) ? r.email : '—'}
          </div>
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
      // Fase 1 — Score: urgencia IA (High/Medium/Low) y marca de posible spam.
      key: 'score',
      label: 'Score',
      render: (r) => <ScoreBadge urgency={r.ai_urgency} spamScore={r.spam_score} />,
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

  // ── Fase 1: export CSV de las filas visibles ──
  const handleExportLeads = () => {
    const header = ['ID', 'Created', 'Lead', 'Email', 'Phone', 'Service', 'Status', 'Assigned to', 'Last update', 'Code', 'Source', 'Channel', 'Pull date', 'Score'];
    const lines = filtered.map((r) => {
      // L587-05/06 — el contacto solo sale si el lead ya está en curso.
      const contact = canViewLeadContact(r.status, isAdmin);
      return [
        r.id, new Date(r.created_at), r.fullName, contact ? r.email : '', contact ? r.phone : '',
        r.service, r.status, r.assigned_lawyer ? lawyerName(r.assigned_lawyer) : '',
        r.updated_at ? new Date(r.updated_at) : '', r.code, r.source_label || sourceLabel(r.source),
        channelLabel(r.channel), r.pull_date ? new Date(r.pull_date) : '', scoreText(r),
      ];
    });
    downloadBlob(buildCsvBlob(header, lines), `firm-leads-${dayjs().format('YYYY-MM-DD')}.csv`);
    toast.success('Leads CSV downloaded');
  };

  // ── Fase 1: panel de filtros y chips activos ──
  // Status presentes en los leads de la firma (más los elegidos en la URL).
  const statusPanelOptions: MultiSelectOption[] = STATUS_OPTIONS.filter(
    (st) => activeStatuses.includes(st) || rows.some((r) => r.status === st)
  ).map((st) => ({ value: st, label: statusLabel(st) }));
  const serviceOptions: MultiSelectOption[] = Array.from(
    new Set([...serviceTypes, ...rows.map((r) => r.service).filter(Boolean)])
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
  // Los leads de la firma siempre están asignados a un abogado de la firma.
  const lawyerNames = new Map<string, string>();
  for (const m of members) lawyerNames.set(String(m.id), lawyerName(m));
  for (const r of rows) {
    if (r.assigned_lawyer && !lawyerNames.has(String(r.assigned_lawyer.id))) {
      lawyerNames.set(String(r.assigned_lawyer.id), lawyerName(r.assigned_lawyer));
    }
  }
  const lawyerOptions: MultiSelectOption[] = Array.from(lawyerNames.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
  const channelOptions: MultiSelectOption[] = Array.from(
    new Set(rows.map((r) => channelKey(r.channel)))
  )
    .map((key) => ({ value: key, label: channelLabel(key) }))
    .sort((a, b) =>
      a.value === 'unknown' ? 1 : b.value === 'unknown' ? -1 : a.label.localeCompare(b.label)
    );
  const removeValue = (
    key: 'services' | 'assigned' | 'sources' | 'channels' | 'scores',
    value: string
  ) =>
    setAdvanced({
      ...advanced,
      [key]: (advanced[key] as string[]).filter((v) => v !== value),
    } as LeadAdvancedFilters);
  const activeChips: ActiveFilterChip[] = [
    ...activeStatuses.map((st) => ({
      key: `status-${st}`,
      label: 'Status',
      value: statusLabel(st),
      onRemove: () => handlePanelStatus(activeStatuses.filter((x) => x !== st)),
    })),
    ...advanced.services.map((v) => ({
      key: `service-${v}`,
      label: 'Area of Law',
      value: v,
      onRemove: () => removeValue('services', v),
    })),
    ...advanced.assigned.map((v) => ({
      key: `assigned-${v}`,
      label: 'Assigned to',
      value: v === UNASSIGNED_VALUE ? 'Unassigned' : lawyerNames.get(v) ?? `#${v}`,
      onRemove: () => removeValue('assigned', v),
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
  const activeFilterCount = countAdvancedFilters(advanced) + (activeStatuses.length > 0 ? 1 : 0);
  const clearAllFilters = () => {
    setSearchText('');
    lastSearchRef.current = '';
    updateParams((p) => {
      writeAdvancedFilters(p, EMPTY_ADVANCED_FILTERS);
      p.delete('search');
      p.delete('status');
    });
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Firm'
        title='Firm Leads'
        subtitle='Leads assigned to any lawyer in your firm.'
        action={
          loading ? undefined : (
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
          )
        }
      />

      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          placeholder='Name, email, number'
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
          aria-controls='firm-leads-filters-panel'
          onClick={() => setFiltersOpen((o) => !o)}
        />
      </div>

      {filtersOpen ? (
        <LeadFiltersPanel
          id='firm-leads-filters-panel'
          idPrefix='fl-filters'
          status={{
            options: statusPanelOptions,
            value: activeStatuses,
            onChange: handlePanelStatus,
          }}
          value={advanced}
          onChange={setAdvanced}
          serviceOptions={serviceOptions}
          lawyerOptions={lawyerOptions}
          channelOptions={channelOptions}
        />
      ) : null}

      <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />

      {loading ? (
        <p className='text-sm text-slate-400'>Loading…</p>
      ) : (
        <DataTable<LeadDTO>
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          pagination={{ enabled: true, initialPageSize: PAGE_SIZE }}
          totalLabel='leads'
          emptyState={
            <div className='px-4 py-10 text-center text-sm text-slate-400'>
              No leads match these filters.
            </div>
          }
        />
      )}
    </div>
  );
};

// FirmLeads usa useSearchParams (filtros en la URL), que en App Router exige un
// límite de Suspense en el árbol de render.
const FirmLeadsPage = () => (
  <Suspense fallback={null}>
    <FirmLeads />
  </Suspense>
);

export default FirmLeadsPage;
