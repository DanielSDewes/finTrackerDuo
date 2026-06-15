"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, CreditCard, Receipt, Loader2 } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { spendSearchService } from "./spend-search.service";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Período padrão: últimos 6 meses (a partir do dia 1) até hoje. Janela ampla o
// suficiente para "quanto gastei com X" sem precisar configurar nada.
function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  from.setDate(1);
  return { from: toISODate(from), to: toISODate(to) };
}

type Preset = { label: string; range: () => { from: string; to: string } };

const PRESETS: Preset[] = [
  {
    label: "Mês atual",
    range: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISODate(from), to: toISODate(now) };
    },
  },
  {
    label: "3 meses",
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - 3);
      from.setDate(1);
      return { from: toISODate(from), to: toISODate(to) };
    },
  },
  {
    label: "6 meses",
    range: defaultRange,
  },
  {
    label: "Este ano",
    range: () => {
      const now = new Date();
      return { from: toISODate(new Date(now.getFullYear(), 0, 1)), to: toISODate(now) };
    },
  },
];

export function SpendSearchView() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();

  const initial = defaultRange();
  const [term, setTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);

  // Consulta efetivamente aplicada (set no submit). Mantém a busca separada da
  // digitação, evitando disparar a query a cada tecla.
  const [applied, setApplied] = useState<{ term: string; from: string; to: string } | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["spend-search", scopeKey, applied?.term, applied?.from, applied?.to],
    queryFn: () =>
      spendSearchService.searchSpend(
        user!.id,
        couple?.id ?? null,
        applied!.term,
        applied!.from,
        applied!.to,
        isShared,
      ),
    enabled: !!user && !!applied && applied.term.trim().length > 0,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    setApplied({ term: term.trim(), from: dateFrom, to: dateTo });
  };

  const applyPreset = (preset: Preset) => {
    const { from, to } = preset.range();
    setDateFrom(from);
    setDateTo(to);
    // Se já existe um termo, re-aplica imediatamente com o novo período.
    if (term.trim()) setApplied({ term: term.trim(), from, to });
  };

  const hasResults = !!data && data.items.length > 0;
  const searching = isLoading || isFetching;

  return (
    <div>
      <Header
        title="Buscar gastos"
        subtitle="Totalize quanto você gastou com algo, somando cartão e transações"
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filtros */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="term">O que você procura</Label>
                  <Input
                    id="term"
                    placeholder="Ex: Paladar, Uber, farmácia..."
                    leftIcon={<Search />}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="from">De</Label>
                  <Input
                    id="from"
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="sm:w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">Até</Label>
                  <Input
                    id="to"
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="sm:w-40"
                  />
                </div>
                <Button type="submit" disabled={!term.trim() || searching} className="shrink-0">
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Buscar
                </Button>
              </div>

              {/* Atalhos de período */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide mr-0.5">
                  Período
                </span>
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Resultados */}
        {!applied ? (
          <EmptyState
            icon={Search}
            variant="full"
            title="Informe um termo e um período"
            description="A busca soma o que você gastou com esse termo em transações e no cartão."
          />
        ) : searching ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !hasResults ? (
          <EmptyState
            icon={Search}
            variant="full"
            title={`Nenhum gasto encontrado para "${applied.term}"`}
            description="Tente outro termo ou amplie o período."
          />
        ) : (
          <>
            {/* Total */}
            <Card className="border-[hsl(var(--expense)/0.3)]">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                      Total com &ldquo;{applied.term}&rdquo;
                    </p>
                    <p className="text-3xl font-bold text-[hsl(var(--expense))] tabular-nums">
                      {formatCurrency(data.total)}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      {data.items.length} lançament{data.items.length === 1 ? "o" : "os"}
                      {" · "}
                      {formatDate(applied.from)} – {formatDate(applied.to)}
                    </p>
                  </div>
                  <div className="flex gap-6 sm:gap-8">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end text-[hsl(var(--muted-foreground))]">
                        <Receipt className="w-3.5 h-3.5" />
                        <span className="text-xs">Transações</span>
                      </div>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatCurrency(data.transactionsTotal)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end text-[hsl(var(--muted-foreground))]">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="text-xs">Cartão</span>
                      </div>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatCurrency(data.cardsTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de lançamentos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lançamentos</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-0.5 max-h-[560px] overflow-y-auto pr-0.5">
                  {data.items.map((item) => (
                    <div
                      key={`${item.source}-${item.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          item.source === "card"
                            ? "bg-[hsl(var(--primary)/0.1)]"
                            : "bg-[hsl(var(--expense)/0.1)]",
                        )}
                      >
                        {item.source === "card" ? (
                          <CreditCard className="w-4 h-4 text-[hsl(var(--primary))]" />
                        ) : (
                          <Receipt className="w-4 h-4 text-[hsl(var(--expense))]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{item.description}</p>
                          <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
                            {item.source === "card" ? "cartão" : "transação"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {formatDate(item.date)}
                          </span>
                          {item.categoryName && (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              · {item.categoryName}
                            </span>
                          )}
                          {item.cardName && (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              · {item.cardName}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[hsl(var(--expense))] shrink-0 tabular-nums">
                        -{formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
