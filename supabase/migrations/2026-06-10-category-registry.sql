-- =============================================================================
-- Migration: cadastro de categorias (transação × cartão)
-- =============================================================================
-- O usuário agora cadastra as próprias categorias e marca onde cada uma é
-- usada:
--   * is_transaction — aparece no lançamento de transações; exige que `type`
--                      seja 'income' (receita) ou 'expense' (despesa)
--   * is_card        — aparece no lançamento de fatura do cartão
--
-- Uma categoria pode ser as duas coisas ("ambas"). Receita nunca pode ser
-- categoria de cartão (cartão só registra gastos) — CHECK abaixo.
--
-- Backfill preserva o comportamento atual sem tocar em nenhum lançamento
-- (transações e faturas continuam apontando para as mesmas categorias):
--   * type = 'expense'    → transação + cartão (hoje o form do cartão lista
--                           todas as despesas, então "ambas" mantém o que
--                           o usuário já via)
--   * type = 'income'     → só transação
--   * type = 'investment' → inerte (não aparecia em nenhum form; segue assim)
--
-- Os ícones de categoria foram removidos do produto; a coluna `icon` cai.
--
-- Idempotente: pode rodar mais de uma vez. O backfill só toca em linhas com
-- os dois flags FALSE (estado impossível de criar pelo app novo), então um
-- rerun não desfaz escolhas feitas pelo usuário depois da migração.
-- =============================================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_transaction BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_card        BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE categories
SET is_transaction = TRUE,
    is_card        = (type = 'expense')
WHERE type IN ('income', 'expense')
  AND is_transaction = FALSE
  AND is_card = FALSE;

-- Receita nunca é categoria de gastos do cartão.
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_income_not_card;
ALTER TABLE categories ADD CONSTRAINT categories_income_not_card
  CHECK (NOT (is_card AND type = 'income'));

ALTER TABLE categories DROP COLUMN IF EXISTS icon;
