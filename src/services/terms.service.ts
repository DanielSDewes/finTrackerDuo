import { createClient } from "@/lib/supabase/client";
import { TERMS_VERSION } from "@/features/legal/terms-version";

export const termsService = {
  /**
   * Registra o aceite da versão vigente dos Termos pelo usuário autenticado:
   * grava a versão no metadata (fonte do gate de reaceite) e insere a linha de
   * auditoria em terms_acceptances.
   */
  async acceptCurrentTerms() {
    const supabase = createClient();
    const acceptedAt = new Date().toISOString();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Sessão não encontrada.");

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        terms_accepted: true,
        terms_version: TERMS_VERSION,
        terms_accepted_at: acceptedAt,
      },
    });
    if (updateError) throw updateError;

    const { error: insertError } = await supabase.from("terms_acceptances").insert({
      user_id: user.id,
      version: TERMS_VERSION,
      accepted_at: acceptedAt,
      source: "reaccept",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (insertError) throw insertError;
  },
};
