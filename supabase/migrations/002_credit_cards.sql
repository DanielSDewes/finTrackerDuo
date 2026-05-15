-- ============================================
-- CREDIT CARDS MODULE
-- ============================================

CREATE TABLE credit_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'other'
    CHECK (brand IN ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'other')),
  color TEXT NOT NULL DEFAULT '#6366f1',
  limit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_card_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'paid', 'overdue')),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, month, year)
);

CREATE TABLE credit_card_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES credit_card_bills(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_installment BOOLEAN NOT NULL DEFAULT FALSE,
  installment_group_id UUID,
  installment_number INTEGER NOT NULL DEFAULT 1,
  installment_total INTEGER NOT NULL DEFAULT 1,
  is_last_installment BOOLEAN NOT NULL DEFAULT TRUE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  shared_group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_couple_id ON credit_cards(couple_id);
CREATE INDEX idx_credit_card_bills_card_id ON credit_card_bills(card_id);
CREATE INDEX idx_credit_card_bills_month_year ON credit_card_bills(year, month);
CREATE INDEX idx_cct_bill_id ON credit_card_transactions(bill_id);
CREATE INDEX idx_cct_card_id ON credit_card_transactions(card_id);
CREATE INDEX idx_cct_user_id ON credit_card_transactions(user_id);
CREATE INDEX idx_cct_installment_group ON credit_card_transactions(installment_group_id);
CREATE INDEX idx_cct_shared_group ON credit_card_transactions(shared_group_id);
CREATE INDEX idx_cct_deleted_at ON credit_card_transactions(deleted_at);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_credit_card_bills_updated_at
  BEFORE UPDATE ON credit_card_bills
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_credit_card_transactions_updated_at
  BEFORE UPDATE ON credit_card_transactions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- credit_cards
CREATE POLICY "Users can view own credit cards" ON credit_cards FOR SELECT
  USING (
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

-- credit_card_bills (acesso derivado da propriedade do cartão)
CREATE POLICY "Users can view own bills" ON credit_card_bills FOR SELECT
  USING (
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
  USING  (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()))
  WITH CHECK (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own bills" ON credit_card_bills
  FOR DELETE USING (card_id IN (SELECT id FROM credit_cards WHERE user_id = auth.uid()));

-- credit_card_transactions
CREATE POLICY "Users can view own card transactions" ON credit_card_transactions FOR SELECT
  USING (
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
