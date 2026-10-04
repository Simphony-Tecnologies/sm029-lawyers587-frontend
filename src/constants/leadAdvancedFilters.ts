import dayjs from 'dayjs';
import type { LeadScore } from '@/types/api.types';

// Fase 1 — filtros avanzados de leads (Lead Management, My Leads).
// Fuente única de: claves de la URL (mismos nombres que el contrato A1 del
// backend), parseo/serialización, conteo y predicado client-side. Las listas
// del admin y del abogado filtran en el cliente sobre las filas ya cargadas
// (igual que las colas del dashboard); combinan todo con AND.

export interface LeadAdvancedFilters {
  /** Áreas de derecho (lawyer_type exacto). */
  services: string[];
  /** Ids de abogado (string) o 'none' = sin asignación vigente. */
  assigned: string[];
  /** Ids de firma (string). */
  firms: string[];
  /** 'chatbot' | 'web_form'. */
  sources: string[];
  /** Canal de adquisición derivado (utm/referrer). */
  channels: string[];
  /** YYYY-MM-DD, día local, inclusive. Entry date = created_at. */
  entryFrom: string;
  entryTo: string;
  /** YYYY-MM-DD, día local, inclusive. Pull date = assigned_at. */
  pullFrom: string;
  pullTo: string;
  scores: LeadScore[];
}

export const EMPTY_ADVANCED_FILTERS: LeadAdvancedFilters = {
  services: [],
  assigned: [],
  firms: [],
  sources: [],
  channels: [],
  entryFrom: '',
  entryTo: '',
  pullFrom: '',
  pullTo: '',
  scores: [],
};

type ListKey = 'services' | 'assigned' | 'firms' | 'sources' | 'channels' | 'scores';
type DateKey = 'entryFrom' | 'entryTo' | 'pullFrom' | 'pullTo';

/** Nombre del parámetro en la URL (= nombre del parámetro del contrato A1). */
export const ADVANCED_PARAM: Record<ListKey | DateKey, string> = {
  services: 'service',
  assigned: 'assigned_to',
  firms: 'firm_id',
  sources: 'source',
  channels: 'channel',
  scores: 'score',
  entryFrom: 'date_from',
  entryTo: 'date_to',
  pullFrom: 'pull_from',
  pullTo: 'pull_to',
};

const LIST_KEYS: ListKey[] = ['services', 'assigned', 'firms', 'sources', 'channels', 'scores'];
const DATE_KEYS: DateKey[] = ['entryFrom', 'entryTo', 'pullFrom', 'pullTo'];

export const UNASSIGNED_VALUE = 'none';
export const SCORE_VALUES: LeadScore[] = ['high', 'medium', 'low', 'spam'];

