"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserRound, Repeat } from "lucide-react";
import { transactionSchema, type TransactionInput } from "@/schemas/transaction";
import { transactionsService } from "@/services/transactions.service";
import { categoriesService } from "@/services/categories.service";
import { useAuthStore } from "@/stores/auth.store";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Transaction } from "@/types";

type TransactionFormProps = {
  transaction?: Transaction | null;
  onSuccess?: () => void;
  /** ID of the partner — passed when couple is active */
  partnerId?: string;
  /** True when this form is already opened in "partner view" mode */
  isPartnerForm?: boolean;
};

export function TransactionForm({ transaction, onSuccess, partnerId, isPartnerForm = false }: TransactionFormProps) {
  const { user, couple } = useAuthStore();

  // UI-only state: whether to create this transaction for the partner
  const [forPartner, setForPartner] = useState(isPartnerForm);

  const targetUserId = forPartner && partnerId ? partnerId : user!.id;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useZodForm<typeof transactionSchema, TransactionInput>(transactionSchema, {
    defaultValues: {
      type: (transaction?.type === "income" ? "income" : "expense") as "income" | "expense",
      amount: transaction?.amount ?? undefined,
      description: transaction?.description ?? "",
      notes: transaction?.notes ?? "",
      date: transaction?.date ?? new Date().toISOString().split("T")[0],
      category_id: transaction?.category_id ?? null,
      account_id: transaction?.account_id ?? null,
      is_recurring: transaction?.is_recurring ?? false,
      status: transaction?.status ?? "completed",
      tags: transaction?.tags ?? [],
    },
  });

  const currentType = watch("type");
  const isRecurring = watch("is_recurring");

  const { data: categories } = useQuery({
    queryKey: ["categories", "transaction", user?.id, couple?.id, currentType],
    queryFn: () => categoriesService.getTransactionCategories(user!.id, currentType, couple?.id),
    enabled: !!user,
  });

  const mutation = useToastMutation({
    mutationFn: async (data: TransactionInput) => {
      if (transaction?.id) {
        // Em edição, NÃO sobrescrevemos os campos da série recorrente
        // (is_recurring, recurring_group_id, recurrence_type). Eles ficam
        // sob controle do banco — caso contrário cada edição apagaria o
        // vínculo da série e a propagação pra frente deixaria de funcionar.
        const updatePayload = {
          type: data.type,
          amount: data.amount,
          description: data.description,
          notes: data.notes,
          date: data.date,
          category_id: data.category_id,
          account_id: data.account_id,
          status: data.status,
          tags: data.tags,
          user_id: targetUserId,
          couple_id: couple?.id ?? null,
        };
        return transactionsService.updateTransaction(transaction.id, updatePayload);
      }

      const createPayload = {
        ...data,
        user_id: targetUserId,
        couple_id: couple?.id ?? null,
        is_shared: false,
        attachments: [],
        // recurrence_type não é mais escolhido pelo usuário; recorrentes
        // são sempre mensais com horizonte de 6 meses.
        recurrence_type: null,
        recurrence_end_date: null,
        recurring_group_id: null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return transactionsService.createTransactionWithRecurrence(createPayload as any);
    },
    invalidateKeys: [
      ["transactions"],
      ["monthly-stats"],
      ["cash-flow"],
      ["category-breakdown"],
      ["total-balance"],
    ],
    successMessage: transaction ? "Transação atualizada!" : "Transação criada!",
    errorMessage: "Erro ao salvar transação",
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as unknown as TransactionInput))} className="space-y-4">
      {/* Type */}
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Tabs value={field.value} onValueChange={field.onChange}>
              <TabsList className="w-full">
                <TabsTrigger value="income" className="flex-1 data-[state=active]:text-success">
                  Receita
                </TabsTrigger>
                <TabsTrigger value="expense" className="flex-1 data-[state=active]:text-expense">
                  Despesa
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          placeholder="Ex: Supermercado, Salário..."
          error={!!errors.description}
          {...register("description")}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Valor (R$)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          placeholder="0,00"
          error={!!errors.amount}
          {...register("amount")}
        />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Data</Label>
        <Input id="date" type="date" error={!!errors.date} {...register("date")} />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Recurring — sempre mensal, propaga 6 meses adiante por padrão e
          o seed automático recria nos meses futuros conforme o usuário
          os acessa. Edição não dispara propagação (só o create). */}
      <div className="space-y-2 p-3 rounded-xl border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <Label
              htmlFor="is_recurring"
              className="flex items-center gap-1.5 text-sky-400"
            >
              <Repeat className="w-3.5 h-3.5" />
              Recorrente
            </Label>
            <p className="text-xs text-muted-foreground">
              Replica nos próximos 6 meses, e novos meses ganham a cópia
              automaticamente ao lançar a 1ª transação ali.
            </p>
          </div>
          <Controller
            name="is_recurring"
            control={control}
            render={({ field }) => (
              <Switch
                id="is_recurring"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={!!transaction?.id}
              />
            )}
          />
        </div>
        {!!transaction?.id && isRecurring && (
          <p className="text-[11px] text-muted-foreground">
            Editar valor, descrição, categoria, conta ou observações dessa
            transação <span className="font-semibold">atualiza também</span>{" "}
            as cópias dos meses futuros. Data e status ficam por instância.
          </p>
        )}
      </div>

      {/* For partner toggle — only when couple is active and not already in partner view */}
      {partnerId && !isPartnerForm && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label htmlFor="for_partner" className="flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5" />
              Criar para o parceiro(a)
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              A transação será registrada na conta do parceiro(a)
            </p>
          </div>
          <Switch
            id="for_partner"
            checked={forPartner}
            onCheckedChange={setForPartner}
          />
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          placeholder="Observações opcionais..."
          rows={2}
          {...register("notes")}
        />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="animate-spin" /> Salvando...</>
        ) : (
          transaction ? "Atualizar" : "Salvar transação"
        )}
      </Button>
    </form>
  );
}
