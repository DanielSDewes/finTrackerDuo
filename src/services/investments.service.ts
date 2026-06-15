import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type {
  Investment, InvestmentDividend, InvestmentTransaction, AssetClass,
  InvestmentGoal, InvestmentAuditLog, InvestorProfile, AuditAction, AuditEntity,
} from "@/types";

/** Provento com os dados do ativo de origem anexados, para o dashboard. */
export type PortfolioDividend = InvestmentDividend & {
  assetName: string;
  assetClass: AssetClass;
};

/** Operação do ledger com o ativo de origem anexado, para a tela de movimentações. */
export type PortfolioTransaction = InvestmentTransaction & {
  assetName: string;
  ticker: string | null;
  assetClass: AssetClass;
};

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

  /**
   * Todos os proventos da carteira visível (escopo individual/casal), com o
   * nome e a classe do ativo de origem anexados. Alimenta o dashboard de
   * proventos. Ordenado do mais antigo ao mais recente para facilitar a
   * agregação por mês no cliente.
   */
  async getAllDividends(
    userId: string,
    coupleId?: string | null,
    isShared = false,
  ): Promise<PortfolioDividend[]> {
    const investments = await this.getInvestments(userId, coupleId, isShared);
    if (investments.length === 0) return [];

    const byId = new Map(investments.map((inv) => [inv.id, inv]));
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_dividends")
      .select("*")
      .in("investment_id", Array.from(byId.keys()))
      .order("received_at", { ascending: true });
    if (error) throw error;

    return (data as InvestmentDividend[]).map((d) => {
      const inv = byId.get(d.investment_id);
      return {
        ...d,
        assetName: inv?.asset_name ?? "—",
        assetClass: (inv?.asset_class ?? "other") as AssetClass,
      };
    });
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

  // ─── Operações (ledger aditivo) ─────────────────────────────────────────────

  async listTransactions(investmentId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_transactions")
      .select("*")
      .eq("investment_id", investmentId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as InvestmentTransaction[];
  },

  async addTransaction(
    input: Omit<InvestmentTransaction, "id" | "created_at" | "updated_at">,
  ) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_transactions")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as InvestmentTransaction;
  },

  async deleteTransaction(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("investment_transactions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Todas as operações da carteira visível, com nome/ticker/classe do ativo
   * anexados. Alimenta a tela de movimentações e o relatório exportável.
   */
  async getAllTransactions(
    userId: string,
    coupleId?: string | null,
    isShared = false,
  ): Promise<PortfolioTransaction[]> {
    const investments = await this.getInvestments(userId, coupleId, isShared);
    if (investments.length === 0) return [];

    const byId = new Map(investments.map((inv) => [inv.id, inv]));
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_transactions")
      .select("*")
      .in("investment_id", Array.from(byId.keys()))
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data as InvestmentTransaction[]).map((t) => {
      const inv = byId.get(t.investment_id);
      return {
        ...t,
        assetName: inv?.asset_name ?? "—",
        ticker: inv?.ticker ?? null,
        assetClass: (inv?.asset_class ?? "other") as AssetClass,
      };
    });
  },

  // ─── Metas de investimento ──────────────────────────────────────────────────

  async listGoals(userId: string, coupleId?: string | null, isShared = false) {
    const supabase = createClient();
    let query = supabase
      .from("investment_goals")
      .select("*")
      .order("created_at", { ascending: true });
    query = applyScopeFilter(query, { userId, coupleId, isShared });
    const { data, error } = await query;
    if (error) throw error;
    return data as InvestmentGoal[];
  },

  async createGoal(goal: Omit<InvestmentGoal, "id" | "created_at" | "updated_at">) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_goals")
      .insert(goal)
      .select()
      .single();
    if (error) throw error;
    return data as InvestmentGoal;
  },

  async deleteGoal(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("investment_goals").delete().eq("id", id);
    if (error) throw error;
  },

  // ─── Perfil de investidor ───────────────────────────────────────────────────

  async getInvestorProfile(userId: string): Promise<InvestorProfile | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("investor_profile")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data?.investor_profile ?? null) as InvestorProfile | null;
  },

  async setInvestorProfile(userId: string, profile: InvestorProfile) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ investor_profile: profile })
      .eq("id", userId);
    if (error) throw error;
  },

  // ─── Auditoria ──────────────────────────────────────────────────────────────

  async listAuditLog(userId: string, limit = 100) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("investment_audit_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as InvestmentAuditLog[];
  },

  /**
   * Registra uma entrada de auditoria. Best-effort: nunca lança — uma falha
   * de log não pode quebrar a operação principal.
   */
  async logAudit(entry: {
    user_id: string;
    action: AuditAction;
    entity: AuditEntity;
    label: string;
    detail?: string | null;
  }): Promise<void> {
    try {
      const supabase = createClient();
      await supabase.from("investment_audit_log").insert({
        user_id: entry.user_id,
        action: entry.action,
        entity: entry.entity,
        label: entry.label,
        detail: entry.detail ?? null,
      });
    } catch (e) {
      console.warn("Falha ao registrar auditoria:", e);
    }
  },
};
