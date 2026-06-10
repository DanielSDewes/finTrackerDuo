-- =============================================================================
-- FinTrackerDuo — Schema completo
-- =============================================================================
-- Setup único para um banco novo: copie todo este arquivo na Supabase SQL
-- Editor e clique "Run". Cria todas as tabelas, RLS, triggers, RPCs e seed
-- de categorias padrão.
--
-- IMPORTANTE: este script NÃO é idempotente. Use apenas em um banco vazio.
-- Para um banco existente, prefira migrations incrementais.
-- =============================================================================


-- =============================================================================
-- 1. EXTENSÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 2. TABELAS — em ordem de dependência
-- =============================================================================

-- ---- profiles (espelha auth.users) ----
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  avatar_url  TEXT,
  phone       TEXT,
  currency    TEXT NOT NULL DEFAULT 'BRL',
  locale      TEXT NOT NULL DEFAULT 'pt-BR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- couples (vínculo entre dois usuários) ----
CREATE TABLE couples (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'dissolved')),
  invite_token  TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invite_email  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- accounts (contas bancárias / carteiras) ----
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id   UUID REFERENCES couples(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'checking'
                CHECK (type IN ('checking', 'savings', 'investment', 'credit', 'cash', 'other')),
  balance     DECIMAL(15,2) NOT NULL DEFAULT 0,
  color       TEXT DEFAULT '#6366f1',
  icon        TEXT DEFAULT 'wallet',
  is_shared   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- categories (income/expense/investment) ----
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id   UUID REFERENCES couples(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  color       TEXT NOT NULL DEFAULT '#6366f1',
  icon        TEXT NOT NULL DEFAULT 'tag',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- transactions (movimentações reais) ----
CREATE TABLE transactions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id            UUID REFERENCES couples(id) ON DELETE SET NULL,
  account_id           UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id          UUID REFERENCES categories(id) ON DELETE SET NULL,
  type                 TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount               DECIMAL(15,2) NOT NULL,
  description          TEXT NOT NULL,
  notes                TEXT,
  date                 DATE NOT NULL,
  is_shared            BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring         BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type      TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end_date  DATE,
  status               TEXT NOT NULL DEFAULT 'completed'
                         CHECK (status IN ('pending', 'completed', 'cancelled')),
  tags                 TEXT[] DEFAULT '{}',
  attachments          TEXT[] DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

-- ---- future_transactions (agendadas) ----
CREATE TABLE future_transactions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id                UUID REFERENCES couples(id) ON DELETE SET NULL,
  account_id               UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id              UUID REFERENCES categories(id) ON DELETE SET NULL,
  type                     TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount                   DECIMAL(15,2) NOT NULL,
  description              TEXT NOT NULL,
  scheduled_date           DATE NOT NULL,
  is_shared                BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring             BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type          TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end_date      DATE,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_transaction_id UUID REFERENCES transactions(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- investments ----
CREATE TABLE investments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id           UUID REFERENCES couples(id) ON DELETE SET NULL,
  asset_class         TEXT NOT NULL
                        CHECK (asset_class IN ('fixed_income', 'variable_income', 'crypto', 'real_estate', 'other')),
  subcategory         TEXT NOT NULL,
  broker              TEXT,
  asset_name          TEXT NOT NULL,
  ticker              TEXT,
  quantity            DECIMAL(18,8) NOT NULL DEFAULT 0,
  average_price       DECIMAL(15,6) NOT NULL DEFAULT 0,
  current_price       DECIMAL(15,6) NOT NULL DEFAULT 0,
  invested_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_value       DECIMAL(15,2) NOT NULL DEFAULT 0,
  profitability       DECIMAL(10,4) DEFAULT 0,
  dividends_received  DECIMAL(15,2) NOT NULL DEFAULT 0,
  -- Rendimento automático. yield_rate é fração (0.01 = 1%), na unidade
  -- definida por yield_period. last_yield_at marca o último dia em que o
  -- accrue rodou para este ativo (idempotência do pg_cron).
  yield_rate          DECIMAL(12,8),
  yield_period        TEXT CHECK (yield_period IN ('daily', 'monthly', 'annual')),
  last_yield_at       DATE,
  is_shared           BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  purchase_date       DATE,
  maturity_date       DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- investment_dividends (histórico de proventos) ----
CREATE TABLE investment_dividends (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id   UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  received_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- goals (metas financeiras) ----
CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id       UUID REFERENCES couples(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN ('travel', 'car', 'house', 'emergency', 'retirement', 'education', 'other')),
  target_amount   DECIMAL(15,2) NOT NULL,
  current_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,
  deadline        DATE,
  color           TEXT DEFAULT '#6366f1',
  icon            TEXT DEFAULT 'target',
  is_shared       BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- goal_contributions (aportes) ----
CREATE TABLE goal_contributions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          DECIMAL(15,2) NOT NULL,
  notes           TEXT,
  contributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- goal_subgoals (sub-itens com link, valor e checkbox) ----
CREATE TABLE goal_subgoals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id       UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id     UUID REFERENCES couples(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  amount        DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  link          TEXT,
  notes         TEXT,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- notifications ----
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'warning', 'success', 'error')),
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- credit_cards ----
CREATE TABLE credit_cards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id     UUID REFERENCES couples(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  brand         TEXT NOT NULL DEFAULT 'other'
                  CHECK (brand IN ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other')),
  color         TEXT NOT NULL DEFAULT '#6366f1',
  limit_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_day   INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day       INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_shared     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- credit_card_bills (faturas mensais) ----
CREATE TABLE credit_card_bills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id         UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INTEGER NOT NULL CHECK (year >= 2020),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'closed', 'paid', 'overdue')),
  total_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,
  owner_amount    DECIMAL(15,2) NOT NULL DEFAULT 0,  -- soma das tx do dono do cartão
  partner_amount  DECIMAL(15,2) NOT NULL DEFAULT 0,  -- soma das tx do parceiro
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, month, year)
);

-- ---- credit_card_transactions (lançamentos da fatura) ----
CREATE TABLE credit_card_transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id               UUID NOT NULL REFERENCES credit_card_bills(id) ON DELETE CASCADE,
  card_id               UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id             UUID REFERENCES couples(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  amount                DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category_id           UUID REFERENCES categories(id) ON DELETE SET NULL,
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_installment        BOOLEAN NOT NULL DEFAULT FALSE,
  installment_group_id  UUID,
  installment_number    INTEGER NOT NULL DEFAULT 1,
  installment_total     INTEGER NOT NULL DEFAULT 1,
  is_last_installment   BOOLEAN NOT NULL DEFAULT TRUE,
  is_shared             BOOLEAN NOT NULL DEFAULT FALSE,
  shared_group_id       UUID,
  is_forecast           BOOLEAN NOT NULL DEFAULT FALSE,
  -- Reembolsado: valor permanece registrado, mas é excluído de qualquer soma
  -- (total da fatura, breakdown por categoria, owner/partner amounts).
  is_reimbursed         BOOLEAN NOT NULL DEFAULT FALSE,
  -- Recorrente mensal: ao marcar, copia o lançamento para todas as faturas
  -- futuras já existentes e para qualquer fatura nova criada depois.
  -- recurring_group_id liga todas as instâncias do mesmo recorrente.
  is_recurring          BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_group_id    UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- ---- terms_acceptances (auditoria de aceites dos Termos de Uso) ----
-- Append-only: registra cada aceite (cadastro ou reaceite por nova versão).
CREATE TABLE terms_acceptances (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,
  accepted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source       TEXT NOT NULL DEFAULT 'signup'
                 CHECK (source IN ('signup', 'reaccept')),
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- calendar_events (agenda: eventos com data e horário opcional) ----
CREATE TABLE calendar_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id     UUID REFERENCES couples(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  event_date    DATE NOT NULL,
  event_time    TIME,            -- opcional: null = evento de dia todo
  color         TEXT NOT NULL DEFAULT '#6366f1',
  is_shared     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- currency_quotes (cache global de cotações USD/EUR → BRL) ----
-- Preenchido pelo cron /api/cron/quotes (Vercel) a cada 10 min. Clientes
-- só leem (RLS abaixo). Writes exigem service role (bypassa RLS).
CREATE TABLE currency_quotes (
  code        TEXT PRIMARY KEY CHECK (code IN ('USD', 'EUR')),
  name        TEXT NOT NULL,
  buy         DECIMAL(10,4),
  variation   DECIMAL(10,4) NOT NULL DEFAULT 0,
  source      TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 3. INDEXES
-- =============================================================================
CREATE INDEX idx_transactions_user_id           ON transactions(user_id);
CREATE INDEX idx_transactions_couple_id         ON transactions(couple_id);
CREATE INDEX idx_transactions_date              ON transactions(date DESC);
CREATE INDEX idx_transactions_type              ON transactions(type);
CREATE INDEX idx_transactions_deleted           ON transactions(deleted_at);
CREATE INDEX idx_future_transactions_user_id    ON future_transactions(user_id);
CREATE INDEX idx_future_transactions_scheduled  ON future_transactions(scheduled_date);
CREATE INDEX idx_investments_user_id            ON investments(user_id);
CREATE INDEX idx_investments_yield              ON investments(last_yield_at) WHERE yield_rate IS NOT NULL AND is_active = TRUE;
CREATE INDEX idx_investment_dividends_inv       ON investment_dividends(investment_id, received_at DESC);
CREATE INDEX idx_investment_dividends_user      ON investment_dividends(user_id);
CREATE INDEX idx_goals_user_id                  ON goals(user_id);
CREATE INDEX idx_accounts_user_id               ON accounts(user_id);
CREATE INDEX idx_categories_user_id             ON categories(user_id);
CREATE INDEX idx_goal_subgoals_goal_id          ON goal_subgoals(goal_id);
CREATE INDEX idx_goal_subgoals_user_id          ON goal_subgoals(user_id);
CREATE INDEX idx_terms_acceptances_user_id      ON terms_acceptances(user_id);
CREATE INDEX idx_calendar_events_user_id        ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_couple_id      ON calendar_events(couple_id);
CREATE INDEX idx_calendar_events_date           ON calendar_events(event_date);
CREATE INDEX idx_credit_cards_user_id           ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_couple_id         ON credit_cards(couple_id);
CREATE INDEX idx_credit_card_bills_card_id      ON credit_card_bills(card_id);
CREATE INDEX idx_credit_card_bills_month_year   ON credit_card_bills(year, month);
CREATE INDEX idx_cct_bill_id                    ON credit_card_transactions(bill_id);
CREATE INDEX idx_cct_card_id                    ON credit_card_transactions(card_id);
CREATE INDEX idx_cct_user_id                    ON credit_card_transactions(user_id);
CREATE INDEX idx_cct_installment_group          ON credit_card_transactions(installment_group_id);
CREATE INDEX idx_cct_shared_group               ON credit_card_transactions(shared_group_id);
CREATE INDEX idx_cct_recurring_group            ON credit_card_transactions(recurring_group_id);
CREATE INDEX idx_cct_deleted_at                 ON credit_card_transactions(deleted_at);


-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- ---- updated_at genérico ----
-- SET search_path explícito + REVOKE no fim do schema fecham o vetor de
-- "function search_path mutable" do linter de segurança do Supabase.
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_couples_updated_at
  BEFORE UPDATE ON couples
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_credit_card_bills_updated_at
  BEFORE UPDATE ON credit_card_bills
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_credit_card_transactions_updated_at
  BEFORE UPDATE ON credit_card_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ---- novo usuário Supabase → cria profile automaticamente ----
-- ON CONFLICT + EXCEPTION garantem que falhas no profile não bloqueiem o
-- cadastro do usuário (caso de race condition ou retentativa do Supabase Auth).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- registra o aceite dos Termos feito no cadastro (auditoria). Bloco próprio
  -- para que uma falha aqui não desfaça a criação do profile.
  IF NEW.raw_user_meta_data ? 'terms_version' THEN
    BEGIN
      INSERT INTO public.terms_acceptances (user_id, version, accepted_at, source)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'terms_version',
        COALESCE((NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMPTZ, NOW()),
        'signup'
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'terms_acceptances insert failed: % %', SQLERRM, SQLSTATE;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---- goal_subgoals: mantém completed_at em sincronia com completed ----
CREATE OR REPLACE FUNCTION set_goal_subgoals_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    NEW.completed_at = NOW();
  ELSIF NEW.completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goal_subgoals_timestamps
  BEFORE UPDATE ON goal_subgoals
  FOR EACH ROW EXECUTE FUNCTION set_goal_subgoals_timestamps();


-- =============================================================================
-- 5. RLS — habilita Row Level Security em todas as tabelas
-- =============================================================================
ALTER TABLE profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_dividends      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_subgoals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards              ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_quotes           ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 6. POLÍTICAS DE RLS
-- =============================================================================

-- ---- profiles ----
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Permite que cada membro de um casal ativo enxergue o perfil do parceiro.
-- Sem esta policy, o embed `partner:partner_id(...)` em queries de couples
-- retorna NULL silenciosamente (RLS oculta a row), e o nome/avatar do
-- parceiro nunca aparece na UI.
CREATE POLICY "Couple members can view partner profile" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active'
        AND partner_id IS NOT NULL
    )
  );

-- ---- couples ----
CREATE POLICY "Couple members can view couple" ON couples
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = partner_id);

CREATE POLICY "Owner can create couple" ON couples
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can update couple" ON couples
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = partner_id);

-- Permite que qualquer usuário autenticado encontre um convite pendente
-- por invite_token (necessário pois o convidado ainda não é partner_id)
CREATE POLICY "Anyone can view pending couple for invite lookup" ON couples
  FOR SELECT USING (status = 'pending');

-- Permite ao convidado aceitar o convite: USING valida a row antiga
-- (ainda pending, sem partner), WITH CHECK valida a nova (vira active
-- e o caller se torna o partner)
CREATE POLICY "Authenticated user can accept pending invite" ON couples
  FOR UPDATE
  USING      (status = 'pending' AND partner_id IS NULL)
  WITH CHECK (auth.uid() = partner_id AND status = 'active');

-- ---- accounts ----
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- ---- categories ----
CREATE POLICY "Users can view own and default categories" ON categories
  FOR SELECT USING (
    auth.uid() = user_id OR
    is_default = TRUE OR
    couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (auth.uid() = user_id);

-- ---- transactions ----
-- IMPORTANTE: policies separadas por operação. Um único FOR ALL com
-- "deleted_at IS NULL" no USING quebra o soft-delete: o Postgres reusa
-- o USING como WITH CHECK, e após setar deleted_at = NOW() a row deixa
-- de satisfazer o filtro, fazendo o UPDATE falhar.
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (
    deleted_at IS NULL AND (
      auth.uid() = user_id OR
      (is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Membros do casal podem ver/criar/atualizar transações do parceiro
-- (necessário para o modo "Lançar para o parceiro")
CREATE POLICY "Couple members can view partner transactions" ON transactions
  FOR SELECT USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active'
        AND partner_id IS NOT NULL
    )
  );

CREATE POLICY "Couple members can create partner transactions" ON transactions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active'
        AND partner_id IS NOT NULL
    )
  );

CREATE POLICY "Couple members can update partner transactions" ON transactions
  FOR UPDATE USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active'
        AND partner_id IS NOT NULL
    )
  );

