import { create } from 'zustand';

type status = 'hidden' | 'fixed right-0 grid';
type typeMobileStatus = {
  statusMobile: status;
  setStatusMobile: (state: status) => void;
  toggleStatus: boolean;
  setToggleStatus: (state: boolean) => void;
};
export const useMobileStatus = create<typeMobileStatus>((set) => ({
  statusMobile: 'hidden',
  setStatusMobile: (state: status) => set(() => ({ statusMobile: state })),
  toggleStatus: true,
  setToggleStatus: (state: boolean) => set(() => ({ toggleStatus: state })),
}));
