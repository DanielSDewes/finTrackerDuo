"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Search, ArrowUpRight, ArrowDownRight,
  Trash2, Pencil, Calendar, Users, CreditCard,
  TrendingUp, TrendingDown, Repeat,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { usePartner } from "@/hooks/use-partner";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { transactionsService } from "@/services/transactions.service";
import { cardsService } from "@/features/cards/services/cards.service";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { TransactionForm } from "./transaction-form";
import type { Transaction, TransactionStatus } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

// Opções dos combos de status. Cada card (Receitas e Despesas) tem o seu, com
// contagem própria: recortar as despesas pendentes não mexe nas receitas.
// "all" = sem filtro; os demais espelham os valores da coluna `status`.
// Os combos recortam apenas as LISTAS — os totais de cada card e o saldo do
// mês são calculados sobre o mês inteiro, independentes deles.
const STATUS_FILTERS: { value: TransactionStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "completed", label: "Concluídas" },
  { value: "cancelled", label: "Canceladas" },
];

/**
 * Combo de status de um card. Recorta apenas a lista daquele card — o total
 * exibido no cabeçalho e o saldo do mês são do mês inteiro, de propósito.
 */
function StatusFilterSelect({
  value,
  onChange,
  counts,
  label,
}: {
  value: TransactionStatus | "all";
  onChange: (value: TransactionStatus | "all") => void;
  counts: Record<TransactionStatus | "all", number>;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TransactionStatus | "all")}>
      <SelectTrigger
        className="h-7 w-full text-xs"
        aria-label={`Filtrar ${label} por status`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_FILTERS.map(({ value: v, label: optLabel }) => (
          <SelectItem key={v} value={v} className="text-xs">
            {optLabel}
            <span className="text-[hsl(var(--muted-foreground))] tabular-nums">
              {" "}
              ({counts[v]})
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface TransactionRowProps {
  transaction: Transaction;
  type: "income" | "expense";
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onDeleteGroup: (t: Transaction) => void;
  /** Modo "Ver como Parceiro": esconde o menu de ações (lente só leitura). */
  readOnly?: boolean;
}

function TransactionRow({ transaction: tx, type, onEdit, onDelete, onDeleteGroup, readOnly = false }: TransactionRowProps) {
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
          <Badge variant={statusVariants[tx.status] ?? "outline"} className="text-[10px] py-0 h-4 shrink-0">
            {tx.status === "completed" ? "Concluída" : tx.status === "pending" ? "Pendente" : "Cancelada"}
          </Badge>
          {tx.is_recurring && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-sky-400/15 text-sky-400 border-0 flex items-center gap-0.5">
              <Repeat className="w-2.5 h-2.5" />
              recorrente
            </Badge>
          )}
          {tx.is_installment && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              {tx.installment_number}/{tx.installment_total}x
            </Badge>
          )}
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

        {!readOnly && (
          <RowActionsMenu
            triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
            actions={[
              { label: "Editar", icon: Pencil, onClick: () => onEdit(tx) },
              { label: "Excluir", icon: Trash2, destructive: true, onClick: () => onDelete(tx.id) },
              ...(tx.is_installment && tx.installment_group_id
                ? [{
                    label: "Excluir parcelamento",
                    icon: Trash2,
                    destructive: true,
                    onClick: () => onDeleteGroup(tx),
                  }]
                : []),
            ]}
          />
        )}
      </div>
    </motion.div>
  );
}

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

