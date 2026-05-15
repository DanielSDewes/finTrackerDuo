"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, ArrowUpRight, ArrowDownRight,
  Trash2, Pencil, MoreHorizontal, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getMonthWindow } from "@/components/shared/month-selector";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransactionForm } from "./transaction-form";
import type { Transaction } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

function AlertDialogComponent({
  open, onOpenChange, onConfirm,
}: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface TransactionRowProps {
  transaction: Transaction;
  type: "income" | "expense";
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

function TransactionRow({ transaction: tx, type, onEdit, onDelete }: TransactionRowProps) {
  const statusVariants: Record<string, "success" | "warning" | "outline"> = {
    completed: "success",
    pending: "warning",
    cancelled: "outline",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${tx.category?.color ?? (type === "income" ? "#22c55e" : "#ef4444")}22` }}
      >
        {type === "income"
          ? <ArrowUpRight className="w-4 h-4 text-[hsl(var(--success))]" />
          : <ArrowDownRight className="w-4 h-4 text-[hsl(var(--expense))]" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium truncate">{tx.description}</p>
          {tx.is_shared && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 border-pink-500/30 text-pink-500 shrink-0">
              Casal
            </Badge>
          )}
          <Badge variant={statusVariants[tx.status] ?? "outline"} className="text-[10px] py-0 h-4 shrink-0">
            {tx.status === "completed" ? "Concluída" : tx.status === "pending" ? "Pendente" : "Cancelada"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{formatDate(tx.date)}</span>
          {tx.category && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{tx.category.name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <p className={cn(
          "text-sm font-semibold",
          type === "income" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--expense))]"
        )}>
          {type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(tx)}>
              <Pencil className="w-4 h-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem destructive onClick={() => onDelete(tx.id)}>
              <Trash2 className="w-4 h-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

export function TransactionsView() {
  const { user, couple } = useAuthStore();
  const { viewMode, selectedMonth, setSelectedMonth } = useUIStore();
  const queryClient = useQueryClient();
  const isShared = viewMode === "couple" && !!couple;

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = getMonthWindow(selectedMonth);

  const [year, monthNum] = selectedMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", user?.id, couple?.id, selectedMonth, isShared],
    queryFn: () =>
      transactionsService.getTransactions(
        user!.id,
        couple?.id ?? null,
        { dateFrom: `${selectedMonth}-01`, dateTo: lastDay },
        { page: 1, pageSize: 500 },
        { field: "date", direction: "desc" },
        isShared
      ),
    enabled: !!user,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsService.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      toast.success("Transação excluída");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir transação"),
  });

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormOpen(true);
  };

  const filtered = (data?.data ?? []).filter(
    (tx) => !search || tx.description.toLowerCase().includes(search.toLowerCase())
  );

  const incomeList = filtered.filter((t) => t.type === "income");
  const expenseList = filtered.filter((t) => t.type === "expense");

  const incomeTotal = incomeList.reduce((s, t) => s + t.amount, 0);
  const expenseTotal = expenseList.reduce((s, t) => s + t.amount, 0);

  const selectedMonthLabel = new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString(
    "pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }
  );

  function MonthListSkeleton() {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  function TransactionListSkeleton() {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-36 mb-1.5" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Transações"
        subtitle="Gerencie suas movimentações financeiras por mês"
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Input
              placeholder="Buscar no mês selecionado..."
              leftIcon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingTransaction(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTransaction(null)}>
                <Plus className="w-4 h-4" />
                Nova transação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Editar transação" : "Nova transação"}
                </DialogTitle>
              </DialogHeader>
              <TransactionForm
                transaction={editingTransaction}
                onSuccess={() => {
                  setFormOpen(false);
                  setEditingTransaction(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Month list */}
          <div className="w-full lg:w-64 shrink-0">
            <Card className="border-border/50">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Meses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {!user ? (
                  <MonthListSkeleton />
                ) : (
                  <div className="space-y-0.5 max-h-[420px] overflow-y-auto pr-0.5">
                    {months.map((month) => {
                      const isSelected = month === selectedMonth;
                      const isCurrent = month === currentMonth;
                      const [my, mm] = month.split("-").map(Number);
                      const label = new Date(Date.UTC(my, mm - 1, 1)).toLocaleDateString(
                        "pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }
                      );

                      return (
                        <button
                          key={month}
                          onClick={() => setSelectedMonth(month)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer",
                            isSelected
                              ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] font-semibold border border-[hsl(var(--primary)/0.25)]"
                              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/0.4)] hover:text-[hsl(var(--foreground))]"
                          )}
                        >
                          <span className="capitalize truncate">{label}</span>
                          {isCurrent && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 py-0 ml-1 shrink-0 border-[hsl(var(--primary)/0.3)] text-[hsl(var(--primary))]"
                            >
                              atual
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transactions panel */}
          <div className="flex-1 min-w-0">
            {/* Month header */}
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <h3 className="text-base font-semibold capitalize">{selectedMonthLabel}</h3>
              {!isLoading && (
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  ({filtered.length} transaç{filtered.length === 1 ? "ão" : "ões"})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receitas */}
              <Card className="border-[hsl(var(--success)/0.25)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[hsl(var(--success))]">
                      Receitas
                      {!isLoading && incomeList.length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                          ({incomeList.length})
                        </span>
                      )}
                    </CardTitle>
                    {!isLoading && incomeTotal > 0 && (
                      <span className="text-sm font-bold text-[hsl(var(--success))]">
                        +{formatCurrency(incomeTotal)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  {isLoading ? (
                    <TransactionListSkeleton />
                  ) : incomeList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ArrowUpRight className="w-8 h-8 text-[hsl(var(--muted-foreground)/0.3)] mb-2" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {search ? "Nenhuma receita encontrada" : "Nenhuma receita neste mês"}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      <div className="space-y-0.5 max-h-[480px] overflow-y-auto pr-0.5">
                        {incomeList.map((tx) => (
                          <TransactionRow
                            key={tx.id}
                            transaction={tx}
                            type="income"
                            onEdit={handleEdit}
                            onDelete={setDeleteId}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>

              {/* Despesas */}
              <Card className="border-[hsl(var(--expense)/0.25)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[hsl(var(--expense))]">
                      Despesas
                      {!isLoading && expenseList.length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                          ({expenseList.length})
                        </span>
                      )}
                    </CardTitle>
                    {!isLoading && expenseTotal > 0 && (
                      <span className="text-sm font-bold text-[hsl(var(--expense))]">
                        -{formatCurrency(expenseTotal)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  {isLoading ? (
                    <TransactionListSkeleton />
                  ) : expenseList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ArrowDownRight className="w-8 h-8 text-[hsl(var(--muted-foreground)/0.3)] mb-2" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {search ? "Nenhuma despesa encontrada" : "Nenhuma despesa neste mês"}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      <div className="space-y-0.5 max-h-[480px] overflow-y-auto pr-0.5">
                        {expenseList.map((tx) => (
                          <TransactionRow
                            key={tx.id}
                            transaction={tx}
                            type="expense"
                            onEdit={handleEdit}
                            onDelete={setDeleteId}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <AlertDialogComponent
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
