import { z } from "zod";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

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
  // Rendimento: taxa em % (1.2 → 1.2%) que será convertida pra fração antes
  // de gravar. Período define a unidade da taxa.
  yield_rate: z.preprocess(emptyToNull, z.coerce.number().min(-100).max(1000).nullable().optional()),
  yield_period: z.preprocess(emptyToNull, z.enum(["daily", "monthly", "annual"]).nullable().optional()),
  is_shared: z.boolean().default(false),
  purchase_date: z.string().optional().nullable(),
  maturity_date: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type InvestmentInput = z.output<typeof investmentSchema>;

export const dividendSchema = z.object({
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  received_at: z.string().min(1, "Data obrigatória"),
  notes: z.string().max(300).optional().nullable(),
});

export type DividendInput = z.output<typeof dividendSchema>;
