"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, ReceiptText, Layers, Clock, Pencil, CheckCircle2, HandCoins, RotateCcw, Repeat, Lock } from "lucide-react";
import { cardsService } from "../services/cards.service";
import { useCardsStore } from "../stores/cards.store";
import { useAuthStore } from "@/stores/auth.store";
import { usePartner } from "@/hooks/use-partner";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { CardTransactionForm } from "./transaction-form";
import { EditCardTransactionForm } from "./edit-transaction-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { BILL_STATUS_META } from "../types";
import type { CreditCardTransaction } from "../types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type DeleteTarget =
  | { type: "single"; tx: CreditCardTransaction }
  | { type: "group"; groupId: string; title: string };

export function BillDetail() {
  const { selectedCardId, selectedBillId, selectedBillMonth, selectedBillYear } = useCardsStore();
  const { user, couple } = useAuthStore();
  const { partnerFirstName } = usePartner();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "forecast" | "installment">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CreditCardTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const hasBillContext = selectedCardId && selectedBillMonth && selectedBillYear;

  // Assina a mesma query das faturas que o BillList usa. Como React Query
  // deduplica por key, não há request extra — mas a reatividade volta:
  // qualquer invalidate em ["bills", selectedCardId] força o BillDetail
  // a rerenderizar com o status atualizado.
  const { data: bills = [] } = useQuery({
    queryKey: ["bills", selectedCardId],
    queryFn: () => cardsService.getBills(selectedCardId!),
    enabled: !!selectedCardId,
  });

  // Resolve o bill_id efetivo a partir do mês selecionado + cache de bills.
  // Isso cobre dois casos: (1) mês sem fatura ainda (selectedBillId é null
  // mas a fatura pode ter sido criada agora pela mutation), e (2) fatura
  // recém-deletada e recriada com outro id após o cleanup do recalculate.
  const activeBill = bills.find(
    (b) => b.month === selectedBillMonth && b.year === selectedBillYear,
  );
  const effectiveBillId = activeBill?.id ?? selectedBillId ?? null;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["card-transactions", effectiveBillId],
    queryFn: () => cardsService.getBillTransactions(effectiveBillId!),
    enabled: !!effectiveBillId,
  });

  const billInvalidates = [
    ["card-transactions", effectiveBillId],
    ["bills", selectedCardId],
    ["cards"],
  ];

  const deleteSingleMutation = useToastMutation({
    mutationFn: ({ id, billId }: { id: string; billId: string }) =>
      cardsService.deleteTransaction(id, billId),
    invalidateKeys: billInvalidates,
    successMessage: "Transação removida",
    errorMessage: "Erro ao remover transação",
    onSuccess: () => setDeleteTarget(null),
  });

  const deleteGroupMutation = useToastMutation({
    mutationFn: (groupId: string) => cardsService.deleteInstallmentGroup(groupId),
    invalidateKeys: billInvalidates,
    successMessage: "Parcelamento removido",
    errorMessage: "Erro ao remover parcelamento",
    onSuccess: () => setDeleteTarget(null),
  });

  const toggleForecastMutation = useToastMutation({
    mutationFn: ({ id, isForecast }: { id: string; isForecast: boolean }) =>
      cardsService.updateTransactionForecast(id, isForecast),
    invalidateKeys: [["card-transactions", effectiveBillId]],
    errorMessage: "Erro ao atualizar lançamento",
  });

  const toggleReimbursedMutation = useToastMutation({
    mutationFn: ({ id, billId, isReimbursed }: { id: string; billId: string; isReimbursed: boolean }) =>
      cardsService.updateTransactionReimbursed(id, billId, isReimbursed),
    invalidateKeys: billInvalidates,
    successMessage: "Reembolso atualizado",
    errorMessage: "Erro ao atualizar reembolso",
  });

  const updateStatusMutation = useToastMutation({
    mutationFn: ({ billId, status }: { billId: string; status: "open" | "closed" | "paid" | "overdue" }) =>
      cardsService.updateBillStatus(billId, status),
    invalidateKeys: [["bills", selectedCardId], ["cards"]],
    successMessage: "Status atualizado",
    errorMessage: "Erro ao atualizar status",
  });

  if (!hasBillContext) {
    return (
      <EmptyState
        variant="full"
        icon={ReceiptText}
        title="Selecione uma fatura"
        description="Escolha um mês para ver os lançamentos"
      />
    );
  }

  // Filtros aplicados em sequência: primeiro o modo (todos / só previsões /
  // só parcelados) e depois a busca textual no título.
  const filtered = transactions
    .filter((t) => {
      if (filterMode === "forecast") return t.is_forecast;
      if (filterMode === "installment") return t.is_installment;
      return true;
    })
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  // Contagens auxiliares para mostrar nos chips do filtro.
  const forecastCount = transactions.filter((t) => t.is_forecast).length;
  const installmentCount = transactions.filter((t) => t.is_installment).length;

  const total = transactions
    .filter((t) => !t.is_reimbursed)
    .reduce((s, t) => s + t.amount, 0);
  const myTotal = user
    ? transactions
        .filter((t) => t.user_id === user.id && !t.is_reimbursed)
        .reduce((s, t) => s + t.amount, 0)
    : total;
  const hasCouple = couple?.status === "active";

  // Status atual da fatura — usa o activeBill (derivado por mês/ano) ao
  // invés de selectedBillId para sobreviver a cleanups + recriações.
  const currentStatus = (activeBill?.status ?? "open") as "open" | "closed" | "paid" | "overdue";
  // Faturas em qualquer status diferente de "open" são finalizadas: o usuário
  // precisa reabri-las manualmente antes de adicionar novos lançamentos.
  // Se ainda não existe fatura no banco (mês "vazio"), o lançamento é
  // permitido — a fatura será criada on-demand pelo createTransaction.
  const isBillLocked = !!activeBill && currentStatus !== "open";
  const lockedLabel = BILL_STATUS_META[currentStatus]?.label.toLowerCase() ?? "fechada";

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
                {formatCurrency(total)}
              </span>
              {hasCouple && myTotal !== total && (
                <> •{" "}
                  <span className="font-semibold text-primary">
                    sua parte {formatCurrency(myTotal)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeBill && (
              <Select
                value={currentStatus}
                onValueChange={(v) =>
                  updateStatusMutation.mutate({
                    billId: activeBill.id,
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
              disabled={isBillLocked}
              title={isBillLocked ? `Fatura ${lockedLabel} — reabra para lançar` : undefined}
            >
              {isBillLocked ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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

        {/* Filtros: Todos / Só previsões / Só parcelados. Aparecem só quando
            há pelo menos um lançamento dos dois tipos na fatura. */}
        {(forecastCount > 0 || installmentCount > 0) && (
          <div className="flex gap-1 text-[11px]">
            <FilterChip
              label="Todos"
              count={transactions.length}
              active={filterMode === "all"}
              onClick={() => setFilterMode("all")}
            />
            {forecastCount > 0 && (
              <FilterChip
                icon={<Clock className="w-2.5 h-2.5" />}
                label="Previsão"
                count={forecastCount}
                active={filterMode === "forecast"}
                tone="orange"
                onClick={() =>
                  setFilterMode(filterMode === "forecast" ? "all" : "forecast")
                }
              />
            )}
            {installmentCount > 0 && (
              <FilterChip
                icon={<Layers className="w-2.5 h-2.5" />}
                label="Parceladas"
                count={installmentCount}
                active={filterMode === "installment"}
                tone="primary"
                onClick={() =>
                  setFilterMode(filterMode === "installment" ? "all" : "installment")
                }
              />
            )}
          </div>
        )}

        {isBillLocked && (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            <Lock className="w-3 h-3 shrink-0" />
            <span className="flex-1">
              Fatura {lockedLabel}. Altere o status para{" "}
              <span className="font-semibold text-foreground">Aberta</span>{" "}
              para adicionar lançamentos.
            </span>
            <Link
              href="/help?section=cartoes"
              className="font-medium text-primary hover:underline whitespace-nowrap"
            >
              Saiba mais
            </Link>
          </div>
        )}
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
              {search
                ? "Nenhum resultado encontrado"
                : filterMode === "forecast"
                ? "Nenhuma previsão nesta fatura"
                : filterMode === "installment"
                ? "Nenhuma parcela nesta fatura"
                : "Nenhum lançamento nesta fatura"}
            </p>
            {!search && filterMode === "all" && !isBillLocked && (
              <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar lançamento
              </Button>
            )}
            {filterMode !== "all" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={() => setFilterMode("all")}
              >
                Limpar filtro
              </Button>
            )}
          </div>
        ) : (
          filtered.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onEdit={(t) => setEditTarget(t)}
              onDelete={(target) => setDeleteTarget(target)}
              onToggleForecast={(id, val) => toggleForecastMutation.mutate({ id, isForecast: val })}
              onToggleReimbursed={(id, billId, val) =>
                toggleReimbursedMutation.mutate({ id, billId, isReimbursed: val })
              }
              currentUserId={user?.id ?? ""}
              partnerFirstName={partnerFirstName}
              hasCouple={hasCouple}
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
              queryClient.invalidateQueries({ queryKey: ["card-transactions", effectiveBillId] });
              queryClient.invalidateQueries({ queryKey: ["bills", selectedCardId] });
              queryClient.invalidateQueries({ queryKey: ["cards"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit transaction dialog (only for forecast transactions) */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar lançamento</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <EditCardTransactionForm
              tx={editTarget}
              onSuccess={() => {
                setEditTarget(null);
                queryClient.invalidateQueries({ queryKey: ["card-transactions", effectiveBillId] });
                queryClient.invalidateQueries({ queryKey: ["bills", selectedCardId] });
                queryClient.invalidateQueries({ queryKey: ["cards"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={deleteTarget?.type === "group" ? "Remover parcelamento" : "Remover lançamento"}
        isPending={deleteGroupMutation.isPending || deleteSingleMutation.isPending}
        description={
          deleteTarget?.type === "group"
            ? `Todas as parcelas de "${deleteTarget.title}" serão removidas de todas as faturas.`
            : `O lançamento "${deleteTarget?.tx?.title}" será removido desta fatura.`
        }
        onConfirm={() => {
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
      />
    </div>
  );
}

// Chip de filtro de uma linha só — comportamento de "toggle exclusivo".
// Clicar no chip ativo desmarca (volta pra "Todos"); clicar em outro troca.
function FilterChip({
  label,
  count,
  active,
  onClick,
  icon,
  tone,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  tone?: "orange" | "primary";
}) {
  const toneActive =
    tone === "orange"
      ? "bg-orange-400/15 text-orange-400 border-orange-400/30"
      : tone === "primary"
      ? "bg-primary/15 text-primary border-primary/30"
      : "bg-muted text-foreground border-border";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md border transition-colors",
        active
          ? toneActive + " font-semibold"
          : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted",
      )}
    >
      {icon}
      {label}
      <span className="opacity-60">({count})</span>
    </button>
  );
}

function TransactionRow({
  tx,
  onEdit,
  onDelete,
  onToggleForecast,
  onToggleReimbursed,
  currentUserId,
  partnerFirstName,
  hasCouple,
}: {
  tx: CreditCardTransaction;
  onEdit: (tx: CreditCardTransaction) => void;
  onDelete: (target: DeleteTarget) => void;
  onToggleForecast: (id: string, isForecast: boolean) => void;
  onToggleReimbursed: (id: string, billId: string, isReimbursed: boolean) => void;
  currentUserId: string;
  partnerFirstName: string;
  hasCouple: boolean;
}) {
  const isOwner = tx.user_id === currentUserId;
  const isLastInstallment = tx.is_installment && tx.is_last_installment;
  const titleColor = tx.is_reimbursed
    ? "text-muted-foreground"
    : isLastInstallment
    ? "text-[hsl(var(--success))]"
    : tx.is_forecast
    ? "text-orange-400"
    : undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
        tx.is_reimbursed
          ? "border-border/30 bg-muted/10 opacity-70"
          : tx.is_last_installment
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
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: "currentColor" }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={cn("text-sm font-medium truncate", titleColor)}>{tx.title}</p>
          {tx.is_installment && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              {tx.installment_number}/{tx.installment_total}x
            </Badge>
          )}
          {isLastInstallment && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-0">
              última
            </Badge>
          )}
          {tx.is_forecast && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-orange-400/15 text-orange-400 border-0 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              previsão
            </Badge>
          )}
          {tx.is_recurring && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-sky-400/15 text-sky-400 border-0 flex items-center gap-0.5">
              <Repeat className="w-2.5 h-2.5" />
              recorrente
            </Badge>
          )}
          {tx.is_reimbursed && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-0 flex items-center gap-0.5">
              <HandCoins className="w-2.5 h-2.5" />
              reembolsado
            </Badge>
          )}
          {hasCouple && (
            <Badge
              variant={isOwner ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
            >
              {isOwner ? "Você" : partnerFirstName}
            </Badge>
          )}
          {tx.is_shared && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              dividido
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(tx.date)}
          {tx.category && ` · ${tx.category.name}`}
        </p>
      </div>

      <p
        className={cn(
          "text-sm font-semibold tabular-nums shrink-0",
          tx.is_reimbursed && "line-through text-muted-foreground",
        )}
      >
        {formatCurrency(tx.amount)}
      </p>

      <RowActionsMenu
        actions={[
          {
            label: "Editar",
            icon: Pencil,
            onClick: () => onEdit(tx),
          },
          ...(tx.is_forecast
            ? [
                {
                  label: "Marcar como realizada",
                  icon: CheckCircle2,
                  onClick: () => onToggleForecast(tx.id, false),
                },
              ]
            : [
                {
                  label: "Marcar como previsão",
                  icon: Clock,
                  onClick: () => onToggleForecast(tx.id, true),
                },
              ]),
          tx.is_reimbursed
            ? {
                label: "Desfazer reembolso",
                icon: RotateCcw,
                onClick: () => onToggleReimbursed(tx.id, tx.bill_id, false),
              }
            : {
                label: "Marcar como reembolsada",
                icon: HandCoins,
                onClick: () => onToggleReimbursed(tx.id, tx.bill_id, true),
              },
          {
            label: "Remover esta parcela",
            icon: Trash2,
            destructive: true,
            separator: true,
            onClick: () => onDelete({ type: "single", tx }),
          },
          ...(tx.is_installment && tx.installment_group_id
            ? [{
                label: "Remover todas as parcelas",
                icon: Layers,
                destructive: true,
                onClick: () =>
                  onDelete({ type: "group", groupId: tx.installment_group_id!, title: tx.title }),
              }]
            : []),
        ]}
      />
    </div>
  );
}
