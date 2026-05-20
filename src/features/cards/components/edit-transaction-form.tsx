"use client";

import { Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { cardTransactionEditSchema, type CardTransactionEditInput } from "../schemas/card.schema";
import { cardsService } from "../services/cards.service";
import { useAuthStore } from "@/stores/auth.store";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { categoriesService } from "@/services/categories.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CategoryIcon } from "@/components/shared/category-icon";
import type { CreditCardTransaction } from "../types";

type EditCardTransactionFormProps = {
  tx: CreditCardTransaction;
  onSuccess?: () => void;
};

export function EditCardTransactionForm({ tx, onSuccess }: EditCardTransactionFormProps) {
  const { user, couple } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useZodForm<typeof cardTransactionEditSchema, CardTransactionEditInput>(cardTransactionEditSchema, {
    defaultValues: {
      title: tx.title,
      description: tx.description ?? "",
      amount: tx.amount,
      category_id: tx.category_id,
      date: tx.date,
      is_forecast: tx.is_forecast,
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", user?.id, "expense"],
    queryFn: () => categoriesService.getCategories(user!.id, "expense", couple?.id),
    enabled: !!user,
  });

  const mutation = useToastMutation({
    mutationFn: (data: CardTransactionEditInput) =>
      cardsService.updateTransaction(tx.id, tx.bill_id, data),
    invalidateKeys: [
      ["card-transactions"],
      ["bills"],
      ["cards"],
    ],
    successMessage: "Lançamento atualizado!",
    errorMessage: "Erro ao atualizar lançamento",
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data as CardTransactionEditInput))}
      className="space-y-4"
    >
      {tx.is_installment && (
        <p className="text-xs text-muted-foreground p-2 rounded-md bg-muted/30 border border-border/40">
          Esta é a parcela {tx.installment_number}/{tx.installment_total}. As
          alterações afetam apenas esta parcela.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          placeholder="Ex: Netflix, Mercado, Amazon..."
          error={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="date">Data da compra</Label>
        <Input id="date" type="date" error={!!errors.date} {...register("date")} />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? "none"}
              onValueChange={(v) => field.onChange(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      {cat.icon && (
                        <CategoryIcon name={cat.icon} className="w-4 h-4 shrink-0" />
                      )}
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is_forecast" className="text-orange-400">Previsão</Label>
            <p className="text-xs text-muted-foreground">
              Desative para marcar como realizada
            </p>
          </div>
          <Controller
            name="is_forecast"
            control={control}
            render={({ field }) => (
              <Switch id="is_forecast" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Observação (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Observações sobre o lançamento..."
          rows={2}
          {...register("description")}
        />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="animate-spin w-4 h-4 mr-2" />Salvando...</>
        ) : (
          "Salvar alterações"
        )}
      </Button>
    </form>
  );
}
