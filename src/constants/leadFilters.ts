import type { LeadStatus } from '@/types/api.types';

// L587-01 / L587-03 — Fuente única del set + orden canónico de filtros de leads
// del abogado. La usan el submenú del sidebar (My Leads) y la filter bar de
// /all-leads, para que ambos muestren exactamente los mismos filtros, en el
// mismo orden. `status: null` = "All" (sin filtro).
export interface LeadFilterDef {
  slug: string;
  label: string;
  status: LeadStatus | null;
}

export const LAWYER_LEAD_FILTERS: LeadFilterDef[] = [
  { slug: 'all', label: 'All', status: null },
  { slug: 'assigned', label: 'Assigned (New)', status: 'ASSIGNED' },
  { slug: 'in-progress', label: 'In Progress', status: 'IN PROGRESS' },
  { slug: 'waiting', label: 'Waiting on Client', status: 'WAITING_ON_CLIENT' },
  { slug: 'flagged', label: 'Flagged', status: 'PROBLEMATIC' },
  { slug: 'retained', label: 'Retained', status: 'CLOSED' },
  { slug: 'disabled', label: 'Disabled', status: 'DISABLED' },
];

// Traduce el slug de la URL (?status=<slug>) al código de estado del backend.
// Devuelve null para "all" o slugs desconocidos (= sin filtro).
export const statusFromSlug = (slug?: string | null): LeadStatus | null => {
  if (!slug || slug === 'all') return null;
  return LAWYER_LEAD_FILTERS.find((f) => f.slug === slug)?.status ?? null;
};

// L587-05 / L587-06 — Fuente única de la regla de visibilidad de contacto.
// El teléfono y el correo del lead solo se muestran al abogado cuando el lead
// está en In Progress / Waiting on Client / Retained. El admin siempre los ve.
export const CONTACT_VISIBLE_STATUSES: LeadStatus[] = [
  'IN PROGRESS',
  'WAITING_ON_CLIENT',
  'CLOSED',
];

export const canViewLeadContact = (
  status: string | null | undefined,
  isAdmin: boolean
): boolean =>
  isAdmin ||
  CONTACT_VISIBLE_STATUSES.includes(
    String(status ?? '').toUpperCase() as LeadStatus
  );

// L587-10 — Set + orden canónico de filtros de leads del admin. Lo usan el
// submenú del sidebar (Lead Management) y la filter bar de /lead-management,
// para que compartan slugs y la URL sea la única fuente de verdad. Incluye las
// vistas dedicadas (Review/Trash/Archived), que son status reales del backend.
export const ADMIN_LEAD_FILTERS: LeadFilterDef[] = [
  { slug: 'all', label: 'All', status: null },
  { slug: 'new', label: 'New', status: 'NEW' },
  { slug: 'assigned', label: 'Assigned', status: 'ASSIGNED' },
  { slug: 'in-progress', label: 'In Progress', status: 'IN PROGRESS' },
  { slug: 'waiting', label: 'Waiting on Client', status: 'WAITING_ON_CLIENT' },
  { slug: 'flagged', label: 'Flagged', status: 'PROBLEMATIC' },
  { slug: 'sent-back', label: 'Sent Back', status: 'LOST' },
  { slug: 'retained', label: 'Retained', status: 'CLOSED' },
  { slug: 'disabled', label: 'Disabled', status: 'DISABLED' },
  { slug: 'expired', label: 'Expired', status: 'EXPIRED' },
  { slug: 'review', label: 'Review', status: 'REVIEW' },
  { slug: 'trash', label: 'Trash', status: 'TRASHED' },
  { slug: 'archived', label: 'Archived', status: 'ARCHIVED' },
];

export const adminStatusFromSlug = (slug?: string | null): LeadStatus | null => {
  if (!slug || slug === 'all') return null;
  return ADMIN_LEAD_FILTERS.find((f) => f.slug === slug)?.status ?? null;
};

export const adminSlugFromStatus = (status?: string | null): string => {
  if (!status) return 'all';
  const up = String(status).toUpperCase();
  return ADMIN_LEAD_FILTERS.find((f) => f.status === up)?.slug ?? 'all';
};
