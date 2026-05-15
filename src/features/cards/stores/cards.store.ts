import { create } from "zustand";

type CardsState = {
  selectedCardId: string | null;
  selectedBillId: string | null;
  selectedBillMonth: number | null;
  selectedBillYear: number | null;
  setSelectedCard: (id: string | null) => void;
  setSelectedBill: (id: string | null, month: number | null, year: number | null) => void;
  reset: () => void;
};

export const useCardsStore = create<CardsState>((set) => ({
  selectedCardId: null,
  selectedBillId: null,
  selectedBillMonth: null,
  selectedBillYear: null,
  setSelectedCard: (id) =>
    set({ selectedCardId: id, selectedBillId: null, selectedBillMonth: null, selectedBillYear: null }),
  setSelectedBill: (id, month, year) =>
    set({ selectedBillId: id, selectedBillMonth: month, selectedBillYear: year }),
  reset: () =>
    set({ selectedCardId: null, selectedBillId: null, selectedBillMonth: null, selectedBillYear: null }),
}));
