"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PiggyBank, Search, CalendarRange, Repeat } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Primeiro dia do mês atual (YYYY-MM-DD) — fronteira do recorte padrão. As
 *  datas das transações são string YYYY-MM-DD, então a comparação é textual. */
function currentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function InvestmentContributions() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ["investment-contributions", scopeKey],
    queryFn: () =>
      transactionsService.getInvestmentTransactions(user!.id, couple?.id ?? null, isShared),
    enabled: !!user,
  });

  const monthStart = useMemo(() => currentMonthStart(), []);
  const term = search.trim().toLowerCase();
  // Buscar implica "todos os tempos": com termo digitado (ou o toggle ligado)
  // ignoramos o recorte do mês atual e varremos o histórico inteiro.
  const allTime = showAll || term.length > 0;

  const visible = useMemo(
    () =>
      contributions.filter((t) => {
        if (!allTime && t.date < monthStart) return false;
        if (term) {
          const haystack = `${t.description} ${t.notes ?? ""} ${t.account?.name ?? ""}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      }),
    [contributions, allTime, monthStart, term],
  );

  const total = visible.reduce((s, t) => s + t.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-primary" />
              Aportes
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Despesas na categoria &ldquo;Investimento&rdquo;.{" "}
              {allTime ? "Todos os períodos." : "Deste mês em diante."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">
              {allTime ? "Total investido" : "A investir deste mês em diante"}
            </p>
            <p className="text-xl font-bold tabular-nums text-primary">{formatCurrency(total)}</p>
            <p className="text-[11px] text-muted-foreground">
              {visible.length} {visible.length === 1 ? "lançamento" : "lançamentos"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Busca (todos os tempos) + alternância de período */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aportes de todos os tempos..."
              className="pl-9 h-9"
            />
          </div>
          <Button
            type="button"
            variant={showAll ? "default" : "outline"}
            size="sm"
            className="h-9 px-3 text-xs gap-1.5"
            onClick={() => setShowAll((v) => !v)}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            {showAll ? "Mês atual" : "Ver todos"}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-30" />
            {term
              ? "Nenhum aporte encontrado para a busca."
              : allTime
                ? "Nenhum aporte registrado na categoria “Investimento”."
                : "Nenhum aporte deste mês em diante. Use “Ver todos” para o histórico."}
          </div>
        ) : (
          <div className="overflow-auto max-h-96 rounded-lg border border-border/40">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Data</th>
                  <th className="px-3 py-2 text-left font-medium">Descrição</th>
                  <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Conta</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{t.description}</span>
                        {t.is_recurring && (
                          <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                        {t.is_installment && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {t.installment_number}/{t.installment_total}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                      {t.account?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
