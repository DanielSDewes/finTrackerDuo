"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Filter, Search, ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Trash2, Pencil, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { Transaction, FilterOptions } from "@/types";
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
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TransactionsView() {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const queryClient = useQueryClient();
  const isShared = viewMode === "couple" && !!couple;

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", user?.id, couple?.id, filters, page, search, isShared],
    queryFn: () =>
      transactionsService.getTransactions(
        user!.id,
        couple?.id ?? null,
        { ...filters, search: search || undefined },
        { page, pageSize: 20 },
        { field: "date", direction: "desc" },
        isShared
      ),
    enabled: !!user,
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

  const totalPages = Math.ceil((data?.count ?? 0) / 20);

  const typeIcons = {
    income: <ArrowUpRight className="w-4 h-4 text-success" />,
    expense: <ArrowDownRight className="w-4 h-4 text-expense" />,
    transfer: <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />,
  };

  const statusVariants: Record<string, "success" | "warning" | "outline"> = {
    completed: "success",
    pending: "warning",
    cancelled: "outline",
  };

  return (
    <div>
      <Header title="Transações" subtitle="Gerencie todas as suas movimentações financeiras" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:max-w-xs">
              <Input
                placeholder="Buscar transações..."
                leftIcon={<Search />}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <Select
              value={filters.type ?? "all"}
              onValueChange={(v) => { setFilters((f) => ({ ...f, type: v === "all" ? undefined : v as any })); setPage(1); }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={formOpen} onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingTransaction(null);
          }}>
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
                onSuccess={() => { setFormOpen(false); setEditingTransaction(null); }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Transaction list */}
        <div className="rounded-xl border border-border/50 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-border/50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-1.5" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ArrowLeftRight className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">Nenhuma transação encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? "Tente outros termos de busca" : "Adicione sua primeira transação"}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="divide-y divide-border/50">
                {data?.data.map((transaction, i) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${transaction.category?.color ?? "#6366f1"}20` }}
                    >
                      {typeIcons[transaction.type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{transaction.description}</p>
                        {transaction.is_shared && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4 border-pink-500/30 text-pink-500 shrink-0">
                            Casal
                          </Badge>
                        )}
                        <Badge variant={statusVariants[transaction.status] ?? "outline"} className="text-[10px] py-0 h-4 shrink-0">
                          {transaction.status === "completed" ? "Concluída" : transaction.status === "pending" ? "Pendente" : "Cancelada"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
                        {transaction.category && (
                          <span className="text-xs text-muted-foreground">{transaction.category.name}</span>
                        )}
                        {transaction.account && (
                          <span className="text-xs text-muted-foreground">{transaction.account.name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <p className={`text-sm font-semibold ${
                        transaction.type === "income" ? "text-success" : "text-expense"
                      }`}>
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
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
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive
                            onClick={() => setDeleteId(transaction.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data?.count} transações
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="flex items-center px-3 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialogComponent
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
