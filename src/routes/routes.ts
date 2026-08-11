import type { dataItem } from '@/types/routes.interface';
import {
  MdBusiness,
  MdChecklist,
  MdDashboard,
  MdDomain,
  MdNotifications,
  MdShield,
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
        name: 'Verification',
        route: '/lawyer-management/verification',
        icon: MdChecklist,
        rol: ['admin'],
      },
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
      // Reassigned: oculto del nav hasta que el backend lo soporte.
      // No existe action_type 'reassign' ni endpoint global de auditoría para
      // listar leads reasignados, y el DTO del lead no trae previous_lawyer_id.
      // Descomentar cuando el backend exponga el endpoint. Ver docs/BARRIDO-UI-UX-ADMIN.md
      // {
      //   name: 'Reassigned',
      //   route: '/lawyer-management/reassigned-leads',
      //   icon: MdChecklist,
      //   rol: ['admin'],
      // },
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
    name: 'Spam Settings',
    route: '/spam-settings',
    icon: MdShield,
    rol: ['admin'],
    group: 'Management',
  },
  {
    name: 'Notifications',
    route: '/notification-settings',
    icon: MdNotifications,
    rol: ['admin'],
    group: 'Management',
  },
  {
    name: 'Firms',
    route: '/firm-admin',
    icon: MdDomain,
    rol: ['admin'],
    gate: 'global_admin',
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
  {
    name: 'My Firm',
    route: '/my-firm',
    icon: MdDomain,
    rol: ['lawyer'],
    gate: 'firm',
    group: 'Management',
    children: [
      { name: 'Overview', route: '/my-firm', rol: ['lawyer'], gate: 'firm' },
      {
        name: 'Members',
        route: '/my-firm/members',
        rol: ['lawyer'],
        gate: 'firm_admin',
      },
      {
        name: 'Settings',
        route: '/my-firm/settings',
        rol: ['lawyer'],
        gate: 'firm_admin',
      },
      {
        name: 'Firm Leads',
        route: '/my-firm/leads',
        rol: ['lawyer'],
        gate: 'firm_admin',
      },
    ],
  },
];
