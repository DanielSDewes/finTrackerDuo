import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

/**
 * Visibilidade: minhas categorias + (se houver casal) as do casal.
 *
 * Não há mais cláusula `is_default`: desde a migration 2026-09-24 cada usuário
 * tem a SUA cópia das categorias padrão (linha própria, com user_id), em vez
 * de uma linha global compartilhada por todo mundo. É isso que permite
 * editá-las e inativá-las sem afetar outras contas.
 */
function visibilityFilter(userId: string, coupleId?: string | null) {
  return coupleId
    ? `user_id.eq.${userId},couple_id.eq.${coupleId}`
    : `user_id.eq.${userId}`;
}

/** Contagem de lançamentos que apontam para uma categoria. */
export type CategoryUsage = {
  transactions: number;
  cardTransactions: number;
  futureTransactions: number;
  total: number;
};

export const categoriesService = {
  /**
   * Todas as categorias com uso marcado (tela de cadastro) — inclui as
   * inativas, que precisam aparecer lá para poderem ser reativadas. Linhas
   * legadas sem nenhum flag (type 'investment' de bancos antigos) ficam de
   * fora.
   */
  async getCategories(userId: string, coupleId?: string | null) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .or(visibilityFilter(userId, coupleId))
      .or("is_transaction.eq.true,is_card.eq.true")
      .order("name");
    if (error) throw error;
    return data as Category[];
  },

  /**
   * Categorias do form de transações, filtradas por receita/despesa. Só
   * ativas: inativar existe justamente para tirar a categoria dos novos
   * lançamentos sem apagar o histórico.
   */
  async getTransactionCategories(
    userId: string,
    type: "income" | "expense",
    coupleId?: string | null,
  ) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .or(visibilityFilter(userId, coupleId))
      .eq("is_transaction", true)
      .eq("is_active", true)
      .eq("type", type)
      .order("name");
    if (error) throw error;
    return data as Category[];
  },

  /** Categorias do lançamento de fatura do cartão. Só ativas. */
  async getCardCategories(userId: string, coupleId?: string | null) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .or(visibilityFilter(userId, coupleId))
      .eq("is_card", true)
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data as Category[];
  },

  async createCategory(category: Omit<Category, "id" | "created_at">) {
    const supabase = createClient();
    const { data, error } = await supabase.from("categories").insert(category).select().single();
    if (error) throw error;
    return data as Category;
  },

  async updateCategory(id: string, updates: Partial<Omit<Category, "id" | "created_at">>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Category;
  },

  /** Inativa/reativa — alternativa à exclusão quando a categoria já tem uso. */
  async setCategoryActive(id: string, isActive: boolean) {
    return categoriesService.updateCategory(id, { is_active: isActive });
  },

  /**
   * Quantos lançamentos usam a categoria, por origem. Conta apenas os vivos
   * (transações e lançamentos de cartão usam soft delete).
   *
   * A RLS limita a contagem às linhas visíveis para quem chama. Na prática
   * isso cobre o caso real — os lançamentos do próprio dono da categoria —,
   * mas se o parceiro tiver usado uma categoria compartilhada do casal em um
   * lançamento NÃO compartilhado, esse uso não entra na conta. É o mesmo
   * limite que já vale para qualquer leitura do app.
   */
  async countCategoryUsage(id: string): Promise<CategoryUsage> {
    const supabase = createClient();

    const [tx, card, future] = await Promise.all([
      supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id)
        .is("deleted_at", null),
      supabase
        .from("credit_card_transactions")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id)
        .is("deleted_at", null),
      supabase
        .from("future_transactions")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),
    ]);

    if (tx.error) throw tx.error;
    if (card.error) throw card.error;
    if (future.error) throw future.error;

    const transactions = tx.count ?? 0;
    const cardTransactions = card.count ?? 0;
    const futureTransactions = future.count ?? 0;

    return {
      transactions,
      cardTransactions,
      futureTransactions,
      total: transactions + cardTransactions + futureTransactions,
    };
  },

  /**
   * Exclui a categoria — apenas quando ela não tem nenhum lançamento.
   *
   * O FK é ON DELETE SET NULL, então excluir uma categoria em uso não apagaria
   * os lançamentos, mas os deixaria órfãos ("Sem categoria") e perderia o
   * histórico de classificação de forma irreversível. Por isso a checagem é
   * feita aqui, e não só na UI: com uso, o caminho é inativar.
   */
  async deleteCategory(id: string) {
    const usage = await categoriesService.countCategoryUsage(id);
    if (usage.total > 0) {
      throw new Error(
        `Categoria em uso por ${usage.total} lançamento(s) — inative-a em vez de excluir.`,
      );
    }

    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  },
};
