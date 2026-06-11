import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

/** Visibilidade: minhas categorias + padrão + (se houver casal) do casal. */
function visibilityFilter(userId: string, coupleId?: string | null) {
  return coupleId
    ? `user_id.eq.${userId},is_default.eq.true,couple_id.eq.${coupleId}`
    : `user_id.eq.${userId},is_default.eq.true`;
}

export const categoriesService = {
  /**
   * Todas as categorias com uso marcado (tela de cadastro). Linhas legadas
   * sem nenhum flag (type 'investment' de bancos antigos) ficam de fora.
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

  /** Categorias do form de transações, filtradas por receita/despesa. */
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
      .eq("type", type)
      .order("name");
    if (error) throw error;
    return data as Category[];
  },

  /** Categorias do lançamento de fatura do cartão. */
  async getCardCategories(userId: string, coupleId?: string | null) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .or(visibilityFilter(userId, coupleId))
      .eq("is_card", true)
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

  /**
   * Exclui a categoria. Lançamentos existentes não são apagados: os FKs de
   * transactions e credit_card_transactions são ON DELETE SET NULL, então
   * eles passam a aparecer como "Sem categoria".
   */
  async deleteCategory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  },
};
