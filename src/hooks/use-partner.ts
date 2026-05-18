"use client";

import { useAuthStore } from "@/stores/auth.store";
import type { UserProfile } from "@/types";

type PartnerInfo = {
  /** True quando há um casal vinculado e ativo. */
  hasCouple: boolean;
  /** True quando o usuário atual é o `owner_id` do casal. */
  isOwner: boolean;
  /** O outro usuário do casal — undefined quando não há vínculo ativo. */
  partner: UserProfile | undefined;
  /** ID do parceiro (útil para criar transações para o parceiro). */
  partnerId: string | null;
  /** Primeiro nome do parceiro, com fallback "Parceiro(a)". */
  partnerFirstName: string;
};

/**
 * Resolve o parceiro do casal do ponto de vista do usuário atual.
 * Substitui o trecho repetido em várias telas:
 *
 *   const partner = couple?.status === "active"
 *     ? (couple.owner_id === user?.id ? couple.partner : couple.owner) as ...
 *     : undefined;
 */
export function usePartner(): PartnerInfo {
  const { user, couple } = useAuthStore();

  const hasCouple = couple?.status === "active";
  const isOwner = hasCouple && couple?.owner_id === user?.id;
  const partner: UserProfile | undefined = hasCouple
    ? (isOwner ? couple?.partner : couple?.owner) ?? undefined
    : undefined;
  const partnerId = hasCouple
    ? (isOwner ? couple?.partner_id ?? null : couple?.owner_id ?? null)
    : null;
  const partnerFirstName = partner?.name?.split(" ")[0] ?? "Parceiro(a)";

  return {
    hasCouple: !!hasCouple,
    isOwner: !!isOwner,
    partner,
    partnerId,
    partnerFirstName,
  };
}
