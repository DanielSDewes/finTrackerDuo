-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- COUPLES
-- ============================================
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'dissolved')),
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invite_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ACCOUNTS
-- ============================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking' CHECK (type IN ('checking', 'savings', 'investment', 'credit', 'cash', 'other')),
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'wallet',
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'tag',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  date DATE NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end_date DATE,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  tags TEXT[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- FUTURE TRANSACTIONS (scheduled)
-- ============================================
CREATE TABLE future_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INVESTMENTS
-- ============================================
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  asset_class TEXT NOT NULL CHECK (asset_class IN ('fixed_income', 'variable_income', 'crypto', 'real_estate', 'other')),
  subcategory TEXT NOT NULL,
  broker TEXT,
  asset_name TEXT NOT NULL,
  ticker TEXT,
  quantity DECIMAL(18,8) NOT NULL DEFAULT 0,
  average_price DECIMAL(15,6) NOT NULL DEFAULT 0,
  current_price DECIMAL(15,6) NOT NULL DEFAULT 0,
  invested_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  profitability DECIMAL(10,4) DEFAULT 0,
  dividends_received DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  purchase_date DATE,
  maturity_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('travel', 'car', 'house', 'emergency', 'retirement', 'education', 'other')),
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  deadline DATE,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'target',
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- GOAL CONTRIBUTIONS
-- ============================================
CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_couple_id ON transactions(couple_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_deleted ON transactions(deleted_at);
CREATE INDEX idx_future_transactions_user_id ON future_transactions(user_id);
CREATE INDEX idx_future_transactions_scheduled ON future_transactions(scheduled_date);
CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_couples_updated_at BEFORE UPDATE ON couples FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_investments_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================
-- NEW USER TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE future_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- COUPLES POLICIES
CREATE POLICY "Couple members can view couple" ON couples FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = partner_id);
CREATE POLICY "Owner can create couple" ON couples FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Members can update couple" ON couples FOR UPDATE
  USING (auth.uid() = owner_id OR auth.uid() = partner_id);

-- ACCOUNTS POLICIES
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );
CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- CATEGORIES POLICIES
CREATE POLICY "Users can view own and default categories" ON categories FOR SELECT
  USING (auth.uid() = user_id OR is_default = TRUE OR couple_id IN (
    SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
  ));
CREATE POLICY "Users can manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT
  USING (
    deleted_at IS NULL AND (
      auth.uid() = user_id OR
      (is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      ))
    )
  );
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- FUTURE TRANSACTIONS POLICIES
CREATE POLICY "Users can view own future transactions" ON future_transactions FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );
CREATE POLICY "Users can manage own future transactions" ON future_transactions FOR ALL
  USING (auth.uid() = user_id);

-- INVESTMENTS POLICIES
CREATE POLICY "Users can view own investments" ON investments FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );
CREATE POLICY "Users can manage own investments" ON investments FOR ALL USING (auth.uid() = user_id);

-- GOALS POLICIES
CREATE POLICY "Users can view own goals" ON goals FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );
CREATE POLICY "Users can manage own goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- GOAL CONTRIBUTIONS POLICIES
CREATE POLICY "Users can view goal contributions" ON goal_contributions FOR SELECT
  USING (auth.uid() = user_id OR goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid()));
CREATE POLICY "Users can add own contributions" ON goal_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- DEFAULT CATEGORIES SEED
-- ============================================
INSERT INTO categories (id, user_id, name, type, color, icon, is_default) VALUES
  (uuid_generate_v4(), NULL, 'Salário', 'income', '#22c55e', 'briefcase', TRUE),
  (uuid_generate_v4(), NULL, 'Freelance', 'income', '#10b981', 'laptop', TRUE),
  (uuid_generate_v4(), NULL, 'Investimentos', 'income', '#6366f1', 'trending-up', TRUE),
  (uuid_generate_v4(), NULL, 'Outros', 'income', '#8b5cf6', 'plus-circle', TRUE),
  (uuid_generate_v4(), NULL, 'Moradia', 'expense', '#ef4444', 'home', TRUE),
  (uuid_generate_v4(), NULL, 'Alimentação', 'expense', '#f97316', 'utensils', TRUE),
  (uuid_generate_v4(), NULL, 'Transporte', 'expense', '#eab308', 'car', TRUE),
  (uuid_generate_v4(), NULL, 'Saúde', 'expense', '#06b6d4', 'heart-pulse', TRUE),
  (uuid_generate_v4(), NULL, 'Educação', 'expense', '#3b82f6', 'graduation-cap', TRUE),
  (uuid_generate_v4(), NULL, 'Lazer', 'expense', '#ec4899', 'gamepad-2', TRUE),
  (uuid_generate_v4(), NULL, 'Vestuário', 'expense', '#a855f7', 'shirt', TRUE),
  (uuid_generate_v4(), NULL, 'Presente', 'expense', '#f472b6', 'gift', TRUE),
  (uuid_generate_v4(), NULL, 'Assinaturas', 'expense', '#64748b', 'repeat', TRUE),
  (uuid_generate_v4(), NULL, 'Cartão de Crédito', 'expense', '#f43f5e', 'credit-card', TRUE),
  (uuid_generate_v4(), NULL, 'Outros', 'expense', '#6b7280', 'more-horizontal', TRUE),
  (uuid_generate_v4(), NULL, 'Renda Fixa', 'investment', '#6366f1', 'shield', TRUE),
  (uuid_generate_v4(), NULL, 'Renda Variável', 'investment', '#8b5cf6', 'trending-up', TRUE),
  (uuid_generate_v4(), NULL, 'Fundos Imobiliários', 'investment', '#7c3aed', 'building-2', TRUE),
  (uuid_generate_v4(), NULL, 'Criptomoedas', 'investment', '#a78bfa', 'bitcoin', TRUE);
