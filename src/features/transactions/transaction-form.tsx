"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { transactionSchema, type TransactionInput } from "@/schemas/transaction";
import { transactionsService } from "@/services/transactions.service";
import { categoriesService } from "@/services/categories.service";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
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
};

export function TransactionForm({ transaction, onSuccess }: TransactionFormProps) {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: (transaction?.type === "income" ? "income" : "expense") as "income" | "expense",
      amount: transaction?.amount ?? undefined,
      description: transaction?.description ?? "",
      notes: transaction?.notes ?? "",
      date: transaction?.date ?? new Date().toISOString().split("T")[0],
      category_id: transaction?.category_id ?? null,
      account_id: transaction?.account_id ?? null,
      is_shared: transaction?.is_shared ?? (viewMode === "couple"),
      is_recurring: transaction?.is_recurring ?? false,
      status: transaction?.status ?? "completed",
      tags: transaction?.tags ?? [],
    },
  });

  const currentType = watch("type");
  const isRecurring = watch("is_recurring");

  const { data: categories } = useQuery({
    queryKey: ["categories", user?.id, currentType],
    queryFn: () => categoriesService.getCategories(user!.id, currentType as any, couple?.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (data: TransactionInput) => {
      const payload = {
        ...data,
        user_id: user!.id,
        couple_id: couple?.id ?? null,
        attachments: [],
        deleted_at: null,
      };

      if (transaction?.id) {
        return transactionsService.updateTransaction(transaction.id, payload);
      }
      return transactionsService.createTransaction(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      queryClient.invalidateQueries({ queryKey: ["category-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["total-balance"] });
      toast.success(transaction ? "Transação atualizada!" : "Transação criada!");
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao salvar transação"),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as TransactionInput))} className="space-y-4">
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

      {/* Recurring */}
      <div className="flex items-center justify-between">
        <Label htmlFor="is_recurring">Recorrente</Label>
        <Controller
          name="is_recurring"
          control={control}
          render={({ field }) => (
            <Switch
              id="is_recurring"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {isRecurring && (
        <div className="space-y-2">
          <Label>Frequência</Label>
          <Controller
            name="recurrence_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Shared (if couple exists) */}
      {couple && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label htmlFor="is_shared">Compartilhar com casal</Label>
            <p className="text-xs text-muted-foreground">Visível para seu parceiro(a)</p>
          </div>
          <Controller
            name="is_shared"
            control={control}
            render={({ field }) => (
              <Switch
                id="is_shared"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
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
