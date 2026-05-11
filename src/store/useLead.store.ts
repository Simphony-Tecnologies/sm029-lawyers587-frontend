// store/useLeadsStore.ts
import { api } from '@/services/database';
import type { LeadDTO, LeadFilters } from '@/types/api.types';
import { create } from 'zustand';

interface LeadsStore {
  columns: string[];
  dataLeads: any;
  total: number;
  loading: boolean;
  error: string | null;
  fetchLeads: (filters?: LeadFilters) => Promise<void>;
}

const pickName = (lead: any): string =>
  lead?.fullName ?? lead?.full_name ?? '';

const pickPhone = (lead: any): string =>
  lead?.phone ?? lead?.phone_number ?? lead?.number ?? '';

const pickService = (lead: any): string =>
  lead?.service ?? lead?.lawyer_type ?? '';

const pickLawyerName = (lead: any): string => {
  const dto = lead?.assigned_lawyer;
  if (dto?.firstName || dto?.lastName) {
    return `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim();
  }
  return 'No assigned';
};

const toRow = (lead: LeadDTO | any) => ({
  'lead id': lead.id,
  date: new Date(lead.created_at ?? lead.entry_date),
  date_updated: new Date(lead.updated_at ?? lead.created_at ?? lead.entry_date),
  'lead name': pickName(lead),
  email: lead.email ?? '',
  'phone number': pickPhone(lead),
  service: pickService(lead),
  'description lead': lead.description ?? '',
  comments: lead.comments ?? '',
  lawyer: pickLawyerName(lead),
  status: lead.status,
  assigned_lawyer_id: lead.assigned_lawyer_id ?? null,
});

export const useLeadsStore = create<LeadsStore>((set) => ({
  columns: [],
  dataLeads: null,
  total: 0,
  loading: false,
  error: null,
  fetchLeads: async (filters?: LeadFilters) => {
    set({ loading: true, error: null });
    const res = await api.leads.list({ limit: 10000, ...(filters || {}) });
    if (!res.success || !res.data) {
      set({
        loading: false,
        error: res.message || 'There are no new leads, please try again later.',
      });
      return;
    }
    const rows = res.data.data.map(toRow);
    set({
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
      dataLeads: rows,
      total: res.data.total,
      loading: false,
      error: null,
    });
  },
}));
