import { create } from "zustand";
import { persist } from "zustand/middleware";

// "partner" = "Ver como Parceiro": uma lente somente-leitura que mostra os
// dados do parceiro (como se logado como ele), em vez da consolidação do casal.
export type ViewMode = "individual" | "couple" | "partner";

type UIState = {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  selectedMonth: string;
  viewMode: ViewMode;
  toggleSidebar: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setSelectedMonth: (month: string) => void;
  setViewMode: (mode: ViewMode) => void;
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
