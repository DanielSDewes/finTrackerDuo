"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <>
      {/* Desktop: 3 painéis lado a lado */}
      <div className="hidden lg:grid lg:grid-cols-[280px_260px_1fr] h-full divide-x divide-border/50">
        <div className="overflow-hidden">
          <CardList />
        </div>
        <div className="overflow-hidden">
          <BillList />
        </div>
        <div className="overflow-hidden">
          <BillDetail />
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden flex flex-col h-full">
        <Tabs defaultValue="cards" className="flex flex-col h-full overflow-hidden">
          <TabsList className="mx-4 mt-4 shrink-0 w-[calc(100%-2rem)]">
            <TabsTrigger value="cards" className="flex-1">Cartões</TabsTrigger>
            <TabsTrigger value="bills" className="flex-1">Faturas</TabsTrigger>
            <TabsTrigger value="detail" className="flex-1">Lançamentos</TabsTrigger>
          </TabsList>
          <TabsContent value="cards" className="flex-1 overflow-hidden mt-2 data-[state=inactive]:hidden">
            <CardList />
          </TabsContent>
          <TabsContent value="bills" className="flex-1 overflow-hidden mt-2 data-[state=inactive]:hidden">
            <BillList />
          </TabsContent>
          <TabsContent value="detail" className="flex-1 overflow-hidden mt-2 data-[state=inactive]:hidden">
            <BillDetail />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
