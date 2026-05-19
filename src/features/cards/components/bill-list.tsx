"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import { cardsService } from "../services/cards.service";
import { useCardsStore } from "../stores/cards.store";
import { useAuthStore } from "@/stores/auth.store";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { BILL_STATUS_META } from "../types";
import type { CreditCardBill } from "../types";
import { cn, formatCurrency } from "@/lib/utils";

const MONTHS_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function buildMonthWindow(bills: CreditCardBill[]) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const billMap = new Map(bills.map((b) => [`${b.year}-${b.month}`, b]));

  const months: { month: number; year: number; bill: CreditCardBill | null; label: string }[] = [];

  for (let offset = -6; offset <= 6; offset++) {
    const raw = currentMonth + offset - 1;
    const month = ((raw % 12) + 12) % 12 + 1;
    const year = currentYear + Math.floor(raw / 12);
    const bill = billMap.get(`${year}-${month}`) ?? null;
    months.push({ month, year, bill, label: `${MONTHS_PT[month - 1]} ${year}` });
  }

  return months;
}

export function BillList() {
  const { selectedCardId, selectedCardOwnerId, selectedBillId, selectedBillMonth, selectedBillYear, setSelectedBill } = useCardsStore();
  const { user } = useAuthStore();
  const isCardOwner = !!user && user.id === selectedCardOwnerId;

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["bills", selectedCardId],
    queryFn: () => cardsService.getBills(selectedCardId!),
    enabled: !!selectedCardId,
  });

  if (!selectedCardId) {
    return (
      <EmptyState
        variant="full"
        icon={Receipt}
        title="Selecione um cartão"
        description="Escolha um cartão para ver as faturas"
      />
    );
  }

  const months = buildMonthWindow(bills);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
        <Receipt className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm">Faturas</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : (
          months.map(({ month, year, bill, label }) => {
            const key = `${year}-${month}`;
            const isCurrentMonth = key === currentMonthKey;
            const isSelected = selectedBillId === bill?.id || (selectedBillMonth === month && selectedBillYear === year);
            const status = bill?.status;
            const meta = status ? BILL_STATUS_META[status] : null;

            return (
              <button
                key={key}
                onClick={() => setSelectedBill(bill?.id ?? null, month, year)}
                className={cn(
                  "relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                  "hover:bg-accent hover:translate-x-0.5",
                  isSelected
                    ? "bg-primary/15 border-2 border-primary shadow-md shadow-primary/15 hover:translate-x-0 ring-2 ring-primary/20"
                    : "bg-muted/30 border-2 border-transparent",
                )}
              >
                {isSelected && (
                  <motion.div
                    layoutId="selectedBillBar"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    !bill && "bg-muted-foreground/30",
                  )} style={meta ? { background: meta.color } : undefined} />
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      isSelected && "text-primary font-bold",
                      isCurrentMonth && !isSelected && "font-semibold",
                    )}>
                      {label}
                      {isCurrentMonth && (
                        <span className="ml-1.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          atual
                        </span>
                      )}
                    </p>
                    {meta && (
                      <p className="text-xs text-muted-foreground">{meta.label}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {bill ? (() => {
                    const userAmt = isCardOwner
                      ? (bill.owner_amount ?? bill.total_amount)
                      : (bill.partner_amount ?? 0);
                    const showTotal = bill.total_amount !== userAmt && bill.total_amount > 0;
                    return (
                      <>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatCurrency(userAmt)}
                        </p>
                        {showTotal && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            total {formatCurrency(bill.total_amount)}
                          </p>
                        )}
                      </>
                    );
                  })() : (
                    <p className="text-xs text-muted-foreground">sem fatura</p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
