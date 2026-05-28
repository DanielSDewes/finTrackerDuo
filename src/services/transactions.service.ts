import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type { Transaction, FilterOptions, PaginationOptions, SortOptions } from "@/types";

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

  async updateTransaction(id: string, updates: Partial<Transaction>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select("*, category:categories(*), account:accounts(*)")
      .single();
    if (error) throw error;
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
    const supabase = createClient();
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
      .select("amount, category:categories(id,name,color,icon)")
      .is("deleted_at", null)
      .eq("type", type)
      .neq("status", "cancelled")
      .gte("date", startDate)
      .lte("date", endDate);

    query = applyScopeFilter(query, { userId, coupleId, isShared, consolidateCouple: true });

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, { name: string; value: number; color: string }> = {};
    data?.forEach((t: any) => {
      const catName = t.category?.name ?? "Sem categoria";
      const catId = t.category?.id ?? "none";
      if (!grouped[catId]) {
        grouped[catId] = { name: catName, value: 0, color: t.category?.color ?? "#6366f1" };
      }
      grouped[catId].value += t.amount;
    });

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  },
};
