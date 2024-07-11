import type { dataItem } from '@/types/routes.interface';
import { MdBusiness, MdDashboard, MdWork } from 'react-icons/md';

export const routesSidebar: dataItem[] = [
  {
    name: 'Dashboard',
    route: '/dashboard',
    icon: MdDashboard,
    rol: ['admin'],
  },
  {
    name: 'Lawyer Management',
    route: '/lawyer-management',
    icon: MdBusiness,
    rol: ['admin'],
    children: [
      {
        name: 'assigned Leads',
        route: '/assigned-leads',

        rol: ['admin'],
      },
      {
        name: 'Lost Leads',
        route: '/lost-leads',

        rol: ['admin'],
      },
      {
        name: 'Reassigned Leads',
        route: '/reassigned-leads',

        rol: ['admin'],
      },
    ],
  },

  {
    name: 'Lead Management',
    route: '/lead-management',
    icon: MdWork,
    rol: ['admin'],
  },
];
