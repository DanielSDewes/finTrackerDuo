"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useUIStore } from "@/stores/ui.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { transactionsService } from "@/services/transactions.service";
import { cardsService } from "@/features/cards/services/cards.service";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryChart() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();
  const { selectedMonth } = useUIStore();
  const [year, monthNum] = selectedMonth.split("-").map(Number);

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["category-breakdown", scopeKey, selectedMonth, "expense"],
    queryFn: () =>
      transactionsService.getCategoryBreakdown(
        user!.id, couple?.id ?? null, selectedMonth, "expense", isShared
      ),
    enabled: !!user,
  });

  const { data: cardExpenseData } = useQuery({
    queryKey: ["category-breakdown", "cards", scopeKey, selectedMonth],
    queryFn: () =>
      cardsService.getCardCategoryBreakdown(
        user!.id, couple?.id ?? null, monthNum, year, isShared
      ),
    enabled: !!user,
  });

  const { data: incomeData } = useQuery({
    queryKey: ["category-breakdown", scopeKey, selectedMonth, "income"],
    queryFn: () =>
      transactionsService.getCategoryBreakdown(
        user!.id, couple?.id ?? null, selectedMonth, "income", isShared
      ),
    enabled: !!user,
  });

  const mergedExpenseData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    for (const item of [...(expenseData ?? []), ...(cardExpenseData ?? [])]) {
      const existing = map.get(item.name);
      if (existing) existing.value += item.value;
      else map.set(item.name, { ...item });
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [expenseData, cardExpenseData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  const renderChart = (data: { name: string; value: number; color: string }[] = []) => (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data.slice(0, 8)}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {data.slice(0, 8).map((entry, index) => (
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
          formatter={(value) => [formatCurrency(Number(value))]}
        />
        <Legend
          formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="expense">
          <TabsList className="mb-4">
            <TabsTrigger value="expense">Despesas</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
          </TabsList>
          <TabsContent value="expense">{renderChart(mergedExpenseData)}</TabsContent>
          <TabsContent value="income">{renderChart(incomeData)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
