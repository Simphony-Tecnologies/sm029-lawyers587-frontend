import { create } from 'zustand';
import { api } from '@/services/database';

// L587-02 — Fuente única del conteo de leads en estado ASSIGNED del abogado.
// El badge del sidebar (submenú "My Leads") y el de la filter bar leen de aquí,
// garantizando el mismo valor. `AllLeads` actualiza el conteo con setCount tras
// cada fetch (se refleja sin recargar al cambiar de estado o tomar un lead);
// el Sidebar lo siembra con fetchCount al montar en cualquier página del rol.
interface AssignedLeadsStore {
  count: number;
  setCount: (n: number) => void;
  fetchCount: (lawyerId: number) => Promise<void>;
}

export const useAssignedLeads = create<AssignedLeadsStore>((set) => ({
  count: 0,
  setCount: (n) => set({ count: n }),
  fetchCount: async (lawyerId) => {
    const res = await api.leads.list({ assigned_to: lawyerId, limit: 1000 });
    if (res.success && res.data) {
      set({
        count: res.data.data.filter((l) => l.status === 'ASSIGNED').length,
      });
    }
  },
}));
