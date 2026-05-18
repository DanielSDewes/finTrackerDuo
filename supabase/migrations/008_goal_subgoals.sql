-- ============================================
-- GOAL SUBGOALS
-- Itens/tarefas associadas a uma meta financeira.
-- Cada sub-meta tem título, valor, link opcional e flag de concluída.
-- ============================================

CREATE TABLE goal_subgoals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  link TEXT,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goal_subgoals_goal_id ON goal_subgoals(goal_id);
CREATE INDEX idx_goal_subgoals_user_id ON goal_subgoals(user_id);

ALTER TABLE goal_subgoals ENABLE ROW LEVEL SECURITY;

-- View: dono da sub-meta OU membro do casal vinculado à meta-pai (quando is_shared)
CREATE POLICY "Users can view own subgoals" ON goal_subgoals FOR SELECT
  USING (
    auth.uid() = user_id
    OR goal_id IN (
      SELECT id FROM goals
      WHERE user_id = auth.uid()
         OR (is_shared = TRUE AND couple_id IN (
           SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
         ))
    )
  );

-- Insert/Update/Delete: apenas o dono da sub-meta (ou membro do casal para metas compartilhadas)
CREATE POLICY "Users can insert own subgoals" ON goal_subgoals FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND goal_id IN (
      SELECT id FROM goals
      WHERE user_id = auth.uid()
         OR (is_shared = TRUE AND couple_id IN (
           SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
         ))
    )
  );

CREATE POLICY "Users can update own subgoals" ON goal_subgoals FOR UPDATE
  USING (
    auth.uid() = user_id
    OR goal_id IN (
      SELECT id FROM goals
      WHERE is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own subgoals" ON goal_subgoals FOR DELETE
  USING (
    auth.uid() = user_id
    OR goal_id IN (
      SELECT id FROM goals
      WHERE is_shared = TRUE AND couple_id IN (
        SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
      )
    )
  );

-- Trigger: mantém updated_at e completed_at em sincronia
CREATE OR REPLACE FUNCTION set_goal_subgoals_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    NEW.completed_at = NOW();
  ELSIF NEW.completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_goal_subgoals_timestamps
BEFORE UPDATE ON goal_subgoals
FOR EACH ROW EXECUTE FUNCTION set_goal_subgoals_timestamps();
