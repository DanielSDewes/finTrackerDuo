import { z } from "zod";

export const goalSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(["travel", "car", "house", "emergency", "retirement", "education", "other"]),
  target_amount: z.coerce.number().positive("Valor meta deve ser positivo"),
  current_amount: z.coerce.number().nonnegative().default(0),
  deadline: z.string().optional().nullable(),
  color: z.string().default("#6366f1"),
  icon: z.string().default("target"),
  is_shared: z.boolean().default(false),
});

export const goalContributionSchema = z.object({
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  notes: z.string().max(200).optional().nullable(),
});

export type GoalInput = z.output<typeof goalSchema>;
export type GoalContributionInput = z.output<typeof goalContributionSchema>;
