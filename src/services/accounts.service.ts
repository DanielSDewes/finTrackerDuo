import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type { Account } from "@/types";

export const accountsService = {
  async getAccounts(userId: string, coupleId?: string | null) {
    const supabase = createClient();
    let query = supabase
      .from("accounts")
      .select("*")
      .eq("is_active", true)
      .order("name");

    query = applyScopeFilter(query, { userId, coupleId, isShared: !!coupleId });

    const { data, error } = await query;
    if (error) throw error;
    return data as Account[];
  },

  async getTotalBalance(userId: string, coupleId?: string | null) {
    const accounts = await this.getAccounts(userId, coupleId);
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  },

  async createAccount(account: Omit<Account, "id" | "created_at" | "updated_at">) {
    const supabase = createClient();
    const { data, error } = await supabase.from("accounts").insert(account).select().single();
    if (error) throw error;
    return data as Account;
  },

  async updateAccount(id: string, updates: Partial<Account>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("accounts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Account;
  },

  async updateBalance(id: string, amount: number, operation: "add" | "subtract") {
    const supabase = createClient();
    const { data: account } = await supabase.from("accounts").select("balance").eq("id", id).single();
    if (!account) throw new Error("Account not found");

    const newBalance = operation === "add" ? account.balance + amount : account.balance - amount;
    return this.updateAccount(id, { balance: newBalance });
  },
};
