import type { dataItem } from '@/types/routes.interface';
import {
  MdBusiness,
  MdChecklist,
  MdDashboard,
  MdDomain,
  MdNotifications,
  MdShield,
  MdSmartToy,
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
    // L587-10 — "Leads" despliega el submenú de filtros del admin. Cada hijo
    // abre /lead-management?status=<slug>; el orden es el canónico de
    // ADMIN_LEAD_FILTERS.
    name: 'Leads',
    route: '/lead-management',
    icon: MdWork,
    rol: ['admin'],
    group: 'Management',
    children: [
      { name: 'All', route: '/lead-management?status=all', rol: ['admin'] },
      { name: 'New', route: '/lead-management?status=new', rol: ['admin'] },
      { name: 'Assigned', route: '/lead-management?status=assigned', rol: ['admin'] },
      { name: 'In Progress', route: '/lead-management?status=in-progress', rol: ['admin'] },
      { name: 'Waiting on Client', route: '/lead-management?status=waiting', rol: ['admin'] },
      { name: 'Flagged', route: '/lead-management?status=flagged', rol: ['admin'] },
      { name: 'Sent Back', route: '/lead-management?status=sent-back', rol: ['admin'] },
      { name: 'Retained', route: '/lead-management?status=retained', rol: ['admin'] },
      { name: 'Disabled', route: '/lead-management?status=disabled', rol: ['admin'] },
      { name: 'Expired', route: '/lead-management?status=expired', rol: ['admin'] },
      { name: 'Review', route: '/lead-management?status=review', rol: ['admin'] },
      { name: 'Trash', route: '/lead-management?status=trash', rol: ['admin'] },
      { name: 'Archived', route: '/lead-management?status=archived', rol: ['admin'] },
    ],
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
    name: 'Chatbot',
    route: '/chatbot-settings',
    icon: MdSmartToy,
    rol: ['admin'],
    gate: 'global_admin',
    group: 'Management',
  },
  {
    name: 'Dashboard',
    route: '/dash-lawyers',
    icon: MdDashboard,
    rol: ['lawyer'],
    group: 'Overview',
  },
  {
    // L587-01 — "My Leads" despliega el submenú de filtros. Cada hijo abre
    // /all-leads?status=<slug>; el orden es el canónico de LAWYER_LEAD_FILTERS.
    name: 'My Leads',
    route: '/all-leads',
    icon: MdWork,
    rol: ['lawyer'],
    group: 'Overview',
    children: [
      { name: 'All', route: '/all-leads?status=all', rol: ['lawyer'] },
      { name: 'Assigned (New)', route: '/all-leads?status=assigned', rol: ['lawyer'] },
      { name: 'In Progress', route: '/all-leads?status=in-progress', rol: ['lawyer'] },
      { name: 'Waiting on Client', route: '/all-leads?status=waiting', rol: ['lawyer'] },
      { name: 'Flagged', route: '/all-leads?status=flagged', rol: ['lawyer'] },
      { name: 'Retained', route: '/all-leads?status=retained', rol: ['lawyer'] },
      { name: 'Disabled', route: '/all-leads?status=disabled', rol: ['lawyer'] },
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
