import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  selectedMonth: string;
  viewMode: "individual" | "couple";
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setSelectedMonth: (month: string) => void;
  setViewMode: (mode: "individual" | "couple") => void;
};

const currentMonth = new Date().toISOString().slice(0, 7);

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      selectedMonth: currentMonth,
      viewMode: "individual",
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarMobileOpen: (sidebarMobileOpen) => set({ sidebarMobileOpen }),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: "fintracker-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        viewMode: state.viewMode,
      }),
    }
  )
);
