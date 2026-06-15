"use client";

import { useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Plus, Target, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { investmentGoalSchema, type InvestmentGoalInput } from "@/schemas/investment";
import { investmentsService } from "@/services/investments.service";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvestmentGoal, InvestmentGoalKind } from "@/types";

const KIND_LABELS: Record<InvestmentGoalKind, string> = {
  networth: "Acumular patrimônio",
  monthly_income: "Renda passiva mensal",
  custom: "Meta personalizada",
};

function avgMonthlyDividends(received: { received_at: string; amount: number }[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
  const total = received
    .filter((d) => d.received_at >= start)
    .reduce((s, d) => s + d.amount, 0);
  return total / 12;
}

export function InvestmentGoals() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();
  const [adding, setAdding] = useState(false);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["investment-goals", scopeKey],
    queryFn: () => investmentsService.listGoals(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const { data: summary } = useQuery({
    queryKey: ["investment-summary", scopeKey],
    queryFn: () => investmentsService.getPortfolioSummary(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const { data: dividends = [] } = useQuery({
    queryKey: ["investment-dividends-all", scopeKey],
    queryFn: () => investmentsService.getAllDividends(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const totalCurrent = summary?.totalCurrent ?? 0;
  const avgMonthly = useMemo(() => avgMonthlyDividends(dividends), [dividends]);

  const deleteMutation = useToastMutation({
    mutationFn: async (goal: InvestmentGoal) => {
      await investmentsService.deleteGoal(goal.id);
      await investmentsService.logAudit({
        user_id: user!.id, action: "delete", entity: "goal", label: goal.title,
      });
    },
    invalidateKeys: [["investment-goals"], ["investment-audit"]],
    successMessage: "Meta removida",
    errorMessage: "Erro ao remover meta",
  });

  const measureFor = (goal: InvestmentGoal) =>
    goal.kind === "monthly_income" ? avgMonthly : totalCurrent;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Acompanhe metas de patrimônio e de renda passiva.
        </p>
        <Button
          size="sm"
          variant={adding ? "secondary" : "default"}
          className="h-7 text-xs gap-1"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="w-3.5 h-3.5" />
          {adding ? "Cancelar" : "Nova meta"}
        </Button>
      </div>

      {adding && user && (
        <GoalForm
          userId={user.id}
          coupleId={couple?.id ?? null}
          canShare={!!couple}
          defaultShared={isShared}
          onDone={() => setAdding(false)}
        />
      )}

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : goals.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Nenhuma meta ainda. Crie a primeira.
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const measure = measureFor(goal);
            const pct = goal.target_amount > 0 ? (measure / goal.target_amount) * 100 : 0;
            const done = pct >= 100;
            const remaining = Math.max(goal.target_amount - measure, 0);
            return (
              <div key={goal.id} className="p-3 rounded-xl border border-border/40">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{goal.title}</p>
                      {done && <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {KIND_LABELS[goal.kind]}
                      {goal.kind === "monthly_income" ? " · alvo/mês " : " · alvo "}
                      {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate(goal)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", done ? "bg-success" : "bg-primary")}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground tabular-nums">
                  <span>{formatCurrency(measure)} ({formatNumber(pct, 1)}%)</span>
                  <span>{done ? "Concluída 🎉" : `Faltam ${formatCurrency(remaining)}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GoalForm({
  userId, coupleId, canShare, defaultShared, onDone,
}: {
  userId: string; coupleId: string | null; canShare: boolean; defaultShared: boolean; onDone: () => void;
}) {
  const { register, handleSubmit, control, formState: { errors } } = useZodForm(investmentGoalSchema, {
    defaultValues: { kind: "networth", title: "", target_amount: 0, is_shared: defaultShared },
  });

  const mutation = useToastMutation({
    mutationFn: async (data: InvestmentGoalInput) => {
      const goal = await investmentsService.createGoal({
        user_id: userId,
        couple_id: coupleId,
        kind: data.kind,
        title: data.title,
        target_amount: data.target_amount,
        is_shared: canShare ? data.is_shared : false,
      });
      await investmentsService.logAudit({
        user_id: userId, action: "create", entity: "goal",
        label: data.title, detail: formatCurrency(data.target_amount),
      });
      return goal;
    },
    invalidateKeys: [["investment-goals"], ["investment-audit"]],
    successMessage: "Meta criada!",
    errorMessage: "Erro ao criar meta",
    onSuccess: () => onDone(),
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data as InvestmentGoalInput))}
      className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Controller
            name="kind"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABELS) as InvestmentGoalKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="goal-target" className="text-xs">Alvo (R$)</Label>
          <Input id="goal-target" type="number" step="0.01" error={!!errors.target_amount} {...register("target_amount")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="goal-title" className="text-xs">Título</Label>
        <Input id="goal-title" placeholder="Ex: Acumular R$ 100 mil" error={!!errors.title} {...register("title")} />
      </div>
      {canShare && (
        <div className="flex items-center justify-between">
          <Label htmlFor="goal-shared" className="text-xs">Compartilhar com casal</Label>
          <Controller
            name="is_shared"
            control={control}
            render={({ field }) => (
              <Switch id="goal-shared" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      )}
      <Button type="submit" size="sm" className="w-full h-8" disabled={mutation.isPending}>
        {mutation.isPending ? <><Loader2 className="animate-spin w-3.5 h-3.5 mr-1" /> Salvando...</> : "Criar meta"}
      </Button>
    </form>
  );
}
