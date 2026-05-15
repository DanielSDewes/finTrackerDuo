-- =============================================================
-- CORREÇÃO DA RLS DE TRANSACTIONS
-- Execute no SQL Editor do painel Supabase
--
-- Problema: "FOR ALL USING (... AND deleted_at IS NULL)" falha
-- em UPDATE de soft-delete porque o PostgreSQL usa o USING
-- também como WITH CHECK — após o UPDATE, a row resultante
-- já não satisfaz "deleted_at IS NULL" e a operação é rejeitada.
--
-- Solução: policies separadas por operação.
-- =============================================================

-- Remove a policy genérica problemática
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;

-- SELECT: só mostra não-deletadas e respeitando is_shared
-- (já existe a policy de SELECT, mantemos ela)

-- INSERT: usuário só insere suas próprias transações
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: pode atualizar (incluindo soft-delete via deleted_at)
--   USING: a row atual deve pertencer ao usuário
--   WITH CHECK: a row resultante deve continuar pertencendo ao usuário
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: pode deletar fisicamente (fallback, não usado no app)
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verifica as policies criadas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;
