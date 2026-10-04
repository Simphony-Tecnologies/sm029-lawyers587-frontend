'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdClose,
  MdDeleteOutline,
  MdFileDownload,
  MdGridView,
  MdPersonAddAlt1,
  MdSwapHoriz,
  MdViewList,
} from 'react-icons/md';
import { toLeadRow, useLeadsStore } from '@/store/useLead.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import { api, database, downloadBlob } from '@/services/database';
import type { FirmListItem, LeadStatus } from '@/types/api.types';
import { statusSelectAll } from '@/constants/status';
import { adminStatusFromSlug, adminSlugFromStatus } from '@/constants/leadFilters';
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
  scoreSortValue,
  urgencyBucket,
  writeAdvancedFilters,
  type AdvancedFilterRow,
  type LeadAdvancedFilters,
} from '@/constants/leadAdvancedFilters';
import {
  PERIOD_PHRASE,
  findLeadQueue,
  isPeriodKey,
  parseSince,
  periodStart,
  rowMatchesQueue,
  type LeadQueueKey,
} from '@/constants/leadQueues';
import {
  useLeadQueueContext,
  type QueueContextLead,
} from '@/hooks/useLeadQueueContext';
import { useUrlQueryState } from '@/hooks/useUrlQueryState';
import {
  ActiveFilterChips,
  Avatar,
  Badge,
  BulkActionBar,
  ConfirmationDialog,
  DataTable,
  FilterButton,
  LeadFiltersPanel,
  LeadInfoModal,
  OriginBadge,
  PageHead,
  ScoreBadge,
  SearchField,
  SourceBadge,
  StatusPill,
  ViewToggle,
  channelKey,
  channelLabel,
  toneFromString,
  variantFromStatus,
  type ActiveFilterChip,
  type BulkAction,
  type ConfirmationField,
  type DataTableColumn,
  type LeadInfoSubmitPayload,
  type MultiSelectOption,
} from '@/components/ui';
import { sourceFilterValue, sourceLabel } from '@/lib/lead-source';
import { buildCsvBlob } from '@/lib/csv';
import Modal from '@/components/organisms/Modal';
import CountdownTimer from '@/components/organisms/CountdownTimer';
import ReLoading from '@/components/atoms/ReLoading';
import Button from '@/components/atoms/Button';

dayjs.extend(utc);
dayjs.extend(relativeTime);

type LeadRow = {
  'lead id': number;
  code?: string;
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
  channel?: string | null;
  source?: string | null;
  source_label?: string | null;
  assigned_lawyer_id: number | null;
  // Spam / trash
  spam_score: number;
  spam_reasons: string[] | null;
  trashed_at: string | null;
  previous_status: string | null;
  // Fase 1 — score (urgencia IA), pull date y firma del abogado asignado.
  ai_urgency?: number | null;
  pull_date?: string | null;
  firm_id?: number | null;
};

const LEAD_MANAGEMENT_PATH = '/lead-management';
const LEAD_NOT_AVAILABLE = 'This lead is not available or belongs to another firm.';

// Fila → campos que usan los filtros avanzados (constants/leadAdvancedFilters).
const toFilterRow = (r: LeadRow): AdvancedFilterRow => ({
  service: r.service,
  assignedId: r.assigned_lawyer_id ?? null,
  firmId: r.firm_id ?? null,
  source: sourceFilterValue(r.source, r.source_label),
  channel: channelKey(r.channel),
  entryDate: r.date,
  pullDate: r.pull_date ?? null,
  ai_urgency: r.ai_urgency ?? null,
  spam_score: r.spam_score,
});

const scoreText = (r: { ai_urgency?: number | null; spam_score?: number | null }) => {
  const bucket = urgencyBucket(r.ai_urgency);
  return [
    bucket ? SCORE_OPTIONS.find((o) => o.value === bucket)?.label : null,
    isPossibleSpam(r.spam_score) ? 'Possible spam' : null,
  ]
    .filter(Boolean)
    .join('; ');
};

const formatDay = (iso?: string | null) =>
  iso ? dayjs(iso).format('MMM D, YYYY') : null;

const dateRangeText = (from: string, to: string) =>
  from && to
    ? `${formatFilterDay(from)} – ${formatFilterDay(to)}`
    : from
    ? `From ${formatFilterDay(from)}`
    : `To ${formatFilterDay(to)}`;

const formatId = (id: number | string) => String(id).padStart(5, '0');
const formatDate = (d: Date | string) => dayjs(d).format('MMM DD, YYYY');
const ASSIGNMENT_WINDOW_HOURS = 48;

const toContextLead = (r: LeadRow): QueueContextLead => ({
  id: Number(r['lead id']),
  status: r.status,
  lawyer: r.lawyer && !/no assigned/i.test(r.lawyer) ? r.lawyer : null,
  updatedAt: r.date_updated,
});
const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '·';

