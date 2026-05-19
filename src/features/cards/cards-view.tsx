"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { SplitPaneView } from "@/components/shared/split-pane-view";
import { CardList } from "./components/card-list";
import { BillList } from "./components/bill-list";
import { BillDetail } from "./components/bill-detail";
import { useCardsStore } from "./stores/cards.store";

export function CardsView() {
  const { reset, selectedCardId, selectedBillMonth } = useCardsStore();
  const [mobilePane, setMobilePane] = useState<string>("cards");

  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  useEffect(() => {
    if (selectedCardId) setMobilePane("bills");
  }, [selectedCardId]);

  useEffect(() => {
    if (selectedBillMonth) setMobilePane("detail");
  }, [selectedBillMonth]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Cartões de Crédito"
        subtitle="Gerencie cartões, faturas e parcelamentos"
      />
      <SplitPaneView
        mobilePane={mobilePane}
        onMobilePaneChange={setMobilePane}
        panes={[
          { id: "cards", label: "Cartões", width: "280px", content: <CardList /> },
          { id: "bills", label: "Faturas", width: "260px", content: <BillList /> },
          { id: "detail", label: "Lançamentos", width: "1fr", content: <BillDetail /> },
        ]}
      />
    </div>
  );
}
