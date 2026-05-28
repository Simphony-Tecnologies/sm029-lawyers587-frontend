export type LeadStatusKey =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'PROBLEMATIC'
  | 'CLOSED'
  | 'LOST'
  | 'EXPIRED'
  | 'DISABLED';

export interface LeadStatusMeta {
  label: string;
  dotClass: string;
  textClass: string;
  badgeBgClass: string;
  triggerClass: string;
  triggerHoverClass: string;
  triggerMetaClass: string;
}

export const LEAD_STATUS_META: Record<LeadStatusKey, LeadStatusMeta> = {
  NEW: {
    label: 'New',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    badgeBgClass: 'bg-emerald-50',
    triggerClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    triggerHoverClass: 'hover:bg-emerald-100 hover:border-emerald-300',
    triggerMetaClass: 'text-emerald-700/70',
  },
  ASSIGNED: {
    label: 'Assigned',
    dotClass: 'bg-sky-500',
    textClass: 'text-sky-700',
    badgeBgClass: 'bg-sky-50',
    triggerClass: 'bg-sky-50 border-sky-200 text-sky-700',
    triggerHoverClass: 'hover:bg-sky-100 hover:border-sky-300',
    triggerMetaClass: 'text-sky-700/70',
  },
  'IN PROGRESS': {
    label: 'In progress',
    dotClass: 'bg-sky-500',
    textClass: 'text-sky-700',
    badgeBgClass: 'bg-sky-50',
    triggerClass: 'bg-sky-50 border-sky-200 text-sky-700',
    triggerHoverClass: 'hover:bg-sky-100 hover:border-sky-300',
    triggerMetaClass: 'text-sky-700/70',
  },
  PROBLEMATIC: {
    label: 'Flagged',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    badgeBgClass: 'bg-amber-50',
    triggerClass: 'bg-amber-50 border-amber-200 text-amber-700',
    triggerHoverClass: 'hover:bg-amber-100 hover:border-amber-300',
    triggerMetaClass: 'text-amber-700/70',
  },
  CLOSED: {
    label: 'Retained',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700',
    badgeBgClass: 'bg-emerald-50',
    triggerClass: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    triggerHoverClass: 'hover:bg-emerald-100 hover:border-emerald-300',
    triggerMetaClass: 'text-emerald-700/70',
  },
  LOST: {
    label: 'Sent back',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-600',
    badgeBgClass: 'bg-rose-50',
    triggerClass: 'bg-rose-50 border-rose-200 text-rose-600',
    triggerHoverClass: 'hover:bg-rose-100 hover:border-rose-300',
    triggerMetaClass: 'text-rose-600/70',
  },
  EXPIRED: {
    label: 'Expired',
    dotClass: 'bg-stone-400',
    textClass: 'text-stone-600',
    badgeBgClass: 'bg-stone-100',
    triggerClass: 'bg-stone-50 border-stone-200 text-stone-600',
    triggerHoverClass: 'hover:bg-stone-100 hover:border-stone-300',
    triggerMetaClass: 'text-stone-500',
  },
  DISABLED: {
    label: 'Disabled',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-500',
    badgeBgClass: 'bg-slate-100',
    triggerClass: 'bg-slate-50 border-slate-200 text-slate-600',
    triggerHoverClass: 'hover:bg-slate-100 hover:border-slate-300',
    triggerMetaClass: 'text-slate-500',
  },
};

export const getLeadStatusMeta = (raw?: string): LeadStatusMeta => {
  const key = (raw ?? '').toUpperCase() as LeadStatusKey;
  return LEAD_STATUS_META[key] ?? LEAD_STATUS_META.DISABLED;
};

// Statuses que requieren razón obligatoria — alineado con backend
// (PROBLEMATIC y SEND_BACK validan `comment` server-side; LOST implica unassign).
const REASON_REQUIRED_STATUSES = new Set(['LOST', 'PROBLEMATIC', 'SEND_BACK']);

export const isDestructiveStatus = (raw?: string): boolean =>
  REASON_REQUIRED_STATUSES.has((raw ?? '').toUpperCase());
