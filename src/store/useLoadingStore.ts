import { create } from 'zustand';

type LoadingState = {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
};

const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: true,
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

export default useLoadingStore;
