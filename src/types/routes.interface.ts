export type rol = 'admin' | 'lawyer';
import { IconType } from 'react-icons';
export type NavGroup = 'Overview' | 'Management';
export interface dataItem {
  name: string;
  route: string;
  icon?: IconType;
  rol: rol[];
  group?: NavGroup;
  children?: dataItem[];
}
