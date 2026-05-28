import { typeStatistis } from '@/types/typeStatistis.type';
import NewLeads from '@/assets/new-leads.png';
import AssignedLeads from '@/assets/assigned-leads.png';
import LeadsforReview from '@/assets/leads-for-review.png';
import DeadLeads from '@/assets/dead-leads.png';
import Closed from '@/assets/closed-leads.png';
import Expired from '@/assets/expired-leads.png';
import Disabled from '@/assets/disabled-leads.png';
import { statusColors } from './statusColor';
export const statistics: typeStatistis[] = [
  {
    title: 'New Leads',
    value: 0,
    date: 'today',
    icon: NewLeads,
    color: statusColors.NEW,
  },
  {
    title: 'Pulled Leads',
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
    title: 'Flagged',
    value: 0,
    date: 'today',
    icon: LeadsforReview,
    color: statusColors.PROBLEMATIC,
  },
  {
    title: 'Sent Back Leads (REVIEW)',
    value: 0,
    date: 'today',
    icon: DeadLeads,
    color: statusColors.LOST,
  },
  {
    title: 'Retained',
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
  {
    title: 'Disabled',
    value: 0,
    date: 'today',
    icon: Disabled,
    color: statusColors.DISABLED,
  },
];
