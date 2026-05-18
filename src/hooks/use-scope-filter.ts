"use client";

import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";

/**
 * Padroniza a leitura do escopo Individual/Casal usado em quase todos os
 * services e views. Substitui o trecho repetido:
 *
 *   const { user, couple } = useAuthStore();
 *   const { viewMode } = useUIStore();
 *   const isShared = viewMode === "couple" && !!couple;
 *
 * Retorna também `scopeKey` para uso como sufixo de queryKey.
 */
export function useScopeFilter() {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const isShared = viewMode === "couple" && !!couple;
  const scopeKey = isShared && couple ? `couple:${couple.id}` : `user:${user?.id ?? ""}`;
  return { user, couple, viewMode, isShared, scopeKey };
}
