"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryChart() {
  const { user, couple } = useAuthStore();
  const { viewMode, selectedMonth } = useUIStore();
  const isShared = viewMode === "couple" && !!couple;

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["category-breakdown", user?.id, couple?.id, selectedMonth, "expense", isShared],
    queryFn: () =>
      transactionsService.getCategoryBreakdown(
        user!.id, couple?.id ?? null, selectedMonth, "expense", isShared
      ),
    enabled: !!user,
  });

  const { data: incomeData } = useQuery({
    queryKey: ["category-breakdown", user?.id, couple?.id, selectedMonth, "income", isShared],
    queryFn: () =>
      transactionsService.getCategoryBreakdown(
        user!.id, couple?.id ?? null, selectedMonth, "income", isShared
      ),
    enabled: !!user,
  });

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
          <TabsContent value="expense">{renderChart(expenseData)}</TabsContent>
          <TabsContent value="income">{renderChart(incomeData)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
