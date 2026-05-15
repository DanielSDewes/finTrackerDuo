import { createClient } from "@/lib/supabase/client";
import type { Category, CategoryType } from "@/types";

export const categoriesService = {
  async getCategories(userId: string, type?: CategoryType, coupleId?: string | null) {
    const supabase = createClient();
    let query = supabase
      .from("categories")
      .select("*")
      .order("name");

    if (coupleId) {
      query = query.or(`user_id.eq.${userId},is_default.eq.true,couple_id.eq.${coupleId}`);
    } else {
      query = query.or(`user_id.eq.${userId},is_default.eq.true`);
    }

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;
    return data as Category[];
  },

  async createCategory(category: Omit<Category, "id" | "created_at">) {
    const supabase = createClient();
    const { data, error } = await supabase.from("categories").insert(category).select().single();
    if (error) throw error;
    return data as Category;
  },

  async deleteCategory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  },
};
