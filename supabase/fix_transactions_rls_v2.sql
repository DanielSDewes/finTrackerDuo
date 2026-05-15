-- =============================================================
-- CORREÇÃO COMPLETA DA RLS DE TRANSACTIONS — v2 (idempotente)
-- Execute no SQL Editor do painel Supabase.
-- Pode ser rodado múltiplas vezes sem efeito colateral.
--
-- Problema original: policy FOR ALL com USING (... AND deleted_at IS NULL)
-- bloqueia o soft-delete porque o PostgreSQL aplica o USING como
-- WITH CHECK após o UPDATE — após setar deleted_at, a row não
-- satisfaz mais "deleted_at IS NULL" e a operação é rejeitada.
--
-- Solução: remover todas as policies existentes e recriar com
-- políticas separadas por operação, sem deleted_at na cláusula
-- UPDATE.
-- =============================================================

-- Remove TODAS as policies existentes da tabela (nomes originais e do fix anterior)
DROP POLICY IF EXISTS "Users can view own transactions"    ON transactions;
DROP POLICY IF EXISTS "Users can manage own transactions"  ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions"  ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions"  ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions"  ON transactions;

-- SELECT: exibe apenas registros não deletados (soft-delete),
--         respeitando visibilidade de transações compartilhadas do casal
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    deleted_at IS NULL AND (
      auth.uid() = user_id OR
      (is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples
        WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      ))
    )
  );

-- INSERT: o usuário só pode inserir suas próprias transações
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: permite atualizar (inclusive soft-delete via deleted_at).
--   USING sem deleted_at IS NULL — a row pode estar deletada e ainda
--   precisar ser referenciada internamente (não usado aqui, mas garante
--   que o soft-delete não falhe).
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: exclui fisicamente (fallback, não usado no app)
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Verifica o resultado
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;
