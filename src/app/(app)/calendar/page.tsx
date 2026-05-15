"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthSelector } from "@/components/shared/month-selector";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function CalendarPage() {
  const { user, couple } = useAuthStore();
  const { viewMode, selectedMonth } = useUIStore();
  const isShared = viewMode === "couple" && !!couple;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["monthly-stats-calendar", user?.id, couple?.id, selectedMonth, isShared],
    queryFn: () =>
      transactionsService.getMonthlyStats(user!.id, couple?.id ?? null, selectedMonth, isShared),
    enabled: !!user,
  });

  const transactionsByDate = stats?.transactions
    ? (stats.transactions as any[]).reduce((acc: Record<string, any[]>, t) => {
        const date = t.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(t);
        return acc;
      }, {})
    : {};

  const daysInMonth = new Date(
    parseInt(selectedMonth.split("-")[0]),
    parseInt(selectedMonth.split("-")[1]),
    0
  ).getDate();

  const firstDay = new Date(`${selectedMonth}-01`).getDay();

  return (
    <div>
      <Header title="Calendário Financeiro" subtitle="Visualize suas movimentações por dia" />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-expense" />
              <span className="text-muted-foreground">Despesas</span>
            </div>
          </div>
          <MonthSelector />
        </div>

        {/* Calendar grid */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                const dayTransactions = transactionsByDate[dateStr] ?? [];
                const hasIncome = dayTransactions.some((t: any) => t.type === "income");
                const hasExpense = dayTransactions.some((t: any) => t.type === "expense");
                const isToday = dateStr === new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={day}
                    className={`min-h-[56px] p-1.5 rounded-lg border transition-colors ${
                      isToday
                        ? "border-primary bg-primary/5"
                        : dayTransactions.length > 0
                        ? "border-border/50 hover:bg-muted/50"
                        : "border-transparent hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                        {day}
                      </span>
                      <div className="flex gap-0.5">
                        {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-success" />}
                        {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-expense" />}
                      </div>
                    </div>
                    {dayTransactions.length > 0 && (
                      <div className="text-[9px] text-muted-foreground">
                        {dayTransactions.length} mov.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily breakdown */}
        <div className="space-y-3">
          <h2 className="font-semibold">Movimentações do Mês</h2>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : Object.keys(transactionsByDate).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação neste período
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(transactionsByDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, transactions]) => (
                  <Card key={date}>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm">{formatDate(date, "EEEE, dd 'de' MMMM")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {(transactions as any[]).map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {t.type === "income"
                              ? <ArrowUpRight className="w-4 h-4 text-success" />
                              : <ArrowDownRight className="w-4 h-4 text-expense" />
                            }
                            <span className="truncate max-w-[200px]">{t.description}</span>
                          </div>
                          <span className={t.type === "income" ? "text-success font-medium" : "text-expense font-medium"}>
                            {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
