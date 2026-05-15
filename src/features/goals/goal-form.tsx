"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { goalSchema, type GoalInput } from "@/schemas/goal";
import { goalsService } from "@/services/goals.service";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Goal } from "@/types";

const goalCategories = [
  { value: "travel", label: "Viagem" },
  { value: "car", label: "Carro" },
  { value: "house", label: "Casa/Imóvel" },
  { value: "emergency", label: "Reserva de Emergência" },
  { value: "retirement", label: "Aposentadoria" },
  { value: "education", label: "Educação" },
  { value: "other", label: "Outro" },
];

type GoalFormProps = {
  goal?: Goal | null;
  onSuccess?: () => void;
};

export function GoalForm({ goal, onSuccess }: GoalFormProps) {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, formState: { errors } } = useForm<GoalInput>({
    resolver: zodResolver(goalSchema) as any,
    defaultValues: {
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      category: goal?.category ?? "other",
      target_amount: goal?.target_amount ?? undefined,
      current_amount: goal?.current_amount ?? 0,
      deadline: goal?.deadline ?? "",
      color: goal?.color ?? "#6366f1",
      is_shared: goal?.is_shared ?? (viewMode === "couple"),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: GoalInput) => {
      const payload = {
        ...data,
        user_id: user!.id,
        couple_id: couple?.id ?? null,
        icon: "target",
        status: "active" as const,
        deadline: data.deadline || null,
        description: data.description || null,
      };

      if (goal?.id) return goalsService.updateGoal(goal.id, payload);
      return goalsService.createGoal(payload as any);
    },
    onSuccess: () => {
      toast.success(goal ? "Meta atualizada!" : "Meta criada!");
      onSuccess?.();
    },
    onError: () => toast.error("Erro ao salvar meta"),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input placeholder="Ex: Viagem para Europa" error={!!errors.title} {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {goalCategories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Valor Meta (R$)</Label>
          <Input type="number" step="0.01" placeholder="0,00" error={!!errors.target_amount} {...register("target_amount")} />
          {errors.target_amount && <p className="text-xs text-destructive">{errors.target_amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Já Acumulado (R$)</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...register("current_amount")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Prazo (opcional)</Label>
        <Input type="date" {...register("deadline")} />
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex items-center gap-3">
          <Input type="color" {...register("color")} className="h-9 w-16 p-1 cursor-pointer" />
          <p className="text-xs text-muted-foreground">Escolha uma cor para identificar a meta</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição (opcional)</Label>
        <Textarea placeholder="Descreva sua meta..." rows={2} {...register("description")} />
      </div>

      {couple && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <Label htmlFor="is_shared">Meta do casal</Label>
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
        {mutation.isPending ? <><Loader2 className="animate-spin" /> Salvando...</> : (goal ? "Atualizar" : "Criar meta")}
      </Button>
    </form>
  );
}
