import { z } from "zod";

export const creditCardSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(60),
  brand: z.enum(["visa", "mastercard", "elo", "amex", "hipercard", "other"]),
  color: z.string().min(4, "Cor obrigatória"),
  limit_amount: z.coerce.number().positive("Limite deve ser positivo"),
  closing_day: z.coerce.number().int().min(1).max(31),
  due_day: z.coerce.number().int().min(1).max(31),
  is_shared: z.boolean().default(false),
});

export type CreditCardInput = z.output<typeof creditCardSchema>;

export const cardTransactionSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(120),
  description: z.string().max(300).optional().nullable(),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  category_id: z.string().uuid().optional().nullable(),
  date: z.string().min(1, "Data obrigatória"),
  is_installment: z.boolean().default(false),
  installment_total: z.coerce.number().int().min(1).max(48).default(1),
  is_shared: z.boolean().default(false),
  is_forecast: z.boolean().default(false),
});

export type CardTransactionInput = z.output<typeof cardTransactionSchema>;
