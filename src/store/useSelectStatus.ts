import { create } from 'zustand';

type status =
  | 'NEW'
  | 'ASSIGNED'
  | 'PROBLEMATIC'
  | 'IN PROGRESS'
  | 'LOST'
  | 'EXPIRED'
  | 'DISABLE';
type typeSelectStatus = {
  selecArray: status[];
  setSelecArray: (state: status[]) => void;
};
export const useSelectStatus = create<typeSelectStatus>((set) => ({
  selecArray: [],
  setSelecArray: (state: status[]) => set(() => ({ selecArray: state })),
}));
