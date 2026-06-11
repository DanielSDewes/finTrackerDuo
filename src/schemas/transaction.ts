import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  description: z.string().min(1, "Descrição obrigatória").max(200),
  notes: z.string().max(500).optional(),
  date: z.string().min(1, "Data obrigatória"),
  category_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  is_recurring: z.boolean().default(false),
  recurrence_type: z.enum(["daily", "weekly", "monthly", "yearly"]).optional().nullable(),
  recurrence_end_date: z.string().optional().nullable(),
  // Parcelamento: o valor informado é POR PARCELA (mesma semântica do
  // cartão); o total da compra é amount * installment_total.
  is_installment: z.boolean().default(false),
  installment_total: z.coerce.number().int().min(1).max(48).default(1),
  status: z.enum(["pending", "completed", "cancelled"]).default("completed"),
  tags: z.array(z.string()).default([]),
});

export const futureTransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  description: z.string().min(1, "Descrição obrigatória").max(200),
  scheduled_date: z.string().min(1, "Data obrigatória"),
  category_id: z.string().uuid().optional().nullable(),
  account_id: z.string().uuid().optional().nullable(),
  is_recurring: z.boolean().default(false),
  recurrence_type: z.enum(["daily", "weekly", "monthly", "yearly"]).optional().nullable(),
  recurrence_end_date: z.string().optional().nullable(),
});

export type TransactionInput = z.output<typeof transactionSchema>;
export type FutureTransactionInput = z.output<typeof futureTransactionSchema>;
