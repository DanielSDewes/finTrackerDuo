"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, Plus, Clock, Pencil, Trash2, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/stores/ui.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { eventsService } from "@/services/events.service";
import { transactionsService } from "@/services/transactions.service";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { MonthSelector } from "@/components/shared/month-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { EventForm } from "./event-form";
import type { CalendarEvent, Transaction } from "@/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmtTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

export function CalendarView() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();
  const { selectedMonth } = useUIStore();

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  const [year, monthNum] = selectedMonth.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, monthNum - 1, 1)).getUTCDay();
  const firstDate = `${selectedMonth}-01`;
  const lastDate = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}`;

  const [selectedDate, setSelectedDate] = useState(today);
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [formDate, setFormDate] = useState(today);
  const [deleteEvent, setDeleteEvent] = useState<CalendarEvent | null>(null);

  // Dia efetivamente exibido: se o dia selecionado não pertence ao mês visível
  // (ex.: o usuário trocou de mês), cai para hoje (no mês atual) ou para o dia 1.
  const activeDate = selectedDate.startsWith(selectedMonth)
    ? selectedDate
    : selectedMonth === currentMonth ? today : firstDate;

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["calendar-events", scopeKey, selectedMonth],
    queryFn: () => eventsService.getEventsByRange(user!.id, couple?.id ?? null, firstDate, lastDate, isShared),
    enabled: !!user,
  });

  const { data: txResult } = useQuery({
    queryKey: ["transactions-calendar", scopeKey, selectedMonth],
    queryFn: () =>
      transactionsService.getTransactions(
        user!.id,
        couple?.id ?? null,
        { dateFrom: firstDate, dateTo: lastDate },
        { page: 1, pageSize: 500 },
        { field: "date", direction: "asc" },
        isShared,
      ),
    enabled: !!user,
  });

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) (map[e.event_date] ??= []).push(e);
    return map;
  }, [events]);

  const txByDate = useMemo(() => {
    const map: Record<string, { income: boolean; expense: boolean; list: Transaction[] }> = {};
    for (const t of txResult?.data ?? []) {
      const entry = (map[t.date] ??= { income: false, expense: false, list: [] });
      if (t.type === "income") entry.income = true;
      else if (t.type === "expense") entry.expense = true;
      entry.list.push(t);
    }
    return map;
  }, [txResult]);

  const dayEvents = eventsByDate[activeDate] ?? [];
  const dayTx = txByDate[activeDate]?.list ?? [];

  const openCreate = (date: string) => {
    setEditEvent(null);
    setFormDate(date);
    setFormOpen(true);
  };
  const openEdit = (e: CalendarEvent) => {
    setEditEvent(e);
    setFormOpen(true);
  };

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => eventsService.deleteEvent(id),
    invalidateKeys: [["calendar-events"]],
    successMessage: "Evento removido",
    errorMessage: "Erro ao remover evento",
    onSuccess: () => setDeleteEvent(null),
  });

  const selectedLabel = formatDate(activeDate, "EEEE, dd 'de' MMMM");

  return (
    <div>
      <Header title="Calendário" subtitle="Sua agenda de eventos e compromissos" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <MonthSelector />
          <Button onClick={() => openCreate(activeDate)} className="shrink-0">
            <Plus className="w-4 h-4" />
            Novo evento
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Calendar grid */}
          <Card className="w-full lg:flex-1">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                  const dayEvts = eventsByDate[dateStr] ?? [];
                  const tx = txByDate[dateStr];
                  const isToday = dateStr === today;
                  const isSelected = dateStr === activeDate;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "min-h-[64px] p-1.5 rounded-lg border text-left transition-colors flex flex-col gap-1 cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : isToday
                            ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                            : dayEvts.length > 0 || tx
                              ? "border-border/50 hover:bg-muted/50"
                              : "border-transparent hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("text-xs font-medium", isToday && "text-primary font-bold")}>
                          {day}
                        </span>
                        <div className="flex gap-0.5">
                          {tx?.income && <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />}
                          {tx?.expense && <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--expense))]" />}
                        </div>
                      </div>

                      {dayEvts.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-auto">
                          {dayEvts.slice(0, 2).map((e) => (
                            <div
                              key={e.id}
                              className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate"
                              style={{ backgroundColor: `${e.color}22`, color: e.color }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: e.color }}
                              />
                              <span className="truncate font-medium">{e.title}</span>
                            </div>
                          ))}
                          {dayEvts.length > 2 && (
                            <span className="text-[10px] text-muted-foreground pl-1">
                              +{dayEvts.length - 2} mais
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected day panel */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="text-sm font-semibold capitalize truncate">{selectedLabel}</h3>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 gap-1 shrink-0" onClick={() => openCreate(activeDate)}>
                    <Plus className="w-3.5 h-3.5" />
                    Evento
                  </Button>
                </div>

                {loadingEvents ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : dayEvents.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Nenhum evento neste dia"
                    description="Adicione um evento para começar"
                  />
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {dayEvents.map((e) => {
                        const time = fmtTime(e.event_time);
                        return (
                          <motion.div
                            key={e.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="group relative flex gap-3 rounded-lg border border-border/50 bg-card p-3 pl-4 overflow-hidden"
                          >
                            <div className="absolute left-0 top-0 h-full w-1" style={{ background: e.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-medium truncate">{e.title}</p>
                                {e.is_shared && (
                                  <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 border-pink-500/40 text-pink-500">
                                    Casal
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{time ?? "Dia todo"}</span>
                              </div>
                              {e.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                              )}
                            </div>
                            <RowActionsMenu
                              triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                              actions={[
                                { label: "Editar", icon: Pencil, onClick: () => openEdit(e) },
                                { label: "Remover", icon: Trash2, destructive: true, onClick: () => setDeleteEvent(e) },
                              ]}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Movimentações financeiras do dia (somente leitura) */}
            {dayTx.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Movimentações do dia</h3>
                  <div className="space-y-2">
                    {dayTx.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {t.type === "income"
                            ? <ArrowUpRight className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                            : <ArrowDownRight className="w-4 h-4 text-[hsl(var(--expense))] shrink-0" />}
                          <span className="truncate">{t.description}</span>
                        </div>
                        <span className={cn(
                          "font-medium shrink-0",
                          t.type === "income" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--expense))]",
                        )}>
                          {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create / edit dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditEvent(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEvent ? "Editar evento" : "Novo evento"}</DialogTitle>
          </DialogHeader>
          <EventForm
            event={editEvent}
            defaultDate={formDate}
            onSuccess={() => {
              setFormOpen(false);
              setEditEvent(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteEvent}
        onOpenChange={(o) => !o && setDeleteEvent(null)}
        title="Remover evento"
        isPending={deleteMutation.isPending}
        description={
          <>
            Tem certeza que deseja remover o evento <strong>{deleteEvent?.title}</strong>? Esta ação não pode ser desfeita.
          </>
        }
        onConfirm={() => deleteEvent && deleteMutation.mutate(deleteEvent.id)}
      />
    </div>
  );
}
