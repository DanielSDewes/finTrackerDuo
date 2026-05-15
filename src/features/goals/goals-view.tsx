"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, MoreHorizontal, Trash2, Pencil, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { goalsService } from "@/services/goals.service";
import { formatCurrency, formatDate, calculatePercentage } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoalForm } from "./goal-form";
import { ContributionForm } from "./contribution-form";
import type { Goal } from "@/types";

const categoryIcons: Record<string, string> = {
  travel: "✈",
  car: "🚗",
  house: "🏠",
  emergency: "🛡",
  retirement: "🌅",
  education: "📚",
  other: "🎯",
};

const categoryLabels: Record<string, string> = {
  travel: "Viagem",
  car: "Carro",
  house: "Casa/Imóvel",
  emergency: "Emergência",
  retirement: "Aposentadoria",
  education: "Educação",
  other: "Outro",
};

const statusVariants: Record<string, { label: string; variant: "success" | "warning" | "outline" }> = {
  active: { label: "Ativa", variant: "success" },
  completed: { label: "Concluída", variant: "success" },
  paused: { label: "Pausada", variant: "warning" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

export function GoalsView() {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const queryClient = useQueryClient();
  const isShared = viewMode === "couple" && !!couple;

  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);

  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals", user?.id, couple?.id, isShared],
    queryFn: () => goalsService.getGoals(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Meta cancelada");
    },
    onError: () => toast.error("Erro ao cancelar meta"),
  });

  const activeGoals = goals?.filter((g) => g.status === "active") ?? [];
  const completedGoals = goals?.filter((g) => g.status === "completed") ?? [];
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.current_amount, 0);

  return (
    <div>
      <Header title="Metas Financeiras" subtitle="Defina e acompanhe seus objetivos" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary */}
        {!isLoading && activeGoals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Metas Ativas</p>
                <p className="text-2xl font-bold">{activeGoals.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Total a Atingir</p>
                <p className="text-2xl font-bold">{formatCurrency(totalTarget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Total Acumulado</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(totalSaved)}</p>
                <Progress
                  value={calculatePercentage(totalSaved, totalTarget)}
                  className="mt-2 h-1.5"
                  indicatorClassName="bg-success"
                />
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Metas</h2>
          <Dialog open={formOpen} onOpenChange={(o) => {
            setFormOpen(o);
            if (!o) setEditingGoal(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingGoal(null)}>
                <Plus className="w-4 h-4" />
                Nova meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGoal ? "Editar meta" : "Nova meta"}</DialogTitle>
              </DialogHeader>
              <GoalForm
                goal={editingGoal}
                onSuccess={() => {
                  setFormOpen(false);
                  setEditingGoal(null);
                  queryClient.invalidateQueries({ queryKey: ["goals"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-12 w-12 rounded-xl mb-4" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : goals?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Target className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="font-semibold text-muted-foreground">Nenhuma meta criada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Defina objetivos financeiros para alcançar seus sonhos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals?.map((goal, i) => {
              const percentage = calculatePercentage(goal.current_amount, goal.target_amount);

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="h-full hover:shadow-md transition-all hover:border-primary/20 group">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: `${goal.color}20` }}
                        >
                          {categoryIcons[goal.category]}
                        </div>
                        <div className="flex items-center gap-2">
                          {goal.is_shared && (
                            <Badge variant="outline" className="text-[10px] h-4 py-0 border-pink-500/30 text-pink-500">
                              Casal
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setContributionGoal(goal)}>
                                <PlusCircle className="w-4 h-4" />
                                Adicionar aporte
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingGoal(goal);
                                setFormOpen(true);
                              }}>
                                <Pencil className="w-4 h-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                destructive
                                onClick={() => deleteMutation.mutate(goal.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-1 mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{goal.title}</h3>
                          <Badge variant={statusVariants[goal.status]?.variant ?? "outline"} className="text-[10px] h-4 py-0">
                            {statusVariants[goal.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{categoryLabels[goal.category]}</p>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-success font-medium">{formatCurrency(goal.current_amount)}</span>
                          <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
                        </div>
                        <Progress
                          value={percentage}
                          className="h-2"
                          indicatorClassName={
                            percentage >= 100 ? "bg-success" :
                            percentage >= 70 ? "bg-primary" :
                            "bg-primary/70"
                          }
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(0)}% concluído</span>
                          {goal.deadline && (
                            <span>Prazo: {formatDate(goal.deadline)}</span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setContributionGoal(goal)}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Adicionar aporte
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contribution Dialog */}
      <Dialog open={!!contributionGoal} onOpenChange={(o) => !o && setContributionGoal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Aporte em "{contributionGoal?.title}"</DialogTitle>
          </DialogHeader>
          {contributionGoal && (
            <ContributionForm
              goal={contributionGoal}
              onSuccess={() => {
                setContributionGoal(null);
                queryClient.invalidateQueries({ queryKey: ["goals"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
