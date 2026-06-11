import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type { Transaction, FilterOptions, PaginationOptions, SortOptions } from "@/types";

// Quantos meses adiante o "Recorrente" replica por padrão. Mesma escolha
// do card: 6 dá um horizonte útil sem inflar demais o banco.
const RECURRENCE_HORIZON_MONTHS = 6;

/** Move uma data YYYY-MM-DD para o mês alvo (year, month), clampando o dia
 *  ao último dia válido do mês (31/Jan → 28/Fev). Mesma lógica usada no
 *  service de cartões.
 */
function shiftDateToMonth(dateStr: string, year: number, month: number): string {
  const [, , dStr] = dateStr.split("-");
  const day = Number.parseInt(dStr, 10);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const clamped = Math.min(day, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

/** Adiciona N meses à data base, preservando a regra de clamp. */
function shiftDateByMonths(dateStr: string, monthsAhead: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  const absolute = y * 12 + (m - 1) + monthsAhead;
  const targetYear = Math.floor(absolute / 12);
  const targetMonth = (absolute % 12) + 1;
  return shiftDateToMonth(dateStr, targetYear, targetMonth);
}

export const transactionsService = {
  async getTransactions(
    userId: string,
    coupleId: string | null,
    filters: FilterOptions = {},
    pagination: PaginationOptions = { page: 1, pageSize: 20 },
    sort: SortOptions = { field: "date", direction: "desc" },
    isSharedView = false
  ) {
    const supabase = createClient();
    const { page, pageSize } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("transactions")
      .select("*, category:categories(*), account:accounts(*)", { count: "exact" })
      .is("deleted_at", null);

    query = applyScopeFilter(query, { userId, coupleId, isShared: isSharedView, consolidateCouple: true });

    if (filters.type) query = query.eq("type", filters.type);
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.accountId) query = query.eq("account_id", filters.accountId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.dateFrom) query = query.gte("date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("date", filters.dateTo);
    if (filters.search) {
      query = query.ilike("description", `%${filters.search}%`);
    }

    query = query
      .order(sort.field, { ascending: sort.direction === "asc" })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as Transaction[], count: count ?? 0 };
  },

  async createTransaction(transaction: Omit<Transaction, "id" | "created_at" | "updated_at" | "deleted_at">) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert(transaction)
      .select("*, category:categories(*), account:accounts(*)")
      .single();
    if (error) throw error;
    return data as Transaction;
  },

  /**
   * Versão alto-nível do createTransaction usada pelo form de transações:
   *   1) insere a tx principal (com recurring_group_id se for recorrente);
   *   2) se for recorrente, replica nos próximos N meses (default 6);
   *   3) se for a 1ª tx do mês para esse usuário, faz seed das recorrentes
   *      do mês anterior que ainda não estavam aqui — assim recorrentes
   *      criadas há mais de 6 meses continuam aparecendo automaticamente.
   *
   * Falhas na propagação/seed só logam; a tx principal já foi gravada e o
   * usuário pode continuar o fluxo. Isso espelha o tratamento usado em
   * cards.service.ts.
   */
  async createTransactionWithRecurrence(
    input: Omit<Transaction, "id" | "created_at" | "updated_at" | "deleted_at">,
  ): Promise<Transaction> {
    const supabase = createClient();
    const isRecurring = !!input.is_recurring;
    const recurringGroupId = isRecurring
      ? (input.recurring_group_id ?? crypto.randomUUID())
      : null;

    const mainPayload = {
      ...input,
      is_recurring: isRecurring,
      recurring_group_id: recurringGroupId,
    };

    const { data: main, error } = await supabase
      .from("transactions")
      .insert(mainPayload)
      .select("*, category:categories(*), account:accounts(*)")
      .single();
    if (error) throw error;

    if (isRecurring && recurringGroupId) {
      try {
        await this.propagateRecurringToFutureMonths(
          mainPayload,
          RECURRENCE_HORIZON_MONTHS,
        );
      } catch (e) {
        console.warn("Falha ao propagar transação recorrente:", e);
      }
    }

    try {
      await this.seedRecurringIfFirstInMonth(input.user_id, input.date);
    } catch (e) {
      console.warn("Falha no seed mensal de recorrentes:", e);
    }

    return main as Transaction;
  },

  /**
   * Insere cópias da `base` nos próximos `monthsAhead` meses, todas com o
   * mesmo `recurring_group_id`. Cada cópia ganha id próprio (default do
   * banco). Datas são deslocadas com clamp para o último dia do mês alvo.
   */
  async propagateRecurringToFutureMonths(
    base: Omit<Transaction, "id" | "created_at" | "updated_at" | "deleted_at">,
    monthsAhead: number,
  ) {
    if (!base.recurring_group_id) return;
    const supabase = createClient();

    const rows: typeof base[] = [];
    for (let i = 1; i <= monthsAhead; i++) {
      rows.push({
        ...base,
        date: shiftDateByMonths(base.date, i),
      });
    }

    if (rows.length === 0) return;
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) throw error;
  },

  /**
   * Se a tx que acabamos de inserir é a única do mês, busca recorrentes em
   * meses anteriores que ainda não têm representante neste mês e cria as
   * cópias faltantes. É a rede de proteção pra recorrentes que estouraram
   * o horizonte inicial de 6 meses.
   */
  async seedRecurringIfFirstInMonth(userId: string, dateStr: string) {
    const supabase = createClient();
    const [year, month] = dateStr.split("-").map(Number);
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = new Date(Date.UTC(year, month, 0))
      .toISOString()
      .split("T")[0];

    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    // Mais de 1 = o mês já tinha conteúdo (ou nós inserimos várias na
    // propagação acima). Não vale a pena rodar o seed de novo.
    if ((count ?? 0) > 1) return;

    const { data: candidates } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_recurring", true)
      .not("recurring_group_id", "is", null)
      .is("deleted_at", null)
      .lt("date", monthStart);

    if (!candidates || candidates.length === 0) return;

    // Agrupa por recurring_group_id e pega a instância MAIS RECENTE
    // estritamente anterior ao mês alvo.
    const latestPerGroup = new Map<string, Transaction>();
    for (const raw of candidates as Transaction[]) {
      if (!raw.recurring_group_id) continue;
      const existing = latestPerGroup.get(raw.recurring_group_id);
      if (!existing || raw.date > existing.date) {
        latestPerGroup.set(raw.recurring_group_id, raw);
      }
    }
    if (latestPerGroup.size === 0) return;

    // Deduplica contra o que já existe no mês (pra cobrir o caso de a
    // própria propagação inicial ter alcançado esse mês).
    const groupIds = Array.from(latestPerGroup.keys());
    const { data: existingInMonth } = await supabase
      .from("transactions")
      .select("recurring_group_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("recurring_group_id", groupIds)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const existingGroups = new Set(
      (existingInMonth ?? [])
        .map((r) => r.recurring_group_id as string | null)
        .filter((g): g is string => !!g),
    );

    const inserts = Array.from(latestPerGroup.values())
      .filter((tx) => tx.recurring_group_id && !existingGroups.has(tx.recurring_group_id))
      .map((tx) => ({
        user_id: tx.user_id,
        couple_id: tx.couple_id,
        account_id: tx.account_id,
        category_id: tx.category_id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        notes: tx.notes,
        date: shiftDateToMonth(tx.date, year, month),
        is_shared: tx.is_shared,
        is_recurring: true,
        recurring_group_id: tx.recurring_group_id,
        recurrence_type: tx.recurrence_type,
        recurrence_end_date: tx.recurrence_end_date,
        status: tx.status,
        tags: tx.tags ?? [],
        attachments: tx.attachments ?? [],
      }));

    if (inserts.length === 0) return;
    const { error } = await supabase.from("transactions").insert(inserts);
    if (error) throw error;
  },

  async updateTransaction(id: string, updates: Partial<Transaction>) {
    const supabase = createClient();

    // Snapshot da tx antes do update — precisamos saber se ela é parte de
    // uma série recorrente para então propagar a alteração às cópias
    // futuras (mesmo recurring_group_id, date > cutoff).
    const { data: before } = await supabase
      .from("transactions")
      .select("recurring_group_id, date")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select("*, category:categories(*), account:accounts(*)")
      .single();
    if (error) throw error;

    const groupId = before?.recurring_group_id ?? null;
    const cutoffDate = before?.date ?? null;

    // Decisão de projeto: edição em transação avulsa de cartão fica
    // restrita à parcela editada, mas em transação comum recorrente a
    // edição propaga pra frente. Justificativa: na maioria dos casos a
    // pessoa editou porque o valor/categoria/descrição mudaram pra valer
    // (ex.: reajuste da mensalidade do aluguel), e atualizar uma a uma
    // os 5 meses seguintes é tedioso. Campos por instância (date e
    // status) são preservados.
    if (groupId && cutoffDate) {
      const propagatable: Partial<Transaction> = {};
      if ("amount" in updates) propagatable.amount = updates.amount;
      if ("description" in updates) propagatable.description = updates.description;
      if ("notes" in updates) propagatable.notes = updates.notes;
      if ("category_id" in updates) propagatable.category_id = updates.category_id;
      if ("account_id" in updates) propagatable.account_id = updates.account_id;
      if ("type" in updates) propagatable.type = updates.type;

      if (Object.keys(propagatable).length > 0) {
        try {
          await supabase
            .from("transactions")
            .update(propagatable)
            .eq("recurring_group_id", groupId)
            .gt("date", cutoffDate)
            .is("deleted_at", null);
        } catch (e) {
          console.warn(
            "Falha ao propagar edição de transação recorrente:",
            e,
          );
        }
      }
    }

    return data as Transaction;
  },

  async deleteTransaction(id: string, isPartner = false) {
    const supabase = createClient();
    const rpc = isPartner ? "soft_delete_partner_transaction" : "soft_delete_transaction";
    const { error } = await supabase.rpc(rpc, { transaction_id: id });
    if (error) throw error;
  },

  async getMonthlyStats(userId: string, coupleId: string | null, month: string, isShared = false) {
    const supabase = createClient();
    const startDate = `${month}-01`;
    const [year, m] = month.split("-").map(Number);
    // Use UTC para evitar bug de timezone no último dia do mês
    const endDate = new Date(Date.UTC(year, m, 0)).toISOString().split("T")[0];

    let query = supabase
      .from("transactions")
      .select("type, amount")
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .gte("date", startDate)
      .lte("date", endDate);

    query = applyScopeFilter(query, { userId, coupleId, isShared, consolidateCouple: true });

    const { data, error } = await query;
    if (error) throw error;

    const income = data?.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0) ?? 0;
    const expense = data?.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0) ?? 0;

    return { income, expense, savings: income - expense };
  },

  async getCashFlowData(userId: string, coupleId: string | null, months = 6, isShared = false) {
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toISOString().slice(0, 7);
      const stats = await this.getMonthlyStats(userId, coupleId, month, isShared);
      results.push({
        month,
        income: stats.income,
        expense: stats.expense,
        balance: stats.income - stats.expense,
      });
    }

    return results;
  },

  async getCategoryBreakdown(userId: string, coupleId: string | null, month: string, type: "income" | "expense", isShared = false) {
    const supabase = createClient();
    const startDate = `${month}-01`;
    const [year, m] = month.split("-").map(Number);
    const endDate = new Date(Date.UTC(year, m, 0)).toISOString().split("T")[0];

    let query = supabase
      .from("transactions")
      .select("amount, category:categories(id,name,color)")
      .is("deleted_at", null)
      .eq("type", type)
      .neq("status", "cancelled")
      .gte("date", startDate)
      .lte("date", endDate);

    query = applyScopeFilter(query, { userId, coupleId, isShared, consolidateCouple: true });

    const { data, error } = await query;
    if (error) throw error;

    type Row = {
      amount: number;
      category: { id: string; name: string; color: string } | null;
    };

    const grouped: Record<string, { name: string; value: number; color: string }> = {};
    for (const t of (data ?? []) as unknown as Row[]) {
      const catName = t.category?.name ?? "Sem categoria";
      const catId = t.category?.id ?? "none";
      if (!grouped[catId]) {
        grouped[catId] = { name: catName, value: 0, color: t.category?.color ?? "#6366f1" };
      }
      grouped[catId].value += t.amount;
    }

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  },
};
