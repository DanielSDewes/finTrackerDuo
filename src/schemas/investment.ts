import { z } from "zod";

export const investmentSchema = z.object({
  asset_class: z.enum(["fixed_income", "variable_income", "crypto", "real_estate", "other"]),
  subcategory: z.string().min(1, "Subcategoria obrigatória"),
  broker: z.string().optional().nullable(),
  asset_name: z.string().min(1, "Nome do ativo obrigatório").max(200),
  ticker: z.string().max(20).optional().nullable(),
  quantity: z.coerce.number().nonnegative("Quantidade deve ser positiva"),
  average_price: z.coerce.number().nonnegative("Preço médio deve ser positivo"),
  current_price: z.coerce.number().nonnegative("Preço atual deve ser positivo"),
  invested_amount: z.coerce.number().nonnegative(),
  current_value: z.coerce.number().nonnegative(),
  dividends_received: z.coerce.number().nonnegative().default(0),
  is_shared: z.boolean().default(false),
  purchase_date: z.string().optional().nullable(),
  maturity_date: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type InvestmentInput = z.output<typeof investmentSchema>;
