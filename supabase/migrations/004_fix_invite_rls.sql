-- Allow any authenticated user to look up a pending couple by invite_token
-- Without this, the partner can't find the row (they're not owner_id or partner_id yet)
CREATE POLICY "Anyone can view pending couple for invite lookup" ON couples FOR SELECT
  USING (status = 'pending');

-- Allow any authenticated user to accept a pending invite
-- USING checks the OLD row: must still be pending with no partner
-- WITH CHECK validates the NEW row: must set themselves as partner and flip to active
CREATE POLICY "Authenticated user can accept pending invite" ON couples FOR UPDATE
  USING (status = 'pending' AND partner_id IS NULL)
  WITH CHECK (auth.uid() = partner_id AND status = 'active');
