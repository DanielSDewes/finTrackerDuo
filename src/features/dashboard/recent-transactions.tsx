"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentTransactions() {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const isShared = viewMode === "couple" && !!couple;

  const { data, isLoading } = useQuery({
    queryKey: ["transactions-recent", user?.id, couple?.id, isShared],
    queryFn: () =>
      transactionsService.getTransactions(
        user!.id,
        couple?.id ?? null,
        {},
        { page: 1, pageSize: 5 },
        { field: "date", direction: "desc" },
        isShared
      ),
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transações Recentes</CardTitle>
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="text-xs">
              Ver todas
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-36 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhuma transação encontrada</p>
            <Link href="/transactions">
              <Button size="sm" className="mt-3">Adicionar transação</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.data.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${transaction.category?.color}20` }}
                >
                  {transaction.type === "income" ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-expense" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{transaction.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </span>
                    {transaction.category && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        {transaction.category.name}
                      </Badge>
                    )}
                    {transaction.is_shared && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 border-pink-500/30 text-pink-500">
                        Casal
                      </Badge>
                    )}
                  </div>
                </div>

                <p className={`text-sm font-semibold shrink-0 ${
                  transaction.type === "income" ? "text-success" : "text-expense"
                }`}>
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
