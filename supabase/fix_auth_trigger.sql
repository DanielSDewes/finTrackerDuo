-- =============================================================
-- DIAGNÓSTICO E CORREÇÃO DO TRIGGER DE REGISTRO
-- Execute este script no SQL Editor do painel Supabase
-- =============================================================

-- 1. Recria o trigger handle_new_user de forma robusta
--    usando ON CONFLICT para evitar erros de duplicata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Loga o erro mas não bloqueia o cadastro
    RAISE WARNING 'handle_new_user failed: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- 2. Garante que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Garante permissão de INSERT no profiles para o trigger funcionar
-- (mesmo com SECURITY DEFINER, o schema precisa estar acessível)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 4. Adiciona política de INSERT que faltava na tabela profiles
-- (o trigger usa SECURITY DEFINER então não precisa, mas é boa prática)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END;
$$;

-- 5. Verifica se o trigger foi criado corretamente
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
