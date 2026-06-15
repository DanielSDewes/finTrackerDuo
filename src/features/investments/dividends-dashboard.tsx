"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Coins, CalendarDays, TrendingUp, Percent, Download } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { investmentsService } from "@/services/investments.service";
import { formatCurrency, formatDate, formatMonth, formatNumber } from "@/lib/utils";
import { downloadCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DIVIDEND_COLOR = "hsl(var(--info))";

type DividendsDashboardProps = {
  totalInvested: number;
  totalCurrent: number;
};

/** Constrói as chaves "YYYY-MM" dos últimos 12 meses, do mais antigo ao atual. */
function last12MonthKeys(): string[] {
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

export function DividendsDashboard({ totalInvested, totalCurrent }: DividendsDashboardProps) {
  const { user, couple, isShared, scopeKey } = useScopeFilter();

  const { data: dividends = [], isLoading } = useQuery({
    queryKey: ["investment-dividends-all", scopeKey],
    queryFn: () => investmentsService.getAllDividends(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const monthKeys = last12MonthKeys();
    const byMonth = new Map<string, number>(monthKeys.map((k) => [k, 0]));
    const byAsset = new Map<string, number>();

    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const currentYear = String(now.getFullYear());

    let totalMonth = 0;
    let totalYear = 0;
    let last12Total = 0;

    for (const d of dividends) {
      const monthKey = d.received_at.slice(0, 7);
      if (byMonth.has(monthKey)) {
        byMonth.set(monthKey, byMonth.get(monthKey)! + d.amount);
        last12Total += d.amount;
      }
      if (monthKey === currentMonthKey) totalMonth += d.amount;
      if (d.received_at.slice(0, 4) === currentYear) totalYear += d.amount;
      byAsset.set(d.assetName, (byAsset.get(d.assetName) ?? 0) + d.amount);
    }

    const monthly = monthKeys.map((k) => ({
      month: formatMonth(k + "-01"),
      value: byMonth.get(k) ?? 0,
    }));

    const topAssets = Array.from(byAsset.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const assetTotal = topAssets.reduce((s, a) => s + a.value, 0);

    return {
      totalMonth,
      totalYear,
      avgMonthly: last12Total / 12,
      // DY/YoC sobre os últimos 12 meses: anualizam os proventos contra o valor
      // atual (DY) e o custo de aquisição (Yield on Cost).
      dividendYield: totalCurrent > 0 ? (last12Total / totalCurrent) * 100 : 0,
      yieldOnCost: totalInvested > 0 ? (last12Total / totalInvested) * 100 : 0,
      monthly,
      topAssets,
      assetTotal,
      hasAny: dividends.length > 0,
    };
  }, [dividends, totalCurrent, totalInvested]);

  const cards = [
    { label: "Recebido no mês", value: stats.totalMonth, icon: CalendarDays },
    { label: "Recebido no ano", value: stats.totalYear, icon: Coins },
    { label: "Média mensal (12m)", value: stats.avgMonthly, icon: TrendingUp },
  ];

  const handleExport = () => {
    const headers = ["Data", "Ativo", "Valor", "Observação"];
    const rows = dividends.map((d) => [formatDate(d.received_at), d.assetName, d.amount, d.notes ?? ""]);
    downloadCsv(`proventos-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold flex items-center gap-2">
          <Coins className="w-4 h-4 text-[hsl(var(--info))]" />
          Proventos
        </h2>
        {stats.hasAny && (
          <Button variant="outline" size="sm" className="h-7 px-3 text-xs gap-1.5" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !stats.hasAny ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhum provento lançado ainda. Lance dividendos na tela de detalhes de cada ativo.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Indicadores */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                    <c.icon className="w-3.5 h-3.5" />
                    <p className="text-xs font-medium">{c.label}</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-[hsl(var(--info))]">
                    {formatCurrency(c.value)}
                  </p>
                </CardContent>
              </Card>
            ))}
            {[
              { label: "Dividend Yield (12m)", value: stats.dividendYield },
              { label: "Yield on Cost (12m)", value: stats.yieldOnCost },
            ].map((c) => (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    <p className="text-xs font-medium">{c.label}</p>
                  </div>
                  <p className="text-lg font-bold tabular-nums">
                    {formatNumber(c.value, 2)}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Proventos por mês */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Proventos por mês — 12 meses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${formatNumber(Number(v), 0)}`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                      formatter={(v) => [formatCurrency(Number(v)), "Proventos"]}
                    />
                    <Bar dataKey="value" fill={DIVIDEND_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top ativos por provento */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por ativo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topAssets.map((a) => {
                    const pct = stats.assetTotal > 0 ? (a.value / stats.assetTotal) * 100 : 0;
                    return (
                      <div key={a.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="truncate">{a.name}</span>
                          <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                            {formatCurrency(a.value)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[hsl(var(--info))] transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
