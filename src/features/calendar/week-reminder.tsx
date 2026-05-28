"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";
import { eventsService } from "@/services/events.service";
import { formatDate } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

const STORAGE_PREFIX = "fintracker-week-reminder";

/**
 * No primeiro acesso do dia, verifica se há eventos na semana atual (de hoje
 * até o fim da semana) e dispara um lembrete (toast). Roda uma vez por dia por
 * usuário — controlado via localStorage. Componente headless (não renderiza).
 */
export function WeekReminder() {
  const { user, couple } = useAuthStore();
  const router = useRouter();
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    if (ranForUser.current === user.id) return;
    ranForUser.current = user.id;

    const todayStr = new Date().toISOString().split("T")[0];
    const storageKey = `${STORAGE_PREFIX}:${user.id}`;
    if (localStorage.getItem(storageKey) === todayStr) return;

    // Marca como verificado já — evita reconsultar a cada navegação no dia.
    localStorage.setItem(storageKey, todayStr);

    // Intervalo: de hoje até o fim da semana (sábado).
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
    const endStr = endOfWeek.toISOString().split("T")[0];

    (async () => {
      try {
        const events = await eventsService.getEventsByRange(
          user.id,
          couple?.id ?? null,
          todayStr,
          endStr,
          !!couple?.id,
        );
        if (events.length === 0) return;

        toast(
          `Você tem ${events.length} evento${events.length > 1 ? "s" : ""} nesta semana`,
          {
            description: <WeekReminderList events={events} />,
            duration: 9000,
            action: {
              label: "Ver agenda",
              onClick: () => router.push("/calendar"),
            },
          },
        );
      } catch {
        // Em caso de erro, libera para tentar de novo no próximo acesso.
        localStorage.removeItem(storageKey);
      }
    })();
  }, [user, couple, router]);

  return null;
}

function WeekReminderList({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="mt-1 space-y-0.5">
      {events.slice(0, 3).map((e) => (
        <div key={e.id} className="flex items-center gap-1.5 text-xs">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color }} />
          <span className="capitalize text-muted-foreground">
            {formatDate(e.event_date, "EEE dd/MM")}
            {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
          </span>
          <span className="truncate font-medium">{e.title}</span>
        </div>
      ))}
      {events.length > 3 && (
        <div className="text-xs text-muted-foreground">+{events.length - 3} mais</div>
      )}
    </div>
  );
}
