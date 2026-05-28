import { createClient } from "@/lib/supabase/client";
import type { Couple } from "@/types";

export const coupleService = {
  async getCouple(userId: string): Promise<Couple | null> {
    const supabase = createClient();
    // Pode haver mais de uma linha (ex.: convites pendentes antigos que ficaram
    // ao gerar novos códigos). Ordena 'active' antes de 'pending' e limita a 1
    // para sempre priorizar o vínculo ativo e nunca quebrar com múltiplas linhas
    // (o que antes, com .maybeSingle(), retornava null e escondia o casal ativo).
    const { data } = await supabase
      .from("couples")
      .select("*, owner:owner_id(id,name,email,avatar_url), partner:partner_id(id,name,email,avatar_url)")
      .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
      .neq("status", "dissolved")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1);

    return (data?.[0] as Couple) ?? null;
  },

  async createCouple(ownerId: string): Promise<Couple> {
    const supabase = createClient();
    // Encerra convites pendentes anteriores deste usuário antes de gerar um
    // novo, evitando que linhas 'pending' se acumulem (cada uma com um token).
    await supabase
      .from("couples")
      .update({ status: "dissolved" })
      .eq("owner_id", ownerId)
      .eq("status", "pending");

    const { data, error } = await supabase
      .from("couples")
      .insert({ owner_id: ownerId, status: "pending" })
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
