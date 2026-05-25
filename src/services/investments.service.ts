import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type { Investment, InvestmentDividend, AssetClass } from "@/types";

export const investmentsService = {
  async getInvestments(userId: string, coupleId?: string | null, isShared = false) {
    const supabase = createClient();
    let query = supabase
      .from("investments")
      .select("*")
      .eq("is_active", true)
      .order("current_value", { ascending: false });

    query = applyScopeFilter(query, { userId, coupleId, isShared });

    const { data, error } = await query;
    if (error) throw error;
    return data as Investment[];
  },

  async getPortfolioSummary(userId: string, coupleId?: string | null, isShared = false) {
    const investments = await this.getInvestments(userId, coupleId, isShared);

    const totalInvested = investments.reduce((sum, inv) => sum + inv.invested_amount, 0);
    const totalCurrent = investments.reduce((sum, inv) => sum + inv.current_value, 0);
    const totalDividends = investments.reduce((sum, inv) => sum + inv.dividends_received, 0);
    const profitability = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

    const byClass: Record<AssetClass, number> = {
      fixed_income: 0,
      variable_income: 0,
      crypto: 0,
      real_estate: 0,
      other: 0,
    };

    investments.forEach((inv) => {
      byClass[inv.asset_class] = (byClass[inv.asset_class] || 0) + inv.current_value;
    });

    return { totalInvested, totalCurrent, totalDividends, profitability, byClass, investments };
  },

  async createInvestment(investment: Omit<Investment, "id" | "created_at" | "updated_at">) {
    const supabase = createClient();
    const { data, error } = await supabase.from("investments").insert(investment).select().single();
    if (error) throw error;
    return data as Investment;
  },

  async updateInvestment(id: string, updates: Partial<Investment>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Investment;
  },

  async deleteInvestment(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("investments")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
  },

  // ─── Dividendos ───────────────────────────────────────────────────────────

  async listDividends(investmentId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_dividends")
      .select("*")
      .eq("investment_id", investmentId)
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as InvestmentDividend[];
  },

  async addDividend(input: {
    investment_id: string;
    user_id: string;
    amount: number;
    received_at: string;
    notes?: string | null;
  }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_dividends")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as InvestmentDividend;
  },

  async deleteDividend(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("investment_dividends")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
