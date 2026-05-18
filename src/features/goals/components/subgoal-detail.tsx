"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Pencil, Check, Target, ExternalLink, Search,
  CheckCircle2, Circle,
} from "lucide-react";
import { toast } from "sonner";
import { goalsService } from "@/services/goals.service";
import { useGoalsStore } from "../stores/goals.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { SubgoalForm } from "./subgoal-form";
import { getGoalCategory } from "../constants";
import { formatCurrency, calculatePercentage, cn } from "@/lib/utils";
import type { Goal, GoalSubgoal } from "@/types";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getLinkLabel(raw: string): string {
  try {
    const url = new URL(normalizeUrl(raw));
    return url.hostname.replace(/^www\./, "");
  } catch {
    return raw.length > 32 ? raw.slice(0, 32) + "…" : raw;
  }
}

export function SubgoalDetail() {
  const { selectedGoalId } = useGoalsStore();
  const { scopeKey } = useScopeFilter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSubgoal, setEditSubgoal] = useState<GoalSubgoal | null>(null);
  const [deleteSubgoal, setDeleteSubgoal] = useState<GoalSubgoal | null>(null);

  // The parent goal — pulled from the goals query cache to avoid an extra fetch
  const goals = queryClient.getQueryData<Goal[]>(["goals", scopeKey]);
  const goal = useMemo(
    () => goals?.find((g) => g.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  const { data: subgoals = [], isLoading } = useQuery({
    queryKey: ["subgoals", selectedGoalId],
    queryFn: () => goalsService.getSubgoals(selectedGoalId!),
    enabled: !!selectedGoalId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      goalsService.toggleSubgoalCompleted(id, completed),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["subgoals", selectedGoalId] });
      const prev = queryClient.getQueryData<GoalSubgoal[]>(["subgoals", selectedGoalId]);
      queryClient.setQueryData<GoalSubgoal[]>(
        ["subgoals", selectedGoalId],
        (old) => old?.map((s) => (s.id === id ? { ...s, completed } : s)) ?? [],
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["subgoals", selectedGoalId], ctx.prev);
      }
      toast.error("Erro ao atualizar sub-meta");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["subgoals", selectedGoalId] });
    },
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => goalsService.deleteSubgoal(id),
    invalidateKeys: [["subgoals", selectedGoalId]],
    successMessage: "Sub-meta removida",
    errorMessage: "Erro ao remover sub-meta",
    onSuccess: () => setDeleteSubgoal(null),
  });

  if (!selectedGoalId || !goal) {
    return (
      <EmptyState
        variant="full"
        icon={Target}
        title="Selecione uma meta"
        description="Escolha uma meta à esquerda para ver e criar sub-metas"
      />
    );
  }

  const filtered = subgoals.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  );

  const totalEstimated = subgoals.reduce((sum, s) => sum + s.amount, 0);
  const doneEstimated = subgoals
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.amount, 0);
  const doneCount = subgoals.filter((s) => s.completed).length;
  const totalCount = subgoals.length;
  const itemsPercentage = totalCount === 0 ? 0 : (doneCount / totalCount) * 100;
  const valuePercentage = calculatePercentage(doneEstimated, totalEstimated);
  const meta = getGoalCategory(goal.category);

  const openCreate = () => { setEditSubgoal(null); setFormOpen(true); };

  return (
    <div className="flex flex-col h-full">
      {/* Header com info da meta */}
      <div className="px-4 py-3 border-b border-border/50 shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
            >
              {meta.icon}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm truncate">{goal.title}</h2>
              <p className="text-xs text-muted-foreground">
                Meta {formatCurrency(goal.target_amount)} ·{" "}
                <span className="font-medium text-[hsl(var(--success))]">
                  {doneCount}/{totalCount} sub-metas
                </span>
              </p>
            </div>
          </div>
          <Button size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Sub-meta
          </Button>
        </div>

        {totalCount > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {doneCount}/{totalCount} concluídas · {itemsPercentage.toFixed(0)}%
              </span>
              <span className="tabular-nums">
                {formatCurrency(doneEstimated)} / {formatCurrency(totalEstimated)}
              </span>
            </div>
            <Progress
              value={itemsPercentage}
              className="h-1.5"
              indicatorClassName={
                itemsPercentage >= 100 ? "bg-[hsl(var(--success))]" : "bg-primary"
              }
            />
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar sub-meta..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Sub-goal list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhum resultado encontrado" : "Nenhuma sub-meta nesta meta"}
            </p>
            {!search && (
              <Button size="sm" variant="outline" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar sub-meta
              </Button>
            )}
          </div>
        ) : (
          filtered.map((sub) => (
            <SubgoalRow
              key={sub.id}
              subgoal={sub}
              goalColor={goal.color}
              onToggle={(completed) => toggleMutation.mutate({ id: sub.id, completed })}
              onEdit={() => { setEditSubgoal(sub); setFormOpen(true); }}
              onDelete={() => setDeleteSubgoal(sub)}
            />
          ))
        )}

        {valuePercentage > 0 && totalCount > 0 && (
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Valor concluído: {valuePercentage.toFixed(0)}% do estimado das sub-metas
          </p>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editSubgoal ? "Editar sub-meta" : "Nova sub-meta"}
            </DialogTitle>
          </DialogHeader>
          <SubgoalForm
            goalId={selectedGoalId}
            subgoal={editSubgoal}
            onSuccess={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteSubgoal}
        onOpenChange={(o) => !o && setDeleteSubgoal(null)}
        title="Remover sub-meta"
        isPending={deleteMutation.isPending}
        description={
          <>
            A sub-meta <strong>{deleteSubgoal?.title}</strong> será removida permanentemente.
          </>
        }
        onConfirm={() => deleteSubgoal && deleteMutation.mutate(deleteSubgoal.id)}
      />
    </div>
  );
}

function SubgoalRow({
  subgoal,
  goalColor,
  onToggle,
  onEdit,
  onDelete,
}: {
  subgoal: GoalSubgoal;
  goalColor: string;
  onToggle: (completed: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isDone = subgoal.completed;
  const linkHref = subgoal.link ? normalizeUrl(subgoal.link) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors group",
        isDone
          ? "border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.06)]"
          : "border-border/30 bg-muted/20 hover:bg-muted/40",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(!isDone)}
        className={cn(
          "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md border-2 transition-colors",
          isDone
            ? "bg-[hsl(var(--success))] border-[hsl(var(--success))] text-white"
            : "border-border hover:border-primary/60",
        )}
        aria-label={isDone ? "Marcar como pendente" : "Marcar como concluído"}
      >
        {isDone ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3 opacity-0" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p
            className={cn(
              "text-sm font-medium truncate",
              isDone && "line-through text-muted-foreground",
            )}
          >
            {subgoal.title}
          </p>
          {isDone && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-0">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
              feito
            </Badge>
          )}
        </div>
        {linkHref && (
          <a
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-full"
          >
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{getLinkLabel(subgoal.link!)}</span>
          </a>
        )}
      </div>

      <div className="text-right shrink-0">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            isDone && "text-muted-foreground",
          )}
          style={!isDone ? { color: goalColor } : undefined}
        >
          {formatCurrency(subgoal.amount)}
        </p>
      </div>

      <RowActionsMenu
        actions={[
          { label: "Editar", icon: Pencil, onClick: onEdit },
          { label: "Remover", icon: Trash2, destructive: true, onClick: onDelete },
        ]}
      />
    </div>
  );
}
