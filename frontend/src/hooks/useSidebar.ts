import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { create } from "zustand";

type SidebarState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen }))
}));

export function useSidebar() {
  const location = useLocation();
  const { isOpen, open, close, toggle } = useSidebarStore();

  useEffect(() => {
    if (!isOpen) return;
    close();
  }, [location.pathname, isOpen, close]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isOpen) {
        close();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, close]);

  return { isOpen, open, close, toggle };
}
