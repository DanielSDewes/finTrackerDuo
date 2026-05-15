import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { UserProfile, Couple } from "@/types";

type AuthState = {
  user: UserProfile | null;
  couple: Couple | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setCouple: (couple: Couple | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        couple: null,
        isLoading: true,
        setUser: (user) => set({ user }),
        setCouple: (couple) => set({ couple }),
        setLoading: (isLoading) => set({ isLoading }),
        reset: () => set({ user: null, couple: null, isLoading: false }),
      }),
      {
        name: "fintracker-auth",
        partialize: (state) => ({ user: state.user }),
      }
    )
  )
);
