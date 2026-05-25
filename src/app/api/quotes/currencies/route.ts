import { hgFetch } from "@/lib/hg-brasil";

type HgCurrencyEntry = {
  name?: string;
  buy: number | null;
  sell: number | null;
  variation: number;
};

// Com fields=only_results, HG retorna o conteúdo de `results` diretamente.
type HgQuotationsResponse = {
  currencies?: {
    source?: string;
    USD?: HgCurrencyEntry;
    EUR?: HgCurrencyEntry;
  };
};

export type CurrencyQuote = {
  code: "USD" | "EUR";
  name: string;
  buy: number | null;
  variation: number;
};

export async function GET() {
  try {
    const data = await hgFetch<HgQuotationsResponse>(
      "/finance/quotations",
      { fields: "only_results,currencies" },
      { revalidate: 300 },
    );

    const currencies = data.currencies ?? {};
    const quotes: CurrencyQuote[] = (["USD", "EUR"] as const)
      .map((code) => {
        const entry = currencies[code];
        if (!entry) return null;
        return {
          code,
          name: entry.name ?? code,
          buy: entry.buy,
          variation: entry.variation ?? 0,
        };
      })
      .filter((q): q is CurrencyQuote => q !== null);

    return Response.json({ quotes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return Response.json({ error: message }, { status: 502 });
  }
}
