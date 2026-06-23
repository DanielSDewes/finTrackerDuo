"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CreditCard } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { cardsService } from "@/features/cards/services/cards.service";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CardCategoryChart() {
  const { user, couple, isShared, scopeKey, scopeUserId } = useScopeFilter();
  const { selectedMonth } = useUIStore();
  const [year, month] = selectedMonth.split("-").map(Number);

  const { data = [], isLoading } = useQuery({
    queryKey: ["cards", "category-breakdown", scopeKey, year, month],
    queryFn: () =>
      cardsService.getCardCategoryBreakdown(
        scopeUserId,
        couple?.id ?? null,
        month,
        year,
        isShared,
      ),
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          Gastos do Cartão por Categoria
        </CardTitle>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {isShared ? "Todas as transações da fatura do casal" : "Suas transações da fatura"}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="w-8 h-8 text-[hsl(var(--muted-foreground)/0.3)] mb-2" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Sem gastos no cartão neste mês
            </p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
