import { createClient } from "@/lib/supabase/client";
import type { Couple } from "@/types";

export const coupleService = {
  async getCouple(userId: string): Promise<Couple | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from("couples")
      .select("*, owner:owner_id(id,name,email,avatar_url), partner:partner_id(id,name,email,avatar_url)")
      .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
      .neq("status", "dissolved")
      .maybeSingle();

    return data as Couple | null;
  },

  async createCouple(ownerId: string, inviteEmail: string): Promise<Couple> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("couples")
      .insert({ owner_id: ownerId, invite_email: inviteEmail, status: "pending" })
      .select("*, owner:owner_id(id,name,email,avatar_url)")
      .single();
    if (error) throw error;
    return data as Couple;
  },

  async acceptInvite(token: string, userId: string): Promise<Couple> {
    const supabase = createClient();
    const { data: couple, error: fetchError } = await supabase
      .from("couples")
      .select("*")
      .eq("invite_token", token)
      .eq("status", "pending")
      .single();

    if (fetchError || !couple) throw new Error("Convite inválido ou expirado");
    if (couple.owner_id === userId) throw new Error("Você não pode aceitar seu próprio convite");

    const { data, error } = await supabase
      .from("couples")
      .update({ partner_id: userId, status: "active" })
      .eq("id", couple.id)
      .select("*, owner:owner_id(id,name,email,avatar_url), partner:partner_id(id,name,email,avatar_url)")
      .single();

    if (error) throw error;
    return data as Couple;
  },

  async dissolveCouple(coupleId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("couples")
      .update({ status: "dissolved" })
      .eq("id", coupleId);
    if (error) throw error;
  },

  async resendInvite(coupleId: string, email: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("couples")
      .update({ invite_email: email })
      .eq("id", coupleId);
    if (error) throw error;
  },
};
