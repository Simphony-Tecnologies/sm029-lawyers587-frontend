// store/useLeadsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LeadsStore {
  columns: string[];
  dataLeads: any;
  error: string | null;
  fetchLeads: () => Promise<void>;
}

export const useLeadsStore = create<LeadsStore>((set) => ({
  columns: [],
  dataLeads: null,
  error: null,
  fetchLeads: async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL_LEADS}`;
      const response = await fetch(url);
      const leadsData = await response.json();

      if (!leadsData.success) {
        throw new Error('Failed to fetch leads data');
      }

      const data = leadsData.data.map((lead: any) => ({
        'lead id': lead.id,
        date: new Date(lead.created_at),
        date_updated: new Date(lead.updated_at),
        'lead name': lead.full_name,
        email: lead.email,
        'phone number': lead.number,
        service: lead.lawyer_type,
        'description lead': lead.description,
        comments: lead.comments,
        status: lead.status,
      }));

      set({
        columns: Object.keys(data[0]),
        dataLeads: data,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching leads data:', err);
      set({
        error: 'There was an error loading the data. Please try again later.',
      });
    }
  },
}));
