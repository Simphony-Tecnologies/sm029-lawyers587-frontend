import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type useAuth = {
  user: any;
  setUser: (state: LawyerData) => void;
};

export const useAuth = create<useAuth>()(
  persist(
    (set) => ({
      user: {},
      setUser: (state: LawyerData) => set(() => ({ user: state })),
    }),
    {
      name: 'auth',
    }
  )
);
