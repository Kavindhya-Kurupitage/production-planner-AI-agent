import { create } from "zustand";

interface UiState {
  userName: string;
  sidebarOpen: boolean;
  setUserName: (value: string) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  userName: "Operations Manager",
  sidebarOpen: true,
  setUserName: (value) => set({ userName: value }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}));
