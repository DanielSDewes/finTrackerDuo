"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Target, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { goalsService } from "@/services/goals.service";
import { useGoalsStore } from "../stores/goals.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { GoalForm } from "../goal-form";
import { getGoalCategory } from "../constants";
import { formatCurrency, formatDate, calculatePercentage, cn } from "@/lib/utils";
import type { Goal } from "@/types";

export function GoalList() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();
  const { selectedGoalId, setSelectedGoal } = useGoalsStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals", scopeKey],
    queryFn: () => goalsService.getGoals(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => goalsService.deleteGoal(id),
    invalidateKeys: [["goals"]],
    successMessage: "Meta cancelada",
    errorMessage: "Erro ao cancelar meta",
    onSuccess: () => {
      if (deleteGoal?.id === selectedGoalId) setSelectedGoal(null);
      setDeleteGoal(null);
    },
  });

  const openCreate = () => { setEditGoal(null); setFormOpen(true); };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Minhas Metas</h2>
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 gap-1">
          <Plus className="w-3.5 h-3.5" />
          Nova
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nenhuma meta cadastrada"
            description="Crie sua primeira meta financeira"
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar meta
              </Button>
            }
          />
        ) : (
          goals.map((goal, i) => {
            const percentage = calculatePercentage(goal.current_amount, goal.target_amount);
            const isSelected = selectedGoalId === goal.id;
            const isCompleted = goal.status === "completed";
            const meta = getGoalCategory(goal.category);

            return (
              <motion.button
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedGoal(isSelected ? null : goal.id)}
                className={cn(
                  "group relative w-full text-left rounded-2xl border p-4 transition-all overflow-hidden",
                  isSelected
                    ? "border-primary/50 bg-primary/5 shadow-md"
                    : "border-border/50 bg-card hover:border-primary/30 hover:bg-accent/30",
                )}
                style={isSelected ? { boxShadow: `0 0 0 1px ${goal.color}40` } : undefined}
              >
                <div
                  className="absolute top-0 left-0 w-1 h-full"
                  style={{ background: goal.color }}
                />

                <div className="flex items-start justify-between gap-2 mb-3 pl-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
                    >
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{goal.title}</p>
                        {isCompleted && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--success))] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {goal.is_shared && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 py-0 px-1.5 border-pink-500/40 text-pink-500"
                      >
                        Casal
                      </Badge>
                    )}
                    <RowActionsMenu
                      triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                      actions={[
                        {
                          label: "Editar",
                          icon: Pencil,
                          onClick: () => { setEditGoal(goal); setFormOpen(true); },
                        },
                        {
                          label: "Cancelar meta",
                          icon: Trash2,
                          destructive: true,
                          onClick: () => setDeleteGoal(goal),
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="pl-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[hsl(var(--success))] font-medium tabular-nums">
                      {formatCurrency(goal.current_amount)}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(goal.target_amount)}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-1.5"
                    indicatorClassName={
                      percentage >= 100
                        ? "bg-[hsl(var(--success))]"
                        : percentage >= 70
                        ? "bg-primary"
                        : "bg-primary/70"
                    }
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{percentage.toFixed(0)}% concluído</span>
                    {goal.deadline && <span>Prazo {formatDate(goal.deadline)}</span>}
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editGoal ? "Editar meta" : "Nova meta"}</DialogTitle>
          </DialogHeader>
          <GoalForm goal={editGoal} onSuccess={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteGoal}
        onOpenChange={(o) => !o && setDeleteGoal(null)}
        title="Cancelar meta"
        confirmLabel="Cancelar meta"
        cancelLabel="Voltar"
        isPending={deleteMutation.isPending}
        description={
          <>
            Tem certeza que deseja cancelar a meta <strong>{deleteGoal?.title}</strong>? As
            sub-metas associadas serão preservadas no histórico, mas a meta não aparecerá
            mais na lista.
          </>
        }
        onConfirm={() => deleteGoal && deleteMutation.mutate(deleteGoal.id)}
      />
    </div>
  );
}
