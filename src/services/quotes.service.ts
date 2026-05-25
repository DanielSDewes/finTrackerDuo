import { investmentsService } from "./investments.service";
import type { Investment } from "@/types";
import type { CurrencyQuote } from "@/app/api/quotes/currencies/route";
import type { StockQuote } from "@/app/api/quotes/stocks/route";

export type { CurrencyQuote, StockQuote };

export type SyncResult = {
  updated: { id: string; ticker: string; price: number }[];
  skipped: { id: string; reason: string }[];
  notFound: string[];
};

export const quotesService = {
  async getCurrencies(): Promise<CurrencyQuote[]> {
    const res = await fetch("/api/quotes/currencies", { cache: "no-store" });
    if (!res.ok) throw new Error(`/api/quotes/currencies → ${res.status}`);
    const data = (await res.json()) as { quotes?: CurrencyQuote[]; error?: string };
    if (data.error) throw new Error(data.error);
    return data.quotes ?? [];
  },

  async getStockQuotes(symbols: string[]): Promise<{ quotes: StockQuote[]; notFound: string[] }> {
    if (symbols.length === 0) return { quotes: [], notFound: [] };
    const params = new URLSearchParams({ symbols: symbols.join(",") });
    const res = await fetch(`/api/quotes/stocks?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`/api/quotes/stocks → ${res.status}`);
    const data = (await res.json()) as { quotes?: StockQuote[]; notFound?: string[]; error?: string };
    if (data.error) throw new Error(data.error);
    return { quotes: data.quotes ?? [], notFound: data.notFound ?? [] };
  },

  // Apenas classes com ticker negociado na B3/exterior fazem sentido aqui.
  // Renda Fixa não tem cotação pública; "other" é heterogêneo.
  isSyncableClass(klass: Investment["asset_class"]): boolean {
    return klass === "variable_income" || klass === "real_estate" || klass === "crypto";
  },

  async syncPortfolioPrices(investments: Investment[]): Promise<SyncResult> {
    const result: SyncResult = { updated: [], skipped: [], notFound: [] };

    const eligible = investments.filter((inv) => {
      if (!quotesService.isSyncableClass(inv.asset_class)) {
        result.skipped.push({ id: inv.id, reason: `classe ${inv.asset_class}` });
        return false;
      }
      if (!inv.ticker || inv.ticker.trim() === "") {
        result.skipped.push({ id: inv.id, reason: "sem ticker" });
        return false;
      }
      return true;
    });

    if (eligible.length === 0) return result;

    const symbols = eligible.map((i) => i.ticker!.toUpperCase().trim());
    const { quotes, notFound } = await quotesService.getStockQuotes(symbols);
    result.notFound = notFound;

    const bySymbol = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));

    await Promise.all(
      eligible.map(async (inv) => {
        const quote = bySymbol.get(inv.ticker!.toUpperCase().trim());
        if (!quote) return;

        const currentValue = +(inv.quantity * quote.price).toFixed(2);
        const profitability =
          inv.invested_amount > 0
            ? +(((currentValue - inv.invested_amount) / inv.invested_amount) * 100).toFixed(4)
            : 0;

        await investmentsService.updateInvestment(inv.id, {
          current_price: quote.price,
          current_value: currentValue,
          profitability,
        });

        result.updated.push({ id: inv.id, ticker: inv.ticker!, price: quote.price });
      }),
    );

    return result;
  },
};
