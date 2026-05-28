/**
 * Aplica o filtro de escopo individual/casal compartilhado da forma
 * padrão usada em todos os services:
 *   - Casal compartilhado: linhas do próprio usuário OR (is_shared = true AND couple_id = X)
 *   - Casal consolidado (consolidateCouple): nenhum filtro de usuário — a RLS
 *     já restringe às linhas dos dois parceiros. Usado por entidades que
 *     sempre pertencem a um usuário e cujas linhas do parceiro são visíveis
 *     via RLS (transações e cartões), em vez da flag is_shared.
 *   - Individual: apenas linhas do próprio usuário
 */

type ScopeFilterParams = {
  userId: string;
  coupleId?: string | null;
  isShared: boolean;
  consolidateCouple?: boolean;
};

// PostgREST filter builders aren't easy to type generically; we accept any
// builder that has `.or(...)` and `.eq(...)` returning itself.
type ScopeFilterable<T> = {
  or: (filter: string) => T;
  eq: (column: string, value: unknown) => T;
};

export function applyScopeFilter<T extends ScopeFilterable<T>>(
  query: T,
  { userId, coupleId, isShared, consolidateCouple }: ScopeFilterParams,
): T {
  if (isShared && coupleId) {
    // Consolidação total do casal: a RLS limita às linhas dos dois parceiros,
    // então não adicionamos filtro de usuário aqui.
    if (consolidateCouple) return query;
    return query.or(
      `user_id.eq.${userId},and(is_shared.eq.true,couple_id.eq.${coupleId})`,
    );
  }
  return query.eq("user_id", userId);
}
