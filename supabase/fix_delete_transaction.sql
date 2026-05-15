-- =============================================================
-- CORREÇÃO DEFINITIVA: soft-delete via função SECURITY DEFINER
-- Execute no SQL Editor do painel Supabase.
--
-- Por que isso funciona definitivamente:
--   - Funções SECURITY DEFINER rodam com permissões do criador
--     (postgres/superuser), ignorando RLS completamente.
--   - A segurança é garantida manualmente pela cláusula
--     "AND user_id = auth.uid()" dentro da função.
--   - Elimina qualquer conflito de policy por operação.
-- =============================================================

CREATE OR REPLACE FUNCTION soft_delete_transaction(transaction_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE transactions
  SET
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id          = transaction_id
    AND user_id     = auth.uid()
    AND deleted_at  IS NULL;
END;
$$;

-- Permite que usuários autenticados chamem a função via supabase.rpc()
GRANT EXECUTE ON FUNCTION soft_delete_transaction(UUID) TO authenticated;
