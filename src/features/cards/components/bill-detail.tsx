"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, MoreVertical, ReceiptText, Layers } from "lucide-react";
import { toast } from "sonner";
import { cardsService } from "../services/cards.service";
import { useCardsStore } from "../stores/cards.store";
import { useAuthStore } from "@/stores/auth.store";
import { CardTransactionForm } from "./transaction-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BILL_STATUS_META } from "../types";
import type { CreditCardTransaction } from "../types";
import { CategoryIcon } from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type DeleteTarget =
  | { type: "single"; tx: CreditCardTransaction }
  | { type: "group"; groupId: string; title: string };

export function BillDetail() {
  const { selectedCardId, selectedBillId, selectedBillMonth, selectedBillYear, setSelectedBill } = useCardsStore();
  const { user, couple } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const hasBillContext = selectedCardId && selectedBillMonth && selectedBillYear;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["card-transactions", selectedBillId],
    queryFn: () => cardsService.getBillTransactions(selectedBillId!),
    enabled: !!selectedBillId,
  });

  const deleteSingleMutation = useMutation({
    mutationFn: ({ id, billId }: { id: string; billId: string }) =>
      cardsService.deleteTransaction(id, billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-transactions", selectedBillId] });
      queryClient.invalidateQueries({ queryKey: ["bills", selectedCardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Transação removida");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Erro ao remover transação"),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => cardsService.deleteInstallmentGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-transactions", selectedBillId] });
      queryClient.invalidateQueries({ queryKey: ["bills", selectedCardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Parcelamento removido");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Erro ao remover parcelamento"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ billId, status }: { billId: string; status: "open" | "closed" | "paid" | "overdue" }) =>
      cardsService.updateBillStatus(billId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills", selectedCardId] });
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  if (!hasBillContext) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <ReceiptText className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Selecione uma fatura</p>
          <p className="text-xs text-muted-foreground mt-1">Escolha um mês para ver os lançamentos</p>
        </div>
      </div>
    );
  }

  const filtered = transactions.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const billFromData = selectedBillId ? { id: selectedBillId } : null;

  // Find current bill status from transactions context — we'll read it from the bills query cache
  const billsData = queryClient.getQueryData<{ id: string; status: string }[]>(["bills", selectedCardId]);
  const currentBill = billsData?.find((b) => b.id === selectedBillId);
  const currentStatus = (currentBill?.status ?? "open") as "open" | "closed" | "paid" | "overdue";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">
              {MONTHS_PT[selectedBillMonth - 1]} {selectedBillYear}
            </h2>
            <p className="text-xs text-muted-foreground">
              {transactions.length} lançamento{transactions.length !== 1 ? "s" : ""} •{" "}
              <span className="font-semibold text-foreground">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedBillId && (
              <Select
                value={currentStatus}
                onValueChange={(v) =>
                  updateStatusMutation.mutate({
                    billId: selectedBillId,
                    status: v as "open" | "closed" | "paid" | "overdue",
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["open", "closed", "paid", "overdue"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {BILL_STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Lançar
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar lançamento..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhum resultado encontrado" : "Nenhum lançamento nesta fatura"}
            </p>
            {!search && (
              <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar lançamento
              </Button>
            )}
          </div>
        ) : (
          filtered.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onDelete={(target) => setDeleteTarget(target)}
            />
          ))
        )}
      </div>

      {/* Add transaction dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>
          <CardTransactionForm
            cardId={selectedCardId}
            billMonth={selectedBillMonth}
            billYear={selectedBillYear}
            onSuccess={() => {
              setFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ["card-transactions", selectedBillId] });
              queryClient.invalidateQueries({ queryKey: ["bills", selectedCardId] });
              queryClient.invalidateQueries({ queryKey: ["cards"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "group" ? "Remover parcelamento" : "Remover lançamento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "group"
                ? `Todas as parcelas de "${deleteTarget.title}" serão removidas de todas as faturas.`
                : `O lançamento "${(deleteTarget as any)?.tx?.title}" será removido desta fatura.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "group") {
                  deleteGroupMutation.mutate(deleteTarget.groupId);
                } else {
                  deleteSingleMutation.mutate({
                    id: deleteTarget.tx.id,
                    billId: deleteTarget.tx.bill_id,
                  });
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TransactionRow({
  tx,
  onDelete,
}: {
  tx: CreditCardTransaction;
  onDelete: (target: DeleteTarget) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
        tx.is_last_installment
          ? "border-primary/20 bg-primary/5"
          : "border-border/30 bg-muted/20 hover:bg-muted/40",
      )}
    >
      {/* Category dot */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: tx.category?.color
            ? `${tx.category.color}20`
            : "hsl(var(--muted))",
          color: tx.category?.color ?? "hsl(var(--muted-foreground))",
        }}
      >
        {tx.category?.icon ? (
          <CategoryIcon name={tx.category.icon} className="w-4 h-4" />
        ) : (
          <span className="text-xs">💳</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium truncate">{tx.title}</p>
          {tx.is_installment && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              {tx.installment_number}/{tx.installment_total}x
            </Badge>
          )}
          {tx.is_last_installment && tx.is_installment && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-primary/20 text-primary border-0">
              última
            </Badge>
          )}
          {tx.is_shared && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              compartilhado
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(tx.date + "T00:00:00").toLocaleDateString("pt-BR")}
          {tx.category && ` · ${tx.category.name}`}
        </p>
      </div>

      {/* Amount */}
      <p className="text-sm font-semibold tabular-nums shrink-0">
        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tx.amount)}
      </p>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="h-7 w-7 shrink-0">
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete({ type: "single", tx })}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remover esta parcela
          </DropdownMenuItem>
          {tx.is_installment && tx.installment_group_id && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() =>
                onDelete({ type: "group", groupId: tx.installment_group_id!, title: tx.title })
              }
            >
              <Layers className="w-4 h-4 mr-2" />
              Remover todas as parcelas
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
