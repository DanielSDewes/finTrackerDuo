import { createClient } from "@/lib/supabase/client";
import { applyScopeFilter } from "@/lib/supabase/filters";
import type { Goal, GoalContribution, GoalSubgoal } from "@/types";

export const goalsService = {
  async getGoals(userId: string, coupleId?: string | null, isShared = false) {
    const supabase = createClient();
    let query = supabase
      .from("goals")
      .select("*")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    query = applyScopeFilter(query, { userId, coupleId, isShared });

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

  // ─── Sub-metas ────────────────────────────────────────────────────────────

  async getSubgoals(goalId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goal_subgoals")
      .select("*")
      .eq("goal_id", goalId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as GoalSubgoal[];
  },

  async createSubgoal(input: {
    goal_id: string;
    user_id: string;
    couple_id: string | null;
    title: string;
    amount: number;
    link?: string | null;
    notes?: string | null;
  }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goal_subgoals")
      .insert({
        goal_id: input.goal_id,
        user_id: input.user_id,
        couple_id: input.couple_id,
        title: input.title,
        amount: input.amount,
        link: input.link ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as GoalSubgoal;
  },

  async updateSubgoal(id: string, updates: Partial<GoalSubgoal>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goal_subgoals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as GoalSubgoal;
  },

  async toggleSubgoalCompleted(id: string, completed: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("goal_subgoals")
      .update({ completed })
      .eq("id", id);
    if (error) throw error;
  },

  async deleteSubgoal(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("goal_subgoals").delete().eq("id", id);
    if (error) throw error;
  },
};
