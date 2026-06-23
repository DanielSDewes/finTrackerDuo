import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";

export type SpendSearchSource = "transaction" | "card";

export type SpendSearchItem = {
  id: string;
  source: SpendSearchSource;
  /** Texto exibido: `description` na transação comum, `title` no cartão. */
  description: string;
  amount: number;
  date: string;
  categoryName: string | null;
  /** Nome do cartão (apenas para itens de cartão). */
  cardName: string | null;
};

export type SpendSearchResult = {
  items: SpendSearchItem[];
  transactionsTotal: number;
  cardsTotal: number;
  total: number;
};

const EMPTY: SpendSearchResult = {
  items: [],
  transactionsTotal: 0,
  cardsTotal: 0,
  total: 0,
};

// Dentro de um filtro `.or()` do PostgREST, vírgulas e parênteses são
// delimitadores; `%` e `_` são curingas do ILIKE. Trocamos os delimitadores
// por espaço para o termo do usuário não quebrar a query — os curingas que
// sobrarem apenas ampliam o match, o que é inofensivo aqui.
function sanitizeTerm(term: string): string {
  return term.replace(/[,()]/g, " ").trim();
}

export const spendSearchService = {
  /**
   * Busca gastos cruzando transações comuns (tipo despesa) e lançamentos de
   * cartão, dentro de um período. Filtra por descrição (`term`), por categoria
   * (`categoryId`) ou por ambos — pelo menos um dos dois precisa estar
   * presente. Retorna os itens e os totais separados por origem. Considera
   * apenas gasto "realizado": ignora transações canceladas e, no cartão,
   * previsões e reembolsos.
   *
   * Escopo individual/casal espelha os demais services: transações usam o
   * applyScopeFilter consolidado; cartões filtram por user_id no individual e
   * delegam à RLS no casal.
   */
  async searchSpend(
    userId: string,
    coupleId: string | null,
    term: string,
    categoryId: string | null,
    dateFrom: string,
    dateTo: string,
    isShared = false,
  ): Promise<SpendSearchResult> {
    const safeTerm = sanitizeTerm(term);
    // Sem termo nem categoria não há o que buscar.
    if (!safeTerm && !categoryId) return EMPTY;

    const supabase = createClient();
    const pattern = `%${safeTerm}%`;

    // Transações comuns (despesas).
    let txQuery = supabase
      .from("transactions")
      .select("id, description, amount, date, category:categories(name)")
      .is("deleted_at", null)
      .eq("type", "expense")
      .neq("status", "cancelled")
      .gte("date", dateFrom)
      .lte("date", dateTo);
    if (safeTerm) txQuery = txQuery.ilike("description", pattern);
    if (categoryId) txQuery = txQuery.eq("category_id", categoryId);
    txQuery = applyScopeFilter(txQuery, {
      userId,
      coupleId,
      isShared,
      consolidateCouple: true,
    });

    // Lançamentos de cartão — busca em título e descrição.
    let cardQuery = supabase
      .from("credit_card_transactions")
      .select(
        "id, title, description, amount, date, category:categories(name), card:credit_cards(name)",
      )
      .is("deleted_at", null)
      .eq("is_reimbursed", false)
      .eq("is_forecast", false)
      .gte("date", dateFrom)
      .lte("date", dateTo);
    if (safeTerm) cardQuery = cardQuery.or(`title.ilike.${pattern},description.ilike.${pattern}`);
    if (categoryId) cardQuery = cardQuery.eq("category_id", categoryId);
    if (!(isShared && coupleId)) cardQuery = cardQuery.eq("user_id", userId);

    const [txRes, cardRes] = await Promise.all([txQuery, cardQuery]);
    if (txRes.error) throw txRes.error;
    if (cardRes.error) throw cardRes.error;

    type TxRow = {
      id: string;
      description: string;
      amount: number;
      date: string;
      category: { name: string } | null;
    };
    type CardRow = {
      id: string;
      title: string;
      amount: number;
      date: string;
      category: { name: string } | null;
      card: { name: string } | null;
    };

    const items: SpendSearchItem[] = [];
    let transactionsTotal = 0;
    let cardsTotal = 0;

    for (const t of (txRes.data ?? []) as unknown as TxRow[]) {
      transactionsTotal += t.amount;
      items.push({
        id: t.id,
        source: "transaction",
        description: t.description,
        amount: t.amount,
        date: t.date,
        categoryName: t.category?.name ?? null,
        cardName: null,
      });
    }

    for (const c of (cardRes.data ?? []) as unknown as CardRow[]) {
      cardsTotal += c.amount;
      items.push({
        id: c.id,
        source: "card",
        description: c.title,
        amount: c.amount,
        date: c.date,
        categoryName: c.category?.name ?? null,
        cardName: c.card?.name ?? null,
      });
    }

    // Mais recentes primeiro.
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return {
      items,
      transactionsTotal,
      cardsTotal,
      total: transactionsTotal + cardsTotal,
    };
  },
};
