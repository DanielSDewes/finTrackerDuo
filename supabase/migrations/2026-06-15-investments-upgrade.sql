-- =============================================================================
-- Upgrade da seção de Investimentos — SCRIPT ÚNICO
-- =============================================================================
-- Rode UMA vez no SQL Editor do Supabase. É idempotente (pode rodar de novo
-- sem erro). Cria toda a estrutura nova do upgrade:
--   1) Ledger de operações (Fase 3, aditivo)
--   2) Metas de investimento (Fase 5)
--   3) Perfil de investidor — coluna em profiles (Fase 5)
--   4) Log de auditoria de investimentos (Fase 6)
--
-- Observação: NÃO há atualização automática de cotações. Preços são manuais;
-- só os rendimentos capitalizam (via accrue_investment_yields já existente).
-- Este script só cria estrutura; não mexe em dados existentes.

-- =============================================================================
-- 1. Ledger de operações (modelo ADITIVO: histórico ao lado das posições)
-- =============================================================================
CREATE TABLE IF NOT EXISTS investment_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id  UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN (
                    'buy', 'sell', 'transfer', 'bonus',
                    'split', 'reverse_split', 'subscription', 'conversion')),
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity       DECIMAL(18,8) NOT NULL DEFAULT 0,
  unit_price     DECIMAL(15,6) NOT NULL DEFAULT 0,
  fees           DECIMAL(15,2) NOT NULL DEFAULT 0,
  total          DECIMAL(15,2) NOT NULL DEFAULT 0,
  realized_gain  DECIMAL(15,2),
  broker         TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_transactions_inv
  ON investment_transactions(investment_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_user
  ON investment_transactions(user_id);

ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own investment transactions" ON investment_transactions;
CREATE POLICY "Users can view own investment transactions" ON investment_transactions
  FOR SELECT USING (
    auth.uid() = user_id OR
    investment_id IN (
      SELECT id FROM investments
      WHERE is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage own investment transactions" ON investment_transactions;
CREATE POLICY "Users can manage own investment transactions" ON investment_transactions
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_investment_transactions_updated_at ON investment_transactions;
CREATE TRIGGER trg_investment_transactions_updated_at
  BEFORE UPDATE ON investment_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- 2. Metas de investimento
-- =============================================================================
-- kind: networth = acumular patrimônio; monthly_income = renda passiva/mês
-- (dividendos); custom = meta genérica de valor.
CREATE TABLE IF NOT EXISTS investment_goals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id     UUID REFERENCES couples(id) ON DELETE SET NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('networth', 'monthly_income', 'custom')),
  title         TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
  is_shared     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON investment_goals(user_id);

ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own investment goals" ON investment_goals;
CREATE POLICY "Users can view own investment goals" ON investment_goals
  FOR SELECT USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can manage own investment goals" ON investment_goals;
CREATE POLICY "Users can manage own investment goals" ON investment_goals
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_investment_goals_updated_at ON investment_goals;
CREATE TRIGGER trg_investment_goals_updated_at
  BEFORE UPDATE ON investment_goals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- 3. Perfil de investidor (conservador / moderado / arrojado)
-- =============================================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS investor_profile TEXT
    CHECK (investor_profile IN ('conservador', 'moderado', 'arrojado'));

-- =============================================================================
-- 4. Log de auditoria de investimentos (append-only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS investment_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity      TEXT NOT NULL CHECK (entity IN ('investment', 'operation', 'dividend', 'goal')),
  label       TEXT NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_audit_user
  ON investment_audit_log(user_id, created_at DESC);

ALTER TABLE investment_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can use own investment audit log" ON investment_audit_log;
CREATE POLICY "Users can use own investment audit log" ON investment_audit_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Pronto. Estrutura do upgrade de investimentos criada.
-- =============================================================================
