import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(120),
  description: z.string().max(500).optional().nullable(),
  event_date: z.string().min(1, "Data obrigatória"),
  // Horário opcional ("HH:MM"); vazio = evento de dia todo.
  event_time: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  color: z.string().default("#6366f1"),
  is_shared: z.boolean().default(false),
});

export type EventInput = z.output<typeof eventSchema>;
