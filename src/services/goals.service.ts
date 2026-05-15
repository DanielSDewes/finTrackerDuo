import { createClient } from "@/lib/supabase/client";
import type { Goal, GoalContribution } from "@/types";

export const goalsService = {
  async getGoals(userId: string, coupleId?: string | null, isShared = false) {
    const supabase = createClient();
    let query = supabase
      .from("goals")
      .select("*")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (isShared && coupleId) {
      query = query.or(`user_id.eq.${userId},and(is_shared.eq.true,couple_id.eq.${coupleId})`);
    } else {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Goal[];
  },

  async createGoal(goal: Omit<Goal, "id" | "created_at" | "updated_at">) {
    const supabase = createClient();
    const { data, error } = await supabase.from("goals").insert(goal).select().single();
    if (error) throw error;
    return data as Goal;
  },

  async updateGoal(id: string, updates: Partial<Goal>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Goal;
  },

  async addContribution(goalId: string, userId: string, amount: number, notes?: string) {
    const supabase = createClient();
    const { data: contribution, error: contribError } = await supabase
      .from("goal_contributions")
      .insert({ goal_id: goalId, user_id: userId, amount, notes })
      .select()
      .single();
    if (contribError) throw contribError;

    const { data: goal } = await supabase.from("goals").select("current_amount").eq("id", goalId).single();
    if (goal) {
      const newAmount = goal.current_amount + amount;
      await supabase
        .from("goals")
        .update({
          current_amount: newAmount,
          status: newAmount >= (await supabase.from("goals").select("target_amount").eq("id", goalId).single()).data?.target_amount
            ? "completed"
            : "active",
        })
        .eq("id", goalId);
    }

    return contribution as GoalContribution;
  },

  async deleteGoal(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("goals").update({ status: "cancelled" }).eq("id", id);
    if (error) throw error;
  },
};
