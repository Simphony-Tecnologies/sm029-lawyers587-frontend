import { typeStatistis } from '@/types/typeStatistis.type';
import NewLeads from '@/assets/new-leads.png';
import AssignedLeads from '@/assets/assigned-leads.png';
import LeadsforReview from '@/assets/leads-for-review.png';
import DeadLeads from '@/assets/dead-leads.png';
import Closed from '@/assets/closed-leads.png';
import Expired from '@/assets/expired-leads.png';
import { statusColors } from './statusColor';
export const statistics: typeStatistis[] = [
  {
    title: 'Avalible Leads',
    value: '0 of 0',
    date: 'today',
    icon: NewLeads,
    color: statusColors.NEW,
  },
  {
    title: 'Assigned Leads',
    value: 0,
    date: 'today',
    icon: NewLeads,
    color: statusColors.NEW,
  },
  {
    title: 'In Progress',
    value: 0,
    date: 'today',
    icon: AssignedLeads,
    color: statusColors['IN PROGRESS'],
  },
  {
    title: 'Problematic',
    value: 0,
    date: 'today',
    icon: LeadsforReview,
    color: statusColors.PROBLEMATIC,
  },
  {
    title: 'Send back Leads',
    value: 0,
    date: 'today',
    icon: DeadLeads,
    color: statusColors.LOST,
  },
  {
    title: 'Closed',
    value: 0,
    date: 'today',
    icon: Closed,
    color: statusColors.CLOSED,
  },
  {
    title: 'Expired',
    value: 0,
    date: 'today',
    icon: Expired,
    color: statusColors.EXPIRED,
  },
];
