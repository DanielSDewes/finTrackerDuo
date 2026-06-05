-- =============================================================================
-- Migration: recorrência em lançamentos de cartão
-- =============================================================================
-- Adiciona dois campos em credit_card_transactions:
--   * is_recurring        — marca o lançamento como recorrente mensal
--   * recurring_group_id  — UUID que liga todas as instâncias do mesmo recorrente
--
-- Idempotente: usa IF NOT EXISTS para colunas e índice.
-- =============================================================================

ALTER TABLE credit_card_transactions
  ADD COLUMN IF NOT EXISTS is_recurring       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurring_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_cct_recurring_group
  ON credit_card_transactions(recurring_group_id);
