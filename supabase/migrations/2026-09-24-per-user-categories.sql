-- =============================================================================
-- Categorias padrão por usuário + inativação
-- =============================================================================
-- Rode no SQL Editor do Supabase. Idempotente: o backfill é auto-guardado
-- (consome as linhas globais e as apaga no fim, então uma segunda execução
-- não encontra nada para copiar).
--
-- MOTIVAÇÃO
-- Até aqui as 17 categorias padrão eram UMA linha global cada (user_id NULL,
-- is_default TRUE) compartilhada por todos os usuários, e a policy de escrita
-- (auth.uid() = user_id) tornava impossível editá-las — renomear "Alimentação"
-- mudaria a categoria de todo mundo. Agora cada usuário recebe a SUA cópia:
-- toda categoria passa a ter dono, então editar/inativar/excluir funciona com
-- a RLS que já existe e sem vazar alteração entre contas.
--
-- O QUE ESTA MIGRATION FAZ
--   1. Adiciona categories.is_active (inativação — bloqueia novos lançamentos
--      sem apagar o histórico).
--   2. Cria seed_default_categories() e passa a semear no cadastro.
--   3. Copia cada default global para cada profile existente e re-aponta
--      transactions / credit_card_transactions / future_transactions daquele
--      usuário para a cópia dele.
--   4. Apaga os defaults globais.
--   5. Reescreve a policy de SELECT: sem o `is_default = TRUE` (que agora
--      vazaria as cópias de um usuário para todos) e com as categorias do
--      parceiro — necessário para o join `category:categories(...)` continuar
--      resolvendo o nome nos lançamentos dele na visão do casal.
-- =============================================================================


-- ---- 1. is_active -----------------------------------------------------------
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN categories.is_active IS
  'Categoria inativa não aparece nos seletores de lançamento (transações e cartão), mas continua nomeando os lançamentos históricos. É a alternativa à exclusão quando a categoria já tem uso.';


-- ---- 2. seed por usuário ----------------------------------------------------
-- Mesma paleta e mesmos flags do seed global antigo (schema.sql seção 9):
-- receitas só em transação; despesas em transação E cartão.
CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO categories
    (user_id, couple_id, name, type, color, is_transaction, is_card, is_default, is_active)
  SELECT p_user_id, NULL::UUID, d.name, d.type, d.color, d.is_transaction, d.is_card, TRUE, TRUE
  FROM (VALUES
    -- Receitas
    ('Salário',           'income',  '#16a34a', TRUE, FALSE),
    ('Freelance',         'income',  '#0d9488', TRUE, FALSE),
    ('Investimentos',     'income',  '#65a30d', TRUE, FALSE),
    ('Outros',            'income',  '#059669', TRUE, FALSE),
    -- Despesas (valem para transação e cartão)
    ('Moradia',           'expense', '#dc2626', TRUE, TRUE),
    ('Alimentação',       'expense', '#ea580c', TRUE, TRUE),
    ('Transporte',        'expense', '#ca8a04', TRUE, TRUE),
    ('Saúde',             'expense', '#0891b2', TRUE, TRUE),
    ('Educação',          'expense', '#2563eb', TRUE, TRUE),
    ('Lazer',             'expense', '#db2777', TRUE, TRUE),
    ('Vestuário',         'expense', '#9333ea', TRUE, TRUE),
    ('Presente',          'expense', '#e11d48', TRUE, TRUE),
    ('Pet',               'expense', '#f59e0b', TRUE, TRUE),
    ('Assinaturas',       'expense', '#475569', TRUE, TRUE),
    ('Cartão de Crédito', 'expense', '#c026d3', TRUE, TRUE),
    ('Investimento',      'expense', '#4f46e5', TRUE, TRUE),
    ('Outros',            'expense', '#6b7280', TRUE, TRUE)
  ) AS d(name, type, color, is_transaction, is_card)
  -- Não duplica em reexecução nem sobrescreve o que o usuário já tem.
  WHERE NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.user_id = p_user_id AND c.name = d.name AND c.type = d.type
  );
END;
$fn$;


-- ---- 3. backfill: uma cópia por usuário, re-apontando os lançamentos --------
-- Loop explícito (e não um INSERT ... SELECT) porque precisamos do id de cada
-- cópia para re-apontar os lançamentos: (name, type) não é chave confiável nos
-- defaults globais de installs antigos, que também têm linhas type
-- 'investment' herdadas.
DO $mig$
DECLARE
  r_user      RECORD;
  r_cat       RECORD;
  v_new_id    UUID;
  v_users     INTEGER := 0;
  v_copies    INTEGER := 0;
  v_repointed INTEGER := 0;
  v_n         INTEGER;
