export type rol = 'admin' | 'lawyer';
import { IconType } from 'react-icons';
export type NavGroup = 'Overview' | 'Management';

// Gating fino además del rol (Activity 25). El Sidebar evalúa esto contra los
// flags del lawyer del login: 'firm' → firm_id != null · 'firm_admin' →
// is_firm_admin === true · 'global_admin' → role.name === 'admin'.
export type NavGate = 'firm' | 'firm_admin' | 'global_admin';

export interface dataItem {
  name: string;
  route: string;
  icon?: IconType;
  rol: rol[];
  group?: NavGroup;
  gate?: NavGate;
  children?: dataItem[];
}
