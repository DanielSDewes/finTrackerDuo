const HG_BASE = "https://api.hgbrasil.com";

// A chave da HG Brasil é restrita ao domínio configurado no painel
// (https://fintrackerduo.vercel.app). Em chamadas server-side o Referer
// padrão é vazio → API responde 403. Mandamos o Referer manualmente.
const REFERER = process.env.NEXT_PUBLIC_APP_URL ?? "https://fintrackerduo.vercel.app";

export type HgFetchOptions = {
  // Em segundos; usa o ISR de fetch do Next pra ricochetear chamadas iguais.
  revalidate?: number;
};

export async function hgFetch<T>(path: string, params: Record<string, string>, opts: HgFetchOptions = {}): Promise<T> {
  const key = process.env.HG_BRASIL_API_KEY;
  if (!key) {
    throw new Error("HG_BRASIL_API_KEY não configurada");
  }

  const url = new URL(`${HG_BASE}${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url, {
    headers: { Referer: REFERER },
    next: { revalidate: opts.revalidate ?? 60 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HG Brasil ${res.status}: ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}