BEGIN
  FOR r_user IN SELECT id FROM profiles ORDER BY created_at LOOP
    v_users := v_users + 1;

    FOR r_cat IN
      SELECT * FROM categories
      WHERE user_id IS NULL AND is_default = TRUE
      ORDER BY name, type
    LOOP
      -- Se o usuário já tem categoria com esse nome+tipo (criou à mão antes
      -- da migration), reusa em vez de duplicar.
      SELECT id INTO v_new_id
      FROM categories
      WHERE user_id = r_user.id AND name = r_cat.name AND type = r_cat.type
      LIMIT 1;

      IF v_new_id IS NULL THEN
        INSERT INTO categories
          (user_id, couple_id, name, type, color,
           is_transaction, is_card, is_default, is_active)
        VALUES
          (r_user.id, NULL, r_cat.name, r_cat.type, r_cat.color,
           r_cat.is_transaction, r_cat.is_card, TRUE, TRUE)
        RETURNING id INTO v_new_id;
        v_copies := v_copies + 1;
      END IF;

      UPDATE transactions SET category_id = v_new_id
       WHERE category_id = r_cat.id AND user_id = r_user.id;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_repointed := v_repointed + v_n;

      UPDATE credit_card_transactions SET category_id = v_new_id
       WHERE category_id = r_cat.id AND user_id = r_user.id;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_repointed := v_repointed + v_n;

      UPDATE future_transactions SET category_id = v_new_id
       WHERE category_id = r_cat.id AND user_id = r_user.id;
      GET DIAGNOSTICS v_n = ROW_COUNT; v_repointed := v_repointed + v_n;

      v_new_id := NULL;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'backfill: % usuarios, % copias criadas, % lancamentos re-apontados',
    v_users, v_copies, v_repointed;
END $mig$;


-- ---- 4. remove os defaults globais -----------------------------------------
-- Antes de apagar, reporta referências que o passo 3 não cobriu (lançamento
-- cujo user_id não tem profile). O FK é ON DELETE SET NULL: se sobrar alguma,
-- o lançamento fica "Sem categoria" em vez de quebrar.
DO $chk$
DECLARE v_orphans INTEGER;
BEGIN
  SELECT
      (SELECT COUNT(*) FROM transactions t
        JOIN categories c ON c.id = t.category_id
       WHERE c.user_id IS NULL AND c.is_default)
    + (SELECT COUNT(*) FROM credit_card_transactions t
        JOIN categories c ON c.id = t.category_id
       WHERE c.user_id IS NULL AND c.is_default)
    + (SELECT COUNT(*) FROM future_transactions t
        JOIN categories c ON c.id = t.category_id
       WHERE c.user_id IS NULL AND c.is_default)
  INTO v_orphans;

  IF v_orphans > 0 THEN
    RAISE WARNING 'ATENCAO: % lancamento(s) ainda apontam para um default global (dono sem profile) e ficarao sem categoria', v_orphans;
  END IF;
END $chk$;

DELETE FROM categories WHERE user_id IS NULL AND is_default = TRUE;


-- ---- 4.1 usuários sem nenhum default ---------------------------------------
-- Cobre installs onde os globais já tinham sido removidos, e contas criadas
-- entre essa remoção e o deploy do novo handle_new_user.
DO $seed$
DECLARE r_user RECORD;
BEGIN
  FOR r_user IN
    SELECT p.id FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM categories c WHERE c.user_id = p.id AND c.is_default
    )
  LOOP
    PERFORM public.seed_default_categories(r_user.id);
  END LOOP;
END $seed$;


-- ---- 5. RLS ----------------------------------------------------------------
-- Sai o `is_default = TRUE` (com as cópias por usuário, ele tornaria a
-- categoria de um usuário legível por todos) e entram as categorias do
-- parceiro, para o join de categoria continuar resolvendo nos lançamentos
-- dele na visão do casal.
DROP POLICY IF EXISTS "Users can view own and default categories" ON categories;
DROP POLICY IF EXISTS "Users can view own and partner categories" ON categories;

CREATE POLICY "Users can view own and partner categories" ON categories
  FOR SELECT USING (
    auth.uid() = user_id
    OR couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    )
    OR user_id IN (
      SELECT owner_id   FROM couples WHERE partner_id = auth.uid()
      UNION
      SELECT partner_id FROM couples WHERE owner_id = auth.uid()
    )
  );

-- A policy de escrita ("Users can manage own categories", FOR ALL USING
-- auth.uid() = user_id) permanece: agora ela alcança as categorias padrão,
-- porque elas passaram a ter dono.


-- ---- 6. semeia no cadastro -------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Categorias padrão do usuário. Bloco próprio: uma falha aqui não pode
  -- desfazer a criação do profile.
  BEGIN
    PERFORM public.seed_default_categories(NEW.id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'seed_default_categories failed: % %', SQLERRM, SQLSTATE;
  END;

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
$fn$;


-- ---- 7. hardening: a função de seed não é RPC pública -----------------------
-- seed_default_categories é SECURITY DEFINER e existe para ser chamada pelo
-- trigger handle_new_user. Sem este REVOKE ela fica invocável via PostgREST
-- (/rest/v1/rpc/seed_default_categories) por qualquer portador da anon key,
-- que poderia re-semear as categorias padrão de um profile conhecido. Mesmo
-- tratamento que o schema.sql dá aos outros triggers internos, e fecha os
-- avisos anon_security_definer_function_executable /
-- authenticated_security_definer_function_executable do security advisor.
REVOKE EXECUTE ON FUNCTION public.seed_default_categories(uuid)
  FROM PUBLIC, anon, authenticated;
