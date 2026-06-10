import { create } from 'zustand';

type status =
  | 'NEW'
  | 'ASSIGNED'
  | 'PROBLEMATIC'
  | 'IN PROGRESS'
  | 'LOST'
  | 'EXPIRED'
  | 'DISABLED'
  | 'WAITING_ON_CLIENT';
type typeSelectStatus = {
  selecArray: status[];
  setSelecArray: (state: status[]) => void;
};
export const useSelectStatus = create<typeSelectStatus>((set) => ({
  selecArray: [],
  setSelecArray: (state: status[]) => set(() => ({ selecArray: state })),
}));
