"use client";

import { Controller } from "react-hook-form";
import { Loader2, ArrowLeftRight, CreditCard } from "lucide-react";
import { categorySchema, type CategoryInput } from "@/schemas/category";
import { categoriesService } from "@/services/categories.service";
import { useAuthStore } from "@/stores/auth.store";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

// Mesma paleta do seed de categorias padrão — cores pensadas para as pizzas
// e barras do dashboard.
export const CATEGORY_PRESET_COLORS = [
  "#16a34a", "#0d9488", "#65a30d", "#059669",
  "#dc2626", "#ea580c", "#ca8a04", "#0891b2",
  "#2563eb", "#db2777", "#9333ea", "#e11d48",
  "#f59e0b", "#475569", "#c026d3", "#6b7280",
];

type CategoryFormProps = {
  category?: Category | null;
  onSuccess?: () => void;
};

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const { user, couple } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useZodForm<typeof categorySchema, CategoryInput>(categorySchema, {
    defaultValues: {
      name: category?.name ?? "",
      color: category?.color ?? CATEGORY_PRESET_COLORS[0],
      is_transaction: category?.is_transaction ?? true,
      is_card: category?.is_card ?? false,
      // Categorias só de cartão são "expense" no banco, mas no form o tipo
      // só aparece (e é exigido) quando o uso em transações está marcado.
      type:
        category && category.is_transaction && category.type !== "investment"
          ? category.type
          : null,
    },
  });

  const isTransaction = watch("is_transaction");
  const type = watch("type");
  const isIncome = isTransaction && type === "income";

  const mutation = useToastMutation({
    mutationFn: async (data: CategoryInput) => {
      const fields = {
        name: data.name,
        color: data.color,
        is_transaction: data.is_transaction,
        is_card: data.is_card,
        // Coluna NOT NULL: categoria só de cartão é gasto por definição.
        type: data.is_transaction ? data.type! : ("expense" as const),
      };
      if (category?.id) {
        return categoriesService.updateCategory(category.id, fields);
      }
      return categoriesService.createCategory({
        ...fields,
        user_id: user!.id,
        couple_id: couple?.id ?? null,
        is_default: false,
      });
    },
    invalidateKeys: [
      ["categories"],
      ["transactions"],
      ["transactions-month"],
      ["transactions-recent"],
      ["category-breakdown"],
      ["category-breakdown-report"],
      ["card-transactions"],
      ["cards"],
    ],
    successMessage: category ? "Categoria atualizada!" : "Categoria criada!",
    errorMessage: "Erro ao salvar categoria",
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as CategoryInput))} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          placeholder="Ex: Mercado, Farmácia, Streaming..."
          error={!!errors.name}
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Usage */}
      <div className="space-y-3 p-3 rounded-xl border border-border/50 bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Onde usar
        </p>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is_transaction" className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transações
            </Label>
            <p className="text-xs text-muted-foreground">Disponível ao lançar receitas e despesas</p>
          </div>
          <Controller
            name="is_transaction"
            control={control}
            render={({ field }) => (
              <Switch
                id="is_transaction"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Tipo — obrigatório quando é categoria de transação */}
        {isTransaction && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label>Tipo</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Tabs
                  value={field.value ?? ""}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // Receita nunca pode ser categoria de cartão.
                    if (v === "income") setValue("is_card", false);
                  }}
                >
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
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div>
            <Label
              htmlFor="is_card"
              className={cn("flex items-center gap-1.5", isIncome && "opacity-40")}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Cartão de crédito
            </Label>
            <p className="text-xs text-muted-foreground">
              {isIncome
                ? "Receitas não podem ser categorias de cartão"
                : "Disponível ao lançar gastos na fatura"}
            </p>
          </div>
          <Controller
            name="is_card"
            control={control}
            render={({ field }) => (
              <Switch
                id="is_card"
                checked={field.value && !isIncome}
                onCheckedChange={field.onChange}
                disabled={isIncome}
              />
            )}
          />
        </div>

        {(errors.is_transaction || errors.is_card) && (
          <p className="text-xs text-destructive">
            {errors.is_transaction?.message ?? errors.is_card?.message}
          </p>
        )}
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label>Cor</Label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {CATEGORY_PRESET_COLORS.map((c) => (
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
        {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="animate-spin w-4 h-4 mr-2" />Salvando...</>
        ) : (
          category ? "Atualizar categoria" : "Criar categoria"
        )}
      </Button>
    </form>
  );
}
