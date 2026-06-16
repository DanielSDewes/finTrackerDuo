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
    // O aceite passa por uma RPC SECURITY DEFINER que valida o token no
    // servidor e ativa o vínculo. A RLS de couples não expõe convites
    // pendentes a quem ainda não é membro — sem isso, qualquer autenticado
    // conseguia ler/sequestrar convites alheios.
    const { error } = await supabase.rpc("accept_couple_invite", {
      p_token: token.trim(),
    });
    if (error) {
      // O texto do RAISE EXCEPTION do Postgres chega em error.message.
      throw new Error(error.message || "Convite inválido ou expirado");
    }

    // Já membro: re-busca com os perfis de owner/partner embutidos (as policies
    // de leitura do casal e do parceiro agora autorizam o usuário).
    const couple = await coupleService.getCouple(userId);
    if (!couple) throw new Error("Não foi possível carregar o casal após o aceite");
    return couple;
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
