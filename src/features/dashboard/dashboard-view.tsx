"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, ArrowRight, ArrowUpRight, ArrowDownRight, CreditCard,
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { transactionsService } from "@/services/transactions.service";
import { cardsService } from "@/features/cards/services/cards.service";
import { formatCurrency, formatDate, calculateChange } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { MonthSelector } from "@/components/shared/month-selector";
import { CashFlowChart } from "./cash-flow-chart";
import { CategoryChart } from "./category-chart";
import { CardCategoryChart } from "./card-category-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardView() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();
  const { selectedMonth } = useUIStore();

  // Parse mês selecionado em números
  const [selectedYear, selectedMonthNum] = selectedMonth.split("-").map(Number);

  // Último dia do mês selecionado — cálculo UTC-safe
  const lastDayOfMonth = new Date(Date.UTC(selectedYear, selectedMonthNum, 0))
    .toISOString()
    .split("T")[0];

  // Mês anterior
  const prevMonth = new Date(Date.UTC(selectedYear, selectedMonthNum - 2, 1))
    .toISOString()
    .slice(0, 7);
  const [prevYear, prevMonthNum] = prevMonth.split("-").map(Number);

  // Totais de transações do mês atual
  const { data: currentStats, isLoading } = useQuery({
    queryKey: ["monthly-stats", scopeKey, selectedMonth],
    queryFn: () =>
      transactionsService.getMonthlyStats(user!.id, couple?.id ?? null, selectedMonth, isShared),
    enabled: !!user,
  });

  // Totais de transações do mês anterior
  const { data: prevStats } = useQuery({
    queryKey: ["monthly-stats", scopeKey, prevMonth],
    queryFn: () =>
      transactionsService.getMonthlyStats(user!.id, couple?.id ?? null, prevMonth, isShared),
    enabled: !!user,
  });

  // Faturas de cartão do mês atual
  const { data: cardsSummary = [], isLoading: loadingCards } = useQuery({
    queryKey: ["cards", "summary", scopeKey, selectedMonthNum, selectedYear],
    queryFn: () =>
      cardsService.getCardsSummary(user!.id, couple?.id ?? null, selectedMonthNum, selectedYear, isShared),
    enabled: !!user,
  });

  // Faturas de cartão do mês anterior
  const { data: prevCardsSummary = [] } = useQuery({
    queryKey: ["cards", "summary", scopeKey, prevMonthNum, prevYear],
    queryFn: () =>
      cardsService.getCardsSummary(user!.id, couple?.id ?? null, prevMonthNum, prevYear, isShared),
    enabled: !!user,
  });

  // Lista completa de transações do mês (side-by-side)
  const { data: monthData, isLoading: loadingList } = useQuery({
    queryKey: ["transactions-month", scopeKey, selectedMonth],
    queryFn: () =>
      transactionsService.getTransactions(
        user!.id,
        couple?.id ?? null,
        { dateFrom: `${selectedMonth}-01`, dateTo: lastDayOfMonth },
        { page: 1, pageSize: 200 },
        { field: "amount", direction: "desc" },
        isShared
      ),
    enabled: !!user,
  });

  const incomeList = monthData?.data.filter((t) => t.type === "income") ?? [];
  const expenseList = monthData?.data.filter((t) => t.type === "expense") ?? [];

  // Totais das faturas de cartão do mês
  const cardExpenseTotal = cardsSummary.reduce((s, c) => s + c.monthTotal, 0);
  const prevCardExpenseTotal = prevCardsSummary.reduce((s, c) => s + c.monthTotal, 0);

  // Totais finais (transações + cartões)
  const income = currentStats?.income ?? 0;
  const txExpense = currentStats?.expense ?? 0;
  const expense = txExpense + cardExpenseTotal;
  const balance = income - expense;
  const total = income + expense;
  const incomeRatio = total > 0 ? (income / total) * 100 : 50;

  const prevExpenseTotal = (prevStats?.expense ?? 0) + prevCardExpenseTotal;
  const incomeChange = currentStats && prevStats
    ? calculateChange(income, prevStats.income)
    : undefined;
  const expenseChange = currentStats && prevStats
    ? calculateChange(expense, prevExpenseTotal)
    : undefined;

  // Cartões com fatura > 0 no mês — exibidos nas "Saídas"
  const cardBillRows = cardsSummary.filter((c) => c.monthTotal > 0);

  const loadingTotals = isLoading || loadingCards;

  return (
    <div>
      <Header
        title={isShared ? "Dashboard do Casal" : "Dashboard"}
        subtitle={isShared ? "Visão financeira compartilhada" : "Sua visão financeira pessoal"}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Month selector — carrossel dinâmico */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Visão Geral</h2>
          <MonthSelector />
        </div>

        {/* Stats (coluna 1) + gráficos do mês (colunas 2 e 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna 1 — stats empilhados */}
          <div className="space-y-4">
            {/* Receitas */}
            <Card className="border-[hsl(var(--success)/0.3)] hover:border-[hsl(var(--success)/0.5)] transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Receitas do Mês</p>
                  <div className="w-9 h-9 rounded-xl bg-[hsl(var(--success)/0.1)] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[hsl(var(--success))]" />
                  </div>
                </div>
                {loadingTotals ? (
                  <Skeleton className="h-8 w-36 mb-2" />
                ) : (
                  <p className="text-3xl font-bold text-[hsl(var(--success))]">{formatCurrency(income)}</p>
                )}
                {incomeChange !== undefined && !loadingTotals && (
                  <p className={`text-xs mt-1.5 font-medium ${incomeChange >= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--expense))]"}`}>
                    {incomeChange >= 0 ? "+" : ""}{incomeChange.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Despesas */}
            <Card className="border-[hsl(var(--expense)/0.3)] hover:border-[hsl(var(--expense)/0.5)] transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Despesas do Mês</p>
                    {!loadingTotals && cardExpenseTotal > 0 && (
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        incl. {formatCurrency(cardExpenseTotal)} em cartões
                      </p>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[hsl(var(--expense)/0.1)] flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-[hsl(var(--expense))]" />
                  </div>
                </div>
                {loadingTotals ? (
                  <Skeleton className="h-8 w-36 mb-2" />
                ) : (
                  <p className="text-3xl font-bold text-[hsl(var(--expense))]">{formatCurrency(expense)}</p>
                )}
                {expenseChange !== undefined && !loadingTotals && (
                  <p className={`text-xs mt-1.5 font-medium ${expenseChange <= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--expense))]"}`}>
                    {expenseChange >= 0 ? "+" : ""}{expenseChange.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Saldo */}
            <Card className={`border-2 transition-colors ${balance >= 0 ? "border-[hsl(var(--primary)/0.3)] hover:border-[hsl(var(--primary)/0.5)]" : "border-[hsl(var(--expense)/0.3)] hover:border-[hsl(var(--expense)/0.5)]"}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-[hsl(var(--muted-foreground))] font-medium">Saldo do Mês</p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${balance >= 0 ? "bg-[hsl(var(--primary)/0.1)]" : "bg-[hsl(var(--expense)/0.1)]"}`}>
                    {balance >= 0
                      ? <TrendingUp className="w-4 h-4 text-[hsl(var(--primary))]" />
                      : <TrendingDown className="w-4 h-4 text-[hsl(var(--expense))]" />
                    }
                  </div>
                </div>
                {loadingTotals ? (
                  <Skeleton className="h-8 w-36 mb-2" />
                ) : (
                  <p className={`text-3xl font-bold ${balance >= 0 ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--expense))]"}`}>
                    {balance >= 0 ? "+" : ""}{formatCurrency(balance)}
                  </p>
                )}
                {!loadingTotals && (
                  <p className="text-xs mt-1.5 text-[hsl(var(--muted-foreground))] font-medium">
                    {balance >= 0 ? "Você gastou menos do que ganhou" : "Gastos maiores que receitas"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2 — gráfico de cartão */}
          <CardCategoryChart />

          {/* Coluna 3 — gráfico de receitas/despesas por categoria */}
          <CategoryChart />
        </div>

        {/* Barra proporcional Receitas vs Despesas */}
        {!loadingTotals && total > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-sm mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success))]" />
                  <span className="text-[hsl(var(--muted-foreground))]">Receitas</span>
                  <span className="font-semibold text-[hsl(var(--success))]">{formatCurrency(income)}</span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">({incomeRatio.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">({(100 - incomeRatio).toFixed(0)}%)</span>
                  <span className="font-semibold text-[hsl(var(--expense))]">{formatCurrency(expense)}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">Despesas</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--expense))]" />
                </div>
              </div>
              <div className="h-3 bg-[hsl(var(--muted))] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[hsl(var(--success))] transition-all duration-700 rounded-l-full"
                  style={{ width: `${incomeRatio}%` }}
                />
                <div
                  className="h-full bg-[hsl(var(--expense))] transition-all duration-700 rounded-r-full"
                  style={{ width: `${100 - incomeRatio}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fluxo de caixa — ocupa as 3 colunas */}
        <CashFlowChart />

        {/* Entradas e Saídas lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Entradas */}
          <Card className="border-[hsl(var(--success)/0.25)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[hsl(var(--success))]">
                  Entradas do Mês
                  {!loadingList && incomeList.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                      ({incomeList.length})
                    </span>
                  )}
                </CardTitle>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver todas
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : incomeList.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                  <p className="text-sm">Nenhuma entrada neste mês</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {incomeList.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${tx.category?.color ?? "#22c55e"}22` }}
                      >
                        <ArrowUpRight className="w-4 h-4 text-[hsl(var(--success))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(tx.date)}</span>
                          {tx.category && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              {tx.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[hsl(var(--success))] shrink-0">
                        +{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saídas */}
          <Card className="border-[hsl(var(--expense)/0.25)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[hsl(var(--expense))]">
                  Saídas do Mês
                  {!loadingList && !loadingCards && (expenseList.length + cardBillRows.length) > 0 && (
                    <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                      ({expenseList.length + cardBillRows.length})
                    </span>
                  )}
                </CardTitle>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Ver todas
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingList || loadingCards ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : expenseList.length === 0 && cardBillRows.length === 0 ? (
                <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                  <p className="text-sm">Nenhuma saída neste mês</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {/* Faturas de cartão */}
                  {cardBillRows.map(({ card, monthTotal, billStatus }) => (
                    <Link key={card.id} href="/cards">
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${card.color}33` }}
                        >
                          <CreditCard className="w-4 h-4" style={{ color: card.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">Fatura {card.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              cartão
                            </Badge>
                            {billStatus && (
                              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                {billStatus === "open" ? "aberta" : billStatus === "closed" ? "fechada" : billStatus === "paid" ? "paga" : "atrasada"}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-[hsl(var(--expense))] shrink-0">
                          -{formatCurrency(monthTotal)}
                        </p>
                      </div>
                    </Link>
                  ))}

                  {/* Transações avulsas */}
                  {expenseList.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${tx.category?.color ?? "#ef4444"}22` }}
                      >
                        <ArrowDownRight className="w-4 h-4 text-[hsl(var(--expense))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(tx.date)}</span>
                          {tx.category && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              {tx.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[hsl(var(--expense))] shrink-0">
                        -{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
