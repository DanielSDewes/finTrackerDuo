"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { transactionsService } from "@/services/transactions.service";
import { cardsService } from "@/features/cards/services/cards.service";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { INVESTMENT_CHART_COLOR } from "@/lib/investment-category";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SERIES_LABELS: Record<string, string> = {
  income: "Receitas",
  expense: "Despesas",
  investment: "Investimentos",
  balance: "Saldo",
};

export function CashFlowChart() {
  const { user, couple, isShared, scopeKey, scopeUserId } = useScopeFilter();

  const { data, isLoading } = useQuery({
    queryKey: ["cash-flow", scopeKey],
    queryFn: () =>
      transactionsService.getCashFlowData(scopeUserId, couple?.id ?? null, 6, isShared),
    enabled: !!user,
  });

  const { data: cardsCashFlow } = useQuery({
    queryKey: ["cash-flow", "cards", scopeKey],
    queryFn: () =>
      cardsService.getCardsCashFlow(scopeUserId, couple?.id ?? null, 6, isShared),
    enabled: !!user,
  });

  const { data: cardsInvestment } = useQuery({
    queryKey: ["cash-flow", "cards", "investment", scopeKey],
    queryFn: () =>
      cardsService.getCardsInvestmentCashFlow(scopeUserId, couple?.id ?? null, 6, isShared),
    enabled: !!user,
  });

  const chartData = data?.map((d) => {
    const cardExpense =
      cardsCashFlow?.find((c) => c.month === d.month)?.expense ?? 0;
    const cardInvestment =
      cardsInvestment?.find((c) => c.month === d.month)?.investment ?? 0;
    // Investimento (transações + cartão) sai da série de despesas e vira uma
    // terceira série própria; o saldo segue descontando tudo (aporte também é
    // saída de caixa), então as três áreas continuam somando o total de antes.
    const totalExpense = d.expense + cardExpense;
    const investment = d.investment + cardInvestment;
    const expense = totalExpense - investment;
    return {
      ...d,
      expense,
      investment,
      balance: d.income - totalExpense,
      month: formatMonth(d.month + "-01"),
    };
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fluxo de Caixa</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="investmentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={INVESTMENT_CHART_COLOR} stopOpacity={0.3} />
                <stop offset="95%" stopColor={INVESTMENT_CHART_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value, name) => [
                formatCurrency(Number(value)),
                SERIES_LABELS[String(name)] ?? String(name),
              ]}
            />
            <Legend
              formatter={(value) => SERIES_LABELS[String(value)] ?? String(value)}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="hsl(142, 76%, 36%)"
              fill="url(#incomeGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="hsl(0, 84%, 60%)"
              fill="url(#expenseGrad)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="investment"
              stroke={INVESTMENT_CHART_COLOR}
              fill="url(#investmentGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
