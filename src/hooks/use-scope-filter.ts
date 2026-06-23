"use client";

import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { usePartner } from "@/hooks/use-partner";

/**
 * Padroniza a leitura do escopo (Individual / Casal / Ver como Parceiro) usado
 * em quase todos os services e views. Substitui o trecho repetido:
 *
 *   const { user, couple } = useAuthStore();
 *   const { viewMode } = useUIStore();
 *   const isShared = viewMode === "couple" && !!couple;
 *
 * Modos:
 *   - individual: dados do próprio usuário.
 *   - couple: consolidação do casal (RLS expõe as linhas dos dois).
 *   - partner ("Ver como Parceiro"): lente SOMENTE LEITURA sobre os dados do
 *     parceiro. `scopeUserId` aponta para o parceiro, então os services filtram
 *     pelas linhas dele — funciona nas tabelas cuja RLS dá visibilidade ao
 *     casal (transações e cartões). Cai para individual se não houver parceiro.
 *
 * Importante: `user` continua sendo o usuário LOGADO (para escrita e checagens
 * de propriedade). Para LEITURA com escopo, use `scopeUserId`.
 *
 * Retorna também `scopeKey` para uso como sufixo de queryKey.
 */
export function useScopeFilter() {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const { partner, partnerId, partnerFirstName, hasCouple } = usePartner();

  const isShared = viewMode === "couple" && !!couple;
  const isPartnerView = viewMode === "partner" && hasCouple && !!partnerId;
  // No modo parceiro a lente é somente leitura: criar/editar/excluir ficam
  // escondidos para não agir como o parceiro sem querer.
  const readOnly = isPartnerView;

  // Usuário-alvo da LEITURA: o parceiro no modo "Ver como Parceiro", senão eu.
  const scopeUserId = isPartnerView ? partnerId! : (user?.id ?? "");

  const scopeKey = isShared && couple
    ? `couple:${couple.id}`
    : isPartnerView
      ? `partner:${partnerId}`
      : `user:${user?.id ?? ""}`;

  return {
    user,
    couple,
    viewMode,
    isShared,
    isPartnerView,
    readOnly,
    scopeUserId,
    partner,
    partnerFirstName,
    scopeKey,
  };
}
