"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2, UserRound } from "lucide-react";
import { cardTransactionSchema, type CardTransactionInput } from "../schemas/card.schema";
import { cardsService } from "../services/cards.service";
import { useAuthStore } from "@/stores/auth.store";
import { usePartner } from "@/hooks/use-partner";
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
import { cn, formatCurrency } from "@/lib/utils";

type CardTransactionFormProps = {
  cardId: string;
  billMonth: number;
  billYear: number;
  onSuccess?: () => void;
};

export function CardTransactionForm({ cardId, billMonth, billYear, onSuccess }: CardTransactionFormProps) {
  const { user, couple } = useAuthStore();
  const { partnerId } = usePartner();

  // UI-only toggles — not part of the Zod schema
  const [forPartner, setForPartner] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useZodForm<typeof cardTransactionSchema, CardTransactionInput>(cardTransactionSchema, {
    defaultValues: {
      title: "",
      description: "",
      amount: undefined,
      category_id: null,
      date: new Date().toISOString().split("T")[0],
      is_installment: false,
      installment_total: 1,
      is_shared: false,
      is_forecast: false,
    },
  });

  const isInstallment = watch("is_installment");
  const isShared = watch("is_shared");
  const installmentTotal = watch("installment_total");
  const amount = watch("amount");

  const { data: categories } = useQuery({
    queryKey: ["categories", user?.id, "expense"],
    queryFn: () => categoriesService.getCategories(user!.id, "expense", couple?.id),
    enabled: !!user,
  });

  const mutation = useToastMutation({
    mutationFn: async (data: CardTransactionInput) => {
      // "Lançar para o parceiro" — full amount, partner's user_id
      if (forPartner && partnerId && couple?.id) {
        return cardsService.createTransaction(
          { ...data, is_shared: false },
          cardId, billMonth, billYear, partnerId, couple.id
        );
      }

      // "Dividir com casal" — 50/50 split
      if (data.is_shared && partnerId && couple?.id) {
        return cardsService.splitTransaction(
          data, cardId, billMonth, billYear, user!.id, partnerId, couple.id
        );
      }

      // Regular transaction
      return cardsService.createTransaction(
        data, cardId, billMonth, billYear, user!.id, couple?.id ?? null,
      );
    },
    invalidateKeys: [
      ["card-transactions"],
      ["bills"],
      ["cards"],
    ],
    successMessage: "Lançamento criado!",
    errorMessage: "Erro ao criar lançamento",
    onSuccess: () => onSuccess?.(),
  });

  const perInstallment =
    isInstallment && installmentTotal > 1 && amount
      ? +(amount / installmentTotal).toFixed(2)
      : null;

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as CardTransactionInput))} className="space-y-4">
      {/* Title */}
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
        {perInstallment && (
          <p className="text-xs text-muted-foreground">
            ≈{" "}
            {formatCurrency(perInstallment)}{" "}
            por parcela
          </p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Data da compra</Label>
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

      {/* Installment toggle */}
      <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is_installment">Parcelado</Label>
            <p className="text-xs text-muted-foreground">Dividir em múltiplas faturas</p>
          </div>
          <Controller
            name="is_installment"
            control={control}
            render={({ field }) => (
              <Switch id="is_installment" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {isInstallment && (
          <div className="space-y-2">
            <Label htmlFor="installment_total">Número de parcelas</Label>
            <Input
              id="installment_total"
              type="number"
              min={2}
              max={48}
              error={!!errors.installment_total}
              {...register("installment_total")}
            />
            {errors.installment_total && (
              <p className="text-xs text-destructive">{errors.installment_total.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Forecast toggle */}
      <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is_forecast" className="text-orange-400">Previsão</Label>
            <p className="text-xs text-muted-foreground">Lançamento estimado, ainda não confirmado</p>
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

      {/* Couple options — only shown when in an active couple */}
      {partnerId && (
        <div className="space-y-2 p-3 rounded-xl border border-border/50 bg-muted/20">
          {/* Dividir com casal — disabled when forPartner is on */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_shared" className={forPartner ? "opacity-40" : undefined}>
                Dividir com casal
              </Label>
              <p className="text-xs text-muted-foreground">Cada um paga metade do valor</p>
            </div>
            <Controller
              name="is_shared"
              control={control}
              render={({ field }) => (
                <Switch
                  id="is_shared"
                  checked={field.value && !forPartner}
                  onCheckedChange={(v) => {
                    field.onChange(v);
                    if (v) setForPartner(false);
                  }}
                  disabled={forPartner}
                />
              )}
            />
          </div>

          {/* Lançar para o parceiro — disabled when is_shared is on */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div>
              <Label htmlFor="for_partner" className={cn("flex items-center gap-1.5", isShared && !forPartner ? "opacity-40" : undefined)}>
                <UserRound className="w-3.5 h-3.5" />
                Lançar para o parceiro(a)
              </Label>
              <p className="text-xs text-muted-foreground">
                Valor inteiro na conta do parceiro(a)
              </p>
            </div>
            <Switch
              id="for_partner"
              checked={forPartner}
              onCheckedChange={(v) => {
                setForPartner(v);
                if (v) {
                  // reset is_shared when switching to for_partner mode
                }
              }}
              disabled={isShared && !forPartner}
            />
          </div>
        </div>
      )}

      {/* Description */}
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
          "Criar lançamento"
        )}
      </Button>
    </form>
  );
}
