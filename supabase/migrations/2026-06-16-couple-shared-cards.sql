-- =============================================================================
-- Migration: parceiro pode gerenciar faturas dos cartões compartilhados
-- =============================================================================
-- Contexto: ao compartilhar um cartão com o casal, o parceiro precisa não só
-- VER as faturas (já coberto por "Couple members can view partner card bills"),
-- mas também conseguir LANÇAR e EDITAR transações nele. Para isso:
--   * findOrCreateBill pode precisar CRIAR a fatura de um mês ainda inexistente
--     -> exige INSERT.
--   * o recálculo de total_amount/owner_amount/partner_amount após lançar,
--     editar ou excluir uma transação faz UPDATE na fatura -> exige UPDATE.
--     Sem isso o partner_amount ficava desatualizado (o UPDATE batia 0 linhas
--     pela RLS, silenciosamente).
--   * a limpeza de fatura que ficou sem lançamentos faz DELETE -> exige DELETE.
--
-- As policies espelham as de "partner card transactions" (escopo por casal
-- ativo, baseado no dono do cartão). A visibilidade do cartão em si (apenas os
-- marcados como compartilhados) é garantida no client; aqui seguimos o mesmo
-- modelo de confiança mútua já usado para as transações de cartão do parceiro.
--
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================================

DROP POLICY IF EXISTS "Couple members can insert partner card bills" ON credit_card_bills;
DROP POLICY IF EXISTS "Couple members can update partner card bills" ON credit_card_bills;
DROP POLICY IF EXISTS "Couple members can delete partner card bills" ON credit_card_bills;

CREATE POLICY "Couple members can insert partner card bills" ON credit_card_bills
  FOR INSERT WITH CHECK (
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

CREATE POLICY "Couple members can update partner card bills" ON credit_card_bills
  FOR UPDATE
  USING (
    card_id IN (
      SELECT id FROM credit_cards
      WHERE user_id IN (
        SELECT CASE WHEN owner_id = auth.uid() THEN partner_id ELSE owner_id END
        FROM couples
        WHERE (owner_id = auth.uid() OR partner_id = auth.uid())
          AND status = 'active' AND partner_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
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

CREATE POLICY "Couple members can delete partner card bills" ON credit_card_bills
  FOR DELETE USING (
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
