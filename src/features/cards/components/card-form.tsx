"use client";

import { Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { creditCardSchema, type CreditCardInput } from "../schemas/card.schema";
import { cardsService } from "../services/cards.service";
import { useAuthStore } from "@/stores/auth.store";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardVisual } from "./card-visual";
import { CARD_PRESET_COLORS } from "../types";
import type { CreditCard } from "../types";
import { cn } from "@/lib/utils";

type CardFormProps = {
  card?: CreditCard | null;
  onSuccess?: () => void;
};

export function CardForm({ card, onSuccess }: CardFormProps) {
  const { user, couple } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useZodForm<typeof creditCardSchema, CreditCardInput>(creditCardSchema, {
    defaultValues: {
      name: card?.name ?? "",
      brand: card?.brand ?? "other",
      color: card?.color ?? CARD_PRESET_COLORS[0],
      limit_amount: card?.limit_amount ?? undefined,
      closing_day: card?.closing_day ?? 1,
      due_day: card?.due_day ?? 10,
      is_shared: card?.is_shared ?? false,
    },
  });

  const preview = watch();

  const mutation = useToastMutation({
    mutationFn: async (data: CreditCardInput) => {
      if (card?.id) {
        return cardsService.updateCard(card.id, data);
      }
      return cardsService.createCard(data, user!.id, couple?.id ?? null);
    },
    invalidateKeys: [["cards"]],
    successMessage: card ? "Cartão atualizado!" : "Cartão criado!",
    errorMessage: "Erro ao salvar cartão",
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as CreditCardInput))} className="space-y-5">
      {/* Preview */}
      <div className="flex justify-center">
        <CardVisual
          card={{
            id: card?.id ?? "preview",
            user_id: user?.id ?? "",
            couple_id: couple?.id ?? null,
            name: preview.name || "Novo Cartão",
            brand: preview.brand ?? "other",
            color: preview.color ?? CARD_PRESET_COLORS[0],
            limit_amount: preview.limit_amount ?? 0,
            closing_day: preview.closing_day ?? 1,
            due_day: preview.due_day ?? 10,
            is_shared: preview.is_shared ?? false,
            is_active: true,
            created_at: "",
            updated_at: "",
          }}
          size="md"
        />
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do cartão</Label>
        <Input id="name" placeholder="Ex: Nubank, Inter, C6..." {...register("name")} error={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label>Bandeira</Label>
        <Controller
          name="brand"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="mastercard">Mastercard</SelectItem>
                <SelectItem value="elo">Elo</SelectItem>
                <SelectItem value="amex">American Express</SelectItem>
                <SelectItem value="hipercard">Hipercard</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>Cor do cartão</Label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {CARD_PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => field.onChange(c)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    field.value === c
                      ? "border-primary scale-110 shadow-md"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="w-8 h-8 rounded-full border-2 border-border cursor-pointer"
                title="Cor personalizada"
              />
            </div>
          )}
        />
      </div>

      {/* Limit */}
      <div className="space-y-2">
        <Label htmlFor="limit_amount">Limite (R$)</Label>
        <Input
          id="limit_amount"
          type="number"
          step="0.01"
          placeholder="5000,00"
          error={!!errors.limit_amount}
          {...register("limit_amount")}
        />
        {errors.limit_amount && <p className="text-xs text-destructive">{errors.limit_amount.message}</p>}
      </div>

      {/* Days */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="closing_day">Dia de fechamento</Label>
          <Input
            id="closing_day"
            type="number"
            min={1}
            max={31}
            error={!!errors.closing_day}
            {...register("closing_day")}
          />
          {errors.closing_day && <p className="text-xs text-destructive">{errors.closing_day.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_day">Dia de vencimento</Label>
          <Input
            id="due_day"
            type="number"
            min={1}
            max={31}
            error={!!errors.due_day}
            {...register("due_day")}
          />
          {errors.due_day && <p className="text-xs text-destructive">{errors.due_day.message}</p>}
        </div>
      </div>

      {/* Shared */}
      {couple && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label htmlFor="is_shared">Compartilhar com casal</Label>
            <p className="text-xs text-muted-foreground">Parceiro(a) pode ver e lançar neste cartão</p>
          </div>
          <Controller
            name="is_shared"
            control={control}
            render={({ field }) => (
              <Switch id="is_shared" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="animate-spin w-4 h-4 mr-2" />Salvando...</>
        ) : (
          card ? "Atualizar cartão" : "Criar cartão"
        )}
      </Button>
    </form>
  );
}
