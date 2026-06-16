-- =============================================================================
-- Migration: corrige brecha de autorização no aceite de convite de casal
-- =============================================================================
-- Problema (antes):
--   * A policy "Anyone can view pending couple for invite lookup" liberava
--     SELECT em TODA linha com status = 'pending'. Como RLS filtra linhas e
--     não colunas, qualquer usuário autenticado lia invite_token e
--     invite_email (PII) de todos os convites pendentes do sistema.
--   * A policy de UPDATE "Authenticated user can accept pending invite" só
--     exigia (status = 'pending' AND partner_id IS NULL) no USING — NÃO
--     validava o token. Logo, qualquer autenticado conseguia se tornar
--     partner_id de um casal alheio (sequestro de convite + acesso aos dados
--     compartilhados da vítima).
--
-- Correção:
--   Remove as duas policies abertas e move o aceite para a RPC
--   accept_couple_invite(p_token), SECURITY DEFINER. O token passa a ser o
--   segredo validado no servidor; nenhuma linha de couples fica legível para
--   não-membros, e é impossível aceitar um convite sem possuí-lo.
--
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view pending couple for invite lookup" ON couples;
DROP POLICY IF EXISTS "Authenticated user can accept pending invite"     ON couples;

CREATE OR REPLACE FUNCTION accept_couple_invite(p_token TEXT)
RETURNS couples
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row couples;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Trava a linha do convite pelo token (o token é o segredo). Roda como dono
  -- da função, então enxerga a row mesmo sem policy de SELECT para terceiros.
  SELECT * INTO v_row
  FROM couples
  WHERE invite_token = p_token
    AND status = 'pending'
    AND partner_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou já utilizado';
  END IF;

  -- auth.uid() continua sendo o chamador mesmo em SECURITY DEFINER.
  IF v_row.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode aceitar o próprio convite';
  END IF;

  UPDATE couples
  SET partner_id = auth.uid(),
      status     = 'active',
      updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_couple_invite(TEXT) TO authenticated;
