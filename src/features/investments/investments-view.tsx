"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Coins, ArrowLeft, PieChart as PieIcon,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { investmentsService } from "@/services/investments.service";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency, formatPercent, formatNumber, CHART_COLORS } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { InvestmentForm } from "./investment-form";
import { AssetDetailDialog } from "./asset-detail-dialog";
import { CurrencyStrip } from "./currency-strip";
import { DividendsDashboard } from "./dividends-dashboard";
import { PortfolioTable } from "./portfolio-table";
import { OperationsReport } from "./operations-report";
import { PlanningSection } from "./planning-section";
import { WealthProjection } from "./wealth-projection";
import { InvestmentContributions } from "./investment-contributions";
import { PartnerScopeNotice } from "@/components/shared/partner-scope-notice";
import type { Investment, AssetClass } from "@/types";

const assetClassLabels: Record<string, string> = {
  fixed_income: "Renda Fixa",
  variable_income: "Renda Variável",
  crypto: "Criptomoedas",
  real_estate: "Fundos Imobiliários",
  other: "Outros",
};

export function InvestmentsView() {
  const { user, couple, isShared, scopeKey, isPartnerView } = useScopeFilter();

  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [detailInvestment, setDetailInvestment] = useState<Investment | null>(null);
  // Drill-down da distribuição: null = nível de classes; senão, ativos da classe.
  const [drillClass, setDrillClass] = useState<AssetClass | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["investment-summary", scopeKey],
    queryFn: () => investmentsService.getPortfolioSummary(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  // Aportes já agendados para os próximos meses (despesas futuras na categoria
  // "Investimento") — alimentam o aporte mensal da projeção de patrimônio.
  const { data: upcomingContributions } = useQuery({
    queryKey: ["upcoming-investment-contributions", scopeKey],
    queryFn: () =>
      transactionsService.getUpcomingInvestmentContributions(user!.id, couple?.id ?? null, 12, isShared),
    enabled: !!user,
  });

  const deleteMutation = useToastMutation({
    mutationFn: async (id: string) => {
      const target = (summary?.investments ?? []).find((inv) => inv.id === id);
      await investmentsService.deleteInvestment(id);
      if (user) {
        await investmentsService.logAudit({
          user_id: user.id, action: "delete", entity: "investment",
          label: target?.asset_name ?? "ativo",
        });
      }
    },
    invalidateKeys: [["investment-summary"], ["investment-dividends-all"], ["investment-audit"]],
    successMessage: "Investimento removido",
    errorMessage: "Erro ao remover investimento",
  });

  const investments = summary?.investments ?? [];
  const totalCurrent = summary?.totalCurrent ?? 0;
  const totalInvested = summary?.totalInvested ?? 0;
  const profitLoss = totalCurrent - totalInvested;
  const isProfitable = profitLoss >= 0;
  const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  // Distribuição por classe (com a chave preservada para o drill-down).
  const classData = summary
    ? Object.entries(summary.byClass)
        .filter(([, value]) => value > 0)
        .map(([key, value], i) => ({
          key: key as AssetClass,
          name: assetClassLabels[key],
          value,
          color: CHART_COLORS[i % CHART_COLORS.length],
        }))
    : [];

  // Ativos individuais ordenados por valor atual (todos, ou filtrados pela
  // classe em drill-down).
  const assetData = investments
    .map((inv) => ({
      id: inv.id,
      key: inv.asset_class,
      name: inv.ticker || inv.asset_name,
      value: inv.current_value,
      color: "",
    }))
    .filter((a) => !drillClass || a.key === drillClass)
    .sort((a, b) => b.value - a.value)
    .map((a, i) => ({ ...a, color: CHART_COLORS[i % CHART_COLORS.length] }));

  // Dados da pizza conforme o nível: classes ou ativos da classe selecionada.
  const pieData = drillClass ? assetData : classData;
  const allocTotal = pieData.reduce((s, d) => s + d.value, 0);

  const handleSliceClick = (index: number) => {
    if (drillClass) return; // já estamos no nível de ativos
    const entry = classData[index];
    if (entry) setDrillClass(entry.key);
  };

  const summaryCards = [
    {
      title: "Total Investido",
      value: totalInvested,
      icon: Wallet,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Valor Atual",
      value: totalCurrent,
      icon: TrendingUp,
      color: isProfitable ? "text-success" : "text-expense",
      bg: isProfitable ? "bg-success/10" : "bg-expense/10",
      footer: summary ? `${formatPercent(summary.profitability)} de rentabilidade` : null,
    },
    {
      title: "Lucro/Prejuízo",
      value: profitLoss,
      prefix: isProfitable ? "+" : "",
      icon: isProfitable ? TrendingUp : TrendingDown,
      color: isProfitable ? "text-success" : "text-expense",
      bg: isProfitable ? "bg-success/10" : "bg-expense/10",
      footer: `${formatPercent(profitLossPct)} sobre o aplicado`,
    },
    {
      title: "Dividendos Recebidos",
      value: summary?.totalDividends ?? 0,
      icon: Coins,
      color: "text-info",
      bg: "bg-info/10",
    },
  ];

  if (isPartnerView) {
    return (
      <div>
        <Header title="Investimentos" subtitle="Acompanhe seu portfólio de investimentos" />
        <PartnerScopeNotice noun="Os investimentos" />
      </div>
    );
  }

  return (
    <div>
      <Header title="Investimentos" subtitle="Acompanhe seu portfólio de investimentos" />

      <div className="p-4 sm:p-6 space-y-6">
        <CurrencyStrip />

        {/* Resumo patrimonial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className="hover:shadow-md transition-all hover:border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg}`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <p className={`text-2xl font-bold tabular-nums ${card.color}`}>
                    {card.prefix}{formatCurrency(card.value)}
                  </p>
                )}
                {card.footer && !isLoading && (
                  <p className={`text-xs mt-1.5 font-medium ${card.color}`}>{card.footer}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Distribuição + alocação por ativo */}
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Distribuição (com drill-down) */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <PieIcon className="w-4 h-4 text-muted-foreground" />
                    {drillClass ? assetClassLabels[drillClass] : "Distribuição"}
                  </CardTitle>
                  {drillClass && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => setDrillClass(null)}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Todas
                    </Button>
                  )}
                </div>
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
                        onClick={(_, index) => handleSliceClick(index)}
                        className={drillClass ? undefined : "cursor-pointer"}
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
                {!drillClass && classData.length > 0 && (
                  <p className="text-[11px] text-muted-foreground text-center mt-1">
                    Clique em uma classe para ver os ativos
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Alocação por ativo */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Alocação por Ativo
                  {drillClass && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      · {assetClassLabels[drillClass]}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assetData.length === 0 ? (
                  <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                    Nenhum ativo nesta seleção
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assetData.map((item) => {
                      const pct = allocTotal > 0 ? (item.value / allocTotal) * 100 : 0;
                      return (
                        <div key={item.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="font-medium truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                              <span className="tabular-nums">{formatCurrency(item.value)}</span>
                              <span className="text-xs w-12 text-right tabular-nums">{formatNumber(pct, 1)}%</span>
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
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projeção de patrimônio */}
        <WealthProjection
          investments={investments}
          totalCurrent={totalCurrent}
          suggestedContribution={upcomingContributions?.monthlyAverage ?? 0}
          upcomingMonths={upcomingContributions?.months.length ?? 0}
          isLoading={isLoading}
        />

        {/* Aportes (despesas na categoria "Investimento") */}
        <InvestmentContributions totalCurrent={totalCurrent} />

        {/* Dashboard de proventos */}
        <DividendsDashboard totalInvested={totalInvested} totalCurrent={totalCurrent} />

        {/* Lista de ativos */}
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

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <PortfolioTable
              investments={investments}
              totalCurrent={totalCurrent}
              onDetail={setDetailInvestment}
              onEdit={(inv) => {
                setEditingInvestment(inv);
                setFormOpen(true);
              }}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        </div>

        {/* Movimentações (ledger + relatório exportável) */}
        <OperationsReport />

        {/* Planejamento & Análise: metas, simuladores, perfil, alertas, auditoria */}
        <PlanningSection />
      </div>

      <AssetDetailDialog
        investment={detailInvestment}
        open={!!detailInvestment}
        onOpenChange={(o) => !o && setDetailInvestment(null)}
      />
    </div>
  );
}
