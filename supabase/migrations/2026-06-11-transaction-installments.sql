-- =============================================================================
-- Migration: parcelamento em transações comuns
-- =============================================================================
-- Permite criar transações parceladas (boletos, promissórias, carnês), tanto
-- receitas quanto despesas. Mesmo modelo do parcelamento do cartão: N
-- transações mensais ligadas por installment_group_id, numeradas i/N, com o
-- valor informado POR PARCELA.
--
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_installment       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS installment_group_id UUID,
  ADD COLUMN IF NOT EXISTS installment_number   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_total    INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_transactions_installment_group
  ON transactions(installment_group_id);
