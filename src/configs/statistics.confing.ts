import { typeStatistis } from '@/types/typeStatistis.type';
import NewLeads from '@/assets/new-leads.png';
import AssignedLeads from '@/assets/assigned-leads.png';
import LeadsforReview from '@/assets/leads-for-review.png';
import DeadLeads from '@/assets/dead-leads.png';
export const statistics: typeStatistis[] = [
  {
    title: 'New Leads',
    value: 0,
    date: 'today',
    icon: NewLeads,
    color: '#8280FF',
  },
  {
    title: 'Assigned Leads',
    value: 0,
    date: 'today',
    icon: AssignedLeads,
    color: '#4AD991',
  },
  {
    title: 'Leads for Review',
    value: 0,
    date: 'today',
    icon: LeadsforReview,
    color: '#FEC53D',
  },
  {
    title: 'Dead Leads',
    value: 0,
    date: 'today',
    icon: DeadLeads,
    color: '#FF9066',
  },
];
