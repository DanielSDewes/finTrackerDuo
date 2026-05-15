-- Soft-delete a single card transaction and recalculate the bill total.
-- SECURITY DEFINER bypasses RLS; authorization is enforced manually.
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

  -- Allow caller if they own it OR are in an active couple with the owner
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

  -- Recalculate bill total
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM credit_card_transactions
  WHERE bill_id = v_bill_id AND deleted_at IS NULL;

  UPDATE credit_card_bills
  SET total_amount = v_total, updated_at = NOW()
  WHERE id = v_bill_id;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_card_transaction(UUID) TO authenticated;

-- Soft-delete all installments of a group and recalculate every affected bill.
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

  -- Recalculate totals for every bill touched by this group
  FOR v_bill_id IN (
    SELECT DISTINCT bill_id
    FROM credit_card_transactions
    WHERE installment_group_id = p_group_id
  ) LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM credit_card_transactions
    WHERE bill_id = v_bill_id AND deleted_at IS NULL;

    UPDATE credit_card_bills
    SET total_amount = v_total, updated_at = NOW()
    WHERE id = v_bill_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_card_installment_group(UUID) TO authenticated;
