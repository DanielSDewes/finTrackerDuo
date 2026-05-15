-- Allow couple members to view partner's card transactions
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

-- Allow couple members to insert card transactions on behalf of partner
-- (needed for "Dividir com casal" split row AND "Lançar para o parceiro")
CREATE POLICY "Couple members can insert partner card transactions" ON credit_card_transactions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

-- Allow couple members to update partner's card transactions
CREATE POLICY "Couple members can update partner card transactions" ON credit_card_transactions
  FOR UPDATE USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

-- Allow couple members to soft-delete partner's card transactions
CREATE POLICY "Couple members can delete partner card transactions" ON credit_card_transactions
  FOR DELETE USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active' AND partner_id IS NOT NULL
    )
  );

-- Category: Pet
INSERT INTO categories (id, user_id, name, type, color, icon, is_default)
VALUES (uuid_generate_v4(), NULL, 'Pet', 'expense', '#f59e0b', 'paw-print', TRUE);
