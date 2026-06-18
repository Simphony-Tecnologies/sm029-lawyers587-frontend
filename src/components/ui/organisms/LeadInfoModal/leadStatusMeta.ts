export type LeadStatusKey =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'PROBLEMATIC'
  | 'WAITING_ON_CLIENT'
  | 'CLOSED'
  | 'LOST'
  | 'EXPIRED'
  | 'DISABLED'
  | 'REVIEW'
  | 'TRASHED';

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
  WAITING_ON_CLIENT: {
    label: 'Waiting on Client',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    badgeBgClass: 'bg-orange-50',
    triggerClass: 'bg-orange-50 border-orange-200 text-orange-700',
    triggerHoverClass: 'hover:bg-orange-100 hover:border-orange-300',
    triggerMetaClass: 'text-orange-700/70',
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
  REVIEW: {
    label: 'Review',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    badgeBgClass: 'bg-amber-50',
    triggerClass: 'bg-amber-50 border-amber-200 text-amber-700',
    triggerHoverClass: 'hover:bg-amber-100 hover:border-amber-300',
    triggerMetaClass: 'text-amber-700/70',
  },
  TRASHED: {
    label: 'Trashed',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700',
    badgeBgClass: 'bg-red-50',
    triggerClass: 'bg-red-50 border-red-200 text-red-700',
    triggerHoverClass: 'hover:bg-red-100 hover:border-red-300',
    triggerMetaClass: 'text-red-700/70',
  },
};

export const getLeadStatusMeta = (raw?: string): LeadStatusMeta => {
  const key = (raw ?? '').toUpperCase() as LeadStatusKey;
  return LEAD_STATUS_META[key] ?? LEAD_STATUS_META.DISABLED;
};

// Friendly labels for machine-generated spam reason codes.
export const SPAM_REASON_LABELS: Record<string, string> = {
  blacklisted_email: 'Blacklisted Email',
  blacklisted_domain: 'Blacklisted Domain',
  suspicious_field: 'Suspicious Content',
  duplicate_email: 'Duplicate Submission',
};

export const SPAM_REASON_TONE: Record<string, string> = {
  blacklisted_email: 'bg-red-50 text-red-700',
  blacklisted_domain: 'bg-red-50 text-red-700',
  suspicious_field: 'bg-amber-50 text-amber-700',
  duplicate_email: 'bg-yellow-50 text-yellow-700',
};

export const SPAM_SCORE_META: Record<number, { label: string; tone: string }> = {
  1: { label: 'Low', tone: 'bg-yellow-50 text-yellow-700' },
  2: { label: 'Medium', tone: 'bg-amber-50 text-amber-700' },
  3: { label: 'High', tone: 'bg-red-50 text-red-700' },
};

// Auto-purge period in days (matches backend TRASH_RETENTION_DAYS).
export const TRASH_PURGE_DAYS = 30;

// Statuses que requieren razón obligatoria — alineado con backend.
const REASON_REQUIRED_STATUSES = new Set(['LOST', 'PROBLEMATIC', 'SEND_BACK', 'WAITING_ON_CLIENT']);

export const isReasonRequired = (raw?: string): boolean =>
  REASON_REQUIRED_STATUSES.has((raw ?? '').toUpperCase());

// Destructive = permanent/unassign action. Red warning + "do not contact" toggle.
const DESTRUCTIVE_STATUSES = new Set(['LOST', 'SEND_BACK']);

export const isDestructiveStatus = (raw?: string): boolean =>
  DESTRUCTIVE_STATUSES.has((raw ?? '').toUpperCase());
