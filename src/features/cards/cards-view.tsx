"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { SplitPaneView } from "@/components/shared/split-pane-view";
import { CardList } from "./components/card-list";
import { BillList } from "./components/bill-list";
import { BillDetail } from "./components/bill-detail";
import { useCardsStore } from "./stores/cards.store";

export function CardsView() {
  const { reset } = useCardsStore();
  const [mobilePane, setMobilePane] = useState<string>("cards");

  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  // Avança o pane mobile quando o usuário seleciona cartão/fatura. Assinatura
  // direta da store (em vez de useEffect sobre os valores) pra disparar o
  // setState como reação ao evento externo, não durante o render.
  useEffect(() => {
    return useCardsStore.subscribe((state, prev) => {
      if (state.selectedCardId && state.selectedCardId !== prev.selectedCardId) {
        setMobilePane("bills");
      }
      if (state.selectedBillMonth && state.selectedBillMonth !== prev.selectedBillMonth) {
        setMobilePane("detail");
      }
    });
  }, []);

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
