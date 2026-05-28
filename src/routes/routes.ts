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
    name: 'My workflow',
    route: '/dash-lawyers',
    icon: MdDashboard,
    rol: ['lawyer'],
    group: 'Overview',
  },
  {
    name: 'All Leads',
    route: '/all-leads',
    icon: MdWork,
    rol: ['lawyer'],
    group: 'Management',
  },
  {
    name: 'New Leads',
    route: '/select-lead',
    icon: MdNotifications,
    rol: ['lawyer'],
    group: 'Management',
  },
];
