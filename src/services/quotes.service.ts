import { createClient } from "@/lib/supabase/client";

export type CurrencyQuote = {
  code: "USD" | "EUR";
  name: string;
  buy: number | null;
  variation: number;
  updated_at: string;
};

export const quotesService = {
  /**
   * Lê as cotações cacheadas na tabela `currency_quotes`. A tabela é
   * atualizada por um cron (a cada 10 min) na rota /api/cron/quotes — o
   * cliente nunca chama a HG Brasil diretamente. Mil usuários abrindo a
   * tela ao mesmo tempo geram mil reads do Supabase (baratos e cacheados
   * por React Query), e zero chamadas externas extras.
   */
  async getCurrencies(): Promise<CurrencyQuote[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("currency_quotes")
      .select("code, name, buy, variation, updated_at")
      .order("code");
    if (error) throw error;
    return (data ?? []) as CurrencyQuote[];
  },
};