/** Opciones del filtro Score (labels del documento vendido). */
export const SCORE_OPTIONS: { value: LeadScore; label: string; hint?: string }[] = [
  { value: 'high', label: 'High urgency', hint: '4–5' },
  { value: 'medium', label: 'Medium', hint: '3' },
  { value: 'low', label: 'Low', hint: '1–2' },
  { value: 'spam', label: 'Possible spam' },
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

interface ParamsLike {
  get: (key: string) => string | null;
  getAll: (key: string) => string[];
}

/**
 * Lee un multivalor de la URL. Acepta parámetros repetidos (`?service=A&service=B`,
 * formato que escribe la app) y, salvo en `service` (los nombres pueden llevar
 * comas), también la lista separada por comas del contrato (`?score=high,low`).
 */
export const readListParam = (params: ParamsLike, key: string): string[] => {
  const raw = params.getAll(key);
  const values = key === ADVANCED_PARAM.services ? raw : raw.flatMap((v) => v.split(','));
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
};

export const parseAdvancedFilters = (params: ParamsLike): LeadAdvancedFilters => {
  const next: LeadAdvancedFilters = { ...EMPTY_ADVANCED_FILTERS };
  for (const key of LIST_KEYS) {
    const values = readListParam(params, ADVANCED_PARAM[key]);
    if (key === 'scores') {
      next.scores = values.filter((v): v is LeadScore => (SCORE_VALUES as string[]).includes(v));
    } else {
      next[key] = values;
    }
  }
  for (const key of DATE_KEYS) {
    const v = (params.get(ADVANCED_PARAM[key]) ?? '').trim();
    next[key] = ISO_DAY.test(v) ? v : '';
  }
  return next;
};

/** Escribe (o borra) los filtros avanzados en `params`; el resto de claves no se toca. */
export const writeAdvancedFilters = (params: URLSearchParams, filters: LeadAdvancedFilters): void => {
  for (const key of LIST_KEYS) {
    const name = ADVANCED_PARAM[key];
    params.delete(name);
    for (const v of filters[key]) params.append(name, v);
  }
  for (const key of DATE_KEYS) {
    const name = ADVANCED_PARAM[key];
    if (filters[key]) params.set(name, filters[key]);
    else params.delete(name);
  }
};

/** Número de campos del panel con algún valor (los rangos de fecha cuentan 1). */
export const countAdvancedFilters = (f: LeadAdvancedFilters): number =>
  LIST_KEYS.filter((k) => f[k].length > 0).length +
  (f.entryFrom || f.entryTo ? 1 : 0) +
  (f.pullFrom || f.pullTo ? 1 : 0);

export const hasAdvancedFilters = (f: LeadAdvancedFilters): boolean => countAdvancedFilters(f) > 0;

// ── Score ────────────────────────────────────────────────────────────────────

/** Bucket de urgencia IA: 4–5 high, 3 medium, 1–2 low. */
export const urgencyBucket = (urgency?: number | null): Exclude<LeadScore, 'spam'> | null => {
  const n = Number(urgency);
  if (urgency === null || urgency === undefined || !Number.isFinite(n) || n <= 0) return null;
  if (n >= 4) return 'high';
  if (n >= 3) return 'medium';
  return 'low';
};

export const isPossibleSpam = (spamScore?: number | null): boolean => Number(spamScore ?? 0) >= 1;

export const matchesScores = (
  row: { ai_urgency?: number | null; spam_score?: number | null },
  scores: LeadScore[]
): boolean => {
  if (scores.length === 0) return true;
  const bucket = urgencyBucket(row.ai_urgency);
  return scores.some((s) => (s === 'spam' ? isPossibleSpam(row.spam_score) : s === bucket));
};

/** Valor de orden para la columna Score: urgencia 1–5; spam sin urgencia queda debajo. */
export const scoreSortValue = (row: { ai_urgency?: number | null; spam_score?: number | null }): number => {
  const n = Number(row.ai_urgency);
  if (Number.isFinite(n) && n > 0) return n;
  return isPossibleSpam(row.spam_score) ? 0.5 : 0;
};

// ── Predicado client-side ───────────────────────────────────────────────────

/** Campos de una fila que usan los filtros avanzados (cada pantalla mapea los suyos). */
export interface AdvancedFilterRow {
  service: string;
  assignedId: number | null;
  firmId?: number | null;
  /** 'chatbot' | 'web_form' (tal como se muestra la fila). */
  source: string;
  channel: string;
  entryDate: Date | string | null;
  pullDate?: Date | string | null;
  ai_urgency?: number | null;
  spam_score?: number | null;
}

const toTime = (value: Date | string | null | undefined): number =>
  value instanceof Date ? value.getTime() : value ? new Date(value).getTime() : NaN;

const inDayRange = (value: Date | string | null | undefined, from: string, to: string): boolean => {
  if (!from && !to) return true;
  const t = toTime(value);
  if (Number.isNaN(t)) return false;
  if (from && t < dayjs(from).startOf('day').valueOf()) return false;
  if (to && t > dayjs(to).endOf('day').valueOf()) return false;
  return true;
};

export const matchesAdvancedFilters = (row: AdvancedFilterRow, f: LeadAdvancedFilters): boolean => {
  if (f.services.length > 0 && !f.services.includes(row.service)) return false;
  if (f.assigned.length > 0) {
    const key = row.assignedId ? String(row.assignedId) : UNASSIGNED_VALUE;
    if (!f.assigned.includes(key)) return false;
  }
  if (f.firms.length > 0) {
    if (row.firmId === null || row.firmId === undefined) return false;
    if (!f.firms.includes(String(row.firmId))) return false;
  }
  if (f.sources.length > 0 && !f.sources.includes(row.source)) return false;
  if (f.channels.length > 0 && !f.channels.includes(row.channel || 'unknown')) return false;
  if (!inDayRange(row.entryDate, f.entryFrom, f.entryTo)) return false;
  // Contrato A1: las asignaciones sin fecha quedan fuera al usar pull date.
  if ((f.pullFrom || f.pullTo) && !inDayRange(row.pullDate ?? null, f.pullFrom, f.pullTo)) return false;
  if (!matchesScores(row, f.scores)) return false;
  return true;
};

/** Fecha corta para chips y CSV ("Oct 4, 2026"). */
export const formatFilterDay = (isoDay: string): string => dayjs(isoDay).format('MMM D, YYYY');
