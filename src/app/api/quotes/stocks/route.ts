import { hgFetch } from "@/lib/hg-brasil";

type HgStockEntry = {
  name?: string;
  symbol: string;
  region?: string;
  currency?: string;
  price: number;
  change_percent?: number;
  updated_at?: string;
};

type HgStockResponse = {
  results?: Record<string, HgStockEntry | { error?: boolean; message?: string }>;
};

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
  currency: string;
  updated_at: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbolsParam = url.searchParams.get("symbols")?.trim();
  if (!symbolsParam) {
    return Response.json({ error: "missing 'symbols' query param" }, { status: 400 });
  }

  // Normaliza: uppercase, dedupe, no espaços. HG aceita comma-separated.
  const symbols = [...new Set(symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (symbols.length === 0) {
    return Response.json({ quotes: [] });
  }

  try {
    const data = await hgFetch<HgStockResponse>(
      "/finance/stock_price",
      { symbol: symbols.join(",") },
      { revalidate: 60 },
    );

    const results = data.results ?? {};

    // HG retorna um pseudo-resultado de erro no nível dos symbols quando a
    // chave não tem plano pra stock_price. Detecta e devolve 402 ao client.
    if (
      results &&
      typeof results === "object" &&
      "error" in results &&
      (results as { error?: boolean }).error
    ) {
      const message = (results as { message?: string }).message ?? "Acesso não autorizado à HG Brasil";
      return Response.json({ error: message, requiresPaidPlan: /plano/i.test(message) }, { status: 402 });
    }

    const quotes: StockQuote[] = [];
    const notFound: string[] = [];

    for (const symbol of symbols) {
      const entry = results[symbol];
      if (!entry || "error" in entry) {
        notFound.push(symbol);
        continue;
      }
      const stock = entry as HgStockEntry;
      if (typeof stock.price !== "number") {
        notFound.push(symbol);
        continue;
      }
      quotes.push({
        symbol: stock.symbol,
        name: stock.name ?? symbol,
        price: stock.price,
        change_percent: stock.change_percent ?? 0,
        currency: stock.currency ?? "BRL",
        updated_at: stock.updated_at ?? null,
      });
    }

    return Response.json({ quotes, notFound });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ error: message }, { status: 502 });
  }
}
