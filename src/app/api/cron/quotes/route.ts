import { NextRequest } from "next/server";
import { hgFetch } from "@/lib/hg-brasil";
import { createAdminClient } from "@/lib/supabase/admin";

// Sem cache estático: o cron precisa executar de verdade a cada chamada,
// caso contrário a Vercel pode servir uma resposta antiga.
export const dynamic = "force-dynamic";

type HgCurrencyEntry = {
  name?: string;
  buy: number | null;
  sell: number | null;
  variation: number;
};

type HgQuotationsResponse = {
  currencies?: {
    source?: string;
    USD?: HgCurrencyEntry;
    EUR?: HgCurrencyEntry;
  };
};

const SUPPORTED = ["USD", "EUR"] as const;

/**
 * Endpoint chamado pelo Vercel Cron a cada 10 minutos. Busca cotação USD/EUR
 * → BRL na HG Brasil e faz upsert na tabela `currency_quotes`. Clientes leem
 * dessa tabela direto pelo Supabase, então quantos usuários acessem a tela
 * de Investimentos não importa: a HG é chamada uma única vez por janela.
 *
 * Proteção: header `Authorization: Bearer <CRON_SECRET>`. O Vercel Cron
 * envia automaticamente esse header quando a env var `CRON_SECRET` está
 * configurada no projeto.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // revalidate:0 — não queremos o Data Cache do Next aqui; o ciclo de
    // atualização é controlado pelo cron, não pelo fetch.
    const data = await hgFetch<HgQuotationsResponse>(
      "/finance/quotations",
      { fields: "only_results,currencies" },
      { revalidate: 0 },
    );

    const currencies = data.currencies ?? {};
    const source = currencies.source ?? null;

    const rows = SUPPORTED.map((code) => {
      const entry = currencies[code];
      if (!entry) return null;
      return {
        code,
        name: entry.name ?? code,
        buy: entry.buy,
        variation: entry.variation ?? 0,
        source,
        updated_at: new Date().toISOString(),
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      return Response.json(
        { error: "HG Brasil retornou cotações vazias" },
        { status: 502 },
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("currency_quotes")
      .upsert(rows, { onConflict: "code" });

    if (error) {
      console.error("[cron/quotes] upsert falhou:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      ok: true,
      updated: rows.map((r) => r.code),
      at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[cron/quotes] falhou:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
