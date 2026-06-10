"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, DollarSign, Euro, Clock } from "lucide-react";
import { quotesService } from "@/services/quotes.service";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ICONS = {
  USD: DollarSign,
  EUR: Euro,
} as const;

export function CurrencyStrip() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["quotes", "currencies"],
    queryFn: () => quotesService.getCurrencies(),
    // O cron atualiza a tabela uma vez por dia (limitação do plano Hobby
    // da Vercel). 1 hora de staleTime é mais do que suficiente para evitar
    // re-fetches do Supabase enquanto o usuário navega, sem deixar a UI
    // engessada caso a cotação mude e o usuário continue logado.
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isError) {
    return (
      <div className="text-xs text-muted-foreground p-3 rounded-xl border border-border/40">
        Não foi possível carregar a cotação do dólar/euro.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-7 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Tabela vazia — cron ainda não rodou para popular esta moeda.
  if (data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3 rounded-xl border border-dashed border-border/40 text-center">
        Cotação ainda não foi sincronizada. O job diário roda às 12:00 UTC
        (09:00 BRT) e grava aqui no banco.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map((q) => {
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
              <div className="flex items-center justify-between mt-0.5 gap-2">
                <p
                  className={`text-[11px] font-medium flex items-center gap-1 ${
                    up ? "text-success" : "text-expense"
                  }`}
                >
                  {up ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {up ? "+" : ""}
                  {formatNumber(q.variation, 2)}%
                </p>
                {/* Mostra quando a cotação foi gravada no banco — deixa explícito
                    que o número é do snapshot diário, não tempo real. */}
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 tabular-nums">
                  <Clock className="w-2.5 h-2.5" />
                  {formatUpdatedAt(q.updated_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
