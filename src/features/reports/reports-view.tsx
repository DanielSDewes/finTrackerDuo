"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { transactionsService } from "@/services/transactions.service";
import { investmentsService } from "@/services/investments.service";
import { formatCurrency, formatMonth, CHART_COLORS } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthSelector } from "@/components/shared/month-selector";

export function ReportsView() {
  const { user, couple } = useAuthStore();
  const { viewMode, selectedMonth } = useUIStore();
  const isShared = viewMode === "couple" && !!couple;

  const { data: cashFlow, isLoading: cfLoading } = useQuery({
    queryKey: ["cash-flow", user?.id, couple?.id, isShared, 12],
    queryFn: () =>
      transactionsService.getCashFlowData(user!.id, couple?.id ?? null, 12, isShared),
    enabled: !!user,
  });

  const { data: expenseBreakdown, isLoading: ebLoading } = useQuery({
    queryKey: ["category-breakdown-report", user?.id, couple?.id, selectedMonth, "expense", isShared],
    queryFn: () =>
      transactionsService.getCategoryBreakdown(
        user!.id, couple?.id ?? null, selectedMonth, "expense", isShared
      ),
    enabled: !!user,
  });

  const { data: incomeBreakdown, isLoading: ibLoading } = useQuery({
    queryKey: ["category-breakdown-report", user?.id, couple?.id, selectedMonth, "income", isShared],
    queryFn: () =>
      transactionsService.getCategoryBreakdown(
        user!.id, couple?.id ?? null, selectedMonth, "income", isShared
      ),
    enabled: !!user,
  });

  const { data: investmentSummary } = useQuery({
    queryKey: ["investment-summary", user?.id, couple?.id, isShared],
    queryFn: () => investmentsService.getPortfolioSummary(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const cashFlowChart = cashFlow?.map((d) => ({
    ...d,
    month: formatMonth(d.month + "-01"),
  }));

  const totalIncome = cashFlow?.reduce((sum, d) => sum + d.income, 0) ?? 0;
  const totalExpense = cashFlow?.reduce((sum, d) => sum + d.expense, 0) ?? 0;
  const avgSavings = cashFlow?.length
    ? cashFlow.reduce((sum, d) => sum + (d.income - d.expense), 0) / cashFlow.length
    : 0;

  return (
    <div>
      <Header title="Relatórios" subtitle="Análise detalhada das suas finanças" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary stats (last 12 months) */}
        <div>
          <h2 className="font-semibold mb-4">Últimos 12 meses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Recebido", value: totalIncome, color: "text-success" },
              { label: "Total Gasto", value: totalExpense, color: "text-expense" },
              { label: "Economia Média/Mês", value: avgSavings, color: avgSavings >= 0 ? "text-success" : "text-expense" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{formatCurrency(stat.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cash flow 12 months */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fluxo de Caixa — 12 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {cfLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashFlowChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    formatter={(v, n) => [formatCurrency(Number(v)), n === "income" ? "Receitas" : "Despesas"]}
                  />
                  <Legend formatter={(v) => v === "income" ? "Receitas" : "Despesas"} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown for selected month */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Análise por Categoria</h2>
            <MonthSelector />
          </div>

          <Tabs defaultValue="expense">
            <TabsList className="mb-4">
              <TabsTrigger value="expense">Despesas</TabsTrigger>
              <TabsTrigger value="income">Receitas</TabsTrigger>
            </TabsList>

            <TabsContent value="expense">
              {ebLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    {expenseBreakdown?.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        Sem despesas neste período
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {expenseBreakdown?.map((cat, i) => {
                          const total = expenseBreakdown.reduce((sum, c) => sum + c.value, 0);
                          const pct = total > 0 ? (cat.value / total) * 100 : 0;
                          return (
                            <div key={cat.name}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                  <span>{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                  <span>{formatCurrency(cat.value)}</span>
                                  <span className="text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: cat.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="income">
              {ibLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <Card>
                  <CardContent className="p-6">
                    {incomeBreakdown?.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        Sem receitas neste período
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {incomeBreakdown?.map((cat) => {
                          const total = incomeBreakdown.reduce((sum, c) => sum + c.value, 0);
                          const pct = total > 0 ? (cat.value / total) * 100 : 0;
                          return (
                            <div key={cat.name}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                  <span>{cat.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                  <span>{formatCurrency(cat.value)}</span>
                                  <span className="text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: cat.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Savings rate chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Taxa de Poupança — 12 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cashFlowChart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v) => [formatCurrency(Number(v)), "Economia"]}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
