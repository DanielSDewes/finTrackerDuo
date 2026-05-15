"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { goalContributionSchema, type GoalContributionInput } from "@/schemas/goal";
import { goalsService } from "@/services/goals.service";
import { useAuthStore } from "@/stores/auth.store";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { Goal } from "@/types";

type ContributionFormProps = {
  goal: Goal;
  onSuccess?: () => void;
};

export function ContributionForm({ goal, onSuccess }: ContributionFormProps) {
  const { user } = useAuthStore();
  const remaining = goal.target_amount - goal.current_amount;
  const percentage = calculatePercentage(goal.current_amount, goal.target_amount);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors } } = useForm<GoalContributionInput>({
    resolver: zodResolver(goalContributionSchema) as any,
  });

  const mutation = useMutation({
    mutationFn: (data: GoalContributionInput) =>
      goalsService.addContribution(goal.id, user!.id, data.amount, data.notes ?? undefined),
    onSuccess: () => {
      toast.success("Aporte registrado!");
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao registrar aporte"),
  });

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Acumulado</span>
          <span className="font-medium">{formatCurrency(goal.current_amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Meta</span>
          <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Faltam</span>
          <span className="font-semibold text-expense">{formatCurrency(remaining)}</span>
        </div>
        <Progress value={percentage} className="h-2 mt-2" />
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="space-y-2">
          <Label>Valor do aporte (R$)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0,00"
            error={!!errors.amount}
            {...register("amount")}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Observações (opcional)</Label>
          <Textarea placeholder="Notas sobre este aporte..." rows={2} {...register("notes")} />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <><Loader2 className="animate-spin" /> Registrando...</> : "Registrar aporte"}
        </Button>
      </form>
    </div>
  );
}
