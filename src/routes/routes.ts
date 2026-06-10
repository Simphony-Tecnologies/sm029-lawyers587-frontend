import type { dataItem } from '@/types/routes.interface';
import {
  MdBusiness,
  MdChecklist,
  MdDashboard,
  MdNotifications,
  MdWork,
} from 'react-icons/md';

export const routesSidebar: dataItem[] = [
  {
    name: 'Dashboard',
    route: '/dashboard',
    icon: MdDashboard,
    rol: ['admin'],
    group: 'Overview',
  },
  {
    name: 'Lawyers',
    route: '/lawyer-management',
    icon: MdBusiness,
    rol: ['admin'],
    group: 'Management',
    children: [
      {
        name: 'Lawyers',
        route: '/lawyer-management',
        icon: MdChecklist,
        rol: ['admin'],
      },
      {
        name: 'Assigned leads',
        route: '/lawyer-management/assigned-leads',
        icon: MdChecklist,
        rol: ['admin'],
      },
      {
        name: 'Lost leads',
        route: '/lawyer-management/lost-leads',
        icon: MdChecklist,
        rol: ['admin'],
      },
      {
        name: 'Reassigned',
        route: '/lawyer-management/reassigned-leads',
        icon: MdChecklist,
        rol: ['admin'],
      },
    ],
  },
  {
    name: 'Leads',
    route: '/lead-management',
    icon: MdWork,
    rol: ['admin'],
    group: 'Management',
  },
  {
    name: 'My Workflow',
    route: '/dash-lawyers',
    icon: MdDashboard,
    rol: ['lawyer'],
    group: 'Overview',
    children: [
      { name: 'Dashboard', route: '/dash-lawyers', rol: ['lawyer'] },
      { name: 'My Active Leads', route: '/all-leads', rol: ['lawyer'] },
      { name: 'Waiting on Client', route: '/all-leads/waiting', rol: ['lawyer'] },
      { name: 'Flagged Leads', route: '/all-leads/flagged', rol: ['lawyer'] },
      { name: 'Retained Leads', route: '/all-leads/retained', rol: ['lawyer'] },
    ],
  },
  {
    name: 'Lead Pool',
    route: '/select-lead',
    icon: MdNotifications,
    rol: ['lawyer'],
    group: 'Management',
  },
];
