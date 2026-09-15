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