const STATUS_OPTIONS_SELECT = [
  { name: 'In progress', value: 'IN PROGRESS' },
  { name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' },
  { name: 'Flagged', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained', value: 'CLOSED' },
  { name: 'Disabled', value: 'DISABLED' },
  { name: 'Archive', value: 'ARCHIVED' },
  { name: 'Expired', value: 'EXPIRED' },
];
// Lead NEW/EXPIRED: no tiene lawyer asignado.
// Flagged (ej: spam) y Send back (ej: lawyer inactivo) son acciones
// del admin que no requieren lawyer. In Progress y Retained sí requieren
// un lawyer activo trabajando el lead.
const STATUS_OPTIONS_NEW = [
  { name: 'In progress (assign first)', value: 'IN PROGRESS', disabled: true },
  { name: 'Flagged', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained (assign first)', value: 'CLOSED', disabled: true },
  { name: 'Disabled', value: 'DISABLED' },
  { name: 'Archive', value: 'ARCHIVED' },
];
const STATUS_OPTIONS_DISABLED = [
  { name: 'New', value: 'NEW' },
  { name: 'Send Back', value: 'LOST' },
  { name: 'Disabled', value: 'DISABLED' },
  { name: 'Archive', value: 'ARCHIVED' },
];
const STATUS_OPTIONS_ARCHIVED = [
  { name: 'New', value: 'NEW' },
  { name: 'Archive', value: 'ARCHIVED' },
];

const BULK_STATUS_OPTIONS: { name: string; value: string }[] = [
  { name: 'New', value: 'NEW' },
  { name: 'In progress', value: 'IN PROGRESS' },
  { name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' },
  { name: 'Flagged', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained', value: 'CLOSED' },
  { name: 'Disabled', value: 'DISABLED' },
];

type BulkDialogType = 'assign' | 'status' | 'archive' | 'delete' | 'trash' | null;

interface LawyerOption {
  id: number;
  name: string;
  services: string[];
  activeLeads: number;
  /** Suma de max_leads de TODOS los services del lawyer (de /lawyers-services).
   *  0 → "Pending setup": el admin no le configuró capacidad y NINGÚN
   *  lead puede asignársele aunque tenga las áreas correctas. */
  maxLeads: number;
  isActive: boolean;
}

const MAX_PREVIEW_NAMES = 3;
const MAX_PREVIEW_IDS = 3;

const LeadManagement = () => {
  const { dataLeads, error, fetchLeads, loading: leadsLoading } =
    useLeadsStore();
  const { selecArray, setSelecArray } = useSelectStatus();

  // L587-10 — la URL (?status=<slug>) es la fuente de verdad del filtro cuando
  // el parámetro está presente (submenú del sidebar, filter bar, reload).
  // L587-10 / Fase 1 — la URL es la fuente de verdad: ?status (uno o varios),
  // ?queue, filtros avanzados, ?search y ?lead. Estado optimista: ver hook.
  const { params, updateParams, getQuery } = useUrlQueryState(LEAD_MANAGEMENT_PATH);
  const statusSlugs = useMemo(() => readListParam(params, 'status'), [params]);
  const statusKey = statusSlugs.join(',');
  const hasStatusParam = params.has('status');
  // Dashboard — ?queue=<key>[&period=<key>] abre exactamente los registros que
  // cuenta la card (mismo predicado y mismo orden, ver constants/leadQueues).
  const activeQueue = findLeadQueue(params.get('queue'));
  const periodParam = params.get('period');
  const queuePeriod = isPeriodKey(periodParam) ? periodParam : 'all';
  const sinceParam = params.get('since');
  const advanced = useMemo(() => parseAdvancedFilters(params), [params]);
  const hasAdvanced = countAdvancedFilters(advanced) > 0;
  const urlSearch = params.get('search') ?? '';
  const leadParam = params.get('lead');

  // Status activos: uno (chip / sidebar) o varios (panel). Vacío = All.
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const statusFilter = statusFilters.length === 1 ? statusFilters[0] : null;
  const [searchText, setSearchText] = useState(urlSearch);
  const lastSearchRef = useRef(urlSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [firms, setFirms] = useState<FirmListItem[]>([]);
  // Nombre de cualquier firma (incluidas las fusionadas) para el export.
  const [firmNames, setFirmNames] = useState<Map<number, string>>(new Map());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  // L587-09 — ventana de tiempo (horas) para leads NEW en la vista admin.
  const [newWindowHours, setNewWindowHours] = useState<24 | 36 | 48>(24);

  const [isOpenLead, setIsOpenLead] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // ── Bulk selection state ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialogType>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [assignLawyerId, setAssignLawyerId] = useState<number | ''>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkComment, setBulkComment] = useState<string>('');
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [singleAssignLoading, setSingleAssignLoading] = useState(false);
  const [lawyersLoading, setLawyersLoading] = useState(false);

  // ── Dedicated-tab state (REVIEW / TRASHED / ARCHIVED) ──
  const [dedicatedData, setDedicatedData] = useState<LeadRow[] | null>(null);
  const [dedicatedLoading, setDedicatedLoading] = useState(false);

  const DEDICATED_TABS = ['REVIEW', 'TRASHED', 'ARCHIVED'] as const;
  type DedicatedTab = (typeof DEDICATED_TABS)[number];
  const isDedicatedTab = (s: string | null): s is DedicatedTab =>
    !!s && (DEDICATED_TABS as readonly string[]).includes(s);

  const fetchDedicated = async (status: DedicatedTab) => {
    setDedicatedLoading(true);
    setDedicatedData(null);
    let res;
    if (status === 'REVIEW') {
      res = await api.leads.review({ limit: 10000 });
    } else if (status === 'TRASHED') {
      res = await api.leads.trashList({ limit: 10000 });
    } else {
      res = await api.leads.list({ status, limit: 10000 });
    }
    setDedicatedLoading(false);
    if (!res.success || !res.data) {
      setDedicatedData([]);
      return;
    }
    setDedicatedData(res.data.data.map((lead) => toLeadRow(lead) as LeadRow));
  };

  const uniqueStatuses = useMemo<string[]>(() => {
    if (!dataLeads) return [];
    return Array.from(new Set((dataLeads as any[]).map((l) => l.status)))
      .filter((s) => s !== 'ARCHIVED' && s !== 'REVIEW' && s !== 'TRASHED');
  }, [dataLeads]);

  // L587-09 — el filtro NEW puede activarse por chip (statusFilter) o por
  // navegación desde el KPI "New Leads" (selecArray=['NEW']).
  // Las colas del dashboard cuentan todos los NEW (sin ventana), así que la
  // ventana no aplica cuando hay ?queue=. Tampoco con un rango de Entry date
  // en el panel: es el mismo concepto (fecha de entrada) y manda el rango.
  const isNewFilterActive =
    !activeQueue &&
    !advanced.entryFrom &&
    !advanced.entryTo &&
    (statusFilter === 'NEW' ||
      (selecArray.length === 1 && selecArray[0]?.toUpperCase() === 'NEW'));

  const queueRows = useMemo<LeadRow[] | null>(() => {
    if (!activeQueue || !Array.isArray(dataLeads)) return null;
    // Mismo instante que usó la card (?since=); si falta, se recalcula.
    const since = activeQueue.periodField
      ? parseSince(sinceParam) ?? periodStart(queuePeriod)
      : null;
    return (dataLeads as LeadRow[]).filter((l) =>
      rowMatchesQueue(activeQueue, l, since)
    );
  }, [activeQueue, queuePeriod, sinceParam, dataLeads]);

  // Returned: la lista de abogados resuelve el nombre de asignaciones masivas.
  useEffect(() => {
    if (activeQueue?.key === 'returned') void ensureLawyersLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQueue]);

  const queueContextLeads = useMemo(
    () => (activeQueue?.context && queueRows ? queueRows.map(toContextLead) : []),
    [activeQueue, queueRows]
  );
  const queueContext = useLeadQueueContext(
    activeQueue?.context,
    queueContextLeads
  );

  // Búsqueda (nombre, email, teléfono, status, ID y código LD-000xx) + filtros
  // avanzados; se aplican sobre cualquier dataset (lista, cola o pestaña dedicada).
  const applySearchAndAdvanced = (list: LeadRow[]): LeadRow[] => {
    let out = list;
    const q = searchText.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (l) =>
          l['lead name']?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l['phone number']?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          String(l['lead id']).includes(q) ||
          formatId(l['lead id']).includes(q) ||
          (l.code ?? '').toLowerCase().includes(q)
      );
    }
    if (hasAdvanced) {
      out = out.filter((l) => matchesAdvancedFilters(toFilterRow(l), advanced));
    }
    return out;
  };

  const filtered = useMemo<LeadRow[]>(() => {
    // When a dedicated tab is active, use its own dataset.
    if (isDedicatedTab(statusFilter) && dedicatedData !== null) {
      return applySearchAndAdvanced(dedicatedData);
    }

    if (!dataLeads) return [];
    let list = dataLeads as LeadRow[];

    if (queueRows) {
      list = queueRows;
    } else if (selecArray.length > 0) {
      const set = new Set(selecArray.map((s) => s.toLowerCase()));
      list = list.filter((l) => set.has(l.status?.toLowerCase()));
    } else if (statusFilters.length > 0) {
      const set = new Set(statusFilters);
      list = list.filter((l) => set.has(l.status));
    } else {
      list = list.filter((l) => l.status !== 'ARCHIVED');
    }

    // L587-09 — ventana 24/36/48h sobre created_at cuando el filtro es NEW.
    if (isNewFilterActive) {
      const cutoff = Date.now() - newWindowHours * 36e5;
      list = list.filter((l) => {
        const t =
          l.date instanceof Date
            ? l.date.getTime()
            : new Date(l.date as any).getTime();
        return !Number.isNaN(t) && t >= cutoff;
      });
    }

    return applySearchAndAdvanced(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataLeads,
    selecArray,
    statusFilters,
    searchText,
    dedicatedData,
    isNewFilterActive,
    newWindowHours,
    queueRows,
    advanced,
    hasAdvanced,
  ]);

  // L587-10 — clicks en la filter bar navegan por URL; el effect de sync aplica
  // el estado. Unidireccional: URL → estado (evita doble-fetch en tabs dedicadas).
  // Fase 1: se conservan los filtros avanzados y la búsqueda; se sale de la cola.
  const handleStatusClick = (status: string | null) => {
    const slug = adminSlugFromStatus(status);
    updateParams((p) => {
      p.delete('queue');
      p.delete('period');
      p.delete('since');
      p.set('status', slug);
    });
  };

  // Panel de filtros: status múltiple, sincronizado con los chips.
  const handlePanelStatus = (next: string[]) => {
    updateParams((p) => {
      p.delete('queue');
      p.delete('period');
      p.delete('since');
      p.delete('status');
      if (next.length === 0) p.set('status', 'all');
      else next.forEach((st) => p.append('status', adminSlugFromStatus(st)));
    });
  };

  const setAdvanced = (next: LeadAdvancedFilters) =>
    updateParams((p) => writeAdvancedFilters(p, next));

  // Búsqueda ↔ URL (?search=): la URL manda al cargar / volver atrás; al
  // escribir se actualiza con un pequeño retardo para no navegar en cada tecla.
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

  // Sincroniza el filtro desde la URL. Solo actúa cuando ?status está presente,
  // para no pisar el flujo Dashboard→KPI (setSelecArray sin parámetro).
  useEffect(() => {
    if (activeQueue) {
      setSelecArray([]);
      setStatusFilters([]);
      setDedicatedData(null);
      return;
    }
    if (!hasStatusParam) return;
    const tokens = statusSlugs
      .map((slug) => adminStatusFromSlug(slug))
      .filter((t): t is LeadStatus => !!t);
    const regular = tokens.filter((t) => !isDedicatedTab(t));
    const dedicated = tokens.find((t) => isDedicatedTab(t));
    setSelecArray([]);
    if (regular.length === 0 && dedicated && isDedicatedTab(dedicated)) {
      setStatusFilters([dedicated]);
      void fetchDedicated(dedicated);
    } else {
      setStatusFilters(regular);
      setDedicatedData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey, hasStatusParam, activeQueue]);

  // Fase 1 — catálogos para el panel (áreas de derecho y firmas).
  useEffect(() => {
    void api.serviceTypes.list().then((res) => {
      if (res.success && res.data) setServiceTypes(res.data.map((t) => t.name).filter(Boolean));
    });
    void api.firms.list().then((res) => {
      if (!res.success || !res.data) return;
      setFirms(res.data.filter((f) => f.status !== 'merged'));
      setFirmNames(new Map(res.data.map((f) => [f.id, f.name])));
    });
  }, []);

  // ── Link directo (?lead=<id>) ──
  // El lead abierto vive en la URL: abrir una fila la escribe, cerrar el
  // detalle la borra, y un link compartido abre el detalle al cargar.
  const linkedLeadRef = useRef<string | null>(null);
  const showLead = (row: LeadRow) => {
    setSelectedLead(row);
    setIsOpenLead(true);
    // Issue #2: si el lead no está asignado, pre-cargamos lawyers para
    // que el picker inline esté disponible sin click extra.
    if (row.status === 'NEW' || row.status === 'EXPIRED' || row.status === 'SEND_BACK') {
      void ensureLawyersLoaded();
    }
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
    // Espera a que cargue la lista (salvo error) para reutilizar la fila.
    if (!Array.isArray(dataLeads) && !error) return;
    linkedLeadRef.current = leadParam;
    const pool = [...((dataLeads as LeadRow[] | null) ?? []), ...(dedicatedData ?? [])];
    const row = pool.find((l) => Number(l['lead id']) === id);
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
      showLead(toLeadRow(res.data) as LeadRow);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadParam, dataLeads, error]);

  // Al cerrar el detalle (cualquier camino: Cancel, guardar, asignar…) se
  // quita ?lead= para que la URL refleje la vista.
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

  const leadHref = (id: number | string) => {
    const p = new URLSearchParams(getQuery());
    p.set('lead', String(id));
    return `${LEAD_MANAGEMENT_PATH}?${p.toString()}`;
  };

  const openLead = (row: LeadRow) => {
    linkedLeadRef.current = String(row['lead id']);
    updateParams((p) => p.set('lead', String(row['lead id'])));
    showLead(row);
  };

  const handleSingleAssign = async (lawyerId: number, comment: string) => {
    if (!selectedLead || Object.keys(selectedLead).length === 0) return;
    // Pre-check client-side de capacity para fail-fast con un mensaje
    // accionable. Backend valida igual server-side. Cubre el bug donde
    // editar áreas creaba lawyer-service con max_leads=0.
    const target = lawyers.find((l) => l.id === lawyerId);
    if (target && target.maxLeads === 0) {
      toast.error(
        'This lawyer has no capacity configured. Edit the lawyer and set "No. Leads Allowed" >= 1.',
        { duration: 8000 }
      );
      return;
    }
    if (target && target.activeLeads >= target.maxLeads && target.maxLeads > 0) {
      toast.error(
        `${target.name} is at capacity (${target.activeLeads}/${target.maxLeads}). Increase max leads or pick another lawyer.`,
        { duration: 8000 }
      );
      return;
    }
    setSingleAssignLoading(true);
    const res = await api.leads.assign(selectedLead['lead id'], {
      lawyer_id: lawyerId,
      comment,
    });
    setSingleAssignLoading(false);
    if (!res.success) {
      // El backend devuelve el message real (capacity exceeded, no area
      // match, lead not NEW/EXPIRED). Lo mostramos verbatim con duración
      // larga para que el admin lo lea.
      toast.error(res.message || 'Could not assign lead', {
        duration: 8000,
      });
      return;
    }
    toast.success('Lead assigned successfully');
    setIsOpenLead(false);
    fetchLeads();
  };

  const handleSaveLead = async ({
    status,
    comments,
  }: LeadInfoSubmitPayload): Promise<void> => {
    if (!selectedLead || Object.keys(selectedLead).length === 0) return;
    const upper = (status ?? '').toUpperCase() as LeadStatus;
    const reason = (comments ?? '').trim();
    if (reason.length === 0) {
      toast.error('A reason is required for this status change');
      return;
    }
    // ARCHIVE corre por su endpoint dedicado.
    if (upper === 'ARCHIVED') {
      setLoading(true);
      const archived = await api.leads.archive(selectedLead['lead id'], { comment: reason });
      setLoading(false);
      if (!archived.success) {
        toast.error(archived.message || 'Error archiving lead');
        return;
      }
      toast.success('Lead archived');
      setSelectedLead({});
      setIsOpenLead(false);
      await fetchLeads();
      return;
    }

    setLoading(true);
    // Statuses que implican quitar asignación → endpoint /unassign dedicado,
    // pero solo si el lead tiene lawyer asignado. Un lead NEW/EXPIRED sin
    // lawyer usa update directamente (ej: admin marca spam como LOST).
    const unassignStatuses: LeadStatus[] = ['LOST', 'SEND_BACK'];
    const leadId = selectedLead['lead id'];
    const hasLawyer = !!selectedLead.assigned_lawyer_id;
    const res = unassignStatuses.includes(upper) && hasLawyer
      ? await api.leads.unassign(leadId, { status: upper, comment: reason })
      : await api.leads.update(leadId, {
          status: upper,
          comment: reason || undefined,
          description: selectedLead['description lead'] ?? '',
        });
    if (!res.success) {
      setLoading(false);
      toast.error(res.message || 'Error updating Lead information');
      return;
    }
    toast.success('Lead information updated successfully');
    setSelectedLead({});
    setIsOpenLead(false);
    await fetchLeads();
    setLoading(false);
  };

  // ── Modal action handlers (Review / Trash / Restore) ──

  const handleMarkValid = async (id: number | string) => {
    setLoading(true);
    const res = await api.leads.markValid(Number(id));
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error marking lead as valid');
      return;
    }
    toast.success('Lead marked as valid — moved to New');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };

  const handleMarkSpam = async (id: number | string) => {
    setLoading(true);
    const res = await api.leads.markSpam(Number(id));
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error confirming spam');
      return;
    }
    toast.success('Lead confirmed as spam — moved to Trash');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };

  const handleRestore = async (id: number | string) => {
    setLoading(true);
    const res = await api.leads.restore(Number(id));
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error restoring lead');
      return;
    }
    toast.success('Lead restored successfully');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };

  const handleTrash = async (id: number | string, comment?: string) => {
    setLoading(true);
    const res = await api.leads.trash(Number(id), comment ? { comment } : undefined);
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error moving lead to trash');
      return;
    }
    toast.success('Lead moved to trash');
    setSelectedLead({});
    setIsOpenLead(false);
    await fetchLeads();
  };

  const handleDeletePermanent = async (id: number | string) => {
    setLoading(true);
    const res = await database.deleteData(
      `${process.env.NEXT_PUBLIC_URL}/leads/${Number(id)}`
    );
    setLoading(false);
    if (!res.success) {
      toast.error('Error deleting lead permanently');
      return;
    }
    toast.success('Lead permanently deleted');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };

  const deleteLead = async () => {
    if (
      selectedLead.status !== 'NEW' &&
      selectedLead.status !== 'DISABLED' &&
      selectedLead.status !== 'LOST'
    ) {
      return toast.error(
        'You cannot delete the lead because it is assigned to a lawyer.'
      );
    }
    const dataDelete = await database.deleteData(
      `${process.env.NEXT_PUBLIC_URL}/leads/${selectedLead['lead id']}`
    );
    // El backend limpia la asignación en cascada al borrar el lead (playbook §4);
    // ya no hace falta el DELETE /leads-assigned/lead/:id por separado.
    if (!dataDelete.success) {
      return toast.error('Could not delete the lead. Please try again.');
    }
    toast.success('Success to delete');
    setIsOpenDelete(false);
    fetchLeads();
  };

  useEffect(() => {
    if (!dataLeads) fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch lawyers list for the Assign-to picker (loaded lazily on first need)
  const ensureLawyersLoaded = async () => {
    if (lawyers.length > 0 || lawyersLoading) return;
    setLawyersLoading(true);
    // Necesitamos /lawyers (v2 DTO) + /lawyers-services (legacy) para
    // cruzar y sumar max_leads. Backend v2 /lawyers no devuelve max_leads;
    // ese campo vive en la tabla `lawyers_services` con un row por área.
    const [res, servicesRes] = await Promise.all([
      api.lawyers.list({ is_active: true, role_id: 2, limit: 1000 }),
      database
        .getData(`${process.env.NEXT_PUBLIC_URL}/lawyers-services`)
        .catch(() => ({ success: false, data: [] as any[] })),
    ]);
    setLawyersLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not load lawyers');
      return;
    }
    // Sum max_leads por lawyer_id.
    const maxByLawyer = new Map<number, number>();
    const servicesList: any[] = Array.isArray(servicesRes.data)
      ? servicesRes.data
      : Array.isArray((servicesRes as any).data?.data)
      ? (servicesRes as any).data.data
      : [];
    for (const svc of servicesList) {
      const lid = Number(svc?.lawyer_id);
      const max = Number(svc?.max_leads ?? 0);
      if (!Number.isFinite(lid) || !Number.isFinite(max)) continue;
      maxByLawyer.set(lid, (maxByLawyer.get(lid) ?? 0) + max);
    }
    const opts: LawyerOption[] = res.data.data
      .map((l) => ({
        id: l.id,
        name:
          `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() ||
          `Lawyer #${l.id}`,
        services: l.services ?? [],
        activeLeads: l.active_assigned_leads ?? 0,
        maxLeads: maxByLawyer.get(l.id) ?? 0,
        isActive: l.is_active ?? true,
      }))
      .filter((o) => Number.isFinite(o.id));
    setLawyers(opts);
  };

  // Selected leads derived from current dataset
  const selectedLeads = useMemo<LeadRow[]>(() => {
    if (selectedIds.size === 0 || !dataLeads) return [];
    return (dataLeads as LeadRow[]).filter((l) =>
      selectedIds.has(Number(l['lead id']))
    );
  }, [dataLeads, selectedIds]);

  const clearSelection = () => setSelectedIds(new Set());

  const openBulkDialog = (type: Exclude<BulkDialogType, null>) => {
    if (selectedIds.size === 0) return;
    if (type === 'assign') {
      setAssignLawyerId('');
      void ensureLawyersLoaded();
    }
    if (type === 'status') {
      setBulkStatus('');
    }
    setBulkComment('');
    setBulkDialog(type);
  };

  const closeBulkDialog = () => {
    if (bulkLoading) return;
    setBulkDialog(null);
  };

  const summarizeBulkResult = (
    action: string,
    res: {
      success: boolean;
      data?: {
        total: number;
        succeeded: number;
        failed: number;
        errors?: Array<{ lead_id: number; message: string }>;
      } | null;
      message?: string;
    }
  ) => {
    if (!res.success || !res.data) {
      toast.error(res.message || `Bulk ${action} failed`);
      return false;
    }
    const { succeeded, failed, total, errors } = res.data;
    if (failed > 0) {
      // Issue #3: el backend devuelve errors[] con { lead_id, message }
      // específicos (capacity exceeded, lawyer doesn't match area, etc).
      // Renderizamos hasta 3 inline + "+N more" para que el admin sepa
      // por qué falló cada lead.
      const errorList = errors ?? [];
      const previewCount = Math.min(errorList.length, 3);
      const extra = errorList.length - previewCount;
      toast(
        (t) => (
          <div className='flex flex-col gap-1.5 text-[12px]'>
            <span className='font-bold text-slate-900'>
              Bulk {action}: {succeeded}/{total} ok · {failed} failed
            </span>
            {errorList.slice(0, previewCount).map((err, i) => (
              <span
                key={`${err.lead_id}-${i}`}
                className='text-[11px] text-slate-600'
              >
                <strong className='font-mono text-slate-900'>
                  #{String(err.lead_id).padStart(5, '0')}
                </strong>
                : {err.message}
              </span>
            ))}
            {extra > 0 ? (
              <span className='text-[11px] font-medium text-slate-400'>
                +{extra} more error{extra === 1 ? '' : 's'}
              </span>
            ) : null}
            <button
              type='button'
              onClick={() => toast.dismiss(t.id)}
              className='mt-1 self-end text-[10px] font-bold uppercase tracking-[0.04em] text-slate-500 hover:text-slate-900'
            >
              Dismiss
            </button>
          </div>
        ),
        { icon: '⚠️', duration: 10000 }
      );
    } else {
      toast.success(
        `Bulk ${action}: ${succeeded} lead${succeeded === 1 ? '' : 's'} ok`
      );
    }
    return true;
  };

  const finishBulk = () => {
    clearSelection();
    setBulkDialog(null);
    fetchLeads();
  };

  // Fase 1 — el CSV contiene exactamente las filas visibles (status, cola,
  // búsqueda y filtros avanzados), generado en el cliente como el de las colas.
  const handleExportLeads = () => {
    const header = ['ID', 'Created', 'Lead', 'Email', 'Phone', 'Service', 'Status', 'Lawyer', 'Last update'];
    if (activeQueue?.context) {
      header.push('Reason', 'Since', activeQueue.context === 'returned' ? 'Previous lawyer' : 'Flagged by');
    }
    header.push('Code', 'Source', 'Channel', 'Pull date', 'Score', 'AI urgency', 'Spam score', 'Firm');
    // Misma secuencia que la tabla al abrir: en las colas su orden; si no, Date desc.
    const rows = activeQueue
      ? filtered
      : [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lines = rows.map((r) => {
      const line: unknown[] = [
        r['lead id'], r.date, r['lead name'], r.email, r['phone number'],
        r.service, r.status, /no assigned/i.test(r.lawyer) ? '' : r.lawyer, r.date_updated,
      ];
      if (activeQueue?.context) {
        const ctx = contextOf(r);
        line.push(ctx?.reason ?? '', ctx?.at ?? '', ctx?.by ?? '');
      }
      line.push(
        r.code ?? '',
        r.source_label || sourceLabel(r.source),
        channelLabel(r.channel),
        r.pull_date ? new Date(r.pull_date) : '',
        scoreText(r),
        r.ai_urgency ?? '',
        r.spam_score ?? '',
        r.firm_id ? firmNames.get(r.firm_id) ?? r.firm_id : ''
      );
      return line;
    });
    downloadBlob(
      buildCsvBlob(header, lines),
      activeQueue
        ? `leads-${activeQueue.key}-${dayjs().format('YYYY-MM-DD')}.csv`
        : `leads-${dayjs().format('YYYY-MM-DD')}.csv`
    );
    toast.success('Leads CSV downloaded');
  };

  const handleConfirmAssign = async () => {
    const lawyer = lawyers.find((l) => l.id === assignLawyerId);
    if (!lawyer) return;
    const comment = bulkComment.trim();
    if (comment.length === 0) {
      toast.error('Reason is required');
      return;
    }
    setBulkLoading(true);
    const res = await api.leads.bulk.assign({
      lead_ids: Array.from(selectedIds),
      lawyer_id: Number(lawyer.id),
      comment,
    });
    setBulkLoading(false);
    if (summarizeBulkResult('assign', res)) finishBulk();
  };

  const handleConfirmStatus = async () => {
    if (!bulkStatus) return;
    const comment = bulkComment.trim();
    if (comment.length === 0) {
      toast.error('Reason is required');
      return;
    }
    setBulkLoading(true);
    const res = await api.leads.bulk.status({
      lead_ids: Array.from(selectedIds),
      status: bulkStatus as LeadStatus,
      comment,
    });
    setBulkLoading(false);
    if (summarizeBulkResult('status update', res)) finishBulk();
  };

  const handleConfirmArchive = async () => {
    const comment = bulkComment.trim();
    if (comment.length === 0) {
      toast.error('Reason is required');
      return;
    }
    setBulkLoading(true);
    const res = await api.leads.bulk.archive({
      lead_ids: Array.from(selectedIds),
      comment,
    });
    setBulkLoading(false);
    if (summarizeBulkResult('archive', res)) finishBulk();
  };

  const handleConfirmDelete = async () => {
    const comment = bulkComment.trim();
    if (comment.length === 0) {
      toast.error('Reason is required');
      return;
    }
    setBulkLoading(true);
    const res = await api.leads.bulk.delete({
      lead_ids: Array.from(selectedIds),
      comment,
    });
    setBulkLoading(false);
    if (summarizeBulkResult('delete', res)) finishBulk();
  };

  const handleConfirmTrash = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ lead_id: number; message: string }> = [];
    for (const id of Array.from(selectedIds)) {
      const res = await api.leads.trash(id, bulkComment.trim() ? { comment: bulkComment.trim() } : undefined);
      if (res.success) {
        succeeded++;
      } else {
        failed++;
        errors.push({ lead_id: id, message: res.message || 'Unknown error' });
      }
    }
    setBulkLoading(false);
    if (summarizeBulkResult('trash', {
      success: true,
      data: { total: selectedIds.size, succeeded, failed, errors },
    })) finishBulk();
  };

  // Preview helpers shared by dialogs
  const previewIds = useMemo(() => {
    const ids = selectedLeads.map((l) => `#${formatId(l['lead id'])}`);
    if (ids.length <= MAX_PREVIEW_IDS) return ids.join(', ');
    return `${ids.slice(0, MAX_PREVIEW_IDS).join(', ')} +${
      ids.length - MAX_PREVIEW_IDS
    } more`;
  }, [selectedLeads]);

  const previewNames = useMemo(() => {
    const names = selectedLeads.map((l) => l['lead name'] || '—');
    if (names.length <= MAX_PREVIEW_NAMES) return names.join(', ');
    return `${names.slice(0, MAX_PREVIEW_NAMES).join(', ')} +${
      names.length - MAX_PREVIEW_NAMES
    } more`;
  }, [selectedLeads]);

  const bulkActions: BulkAction[] = [
    {
      key: 'assign',
      label: 'Assign to',
      icon: <MdPersonAddAlt1 size={14} />,
      onClick: () => openBulkDialog('assign'),
    },
    {
      key: 'status',
      label: 'Change status',
      icon: <MdSwapHoriz size={14} />,
      onClick: () => openBulkDialog('status'),
    },
    {
      key: 'archive',
      label: 'Archive',
      icon: <MdArchive size={14} />,
      onClick: () => openBulkDialog('archive'),
    },
    {
      key: 'trash',
      label: 'Move to Trash',
      icon: <MdDeleteOutline size={14} />,
      onClick: () => openBulkDialog('trash'),
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <MdDeleteOutline size={14} />,
      variant: 'danger',
      onClick: () => openBulkDialog('delete'),
    },
  ];

  const assignFields: ConfirmationField[] = [
    { label: 'Action', value: 'Assign to lawyer' },
    {
      label: 'Leads affected',
      value: `${selectedIds.size} ${
        selectedIds.size === 1 ? 'lead' : 'leads'
      }`,
    },
    {
      label: 'Assign to',
      value: (() => {
        const lawyer = lawyers.find((l) => l.id === assignLawyerId);
        return lawyer ? lawyer.name : '—';
      })(),
      highlight: !!assignLawyerId,
    },
    { label: 'IDs', value: previewIds || '—' },
  ];

  const statusFields: ConfirmationField[] = [
    { label: 'Action', value: 'Change status' },
    {
      label: 'Leads affected',
      value: `${selectedIds.size} ${
        selectedIds.size === 1 ? 'lead' : 'leads'
      }`,
    },
    {
      label: 'New status',
      value:
        BULK_STATUS_OPTIONS.find((o) => o.value === bulkStatus)?.name ?? '—',
      highlight: !!bulkStatus,
    },
    { label: 'IDs', value: previewIds || '—' },
  ];

  const archiveFields: ConfirmationField[] = [
    { label: 'Action', value: 'Archive leads' },
    {
      label: 'Leads affected',
      value: `${selectedIds.size} ${
        selectedIds.size === 1 ? 'lead' : 'leads'
      }`,
    },
    { label: 'IDs', value: previewIds || '—' },
  ];

  const deleteFields: ConfirmationField[] = [
    { label: 'Leads', value: previewNames || '—' },
    { label: 'IDs', value: previewIds || '—' },
  ];

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
      key: 'date',
      label: 'Date',
      width: '88px',
      sortable: true,
      accessor: (r) => r.date,
      render: (r) => (
        <span className='text-[11px] tabular-nums text-slate-500'>
          {formatDate(r.date)}
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
          <span className='flex min-w-0 items-center gap-1.5'>
            <span
              title={r['lead name'] || undefined}
              className='truncate text-[13px] font-bold tracking-[-0.005em] text-slate-900'
            >
              {r['lead name'] || '—'}
            </span>
            {/* Fase 1 — "New Lead": link directo al detalle (?lead=<id>). */}
            {r.status === 'NEW' ? (
              <Link
                href={leadHref(r['lead id'])}
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
      key: 'description lead',
      label: 'Description',
      width: 'minmax(200px, 1fr)',
      render: (r) => (
        <span
          title={r['description lead']}
          className='block truncate pr-3 text-xs text-slate-500'
        >
          {r['description lead'] || '—'}
        </span>
      ),
    },
    {
      key: 'lawyer',
      label: 'Assigned to',
      width: '170px',
      sortable: true,
      accessor: (r) => r.lawyer,
      render: (r) => {
        const isAssigned = r.lawyer && !/no assigned/i.test(r.lawyer);
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
      // Fase 1 — Score: urgencia IA (High/Medium/Low) y marca de posible spam.
      key: 'score',
      label: 'Score',
      width: '96px',
      sortable: true,
      accessor: (r) => scoreSortValue(r),
      render: (r) => <ScoreBadge urgency={r.ai_urgency} spamScore={r.spam_score} />,
    },
  ];

  // Fase 1 — a 1280px la tabla no cabe completa: lo que el abogado revisa en
  // cada fila (lead, área, status, score, asignado) va primero y queda a la
  // vista; teléfono, descripción, canal y origen siguen en la tabla (scroll
  // horizontal) y en el detalle del lead.
  const COLUMN_ORDER = [
    'lead id',
    'date',
    'lead name',
    'service',
    'status',
    'score',
    'lawyer',
    'phone number',
    'description lead',
    'channel',
    'source',
  ];
  const orderedColumns = COLUMN_ORDER.map((k) => columns.find((c) => c.key === k)).filter(
    (c): c is DataTableColumn<LeadRow> => !!c
  );

  // ── Columnas de las colas del dashboard (?queue=) ──
  // id → nombre para las asignaciones masivas, que en el audit log solo guardan
  // el id: abogados del listado + lista de abogados (se carga en Returned).
  const lawyerNames = new Map<number, string>();
  for (const l of lawyers) lawyerNames.set(Number(l.id), l.name);
  if (Array.isArray(dataLeads)) {
    for (const l of dataLeads as LeadRow[]) {
      if (l.assigned_lawyer_id && l.lawyer && !/no assigned/i.test(l.lawyer)) {
        lawyerNames.set(Number(l.assigned_lawyer_id), l.lawyer);
      }
    }
  }
  const contextOf = (r: LeadRow) => {
    const ctx = queueContext.getContext(toContextLead(r));
    if (!ctx || ctx.by || !ctx.byId) return ctx;
    return { ...ctx, by: lawyerNames.get(ctx.byId) ?? null };
  };
  const pendingText = queueContext.loading ? 'Loading…' : '—';
  const timeColumn = (
    label: string,
    accessor: (r: LeadRow) => Date,
    render: (d: Date) => JSX.Element
  ): DataTableColumn<LeadRow> => ({
    key: 'queue_time',
    label,
    width: '130px',
    sortable: true,
    accessor,
    render: (r) => render(accessor(r)),
  });
  const relativeCell = (d: Date) => (
    <span className='flex flex-col gap-0.5'>
      <span className='text-[11px] font-semibold text-slate-700'>
        {dayjs(d).fromNow()}
      </span>
      <span className='text-[10px] tabular-nums text-slate-400'>
        {dayjs(d).format('MMM DD, HH:mm')}
      </span>
    </span>
  );
  const reasonColumn = (label: string): DataTableColumn<LeadRow> => ({
    key: 'queue_reason',
    label,
    width: 'minmax(200px, 1fr)',
    render: (r) => {
      const ctx = contextOf(r);
      const reason = ctx?.reason;
      return (
        <span
          title={reason ?? undefined}
          className={`block truncate pr-3 text-xs ${
            reason ? 'text-slate-700' : 'italic text-slate-400'
          }`}
        >
          {reason ?? (ctx ? 'No reason recorded' : pendingText)}
        </span>
      );
    },
  });
  const eventTime = (r: LeadRow) => contextOf(r)?.at ?? r.date_updated;

  const QUEUE_COLUMNS: Partial<Record<LeadQueueKey, DataTableColumn<LeadRow>[]>> = {
    assigned: [
      timeColumn(
        'Expires',
        (r) => r.date_updated,
        (d) => {
          const deadline = dayjs(d).add(ASSIGNMENT_WINDOW_HOURS, 'hour');
          const overdue = deadline.isBefore(dayjs());
          return (
            <span className='flex flex-col gap-0.5'>
              <span
                className={`text-[11px] font-semibold ${
                  overdue ? 'text-customRed' : 'text-slate-700'
                }`}
              >
                {overdue ? 'Overdue' : deadline.fromNow()}
              </span>
              <span className='text-[10px] tabular-nums text-slate-400'>
                {deadline.format('MMM DD, HH:mm')}
              </span>
            </span>
          );
        }
      ),
    ],
    // updated_at: el BE lo actualiza en cada cambio del lead (no con las notas).
    'in-progress': [timeColumn('Last update', (r) => r.date_updated, relativeCell)],
    waiting: [timeColumn('Last update', (r) => r.date_updated, relativeCell)],
    returned: [
      timeColumn('Returned', eventTime, relativeCell),
      reasonColumn('Return reason'),
      {
        key: 'queue_by',
        label: 'Previous lawyer',
        width: '160px',
        sortable: true,
        accessor: (r) => contextOf(r)?.by ?? '',
        render: (r) => {
          const ctx = contextOf(r);
          const name = ctx?.by;
          return name ? (
            <div className='flex min-w-0 items-center gap-2'>
              <Avatar size='xs' tone={toneFromString(name)} initials={initialsOf(name)} />
              <span className='truncate text-xs font-semibold text-slate-700'>{name}</span>
            </div>
          ) : (
            <span className='text-[11px] font-medium italic text-slate-400'>
              {ctx ? 'Unknown' : pendingText}
            </span>
          );
        },
      },
    ],
    flagged: [timeColumn('Flagged on', eventTime, relativeCell), reasonColumn('Flag reason')],
    retained: [timeColumn('Retained', (r) => r.date_updated, relativeCell)],
  };

  // Vista de cola: se ocultan columnas para que la de tiempo / razón quede
  // visible sin scroll horizontal.
  const WITH_TIME = ['channel', 'source', 'description lead', 'phone number'];
  // La razón es la columna clave en Returned / Flagged: el Score se oculta ahí.
  const WITH_REASON = [...WITH_TIME, 'phone number', 'date', 'score'];
  const QUEUE_HIDDEN_COLUMNS: Record<LeadQueueKey, string[]> = {
    new: ['channel', 'source'],
    received: ['channel', 'source'],
    assigned: WITH_TIME,
    'in-progress': WITH_TIME,
    waiting: WITH_TIME,
    retained: WITH_TIME,
    flagged: WITH_REASON,
    // El lead ya no tiene abogado asignado: lo reemplaza "Previous lawyer".
    returned: [...WITH_REASON, 'lawyer'],
  };

  let tableColumns = orderedColumns;
  if (activeQueue) {
    const hidden = new Set(QUEUE_HIDDEN_COLUMNS[activeQueue.key]);
    const visible = orderedColumns.filter((c) => !hidden.has(c.key));
    // Las columnas de la cola van justo después del lead: son las que explican
    // el orden y el motivo, y tienen que verse sin scroll horizontal.
    const at = visible.findIndex((c) => c.key === 'lead name') + 1;
    tableColumns = [
      ...visible.slice(0, at),
      ...(QUEUE_COLUMNS[activeQueue.key] ?? []),
      ...visible.slice(at),
    ];
  }
  const tableSort = activeQueue
    ? {
        key: activeQueue.sort.field === 'created' ? 'date' : 'queue_time',
        direction: activeQueue.sort.direction,
      }
    : { key: 'date', direction: 'desc' as const };

  // ── Fase 1: opciones del panel y chips de filtros activos ──
  const allRows: LeadRow[] = [
    ...(Array.isArray(dataLeads) ? (dataLeads as LeadRow[]) : []),
    ...(dedicatedData ?? []),
  ];
  const statusLabel = (st: string) =>
    statusSelectAll.find((it) => it.value === st)?.name ?? st;
  const statusPanelOptions: MultiSelectOption[] = uniqueStatuses.map((st) => ({
    value: st,
    label: statusLabel(st),
  }));
  const regularStatusFilters = statusFilters.filter((st) => !isDedicatedTab(st));
  const serviceOptions: MultiSelectOption[] = Array.from(
    new Set([...serviceTypes, ...allRows.map((r) => r.service).filter(Boolean)])
  )
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
  const lawyerOptions: MultiSelectOption[] = [
    { value: UNASSIGNED_VALUE, label: 'Unassigned' },
    ...Array.from(lawyerNames.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: String(id), label: name })),
  ];
  const firmOptions: MultiSelectOption[] = [...firms]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => ({ value: String(f.id), label: f.name }));
  const channelOptions: MultiSelectOption[] = Array.from(
    new Set(allRows.map((r) => channelKey(r.channel)))
  )
    .map((key) => ({ value: key, label: channelLabel(key) }))
    .sort((a, b) =>
      a.value === 'unknown' ? 1 : b.value === 'unknown' ? -1 : a.label.localeCompare(b.label)
    );
  const optionLabel = (options: MultiSelectOption[], value: string, fallback?: string) =>
    options.find((o) => o.value === value)?.label ?? fallback ?? value;

  const removeValue = <K extends 'services' | 'assigned' | 'firms' | 'sources' | 'channels' | 'scores'>(
    key: K,
    value: string
  ) =>
    setAdvanced({
      ...advanced,
      [key]: (advanced[key] as string[]).filter((v) => v !== value),
    } as LeadAdvancedFilters);

  const activeChips: ActiveFilterChip[] = [
    ...(activeQueue
      ? []
      : regularStatusFilters.map((st) => ({
          key: `status-${st}`,
          label: 'Status',
          value: statusLabel(st),
          onRemove: () => handlePanelStatus(regularStatusFilters.filter((x) => x !== st)),
        }))),
    ...advanced.services.map((v) => ({
      key: `service-${v}`,
      label: 'Area of Law',
      value: v,
      onRemove: () => removeValue('services', v),
    })),
    ...advanced.assigned.map((v) => ({
      key: `assigned-${v}`,
      label: 'Assigned to',
      value: optionLabel(lawyerOptions, v, `Lawyer #${v}`),
      onRemove: () => removeValue('assigned', v),
    })),
    ...advanced.firms.map((v) => ({
      key: `firm-${v}`,
      label: 'Firm',
      value: optionLabel(firmOptions, v, `#${v}`),
      onRemove: () => removeValue('firms', v),
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
  const activeFilterCount =
    countAdvancedFilters(advanced) + (!activeQueue && regularStatusFilters.length > 0 ? 1 : 0);

  // Clear all: vuelve a la lista completa (status All, sin filtros ni búsqueda).
  // Las vistas Review / Trash / Archived y las colas tienen su propio control.
  const clearAllFilters = () => {
    setSearchText('');
    lastSearchRef.current = '';
    updateParams((p) => {
      writeAdvancedFilters(p, EMPTY_ADVANCED_FILTERS);
      p.delete('search');
      if (!activeQueue && regularStatusFilters.length > 0) p.set('status', 'all');
    });
  };

  if (loading) return <ReLoading />;

  return (
    <div className='flex flex-col gap-4 min-h-0 flex-1'>
      {/* Modal: Lead detail / status update */}
      <LeadInfoModal
        open={isOpenLead}
        onClose={() => setIsOpenLead(false)}
        lead={
          Object.keys(selectedLead).length > 0
            ? {
                id: selectedLead['lead id'],
                name: selectedLead['lead name'],
                email: selectedLead.email,
                phone: selectedLead['phone number'],
                service: selectedLead.service,
                description: selectedLead['description lead'],
                comments: selectedLead.comments,
                selectedAt: selectedLead.date
                  ? dayjs
                      .utc(selectedLead.date as string)
                      .local()
                      .format('MMM D, YYYY')
                  : undefined,
                pullDate: formatDay(selectedLead.pull_date),
                status: selectedLead.status,
                spam_score: selectedLead.spam_score,
                spam_reasons: selectedLead.spam_reasons,
                trashed_at: selectedLead.trashed_at,
                previous_status: selectedLead.previous_status,
              }
            : null
        }
        statusOptions={
          selectedLead.status === 'REVIEW' || selectedLead.status === 'TRASHED'
            ? []
            : selectedLead.status === 'ARCHIVED'
            ? STATUS_OPTIONS_ARCHIVED
            : selectedLead.status === 'DISABLED' ||
              selectedLead.status === 'LOST'
            ? STATUS_OPTIONS_DISABLED
            : selectedLead.status === 'NEW' ||
              selectedLead.status === 'EXPIRED' ||
              selectedLead.status === 'SEND_BACK'
            ? STATUS_OPTIONS_NEW
            : STATUS_OPTIONS_SELECT
        }
        onSubmit={handleSaveLead}
        loading={loading}
        assignableLawyers={lawyers.map((l) => ({
          id: l.id,
          name: l.name,
          services: l.services,
          activeLeads: l.activeLeads,
          maxLeads: l.maxLeads,
        }))}
        onAssign={handleSingleAssign}
        assignLoading={singleAssignLoading}
        onMarkValid={handleMarkValid}
        onMarkSpam={handleMarkSpam}
        onRestore={handleRestore}
        onTrash={handleTrash}
        onDeletePermanent={handleDeletePermanent}
        countdown={
          selectedLead.status === 'ASSIGNED' && selectedLead.date_updated ? (
            <CountdownTimer targetDate={selectedLead.date_updated} />
          ) : undefined
        }
      />

      {/* Modal: Delete confirmation */}
      <Modal
        title='Delete'
        isOpen={isOpenDelete}
        setIsOpen={setIsOpenDelete}
        className='max-w-sm'
      >
        <div className='flex flex-col gap-4'>
          <div className='flex justify-center text-center'>
            <p>
              Are you sure you want to delete the lead{' '}
              <span className='font-medium'>{selectedLead?.email}?</span>
            </p>
          </div>
          <div className='flex justify-around'>
            <Button
              name='Cancel'
              type='button'
              onClick={() => setIsOpenDelete(false)}
            />
            <Button
              name='Delete'
              type='button'
              color='bg-red-500'
              onClick={deleteLead}
            />
          </div>
        </div>
      </Modal>

      {/* Page head */}
      <PageHead
        title='Leads Manage'
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
              {filtered.length} leads
            </span>
          </div>
        }
      />

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          placeholder='Search by name, email, phone or ID...'
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {/* Fase 1 — filtros avanzados (panel inline) con contador de activos. */}
        <FilterButton
          label='Filters'
          dropdown
          active={filtersOpen}
          count={activeFilterCount > 0 ? activeFilterCount : undefined}
          aria-expanded={filtersOpen}
          aria-controls='lead-filters-panel'
          onClick={() => setFiltersOpen((o) => !o)}
        />
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        <FilterButton
          label='All'
          active={statusFilters.length === 0 && selecArray.length === 0 && !activeQueue}
          onClick={() => handleStatusClick(null)}
        />
        {uniqueStatuses.map((s) => {
          const niceLabel =
            statusSelectAll.find((it) => it.value === s)?.name ?? s;
          return (
            <FilterButton
              key={s}
              label={niceLabel}
              active={!activeQueue && statusFilters.includes(s)}
              onClick={() => handleStatusClick(s)}
            />
          );
        })}
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        <FilterButton
          label='Review'
          active={statusFilter === 'REVIEW'}
          onClick={() => handleStatusClick('REVIEW')}
        />
        <FilterButton
          label='Trash'
          active={statusFilter === 'TRASHED'}
          onClick={() => handleStatusClick('TRASHED')}
        />
        <FilterButton
          label='Archived'
          active={statusFilter === 'ARCHIVED'}
          onClick={() => handleStatusClick('ARCHIVED')}
        />

        {/* L587-09 — ventana de tiempo para leads NEW (solo con filtro NEW). */}
        {isNewFilterActive ? (
          <>
            <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
            <span className='text-[11px] font-semibold text-slate-400'>
              New within
            </span>
            {([24, 36, 48] as const).map((h) => (
              <FilterButton
                key={h}
                label={`${h}h`}
                active={newWindowHours === h}
                onClick={() => setNewWindowHours(h)}
              />
            ))}
          </>
        ) : null}

        <div className='ml-auto flex items-center gap-2'>
          <ViewToggle
            value={view}
            onChange={(v) => setView(v as 'grid' | 'list')}
            options={[
              { value: 'grid', icon: <MdGridView size={14} />, label: 'Grid view' },
              { value: 'list', icon: <MdViewList size={14} />, label: 'List view' },
            ]}
          />
        </div>
      </div>

      {activeQueue ? (
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5'>
          <span className='text-[12px] font-bold text-slate-800'>
            {activeQueue.label}
            {activeQueue.periodField ? ` · ${PERIOD_PHRASE[queuePeriod]}` : ''}
          </span>
          <span className='text-[11px] font-medium text-slate-500'>
            {activeQueue.info}
          </span>
          <span className='text-[11px] font-semibold text-slate-400'>
            Default order: {activeQueue.sort.label}
          </span>
          <button
            type='button'
            onClick={() => handleStatusClick(null)}
            className='ml-auto inline-flex items-center gap-1 rounded bg-transparent text-[11px] font-bold text-slate-600 transition-colors hover:text-customRed focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40'
          >
            <MdClose size={12} />
            Clear
          </button>
        </div>
      ) : null}

      {filtersOpen ? (
        <LeadFiltersPanel
          id='lead-filters-panel'
          idPrefix='lm-filters'
          status={{
            options: statusPanelOptions,
            value: activeQueue ? [] : regularStatusFilters,
            onChange: handlePanelStatus,
          }}
          value={advanced}
          onChange={setAdvanced}
          serviceOptions={serviceOptions}
          lawyerOptions={lawyerOptions}
          firmOptions={firmOptions}
          channelOptions={channelOptions}
        />
      ) : null}

      <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />

      {/* Table or error */}
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
          // Remonta por cola para aplicar su orden inicial.
          key={activeQueue ? `queue-${activeQueue.key}-${queuePeriod}` : 'leads'}
          columns={tableColumns}
          data={filtered}
          rowKey={(row) => row['lead id']}
          onRowClick={openLead}
          pagination={{ enabled: true, initialPageSize: 10 }}
          totalLabel='leads'
          initialSort={tableSort}
          selection={{
            getRowKey: (row) => Number(row['lead id']),
            selectedKeys: selectedIds,
            onChange: (next) => setSelectedIds(next as Set<number>),
            selectAllScope: 'page',
            ariaLabel: 'Select all leads on this page',
          }}
          emptyState={
            leadsLoading || dataLeads === null ? (
              <div
                className='flex w-full flex-col gap-2 py-2'
                aria-busy='true'
                aria-label='Loading leads'
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className='h-11 w-full animate-pulse rounded-lg bg-slate-100'
                  />
                ))}
              </div>
            ) : (
              <div className='flex flex-col items-center gap-1'>
                <span className='text-[13px] font-semibold text-slate-700'>
                  {!activeQueue || searchText.trim() || hasAdvanced
                    ? 'No leads match your filters'
                    : activeQueue.periodField
                    ? `No leads ${activeQueue.hint.toLowerCase()} ${PERIOD_PHRASE[queuePeriod]}`
                    : 'No leads in this list'}
                </span>
                <span className='text-[11px] text-slate-400'>
                  {!activeQueue || searchText.trim() || hasAdvanced
                    ? 'Adjust the search or status filters above'
                    : activeQueue.periodField
                    ? 'Try a longer period on the dashboard'
                    : 'Nothing needs attention here right now'}
                </span>
              </div>
            )
          }
        />
      )}

      {/* Sticky bulk action bar */}
      <BulkActionBar
        count={selectedIds.size}
        actions={bulkActions}
        onDeselect={clearSelection}
      />

      {/* Bulk dialogs */}
      <ConfirmationDialog
        open={bulkDialog === 'assign'}
        onClose={closeBulkDialog}
        title='Confirm bulk assignment'
        subtitle='Review the action below before confirming.'
        fields={assignFields}
        notice="This action will be recorded in each lead's history. The assigned lawyer will receive a notification."
        confirmLabel='Confirm assignment'
        onConfirm={handleConfirmAssign}
        loading={bulkLoading}
        confirmDisabled={!assignLawyerId || bulkComment.trim().length === 0}
      >
        <LawyerPicker
          lawyers={lawyers}
          loading={lawyersLoading}
          value={assignLawyerId === '' ? null : Number(assignLawyerId)}
          onChange={(id) => setAssignLawyerId(id ?? '')}
        />
        <BulkCommentField
          value={bulkComment}
          onChange={setBulkComment}
          disabled={bulkLoading}
          placeholder='Why are these leads being assigned to this lawyer?'
        />
      </ConfirmationDialog>

      <ConfirmationDialog
        open={bulkDialog === 'status'}
        onClose={closeBulkDialog}
        title='Change status'
        subtitle='Apply a new status to all selected leads.'
        fields={statusFields}
        notice='Each lead history will be updated. Lawyers may receive a notification depending on the new status.'
        confirmLabel='Apply status'
        onConfirm={handleConfirmStatus}
        loading={bulkLoading}
        confirmDisabled={!bulkStatus || bulkComment.trim().length === 0}
      >
        <div className='mb-1 flex flex-col gap-1.5'>
          <label
            htmlFor='bulk-status-select'
            className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500'
          >
            Status
          </label>
          <select
            id='bulk-status-select'
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className='h-10 w-full rounded-[9px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 transition-colors hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-customRed/20'
          >
            <option value=''>Select a status…</option>
            {BULK_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
        <BulkCommentField
          value={bulkComment}
          onChange={setBulkComment}
          disabled={bulkLoading}
          placeholder='Why is the status changing for these leads?'
        />
      </ConfirmationDialog>

      <ConfirmationDialog
        open={bulkDialog === 'archive'}
        onClose={closeBulkDialog}
        title={`Archive ${selectedIds.size} ${
          selectedIds.size === 1 ? 'lead' : 'leads'
        }`}
        subtitle='Archived leads stay in the system but are hidden from the active list.'
        fields={archiveFields}
        notice='You can restore archived leads from the Trash section at any time.'
        confirmLabel='Archive'
        onConfirm={handleConfirmArchive}
        loading={bulkLoading}
        confirmDisabled={bulkComment.trim().length === 0}
      >
        <BulkCommentField
          value={bulkComment}
          onChange={setBulkComment}
          disabled={bulkLoading}
          placeholder='Why are these leads being archived?'
        />
      </ConfirmationDialog>

      <ConfirmationDialog
        open={bulkDialog === 'delete'}
        onClose={closeBulkDialog}
        variant='danger'
        title={`Delete ${selectedIds.size} ${
          selectedIds.size === 1 ? 'lead' : 'leads'
        }`}
        subtitle='This action is permanent and cannot be undone.'
        fields={deleteFields}
        notice='Deleted leads will be moved to Trash and can be restored within the retention period. All history will be preserved.'
        confirmLabel={`Delete ${selectedIds.size} ${
          selectedIds.size === 1 ? 'lead' : 'leads'
        }`}
        onConfirm={handleConfirmDelete}
        loading={bulkLoading}
        confirmDisabled={bulkComment.trim().length === 0}
      >
        <BulkCommentField
          value={bulkComment}
          onChange={setBulkComment}
          disabled={bulkLoading}
          placeholder='Why are these leads being deleted?'
        />
      </ConfirmationDialog>

      <ConfirmationDialog
        open={bulkDialog === 'trash'}
        onClose={closeBulkDialog}
        title='Move to Trash'
        subtitle='These leads will be moved to trash and auto-purged after 30 days.'
        fields={[
          { label: 'Action', value: 'Move to trash' },
          {
            label: 'Leads affected',
            value: `${selectedIds.size} ${selectedIds.size === 1 ? 'lead' : 'leads'}`,
          },
          { label: 'IDs', value: previewIds || '—' },
        ]}
        notice='Trashed leads can be restored before the purge date.'
        confirmLabel='Move to Trash'
        onConfirm={handleConfirmTrash}
        loading={bulkLoading}
        confirmDisabled={bulkComment.trim().length === 0}
      >
        <BulkCommentField
          value={bulkComment}
          onChange={setBulkComment}
          disabled={bulkLoading}
          placeholder='Why are these leads being trashed?'
        />
      </ConfirmationDialog>
    </div>
  );
};

