import { typeCards } from '@/types/typeStatictis.type';
import NewLeads from '@/assets/new-leads.png';
import AssignedLeads from '@/assets/assigned-leads.png';
import LeadsforReview from '@/assets/leads-for-review.png';
import DeadLeads from '@/assets/dead-leads.png';
export const statistics: typeCards[] = [
  {
    title: 'New Leads',
    value: 200,
    date: 'Last 24 hours',
    icon: NewLeads,
    color: '#8280FF',
  },
  {
    title: 'Assigned Leads',
    value: 50,
    date: 'Last update - Today 15:00',
    icon: AssignedLeads,
    color: '#4AD991',
  },
  {
    title: 'Leads for Review',
    value: 30,
    date: 'Last update - Today 18:00',
    icon: LeadsforReview,
    color: '#FEC53D',
  },
  {
    title: 'Dead Leads',
    value: 20,
    date: 'Last update - Today 12:00',
    icon: DeadLeads,
    color: '#FF9066',
  },
];
