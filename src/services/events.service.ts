import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type { CalendarEvent } from "@/types";

export const eventsService = {
  /** Eventos num intervalo de datas (inclusive), ordenados por data e horário. */
  async getEventsByRange(
    userId: string,
    coupleId: string | null,
    dateFrom: string,
    dateTo: string,
    isShared = false,
  ) {
    const supabase = createClient();
    let query = supabase
      .from("calendar_events")
      .select("*")
      .gte("event_date", dateFrom)
      .lte("event_date", dateTo)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true, nullsFirst: true });

    query = applyScopeFilter(query, { userId, coupleId, isShared });

    const { data, error } = await query;
    if (error) throw error;
    return data as CalendarEvent[];
  },

  async createEvent(
    event: Omit<CalendarEvent, "id" | "created_at" | "updated_at">,
  ) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(event)
      .select()
      .single();
    if (error) throw error;
    return data as CalendarEvent;
  },

  async updateEvent(id: string, updates: Partial<CalendarEvent>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("calendar_events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as CalendarEvent;
  },

  async deleteEvent(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
  },
};
