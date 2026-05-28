"use client";

import { Controller } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { eventSchema, type EventInput } from "@/schemas/event";
import { eventsService } from "@/services/events.service";
import { useAuthStore } from "@/stores/auth.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

export const EVENT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
];

type EventFormProps = {
  event?: CalendarEvent | null;
  /** Data pré-selecionada ao criar um novo evento (YYYY-MM-DD). */
  defaultDate?: string;
  onSuccess?: () => void;
};

export function EventForm({ event, defaultDate, onSuccess }: EventFormProps) {
  const { user, couple } = useAuthStore();
  const { isShared: scopeShared } = useScopeFilter();

  const { register, handleSubmit, control, formState: { errors } } = useZodForm(eventSchema, {
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      event_date: event?.event_date ?? defaultDate ?? new Date().toISOString().split("T")[0],
      event_time: event?.event_time ? event.event_time.slice(0, 5) : "",
      color: event?.color ?? EVENT_COLORS[0],
      is_shared: event?.is_shared ?? scopeShared,
    },
  });

  const mutation = useToastMutation({
    mutationFn: async (data: EventInput) => {
      const payload = {
        ...data,
        user_id: user!.id,
        couple_id: couple?.id ?? null,
        description: data.description || null,
        event_time: data.event_time || null,
      };

      if (event?.id) return eventsService.updateEvent(event.id, payload);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return eventsService.createEvent(payload as any);
    },
    invalidateKeys: [["calendar-events"]],
    successMessage: event ? "Evento atualizado!" : "Evento criado!",
    errorMessage: "Erro ao salvar evento",
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data as EventInput))} className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input placeholder="Ex: Aniversário, Reunião, Consulta..." error={!!errors.title} {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" error={!!errors.event_date} {...register("event_date")} />
          {errors.event_date && <p className="text-xs text-destructive">{errors.event_date.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Horário (opcional)</Label>
          <Input type="time" {...register("event_time")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cor</Label>
        <Controller
          name="color"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap items-center gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => field.onChange(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    field.value === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105",
                  )}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
              <Input
                type="color"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-7 w-12 p-1 cursor-pointer"
                title="Cor personalizada"
              />
            </div>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição (opcional)</Label>
        <Textarea placeholder="Detalhes do evento..." rows={2} {...register("description")} />
      </div>

      {couple && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label htmlFor="is_shared">Compartilhar com casal</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Visível para seu parceiro(a)</p>
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
        {mutation.isPending ? <><Loader2 className="animate-spin" /> Salvando...</> : (event ? "Atualizar" : "Criar evento")}
      </Button>
    </form>
  );
}
