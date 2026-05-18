"use client";

import { useEffect } from "react";
import { SplitPaneView } from "@/components/shared/split-pane-view";
import { CardList } from "./components/card-list";
import { BillList } from "./components/bill-list";
import { BillDetail } from "./components/bill-detail";
import { useCardsStore } from "./stores/cards.store";

export function CardsView() {
  const { reset } = useCardsStore();

  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  return (
    <SplitPaneView
      panes={[
        { id: "cards", label: "Cartões", width: "280px", content: <CardList /> },
        { id: "bills", label: "Faturas", width: "260px", content: <BillList /> },
        { id: "detail", label: "Lançamentos", width: "1fr", content: <BillDetail /> },
      ]}
    />
  );
}
