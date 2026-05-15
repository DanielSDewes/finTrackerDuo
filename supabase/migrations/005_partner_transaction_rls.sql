-- Allow couple members to view their partner's transactions
CREATE POLICY "Couple members can view partner transactions" ON transactions FOR SELECT
  USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active'
        AND partner_id IS NOT NULL
    )
  );

-- Allow couple members to create transactions on behalf of their partner
CREATE POLICY "Couple members can create partner transactions" ON transactions FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active'
        AND partner_id IS NOT NULL
    )
  );

-- Allow couple members to update their partner's transactions
CREATE POLICY "Couple members can update partner transactions" ON transactions FOR UPDATE
  USING (
    user_id IN (
      SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
      FROM couples
      WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
        AND status = 'active'
        AND partner_id IS NOT NULL
    )
  );

-- Soft-delete a partner's transaction (SECURITY DEFINER to bypass RLS,
-- with manual authorization check via the couples table)
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
