import { create } from "zustand";

type GoalsState = {
  selectedGoalId: string | null;
  setSelectedGoal: (id: string | null) => void;
  reset: () => void;
};

export const useGoalsStore = create<GoalsState>((set) => ({
  selectedGoalId: null,
  setSelectedGoal: (id) => set({ selectedGoalId: id }),
  reset: () => set({ selectedGoalId: null }),
}));
