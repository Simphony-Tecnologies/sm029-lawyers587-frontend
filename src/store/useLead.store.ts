// store/useLeadsStore.ts
import { database } from '@/services/database';
import { create } from 'zustand';

interface LeadsStore {
  columns: string[];
  dataLeads: any;
  error: string | null;
  fetchLeads: () => Promise<void>;
}

const pickName = (lead: any): string =>
  lead?.fullName ?? lead?.full_name ?? '';

const pickPhone = (lead: any): string =>
  lead?.phone ?? lead?.phone_number ?? lead?.number ?? '';

const pickService = (lead: any): string =>
  lead?.service ?? lead?.lawyer_type ?? '';

const pickLawyerName = (lead: any, fallback: string): string => {
  const dto = lead?.assigned_lawyer;
  if (dto?.firstName || dto?.lastName) {
    return `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim();
  }
  return fallback;
};

export const useLeadsStore = create<LeadsStore>((set) => ({
  columns: [],
  dataLeads: null,
  error: null,
  fetchLeads: async () => {
    try {
      const leadsRes = await database.getData(
        `${process.env.NEXT_PUBLIC_URL}/leads?limit=10000`
      );
      if (!leadsRes.success) {
        throw new Error('Failed to fetch leads data');
      }

      const lawyersAssignedRes = await database.fetchData(
        `${process.env.NEXT_PUBLIC_URL}/leads-assigned`
      );
      const lawyersAssigned = Array.isArray(lawyersAssignedRes?.data)
        ? lawyersAssignedRes.data
        : Array.isArray(lawyersAssignedRes?.data?.data)
        ? lawyersAssignedRes.data.data
        : [];

      const data = (leadsRes.data as any[]).map((lead: any) => ({
        'lead id': lead.id,
        date: new Date(lead.created_at),
        date_updated: new Date(lead.updated_at ?? lead.created_at),
        'lead name': pickName(lead),
        email: lead.email ?? '',
        'phone number': pickPhone(lead),
        service: pickService(lead),
        'description lead': lead.description ?? '',
        comments: lead.comments ?? '',
        lawyer: pickLawyerName(lead, 'No assigned'),
        status: lead.status,
      }));

      const updatedDataLeads = data.map((items: any) => {
        if (items.lawyer && items.lawyer !== 'No assigned') return items;
        const match = lawyersAssigned.find(
          (entry: any) => entry?.lead === items['lead id']
        );
        return {
          ...items,
          lawyer: match?.lawyer
            ? `${match.lawyer.firstName ?? ''} ${match.lawyer.lastName ?? ''}`.trim()
            : 'Not assigned',
        };
      });

      set({
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        dataLeads: updatedDataLeads,
        error: '',
      });
    } catch (err) {
      console.log('Error fetching leads data:', err);
      set({
        error: 'There are no new leads, please try again later.',
      });
    }
  },
}));
