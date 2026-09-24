import dayjs from 'dayjs';
import type { LeadStatus } from '@/types/api.types';
import type { PeriodKey } from '@/components/ui';

// Dashboard sep-2026 (spec del cliente: "What each current-work card counts
// and opens"). Fuente ÚNICA de las colas del dashboard: el conteo de cada card
// y la lista que abre en Lead Management usan la misma definición y el mismo
// predicado (`rowMatchesQueue`), para que cada card abra exactamente los
// registros que cuenta.

export type LeadQueueKey =
  | 'new'
  | 'assigned'
  | 'in-progress'
  | 'waiting'
  | 'returned'
  | 'flagged'
  | 'received'
  | 'retained';

/** Campo temporal de la fila: alta del lead, última actualización o evento del audit log. */
export type LeadQueueSortField = 'created' | 'updated' | 'event';

export interface LeadQueueDef {
  key: LeadQueueKey;
  label: string;
  /** Subtítulo corto de la card. En las cards de período se completa con el período. */
  hint: string;
  /** Tooltip (ⓘ): qué cuenta exactamente la card. */
  info: string;
  /** Status que cuenta la cola. `null` = cualquier status del listado. */
  statuses: LeadStatus[] | null;
  /** Solo cards de resultados: campo que se compara contra el inicio del período. */
  periodField?: 'created' | 'updated';
  sort: { field: LeadQueueSortField; direction: 'asc' | 'desc'; label: string };
  /** Colas que necesitan la razón / el abogado previo desde el audit log. */
  context?: 'returned' | 'flagged';
}

// Colas "Work right now": estado actual, sin ventana de tiempo (incluye leads
// viejos que siguen necesitando atención).
export const WORK_QUEUES: LeadQueueDef[] = [
  {
    key: 'new',
    label: 'New',
    hint: 'Needs assignment',
    info: 'Leads in New status waiting to be assigned to a lawyer, including older ones.',
    statuses: ['NEW'],
    sort: { field: 'created', direction: 'asc', label: 'Oldest first' },
  },
  {
    key: 'assigned',
    label: 'Assigned',
    hint: 'Lawyer has not started',
    info: 'Assigned to a lawyer who has not started work yet. If the lawyer does not act, the lead expires about 48h after assignment.',
    statuses: ['ASSIGNED'],
    // El cron expira ASSIGNED a COALESCE(updated_at, created_at) + 48h:
    // updated_at ascendente = deadline más cercano primero.
    sort: { field: 'updated', direction: 'asc', label: 'Nearest assignment deadline first' },
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    hint: 'Lawyer has started',
    info: 'Leads currently In Progress. Waiting on Client is counted separately.',
    statuses: ['IN PROGRESS'],
    sort: { field: 'updated', direction: 'asc', label: 'Longest since last update first' },
  },
  {
    key: 'waiting',
    label: 'Waiting on Client',
    hint: 'Reply or documents needed',
    info: 'Leads waiting for a client response or information.',
    statuses: ['WAITING_ON_CLIENT'],
    sort: { field: 'updated', direction: 'asc', label: 'Longest waiting first' },
  },
  {
    key: 'returned',
    label: 'Returned to Admin',
    hint: 'Review and reassign',
    info: 'Leads a lawyer sent back or marked as lost, and leads that expired after 48h without action. They await an admin decision.',
    // SEND_BACK / LOST: devueltos por el abogado. EXPIRED: devuelto por el
    // sistema tras 48h sin acción. DISABLED (segunda expiración) es terminal y
    // queda fuera de "work right now".
    statuses: ['SEND_BACK', 'LOST', 'EXPIRED'],
    sort: { field: 'event', direction: 'asc', label: 'Longest waiting first' },
    context: 'returned',
  },
  {
    key: 'flagged',
    label: 'Flagged',
    hint: 'Problem needs review',
    info: 'Leads with an unresolved issue. Resolving the flag removes the lead from this list.',
    statuses: ['PROBLEMATIC'],
    sort: { field: 'event', direction: 'asc', label: 'Oldest flag first' },
    context: 'flagged',
  },
];

// Cards "Results for this period": el PeriodSelect solo afecta a estas dos.
export const PERIOD_QUEUES: LeadQueueDef[] = [
  {
    key: 'received',
    label: 'Leads Received',
    hint: 'Received',
    info: 'Leads that came in during the selected period. Leads in spam review, archived or in trash are not included.',
    statuses: null,
    periodField: 'created',
    sort: { field: 'created', direction: 'desc', label: 'Newest first' },
  },
  {
    key: 'retained',
    label: 'Clients Retained',
    hint: 'Retained',
    info: 'Retained leads whose last update falls in the selected period. Archived leads are not included.',
    statuses: ['CLOSED'],
    // El DTO no trae fecha de cierre: se usa updated_at, que el BE también
    // actualiza en cualquier PUT posterior sobre el lead CLOSED (aproximación
    // hasta que el BE exponga closed_at).
    periodField: 'updated',
    sort: { field: 'updated', direction: 'desc', label: 'Most recently retained first' },
  },
];

const ALL_QUEUES = [...WORK_QUEUES, ...PERIOD_QUEUES];

export const findLeadQueue = (key?: string | null): LeadQueueDef | null =>
  ALL_QUEUES.find((q) => q.key === key) ?? null;

export const PERIOD_PHRASE: Record<PeriodKey, string> = {
  today: 'today',
  week: 'this week',
  month: 'this month',
  all: 'to date',
};

/** `since` exacto que viaja en la URL (?since=ISO) para que la lista use el mismo instante que la card. */
export const parseSince = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const isPeriodKey = (value?: string | null): value is PeriodKey =>
  value === 'today' || value === 'week' || value === 'month' || value === 'all';

/** Inicio calendario del período en la hora local (hoy, semana, mes). `null` = all time. */
export const periodStart = (key: PeriodKey, now: Date = new Date()): Date | null => {
  if (key === 'all') return null;
  const unit = key === 'today' ? 'day' : key;
  return dayjs(now).startOf(unit).toDate();
};

type QueueRowLike = {
  status?: string | null;
  date?: Date | string | null;
  date_updated?: Date | string | null;
};

const toMs = (value: Date | string | null | undefined): number =>
  value instanceof Date ? value.getTime() : new Date(value ?? NaN).getTime();

/** Predicado único card ⇄ lista. `since` solo aplica a las colas con `periodField`. */
export const rowMatchesQueue = (
  queue: LeadQueueDef,
  row: QueueRowLike,
  since: Date | null
): boolean => {
  if (
    queue.statuses &&
    !queue.statuses.includes(String(row.status ?? '').toUpperCase() as LeadStatus)
  ) {
    return false;
  }
  if (queue.periodField && since) {
    const t = toMs(queue.periodField === 'created' ? row.date : row.date_updated);
    if (Number.isNaN(t) || t < since.getTime()) return false;
  }
  return true;
};