const LawyerPicker = ({
  lawyers,
  loading,
  value,
  onChange,
}: {
  lawyers: LawyerOption[];
  loading: boolean;
  value: number | null;
  onChange: (id: number | null) => void;
}) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lawyers;
    return lawyers.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.services.some((s) => s.toLowerCase().includes(q))
    );
  }, [lawyers, query]);

  return (
    <div className='mb-1 flex flex-col gap-1.5'>
      <label className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500'>
        Assign to lawyer
      </label>
      <input
        type='search'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='Search by name or service…'
        disabled={loading}
        className='h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:opacity-60'
      />
      <div className='max-h-[220px] overflow-y-auto rounded-md border border-slate-200 bg-white'>
        {loading ? (
          <div className='px-3 py-4 text-center text-[12px] font-medium text-slate-400'>
            Loading lawyers…
          </div>
        ) : filtered.length === 0 ? (
          <div className='px-3 py-4 text-center text-[12px] font-medium text-slate-400'>
            {lawyers.length === 0
              ? 'No active lawyers available'
              : 'No matches'}
          </div>
        ) : (
          filtered.map((l) => {
            const selected = value === l.id;
            return (
              <button
                key={l.id}
                type='button'
                onClick={() => onChange(selected ? null : l.id)}
                className={
                  'flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-b-0 ' +
                  (selected
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-800 hover:bg-slate-50')
                }
              >
                <div className='flex min-w-0 items-center gap-2.5'>
                  <span
                    className={
                      'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold ' +
                      (selected
                        ? 'bg-white/10 text-white'
                        : 'bg-slate-100 text-slate-700')
                    }
                  >
                    {l.name
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase() || '·'}
                  </span>
                  <div className='flex min-w-0 flex-col'>
                    <span className='truncate text-[12px] font-bold'>
                      {l.name}
                    </span>
                    <span
                      className={
                        'truncate text-[10px] ' +
                        (selected ? 'text-white/70' : 'text-slate-500')
                      }
                    >
                      {l.services.length > 0 ? l.services.join(', ') : 'No services'}
                    </span>
                  </div>
                </div>
                {l.maxLeads === 0 ? (
                  // Capacidad 0 → backend rechazará cualquier assign.
                  // Mostrar warning visible para que admin entienda.
                  <span
                    className={
                      'flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] ' +
                      (selected
                        ? 'bg-white/15 text-white'
                        : 'bg-red-50 text-customRed')
                    }
                    title='No max_leads configured — edit lawyer to set capacity'
                  >
                    Pending setup
                  </span>
                ) : (
                  <span
                    className={
                      'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums ' +
                      (selected
                        ? 'bg-white/15 text-white'
                        : l.activeLeads >= l.maxLeads
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600')
                    }
                  >
                    {l.activeLeads}/{l.maxLeads}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

const BulkCommentField = ({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) => (
  <div className='mt-2 flex flex-col gap-1.5'>
    <label
      htmlFor='bulk-comment'
      className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500'
    >
      Reason (required)
    </label>
    <textarea
      id='bulk-comment'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      disabled={disabled}
      placeholder={placeholder}
      className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:opacity-60'
    />
  </div>
);

export default LeadManagement;
