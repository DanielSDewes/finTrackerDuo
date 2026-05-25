import type { CurrencyQuote } from "@/app/api/quotes/currencies/route";

export type { CurrencyQuote };

export const quotesService = {
  async getCurrencies(): Promise<CurrencyQuote[]> {
    const res = await fetch("/api/quotes/currencies", { cache: "no-store" });
    if (!res.ok) throw new Error(`/api/quotes/currencies → ${res.status}`);
    const data = (await res.json()) as { quotes?: CurrencyQuote[]; error?: string };
    if (data.error) throw new Error(data.error);
    return data.quotes ?? [];
  },
};
