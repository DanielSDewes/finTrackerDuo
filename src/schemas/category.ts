import { z } from "zod";

export const categorySchema = z
  .object({
    name: z.string().min(1, "Nome obrigatório").max(60),
    color: z.string().min(4, "Cor obrigatória"),
    // Onde a categoria é usada — pelo menos um dos dois.
    is_transaction: z.boolean().default(false),
    is_card: z.boolean().default(false),
    // Receita/despesa — obrigatório quando a categoria é de transação.
    // Categorias só de cartão são gravadas como "expense" no service.
    type: z.enum(["income", "expense"]).nullable().default(null),
  })
  .superRefine((data, ctx) => {
    if (!data.is_transaction && !data.is_card) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["is_transaction"],
        message: "Marque pelo menos um uso: transações e/ou cartão",
      });
    }
    if (data.is_transaction && !data.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: "Escolha se é receita ou despesa",
      });
    }
    if (data.is_card && data.type === "income") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["is_card"],
        message: "Categoria de receita não pode ser usada no cartão",
      });
    }
  });

export type CategoryInput = z.output<typeof categorySchema>;
