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
    // children: [
    //   {
    //     name: 'assigned Leads',
    //     route: '/assigned-leads',
    //     icon: MdBusiness,
    //     rol: ['admin'],
    //   },
    //   {
    //     name: 'Lost Leads',
    //     route: '/lost-leads',
    //     icon: MdBusiness,
    //     rol: ['admin'],
    //   },
    //   {
    //     name: 'Reassigned Leads',
    //     route: '/reassigned-leads',
    //     icon: MdBusiness,
    //     rol: ['admin'],
    //   },
    // ],
  },

  {
    name: 'Lead Management',
    route: '/lead-management',
    icon: MdWork,
    rol: ['admin'],
  },
  {
    name: 'All Leads',
    route: '/all-leads',
    icon: MdDashboard,
    rol: ['lawyer'],
  },
];
