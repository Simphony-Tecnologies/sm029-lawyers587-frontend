export type rol = 'admin' | 'lawyer';
import { IconType } from 'react-icons';
export interface dataItem {
  name: string;
  route: string;
  icon?: IconType;
  rol: rol[];
  children?: dataItem[];
}