export function TransactionsView() {
  const { user, couple } = useAuthStore();
  const { selectedMonth, setSelectedMonth } = useUIStore();
  const { partner, partnerId } = usePartner();
  // Modo global "Ver como Parceiro": força a visão do parceiro em só leitura,
  // sobrepondo (e escondendo) o toggle local desta tela.
  const { isPartnerView, readOnly } = useScopeFilter();

  const [viewingPartner, setViewingPartner] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Alvo do "Excluir parcelamento" — guarda a transação pra mostrar o total
  // de parcelas no texto de confirmação.
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  // Um filtro por card: receitas e despesas se investigam separado (ver só as
  // despesas pendentes não deveria mexer na lista de receitas).
  const [incomeStatus, setIncomeStatus] = useState<TransactionStatus | "all">("all");
  const [expenseStatus, setExpenseStatus] = useState<TransactionStatus | "all">("all");

  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = getMonthWindow(selectedMonth);

  const [year, monthNum] = selectedMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).toISOString().split("T")[0];

  // Visão do parceiro: pelo modo global (só leitura) OU pelo toggle local
  // (leitura+escrita, quando não está no modo global). No modo global ignoramos
  // o toggle local para evitar conflito.
  const effectiveViewingPartner = isPartnerView || (viewingPartner && !isPartnerView);
  // When viewing partner, query their userId instead of ours
  const activeUserId = effectiveViewingPartner && partnerId ? partnerId : (user?.id ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", activeUserId, couple?.id, selectedMonth],
    queryFn: () =>
      transactionsService.getTransactions(
        activeUserId,
        couple?.id ?? null,
        { dateFrom: `${selectedMonth}-01`, dateTo: lastDay },
        { page: 1, pageSize: 500 },
        { field: "date", direction: "desc" },
        false
      ),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Faturas de cartão do mês — exibidas como "despesas virtuais" no card
  // Despesas. A invalidação por prefix ["cards"] (acionada por qualquer
  // mutação de transação de cartão) refresca essa lista automaticamente,
  // espelhando o comportamento do dashboard.
  const { data: cardsSummary = [], isLoading: loadingCards } = useQuery({
    queryKey: ["cards", "summary", activeUserId, couple?.id, selectedMonth],
    queryFn: () =>
      cardsService.getCardsSummary(
        activeUserId,
        couple?.id ?? null,
        monthNum,
        year,
        false,
      ),
    enabled: !!user && !!activeUserId,
    staleTime: 60_000,
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => transactionsService.deleteTransaction(id, viewingPartner),
    invalidateKeys: [["transactions"], ["monthly-stats"], ["cash-flow"]],
    successMessage: "Transação excluída",
    errorMessage: "Erro ao excluir transação",
    onSuccess: () => setDeleteId(null),
  });

  const deleteGroupMutation = useToastMutation({
    mutationFn: (groupId: string) => transactionsService.deleteInstallmentGroup(groupId),
    invalidateKeys: [["transactions"], ["transactions-month"], ["monthly-stats"], ["cash-flow"]],
    successMessage: "Parcelamento excluído",
    errorMessage: "Erro ao excluir parcelamento",
    onSuccess: () => setDeleteGroupTarget(null),
  });

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormOpen(true);
  };

  const monthTransactions = data?.data ?? [];

  // A busca vem primeiro e vale para os dois cards; o status é por card. Assim
  // os contadores de cada combo mostram quanto aquele status renderia naquele
  // card, dentro da busca atual.
  const searched = monthTransactions.filter(
    (tx) => !search || tx.description.toLowerCase().includes(search.toLowerCase()),
  );

  const searchedIncome = searched.filter((t) => t.type === "income");
  const searchedExpense = searched.filter((t) => t.type === "expense");

  const countsByStatus = (
    list: Transaction[],
  ): Record<TransactionStatus | "all", number> => ({
    all: list.length,
    pending: list.filter((t) => t.status === "pending").length,
    completed: list.filter((t) => t.status === "completed").length,
    cancelled: list.filter((t) => t.status === "cancelled").length,
  });

  const incomeCounts = countsByStatus(searchedIncome);
  const expenseCounts = countsByStatus(searchedExpense);

  const incomeList = searchedIncome.filter(
    (tx) => incomeStatus === "all" || tx.status === incomeStatus,
  );
  const expenseList = searchedExpense.filter(
    (tx) => expenseStatus === "all" || tx.status === expenseStatus,
  );

  // Recorte ativo por card — decide o texto de lista vazia, o "X de Y" e, no
  // card de despesas, a exibição das linhas de fatura.
  const incomeFiltered = !!search || incomeStatus !== "all";
  const expenseFiltered = !!search || expenseStatus !== "all";
  const anyFilterActive = incomeFiltered || expenseFiltered;

  // Faturas de cartão do mês: "despesas virtuais" agregadas, sem status por
  // lançamento. Entram sempre no total, mas só aparecem NA LISTA quando o card
  // de despesas não está recortado — não faz sentido exibi-las ao procurar uma
  // transação específica ou ao isolar as pendentes.
  const monthCardBills = cardsSummary.filter((c) => c.monthTotal > 0);
  const cardBillRows = !expenseFiltered ? monthCardBills : [];

  // TOTAIS E SALDO SÃO DO MÊS INTEIRO — deliberadamente indiferentes à busca e
  // ao filtro de status. Quanto entrou e quanto saiu no mês é um fato do mês;
  // não pode mudar porque o usuário foi olhar só as pendentes. O filtro recorta
  // as listas abaixo, e os contadores dos cards mostram "X de Y" pra deixar
  // claro que a lista é um recorte do total exibido.
  const incomeTotal = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const txExpenseTotal = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const cardExpenseTotal = monthCardBills.reduce((s, c) => s + c.monthTotal, 0);
  const expenseTotal = txExpenseTotal + cardExpenseTotal;
  const balance = incomeTotal - expenseTotal;

  // Quantidades do mês, para o "X de Y" dos cabeçalhos.
  const monthIncomeCount = monthTransactions.filter((t) => t.type === "income").length;
  const monthExpenseCount =
    monthTransactions.filter((t) => t.type === "expense").length + monthCardBills.length;

  const selectedMonthLabel = new Date(Date.UTC(year, monthNum - 1, 1)).toLocaleDateString(
    "pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }
  );

  return (
    <div>
      <Header
        title="Transações"
        subtitle={
          effectiveViewingPartner && partner
            ? `Transações de ${partner.name}`
            : "Gerencie suas movimentações financeiras por mês"
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-lg">
            <div className="relative flex-1 sm:max-w-xs">
              <Input
                placeholder="Buscar no mês selecionado..."
                leftIcon={<Search />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Partner view toggle — escondido no modo global "Ver como
                Parceiro", que já força a visão do parceiro (só leitura). */}
            {partnerId && !isPartnerView && (
              <Button
                variant={viewingPartner ? "default" : "outline"}
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => {
                  setViewingPartner((v) => !v);
                  setSearch("");
                  setIncomeStatus("all");
                  setExpenseStatus("all");
                  setFormOpen(false);
                  setEditingTransaction(null);
                }}
              >
                <Users className="w-4 h-4" />
                {viewingPartner ? "Minhas transações" : `Ver transações de ${partner?.name?.split(" ")[0]}`}
              </Button>
            )}
          </div>

          {!readOnly && (
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
                    {viewingPartner && partner && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        — {partner.name}
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <TransactionForm
                  transaction={editingTransaction}
                  partnerId={partnerId ?? undefined}
                  isPartnerForm={viewingPartner}
                  onSuccess={() => {
                    setFormOpen(false);
                    setEditingTransaction(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
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
                  ({incomeList.length + expenseList.length}
                  {anyFilterActive && ` de ${monthTransactions.length}`} transaç
                  {incomeList.length + expenseList.length === 1 ? "ão" : "ões"})
                </span>
              )}
            </div>

            {/* Saldo do mês */}
            {!isLoading && !loadingCards && (incomeTotal > 0 || expenseTotal > 0) && (
              <Card
                className={cn(
                  "mb-4 border-2 transition-colors",
                  balance >= 0
                    ? "border-[hsl(var(--primary)/0.3)] hover:border-[hsl(var(--primary)/0.5)]"
                    : "border-[hsl(var(--expense)/0.3)] hover:border-[hsl(var(--expense)/0.5)]",
                )}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        balance >= 0
                          ? "bg-[hsl(var(--primary)/0.1)]"
                          : "bg-[hsl(var(--expense)/0.1)]",
                      )}
                    >
                      {balance >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-[hsl(var(--primary))]" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-[hsl(var(--expense))]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                        Saldo do mês
                      </p>
                      <p
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          balance >= 0
                            ? "text-[hsl(var(--primary))]"
                            : "text-[hsl(var(--expense))]",
                        )}
                      >
                        {balance >= 0 ? "+" : ""}
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                      Receitas − Despesas
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
                      <span className="text-[hsl(var(--success))] font-semibold">
                        {formatCurrency(incomeTotal)}
                      </span>
                      {" − "}
                      <span className="text-[hsl(var(--expense))] font-semibold">
                        {formatCurrency(expenseTotal)}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receitas */}
              <Card className="border-[hsl(var(--success)/0.25)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[hsl(var(--success))]">
                      Receitas
                      {!isLoading && monthIncomeCount > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                          ({incomeList.length}
                          {incomeFiltered && ` de ${monthIncomeCount}`})
                        </span>
                      )}
                    </CardTitle>
                    {!isLoading && incomeTotal > 0 && (
                      <span className="text-sm font-bold text-[hsl(var(--success))]">
                        +{formatCurrency(incomeTotal)}
                      </span>
                    )}
                  </div>
                  {!isLoading && monthIncomeCount > 0 && (
                    <div className="pt-1.5 max-w-[11rem]">
                      <StatusFilterSelect
                        value={incomeStatus}
                        onChange={setIncomeStatus}
                        counts={incomeCounts}
                        label="receitas"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  {isLoading ? (
                    <TransactionListSkeleton />
                  ) : incomeList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ArrowUpRight className="w-8 h-8 text-[hsl(var(--muted-foreground)/0.3)] mb-2" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {incomeFiltered ? "Nenhuma receita encontrada" : "Nenhuma receita neste mês"}
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
                            onDeleteGroup={setDeleteGroupTarget}
                            readOnly={readOnly}
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
                      {!isLoading && !loadingCards && monthExpenseCount > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                          ({expenseList.length + cardBillRows.length}
                          {expenseFiltered && ` de ${monthExpenseCount}`})
                        </span>
                      )}
                    </CardTitle>
                    {!isLoading && !loadingCards && expenseTotal > 0 && (
                      <span className="text-sm font-bold text-[hsl(var(--expense))]">
                        -{formatCurrency(expenseTotal)}
                      </span>
                    )}
                  </div>
                  {!isLoading && !loadingCards && monthExpenseCount > 0 && (
                    <div className="pt-1.5 max-w-[11rem]">
                      <StatusFilterSelect
                        value={expenseStatus}
                        onChange={setExpenseStatus}
                        counts={expenseCounts}
                        label="despesas"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0 px-3 pb-3">
                  {isLoading || loadingCards ? (
                    <TransactionListSkeleton />
                  ) : expenseList.length === 0 && cardBillRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ArrowDownRight className="w-8 h-8 text-[hsl(var(--muted-foreground)/0.3)] mb-2" />
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {expenseFiltered ? "Nenhuma despesa encontrada" : "Nenhuma despesa neste mês"}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      <div className="space-y-0.5 max-h-[480px] overflow-y-auto pr-0.5">
                        {/* Faturas de cartão como "despesas virtuais" — somam
                            automaticamente conforme novos lançamentos são feitos
                            via invalidação por prefix ["cards"]. */}
                        {cardBillRows.map(({ card, monthTotal, billStatus }) => (
                          <Link
                            key={`bill-${card.id}`}
                            href="/cards"
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors cursor-pointer"
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${card.color}33` }}
                            >
                              <CreditCard
                                className="w-4 h-4"
                                style={{ color: card.color }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-medium truncate">
                                  Fatura {card.name}
                                </p>
                                <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
                                  cartão
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {billStatus && (
                                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                    {billStatus === "open"
                                      ? "aberta"
                                      : billStatus === "closed"
                                      ? "fechada"
                                      : billStatus === "paid"
                                      ? "paga"
                                      : "atrasada"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-[hsl(var(--expense))] shrink-0">
                              -{formatCurrency(monthTotal)}
                            </p>
                          </Link>
                        ))}

                        {/* Transações avulsas */}
                        {expenseList.map((tx) => (
                          <TransactionRow
                            key={tx.id}
                            transaction={tx}
                            type="expense"
                            onEdit={handleEdit}
                            onDelete={setDeleteId}
                            onDeleteGroup={setDeleteGroupTarget}
                            readOnly={readOnly}
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

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir transação"
        confirmLabel="Excluir"
        description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />

      <ConfirmDeleteDialog
        open={!!deleteGroupTarget}
        onOpenChange={(open) => !open && setDeleteGroupTarget(null)}
        title="Excluir parcelamento"
        confirmLabel="Excluir todas"
        description={`Exclui todas as ${deleteGroupTarget?.installment_total ?? ""} parcelas desta série — inclusive as de meses anteriores e futuros. Esta ação não pode ser desfeita.`}
        isPending={deleteGroupMutation.isPending}
        onConfirm={() =>
          deleteGroupTarget?.installment_group_id &&
          deleteGroupMutation.mutate(deleteGroupTarget.installment_group_id)
        }
      />
    </div>
  );
}