-- ---- future_transactions ----
CREATE POLICY "Users can view own future transactions" ON future_transactions
  FOR SELECT USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can manage own future transactions" ON future_transactions
  FOR ALL USING (auth.uid() = user_id);

-- ---- investments ----
CREATE POLICY "Users can view own investments" ON investments
  FOR SELECT USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can manage own investments" ON investments
  FOR ALL USING (auth.uid() = user_id);

-- ---- investment_dividends ----
CREATE POLICY "Users can view own dividends" ON investment_dividends
  FOR SELECT USING (
    auth.uid() = user_id OR
    investment_id IN (
      SELECT id FROM investments
      WHERE is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage own dividends" ON investment_dividends
  FOR ALL USING (auth.uid() = user_id);

-- ---- goals ----
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can manage own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

-- ---- goal_contributions ----
CREATE POLICY "Users can view goal contributions" ON goal_contributions
  FOR SELECT USING (
    auth.uid() = user_id OR
    goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can add own contributions" ON goal_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- goal_subgoals ----
CREATE POLICY "Users can view own subgoals" ON goal_subgoals
  FOR SELECT USING (
    auth.uid() = user_id
    OR goal_id IN (
      SELECT id FROM goals
      WHERE user_id = auth.uid()
         OR (is_shared = TRUE AND couple_id IN (
           SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can insert own subgoals" ON goal_subgoals
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND goal_id IN (
      SELECT id FROM goals
      WHERE user_id = auth.uid()
         OR (is_shared = TRUE AND couple_id IN (
           SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can update own subgoals" ON goal_subgoals
  FOR UPDATE USING (
    auth.uid() = user_id
    OR goal_id IN (
      SELECT id FROM goals
      WHERE is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own subgoals" ON goal_subgoals
  FOR DELETE USING (
    auth.uid() = user_id
    OR goal_id IN (
      SELECT id FROM goals
      WHERE is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      )
    )
  );

-- ---- notifications ----
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ---- credit_cards ----
CREATE POLICY "Users can view own credit cards" ON credit_cards
  FOR SELECT USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert own credit cards" ON credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit cards" ON credit_cards
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit cards" ON credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Membros do casal podem ver os cartões do parceiro (modo casal consolidado).
-- Apenas SELECT: criar/editar/excluir continua restrito ao dono do cartão.
CREATE POLICY "Couple members can view partner credit cards" ON credit_cards
  FOR SELECT USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

-- ---- credit_card_bills (acesso derivado do cartão) ----
CREATE POLICY "Users can view own bills" ON credit_card_bills
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM credit_cards
      WHERE user_id = auth.uid()
         OR (is_shared = TRUE AND couple_id IN (
              SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
            ))
    )
  );

CREATE POLICY "Users can insert own bills" ON credit_card_bills
  FOR INSERT WITH CHECK (
    card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own bills" ON credit_card_bills
  FOR UPDATE
  USING      (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()))
  WITH CHECK (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own bills" ON credit_card_bills
  FOR DELETE USING (
    card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid())
  );

-- Membros do casal podem ver as faturas dos cartões do parceiro (modo casal
-- consolidado). Apenas SELECT.
CREATE POLICY "Couple members can view partner card bills" ON credit_card_bills
  FOR SELECT USING (
    card_id IN (
      SELECT id FROM credit_cards
      WHERE user_id IN (
        SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
        FROM couples
        WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
          AND status = 'active' AND partner_id IS NOT NULL
      )
    )
  );

-- ---- credit_card_transactions ----
CREATE POLICY "Users can view own card transactions" ON credit_card_transactions
  FOR SELECT USING (
    deleted_at IS NULL AND (
      auth.uid() = user_id OR
      (is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can insert own card transactions" ON credit_card_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card transactions" ON credit_card_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own card transactions" ON credit_card_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Membros do casal podem manipular transações do parceiro no cartão
-- (necessário para "Dividir com casal" e "Lançar para o parceiro")
CREATE POLICY "Couple members can view partner card transactions" ON credit_card_transactions
  FOR SELECT USING (
    deleted_at IS NULL AND
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

CREATE POLICY "Couple members can insert partner card transactions" ON credit_card_transactions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

CREATE POLICY "Couple members can update partner card transactions" ON credit_card_transactions
  FOR UPDATE USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

CREATE POLICY "Couple members can delete partner card transactions" ON credit_card_transactions
  FOR DELETE USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

-- ---- terms_acceptances (append-only: só leitura e inserção do próprio) ----
CREATE POLICY "Users can view own terms acceptances" ON terms_acceptances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own terms acceptances" ON terms_acceptances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- calendar_events ----
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

-- ---- currency_quotes (cache global, somente leitura para clientes) ----
-- Writes só pela service role (rota /api/cron/quotes), que bypassa RLS.
CREATE POLICY "Authenticated can read currency quotes" ON currency_quotes
  FOR SELECT
  TO authenticated
  USING (true);


-- =============================================================================
-- 7. FUNÇÕES SECURITY DEFINER (RPCs)
-- =============================================================================
-- SECURITY DEFINER ignora RLS do caller mas faz checagem manual de autorização
-- antes de executar — usado quando UPDATE + SELECT na mesma row tem conflito
-- com a política, ou quando a operação precisa recalcular agregados.

-- ---- Soft-delete da própria transação ----
CREATE OR REPLACE FUNCTION soft_delete_transaction(transaction_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE transactions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id          = transaction_id
    AND user_id     = auth.uid()
    AND deleted_at  IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_transaction(UUID) TO authenticated;

-- ---- Soft-delete da transação do parceiro ----
CREATE OR REPLACE FUNCTION soft_delete_partner_transaction(transaction_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
  INTO v_partner_id
  FROM couples
  WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
    AND status = 'active'
    AND partner_id IS NOT NULL
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'No active couple found';
  END IF;

  UPDATE transactions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id        = transaction_id
    AND user_id   = v_partner_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_partner_transaction(UUID) TO authenticated;

-- ---- Soft-delete de uma única transação de cartão + recalcula total ----
CREATE OR REPLACE FUNCTION soft_delete_card_transaction(p_transaction_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_bill_id  UUID;
  v_total    DECIMAL(15,2);
BEGIN
  SELECT user_id, bill_id INTO v_owner_id, v_bill_id
  FROM credit_card_transactions
  WHERE id = p_transaction_id AND deleted_at IS NULL;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Autoriza se for o dono OU se for membro de um casal ativo com o dono
  IF v_owner_id <> auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM couples
      WHERE status = 'active'
        AND (
          (owner_id = auth.uid() AND partner_id = v_owner_id) OR
          (partner_id = auth.uid() AND owner_id = v_owner_id)
        )
    ) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  UPDATE credit_card_transactions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Recalcula total da fatura afetada (reembolsadas ficam de fora).
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM credit_card_transactions
  WHERE bill_id = v_bill_id AND deleted_at IS NULL AND is_reimbursed = FALSE;

  UPDATE credit_card_bills
  SET total_amount = v_total, updated_at = NOW()
  WHERE id = v_bill_id;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_card_transaction(UUID) TO authenticated;

-- ---- Soft-delete de todas as parcelas de um grupo + recalcula faturas ----
CREATE OR REPLACE FUNCTION soft_delete_card_installment_group(p_group_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_bill_id  UUID;
  v_total    DECIMAL(15,2);
BEGIN
  SELECT user_id INTO v_owner_id
  FROM credit_card_transactions
  WHERE installment_group_id = p_group_id AND deleted_at IS NULL
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Installment group not found';
  END IF;

  IF v_owner_id <> auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM couples
      WHERE status = 'active'
        AND (
          (owner_id = auth.uid() AND partner_id = v_owner_id) OR
          (partner_id = auth.uid() AND owner_id = v_owner_id)
        )
    ) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  UPDATE credit_card_transactions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE installment_group_id = p_group_id AND deleted_at IS NULL;

  -- Recalcula total de cada fatura tocada pelo grupo
  FOR v_bill_id IN (
    SELECT DISTINCT bill_id
    FROM credit_card_transactions
    WHERE installment_group_id = p_group_id
  ) LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM credit_card_transactions
    WHERE bill_id = v_bill_id AND deleted_at IS NULL AND is_reimbursed = FALSE;

    UPDATE credit_card_bills
    SET total_amount = v_total, updated_at = NOW()
    WHERE id = v_bill_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_card_installment_group(UUID) TO authenticated;


-- ---- Accrue diário do rendimento dos investimentos ----------------------------
-- Aplica juros compostos sobre current_value para cada investimento ativo com
-- yield_rate definido. Converte taxas mensais/anuais para equivalente diário
-- composto e usa last_yield_at para idempotência (rodar 2x no mesmo dia é
-- no-op). current_price é resincronizado com current_value / quantity quando
-- há quantidade.
CREATE OR REPLACE FUNCTION accrue_investment_yields()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  UPDATE investments AS i
  SET
    current_value = ROUND(
      i.current_value * POWER(
        1 +
          CASE i.yield_period
            WHEN 'daily'   THEN i.yield_rate
            WHEN 'monthly' THEN POWER(1 + i.yield_rate, 1.0 / 30.0) - 1
            WHEN 'annual'  THEN POWER(1 + i.yield_rate, 1.0 / 365.0) - 1
          END,
        (v_today - COALESCE(i.last_yield_at, v_today))
      ),
      2
    ),
    current_price = CASE
      WHEN i.quantity > 0 THEN ROUND(
        (i.current_value * POWER(
          1 +
            CASE i.yield_period
              WHEN 'daily'   THEN i.yield_rate
              WHEN 'monthly' THEN POWER(1 + i.yield_rate, 1.0 / 30.0) - 1
              WHEN 'annual'  THEN POWER(1 + i.yield_rate, 1.0 / 365.0) - 1
            END,
          (v_today - COALESCE(i.last_yield_at, v_today))
        )) / i.quantity,
        6
      )
      ELSE i.current_price
    END,
    profitability = CASE
      WHEN i.invested_amount > 0 THEN ROUND(
        (((i.current_value * POWER(
          1 +
            CASE i.yield_period
              WHEN 'daily'   THEN i.yield_rate
              WHEN 'monthly' THEN POWER(1 + i.yield_rate, 1.0 / 30.0) - 1
              WHEN 'annual'  THEN POWER(1 + i.yield_rate, 1.0 / 365.0) - 1
            END,
          (v_today - COALESCE(i.last_yield_at, v_today))
        )) - i.invested_amount) / i.invested_amount) * 100,
        4
      )
      ELSE 0
    END,
    last_yield_at = v_today,
    updated_at = NOW()
  WHERE i.is_active = TRUE
    AND i.yield_rate IS NOT NULL
    AND i.yield_period IS NOT NULL
    AND (i.last_yield_at IS NULL OR i.last_yield_at < v_today);
END;
$$;

GRANT EXECUTE ON FUNCTION accrue_investment_yields() TO authenticated;

-- Agendamento diário às 03:00 UTC (00:00 BRT). Requer extensão pg_cron
-- habilitada no projeto Supabase (Dashboard → Database → Extensions → pg_cron).
-- O CREATE EXTENSION é guardado para não falhar se já existir / não houver
-- permissão durante um rerun do schema.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'pg_cron exige privilégio de superuser; habilite manualmente no painel do Supabase.';
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove agendamento anterior (se houver) antes de recadastrar
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'accrue_investment_yields_daily';

    PERFORM cron.schedule(
      'accrue_investment_yields_daily',
      '0 3 * * *',
      $cron$SELECT public.accrue_investment_yields();$cron$
    );
  END IF;
END;
$$;


-- ---- Sync de dividendos: dividends_received <- SUM(investment_dividends) -----
-- Mantém o agregado no investimento sempre coerente com a tabela de histórico.
CREATE OR REPLACE FUNCTION sync_investment_dividends()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investment_id UUID := COALESCE(NEW.investment_id, OLD.investment_id);
  v_total         DECIMAL(15,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM investment_dividends
  WHERE investment_id = v_investment_id;

  UPDATE investments
  SET dividends_received = v_total, updated_at = NOW()
  WHERE id = v_investment_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_investment_dividends_sync
  AFTER INSERT OR UPDATE OR DELETE ON investment_dividends
  FOR EACH ROW EXECUTE FUNCTION sync_investment_dividends();


-- =============================================================================
-- 7.1. HARDENING — REVOKE de funções na superfície PostgREST
-- =============================================================================
-- Por padrão o Postgres concede EXECUTE em funções para PUBLIC, e o PostgREST
-- do Supabase expõe automaticamente tudo que esteja no schema `public` como
-- RPC em `/rest/v1/rpc/<nome>`. Sem REVOKE explícito, isso significa que:
--
-- 1) Triggers internos (handle_new_user, handle_updated_at, sync_investment_
--    dividends, set_goal_subgoals_timestamps) ficam chamáveis via REST por
--    qualquer um, anônimo ou autenticado. Eles foram desenhados para rodar
--    no contexto de triggers, não como RPC pública — chamá-los direto pode
--    inserir/alterar dados sem passar pelos checks normais.
--
-- 2) RPCs do app (soft_delete_*) tinham GRANT TO authenticated mas o EXECUTE
--    pra PUBLIC continuava aberto, ou seja, o token anon também conseguia
--    invocar. As funções têm checagem interna por auth.uid(), mas a defesa
--    em profundidade pede REVOKE em PUBLIC.
--
-- Esses REVOKE/GRANT fecham os warnings do security advisor:
--   - anon_security_definer_function_executable
--   - authenticated_security_definer_function_executable

-- Triggers internos: ninguém invoca via RPC.
REVOKE EXECUTE ON FUNCTION public.handle_updated_at()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_goal_subgoals_timestamps() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_investment_dividends()   FROM PUBLIC, anon, authenticated;

-- RPCs do app: só authenticated. PUBLIC/anon ficam bloqueados.
REVOKE EXECUTE ON FUNCTION public.soft_delete_transaction(UUID)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_partner_transaction(UUID)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_card_transaction(UUID)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_card_installment_group(UUID)         FROM PUBLIC, anon;

-- accrue_investment_yields() roda via pg_cron, mas o GRANT TO authenticated
-- também permite chamada manual em ambiente local. Mantemos o grant e só
-- tiramos PUBLIC/anon por garantia.
REVOKE EXECUTE ON FUNCTION public.accrue_investment_yields()    FROM PUBLIC, anon;


-- =============================================================================
-- 8. GRANTS — permissões para roles do Supabase
-- =============================================================================
-- Garante que authenticated e anon possam acessar o schema public
-- (necessário para SDK do Supabase rodar com a anon/JWT key).
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;


-- =============================================================================
-- 9. SEED — categorias padrão
-- =============================================================================
-- Paleta organizada para o gráfico de pizza do dashboard:
-- - Receitas em verdes/teals (sinal de entrada).
-- - Despesas espalhadas por todo o spectrum (vermelho/laranja/azul/roxo etc.)
--   para diferenciar visualmente quando o usuário tem muitas categorias.
-- - Investimentos em azul/violeta/laranja, sem repetir tons das despesas.
-- Cada cor é única dentro do tipo (e entre tipos, exceto pelo "Outros" cinza,
-- que é genérico e propositalmente neutro).
INSERT INTO categories (id, user_id, name, type, color, icon, is_default) VALUES
  -- Receitas
  (uuid_generate_v4(), NULL, 'Salário',             'income',     '#16a34a', 'briefcase',       TRUE),
  (uuid_generate_v4(), NULL, 'Freelance',           'income',     '#0d9488', 'laptop',          TRUE),
  (uuid_generate_v4(), NULL, 'Investimentos',       'income',     '#65a30d', 'trending-up',     TRUE),
  (uuid_generate_v4(), NULL, 'Outros',              'income',     '#059669', 'plus-circle',     TRUE),

  -- Despesas
  (uuid_generate_v4(), NULL, 'Moradia',             'expense',    '#dc2626', 'home',            TRUE),
  (uuid_generate_v4(), NULL, 'Alimentação',         'expense',    '#ea580c', 'utensils',        TRUE),
  (uuid_generate_v4(), NULL, 'Transporte',          'expense',    '#ca8a04', 'car',             TRUE),
  (uuid_generate_v4(), NULL, 'Saúde',               'expense',    '#0891b2', 'heart-pulse',     TRUE),
  (uuid_generate_v4(), NULL, 'Educação',            'expense',    '#2563eb', 'graduation-cap',  TRUE),
  (uuid_generate_v4(), NULL, 'Lazer',               'expense',    '#db2777', 'gamepad-2',       TRUE),
  (uuid_generate_v4(), NULL, 'Vestuário',           'expense',    '#9333ea', 'shirt',           TRUE),
  (uuid_generate_v4(), NULL, 'Presente',            'expense',    '#e11d48', 'gift',            TRUE),
  (uuid_generate_v4(), NULL, 'Pet',                 'expense',    '#f59e0b', 'paw-print',       TRUE),
  (uuid_generate_v4(), NULL, 'Assinaturas',         'expense',    '#475569', 'repeat',          TRUE),
  (uuid_generate_v4(), NULL, 'Cartão de Crédito',   'expense',    '#c026d3', 'credit-card',     TRUE),
  (uuid_generate_v4(), NULL, 'Investimento',        'expense',    '#4f46e5', 'trending-up',     TRUE),
  (uuid_generate_v4(), NULL, 'Outros',              'expense',    '#6b7280', 'more-horizontal', TRUE),

  -- Investimentos
  (uuid_generate_v4(), NULL, 'Renda Fixa',          'investment', '#0284c7', 'shield',          TRUE),
  (uuid_generate_v4(), NULL, 'Renda Variável',      'investment', '#7c3aed', 'trending-up',     TRUE),
  (uuid_generate_v4(), NULL, 'Fundos Imobiliários', 'investment', '#be185d', 'building-2',      TRUE),
  (uuid_generate_v4(), NULL, 'Criptomoedas',        'investment', '#f97316', 'bitcoin',         TRUE);


-- =============================================================================
-- 9.1. REFRESH DE CORES — para installs existentes
-- =============================================================================
-- Os INSERTs acima só rodam em setup fresco. Em bancos já populados, aplique
-- estes UPDATEs no SQL Editor do Supabase para repintar as categorias default
-- com a paleta nova (custom categories dos usuários não são tocadas, porque
-- filtramos por is_default = TRUE).
UPDATE categories SET color = CASE name
  WHEN 'Salário'        THEN '#16a34a'
  WHEN 'Freelance'      THEN '#0d9488'
  WHEN 'Investimentos'  THEN '#65a30d'
  WHEN 'Outros'         THEN '#059669'
  ELSE color
END WHERE type = 'income' AND is_default = TRUE;

UPDATE categories SET color = CASE name
  WHEN 'Moradia'             THEN '#dc2626'
  WHEN 'Alimentação'         THEN '#ea580c'
  WHEN 'Transporte'          THEN '#ca8a04'
  WHEN 'Saúde'               THEN '#0891b2'
  WHEN 'Educação'            THEN '#2563eb'
  WHEN 'Lazer'               THEN '#db2777'
  WHEN 'Vestuário'           THEN '#9333ea'
  WHEN 'Presente'            THEN '#e11d48'
  WHEN 'Pet'                 THEN '#f59e0b'
  WHEN 'Assinaturas'         THEN '#475569'
  WHEN 'Cartão de Crédito'   THEN '#c026d3'
  WHEN 'Investimento'        THEN '#4f46e5'
  WHEN 'Outros'              THEN '#6b7280'
  ELSE color
END WHERE type = 'expense' AND is_default = TRUE;

UPDATE categories SET color = CASE name
  WHEN 'Renda Fixa'            THEN '#0284c7'
  WHEN 'Renda Variável'        THEN '#7c3aed'
  WHEN 'Fundos Imobiliários'   THEN '#be185d'
  WHEN 'Criptomoedas'          THEN '#f97316'
  ELSE color
END WHERE type = 'investment' AND is_default = TRUE;


-- =============================================================================
-- Pronto.
-- Próximos passos:
--   1. Em Auth → URL Configuration, adicione: <APP_URL>/auth/callback
--   2. Em .env.local da app, preencha NEXT_PUBLIC_SUPABASE_URL e _ANON_KEY
--   3. npm run dev → http://localhost:3000
-- =============================================================================
