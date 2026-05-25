"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, Euro } from "lucide-react";
import { quotesService } from "@/services/quotes.service";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";

const ICONS = {
  USD: DollarSign,
  EUR: Euro,
} as const;

export function CurrencyStrip() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["quotes", "currencies"],
    queryFn: () => quotesService.getCurrencies(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isError) {
    return (
      <div className="text-xs text-muted-foreground p-3 rounded-xl border border-border/40">
        Não foi possível carregar a cotação do dólar/euro.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {isLoading || data.length === 0
        ? Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-7 w-28" />
              </CardContent>
            </Card>
          ))
        : data.map((q) => {
            const Icon = ICONS[q.code] ?? DollarSign;
            const up = q.variation >= 0;
            return (
              <Card key={q.code} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {q.code} → BRL
                    </p>
                    <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xl font-bold tabular-nums">
                    {q.buy != null ? formatCurrency(q.buy) : "—"}
                  </p>
                  <p
                    className={`text-[11px] font-medium mt-0.5 flex items-center gap-1 ${
                      up ? "text-success" : "text-expense"
                    }`}
                  >
                    {up ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {up ? "+" : ""}
                    {formatNumber(q.variation, 2)}% hoje
                  </p>
                </CardContent>
              </Card>
            );
          })}
    </div>
  );
}
