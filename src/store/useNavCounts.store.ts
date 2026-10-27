import { create } from 'zustand';
import { api, database } from '@/services/database';
import { adminStatusFromSlug, DEFAULT_NEW_WINDOW_HOURS } from '@/constants/leadFilters';
import { toLeadRow } from '@/store/useLead.store';

// Contadores del sidebar del admin: solo lo que espera una acción suya. Cada
// número sale del mismo endpoint y con el mismo filtro que la pantalla que abre
// ese item, así el contador coincide con lo que se ve al hacer clic. El Sidebar
// lo recalcula cada 30 s, al volver a la pestaña y tras cada escritura.

// Filtros del submenú Leads con contador (slugs de ADMIN_LEAD_FILTERS).
export const ADMIN_PENDING_LEAD_SLUGS = [
  'new',
  'flagged',
  'sent-back',
  'expired',
  'review',
] as const;
export type AdminPendingLeadSlug = (typeof ADMIN_PENDING_LEAD_SLUGS)[number];

const totalOf = (res: { success: boolean; data: { total?: number } | null }) =>
  res.success && res.data ? Number(res.data.total ?? 0) : null;

// null = la llamada falló: se conserva el último valor en vez de borrar el badge.
const countLeads = async (slug: AdminPendingLeadSlug): Promise<number | null> => {
  // Review tiene endpoint propio, igual que su pestaña dedicada.
  if (slug === 'review') return totalOf(await api.leads.review({ limit: 1 }));
  const status = adminStatusFromSlug(slug) ?? undefined;
  if (slug === 'new') {
    // La pestaña New muestra solo los NEW de la ventana sobre la fecha de
    // entrada (mismo campo que toLeadRow). El backend ordena por id DESC.
    const res = await api.leads.list({ status, limit: 1000 });
    if (!res.success || !res.data) return null;
    const cutoff = Date.now() - DEFAULT_NEW_WINDOW_HOURS * 36e5;
    return res.data.data.filter((lead) => {
      const t = toLeadRow(lead).date.getTime();
      return !Number.isNaN(t) && t >= cutoff;
    }).length;
  }
  return totalOf(await api.leads.list({ status, limit: 1 }));
};

interface NavCountsStore {
  verification: number;
  leads: Partial<Record<AdminPendingLeadSlug, number>>;
  refreshAdmin: () => Promise<void>;
}

// Si piden un refresco mientras otro está en curso (p. ej. una acción justo
// después del chequeo periódico), se repite al terminar: el último pedido
// siempre ve los datos posteriores a la acción.
let running: Promise<void> | null = null;
let rerun = false;

export const useNavCounts = create<NavCountsStore>((set, get) => ({
  verification: 0,
  leads: {},
  refreshAdmin: () => {
    if (running) {
      rerun = true;
      return running;
    }
    running = (async () => {
      do {
        rerun = false;
        const [pending, ...totals] = await Promise.all([
          database.getPendingVerifications(),
          ...ADMIN_PENDING_LEAD_SLUGS.map(countLeads),
        ]);
        const leads = { ...get().leads };
        ADMIN_PENDING_LEAD_SLUGS.forEach((slug, i) => {
          const n = totals[i];
          if (n !== null) leads[slug] = n;
        });
        set({
          verification: pending.success ? pending.data.length : get().verification,
          leads,
        });
      } while (rerun);
    })().finally(() => {
      running = null;
    });
    return running;
  },
}));
