"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Pencil, Receipt, Percent } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { investmentsService } from "@/services/investments.service";
import { formatCurrency, formatPercent, formatNumber, CHART_COLORS } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { InvestmentForm } from "./investment-form";
import { AssetDetailDialog } from "./asset-detail-dialog";
import { CurrencyStrip } from "./currency-strip";
import type { Investment } from "@/types";

const assetClassLabels: Record<string, string> = {
  fixed_income: "Renda Fixa",
  variable_income: "Renda Variável",
  crypto: "Criptomoedas",
  real_estate: "Fundos Imobiliários",
  other: "Outros",
};

export function InvestmentsView() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();

  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [detailInvestment, setDetailInvestment] = useState<Investment | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["investment-summary", scopeKey],
    queryFn: () => investmentsService.getPortfolioSummary(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => investmentsService.deleteInvestment(id),
    invalidateKeys: [["investment-summary"]],
    successMessage: "Investimento removido",
    errorMessage: "Erro ao remover investimento",
  });

  const pieData = summary
    ? Object.entries(summary.byClass)
        .filter(([, value]) => value > 0)
        .map(([key, value], i) => ({
          name: assetClassLabels[key],
          value,
          color: CHART_COLORS[i % CHART_COLORS.length],
        }))
    : [];

  const profitLoss = (summary?.totalCurrent ?? 0) - (summary?.totalInvested ?? 0);
  const isProfitable = profitLoss >= 0;

  return (
    <div>
      <Header title="Investimentos" subtitle="Acompanhe seu portfólio de investimentos" />

      <div className="p-4 sm:p-6 space-y-6">
        <CurrencyStrip />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              title: "Total Investido",
              value: summary?.totalInvested ?? 0,
              icon: Wallet,
              iconColor: "text-primary",
              iconBg: "bg-primary/10",
            },
            {
              title: "Valor Atual",
              value: summary?.totalCurrent ?? 0,
              icon: TrendingUp,
              iconColor: isProfitable ? "text-success" : "text-expense",
              iconBg: isProfitable ? "bg-success/10" : "bg-expense/10",
            },
            {
              title: "Lucro/Prejuízo",
              value: Math.abs(profitLoss),
              icon: isProfitable ? TrendingUp : TrendingDown,
              iconColor: isProfitable ? "text-success" : "text-expense",
              iconBg: isProfitable ? "bg-success/10" : "bg-expense/10",
              prefix: isProfitable ? "+" : "-",
            },
            {
              title: "Dividendos Recebidos",
              value: summary?.totalDividends ?? 0,
              icon: TrendingUp,
              iconColor: "text-info",
              iconBg: "bg-info/10",
            },
          ].map((card, i) => (
            <Card key={card.title} className="hover:shadow-md transition-all hover:border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${card.iconColor}`}>
                  {card.prefix}{formatCurrency(card.value)}
                </p>
                {i === 1 && summary && (
                  <p className={`text-xs mt-1.5 font-medium ${isProfitable ? "text-success" : "text-expense"}`}>
                    {formatPercent(summary.profitability)} de rentabilidade
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Portfolio allocation chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Alocação do Portfólio</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        formatter={(v) => [formatCurrency(Number(v))]}
                      />
                      <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                    Nenhum investimento cadastrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Asset class breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Por Classe de Ativo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pieData.map((item) => {
                    const pct = summary?.totalCurrent
                      ? (item.value / summary.totalCurrent) * 100
                      : 0;
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{formatCurrency(item.value)}</span>
                            <span className="text-xs">{formatNumber(pct, 1)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Investments list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Ativos</h2>
            <Dialog open={formOpen} onOpenChange={(o) => {
              setFormOpen(o);
              if (!o) setEditingInvestment(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingInvestment(null)}>
                  <Plus className="w-4 h-4" />
                  Adicionar ativo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingInvestment ? "Editar investimento" : "Novo investimento"}
                  </DialogTitle>
                </DialogHeader>
                <InvestmentForm
                  investment={editingInvestment}
                  onSuccess={() => {
                    setFormOpen(false);
                    setEditingInvestment(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="fixed_income">Renda Fixa</TabsTrigger>
              <TabsTrigger value="variable_income">Renda Variável</TabsTrigger>
              <TabsTrigger value="real_estate">FIIs</TabsTrigger>
            </TabsList>

            {["all", "fixed_income", "variable_income", "real_estate"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  {isLoading ? (
                    <div className="space-y-0 divide-y divide-border/50">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-4">
                          <Skeleton className="w-10 h-10 rounded-xl" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-1.5" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <div className="text-right">
                            <Skeleton className="h-4 w-20 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {(summary?.investments ?? [])
                        .filter((inv) => tab === "all" || inv.asset_class === tab)
                        .map((investment) => {
                          const pl = investment.current_value - investment.invested_amount;
                          const plPct = investment.invested_amount > 0
                            ? (pl / investment.invested_amount) * 100
                            : 0;

                          return (
                            <div
                              key={investment.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setDetailInvestment(investment)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setDetailInvestment(investment);
                                }
                              }}
                              className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors group cursor-pointer focus:outline-none focus:bg-muted/30"
                            >
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-primary" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{investment.asset_name}</p>
                                  {investment.ticker && (
                                    <Badge variant="outline" className="text-[10px] h-4 py-0 shrink-0">
                                      {investment.ticker}
                                    </Badge>
                                  )}
                                  {investment.yield_rate != null && investment.yield_period && (
                                    <Badge className="text-[10px] h-4 py-0 shrink-0 bg-primary/15 text-primary border-0 flex items-center gap-0.5">
                                      <Percent className="w-2.5 h-2.5" />
                                      auto
                                    </Badge>
                                  )}
                                  {investment.is_shared && (
                                    <Badge variant="outline" className="text-[10px] h-4 py-0 shrink-0 border-pink-500/30 text-pink-500">
                                      Casal
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {assetClassLabels[investment.asset_class]} • {investment.broker ?? "Sem corretora"}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{formatCurrency(investment.current_value)}</p>
                                <p className={`text-xs font-medium ${pl >= 0 ? "text-success" : "text-expense"}`}>
                                  {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({formatPercent(plPct)})
                                </p>
                              </div>

                              <RowActionsMenu
                                triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                                actions={[
                                  {
                                    label: "Ver detalhes / dividendos",
                                    icon: Receipt,
                                    onClick: () => setDetailInvestment(investment),
                                  },
                                  {
                                    label: "Editar",
                                    icon: Pencil,
                                    onClick: () => {
                                      setEditingInvestment(investment);
                                      setFormOpen(true);
                                    },
                                  },
                                  {
                                    label: "Remover",
                                    icon: Trash2,
                                    destructive: true,
                                    onClick: () => deleteMutation.mutate(investment.id),
                                  },
                                ]}
                              />
                            </div>
                          );
                        })}
                      {(summary?.investments ?? []).filter((inv) => tab === "all" || inv.asset_class === tab).length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhum ativo nesta categoria</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      <AssetDetailDialog
        investment={detailInvestment}
        open={!!detailInvestment}
        onOpenChange={(o) => !o && setDetailInvestment(null)}
      />
    </div>
  );
}
