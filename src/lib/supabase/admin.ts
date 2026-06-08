import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a SERVICE ROLE KEY.
 *
 * Bypassa RLS — use somente em rotas server-side controladas (cron jobs,
 * webhooks). NUNCA importe este módulo em código que vai pro bundle do
 * navegador. A `SUPABASE_SERVICE_ROLE_KEY` não é prefixada com `NEXT_PUBLIC_`
 * exatamente por isso.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurada",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
