"use client";

import { Loader2, Link2 } from "lucide-react";
import { goalSubgoalSchema, type GoalSubgoalInput } from "@/schemas/goal";
import { goalsService } from "@/services/goals.service";
import { useAuthStore } from "@/stores/auth.store";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GoalSubgoal } from "@/types";

type SubgoalFormProps = {
  goalId: string;
  subgoal?: GoalSubgoal | null;
  onSuccess?: () => void;
};

export function SubgoalForm({ goalId, subgoal, onSuccess }: SubgoalFormProps) {
  const { user, couple } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(goalSubgoalSchema, {
    defaultValues: {
      title: subgoal?.title ?? "",
      amount: subgoal?.amount ?? 0,
      link: subgoal?.link ?? "",
      notes: subgoal?.notes ?? "",
    },
  });

  const mutation = useToastMutation({
    mutationFn: async (data: GoalSubgoalInput) => {
      if (subgoal?.id) {
        return goalsService.updateSubgoal(subgoal.id, {
          title: data.title,
          amount: data.amount,
          link: data.link,
          notes: data.notes ?? null,
        });
      }
      return goalsService.createSubgoal({
        goal_id: goalId,
        user_id: user!.id,
        couple_id: couple?.id ?? null,
        title: data.title,
        amount: data.amount,
        link: data.link,
        notes: data.notes ?? null,
      });
    },
    invalidateKeys: [["subgoals", goalId], ["goals"]],
    successMessage: subgoal ? "Sub-meta atualizada!" : "Sub-meta criada!",
    errorMessage: "Erro ao salvar sub-meta",
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as GoalSubgoalInput))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          placeholder="Ex: Novo controle do alarme"
          error={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor estimado (R$)</Label>
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
        <Label htmlFor="link">Link (opcional)</Label>
        <Input
          id="link"
          placeholder="https://mercadolivre.com.br/..."
          leftIcon={<Link2 />}
          error={!!errors.link}
          {...register("link")}
        />
        <p className="text-[11px] text-muted-foreground">
          Cole o link da loja, anúncio ou referência.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Detalhes, comparações de preço, etc."
          rows={2}
          {...register("notes")}
        />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="animate-spin w-4 h-4 mr-2" /> Salvando...</>
        ) : subgoal ? (
          "Atualizar sub-meta"
        ) : (
          "Criar sub-meta"
        )}
      </Button>
    </form>
  );
}
