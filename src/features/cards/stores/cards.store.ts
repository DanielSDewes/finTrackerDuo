import { create } from "zustand";

type CardsState = {
  selectedCardId: string | null;
  selectedCardOwnerId: string | null; // user_id of the card's creator (owner)
  selectedBillId: string | null;
  selectedBillMonth: number | null;
  selectedBillYear: number | null;
  setSelectedCard: (id: string | null, ownerId?: string | null) => void;
  setSelectedBill: (id: string | null, month: number | null, year: number | null) => void;
  reset: () => void;
};

export const useCardsStore = create<CardsState>((set) => ({
  selectedCardId: null,
  selectedCardOwnerId: null,
  selectedBillId: null,
  selectedBillMonth: null,
  selectedBillYear: null,
  setSelectedCard: (id, ownerId = null) =>
    set({ selectedCardId: id, selectedCardOwnerId: ownerId, selectedBillId: null, selectedBillMonth: null, selectedBillYear: null }),
  setSelectedBill: (id, month, year) =>
    set({ selectedBillId: id, selectedBillMonth: month, selectedBillYear: year }),
  reset: () =>
    set({ selectedCardId: null, selectedCardOwnerId: null, selectedBillId: null, selectedBillMonth: null, selectedBillYear: null }),
}));
