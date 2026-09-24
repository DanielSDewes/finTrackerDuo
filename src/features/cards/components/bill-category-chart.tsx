"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CreditCardTransaction } from "../types";

// Pizza legível é pizza curta: acima disso as fatias finas viram ruído e as
// cores adjacentes deixam de ser distinguíveis. A cauda vai para "Outras" no
// gráfico — a lista abaixo continua mostrando categoria por categoria, que é
// onde o usuário lê o valor exato.
const MAX_SLICES = 6;

// Neutros para as duas fatias que não vêm do cadastro de categorias.
const NO_CATEGORY_COLOR = "hsl(var(--muted-foreground))";
const OTHERS_COLOR = "hsl(var(--muted-foreground) / 0.55)";

type Slice = {
  key: string;
  name: string;
  value: number;
  color: string;
  /** Fração do total da fatura, 0–1. */
  share: number;
};

type BillCategoryChartProps = {
  /**
   * Lançamentos que compõem o total exibido no cabeçalho da fatura. O
   * componente só descarta os reembolsados (valor que volta não é gasto); a
   * decisão sobre previsões é de quem chama, para o total do gráfico bater
   * com o total do cabeçalho.
   */
  transactions: CreditCardTransaction[];
  /** Texto curto sob o título, explicando o conjunto somado. */
  caption?: string;
};

export function BillCategoryChart({ transactions, caption }: BillCategoryChartProps) {
  const { slices, rows, total } = useMemo(() => {
    const byCategory = new Map<string, { name: string; color: string; value: number }>();
    let sum = 0;

    for (const tx of transactions) {
      if (tx.is_reimbursed) continue;
      const key = tx.category?.id ?? "__none__";
      const entry = byCategory.get(key);
      if (entry) {
        entry.value += tx.amount;
      } else {
        byCategory.set(key, {
          name: tx.category?.name ?? "Sem categoria",
          color: tx.category?.color ?? NO_CATEGORY_COLOR,
          value: tx.amount,
        });
      }
      sum += tx.amount;
    }

    const ranked: Slice[] = Array.from(byCategory.entries())
      .map(([key, v]) => ({ ...v, key, share: sum > 0 ? v.value / sum : 0 }))
      .sort((a, b) => b.value - a.value);

    // Gráfico: as maiores + "Outras". Lista: todas.
    const head = ranked.slice(0, MAX_SLICES);
    const tail = ranked.slice(MAX_SLICES);
    const chartSlices =
      tail.length > 0
        ? [
            ...head,
            {
              key: "__others__",
              name: `Outras (${tail.length})`,
              color: OTHERS_COLOR,
              value: tail.reduce((s, r) => s + r.value, 0),
              share: tail.reduce((s, r) => s + r.share, 0),
            },
          ]
        : head;

    return { slices: chartSlices, rows: ranked, total: sum };
  }, [transactions]);

  if (total <= 0) return null;

  const formatShare = (share: number) =>
    `${(share * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-3">
      <div className="flex items-center gap-2">
        <PieChartIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Gastos por categoria
        </h3>
      </div>
      {caption && <p className="mt-0.5 text-[11px] text-muted-foreground">{caption}</p>}

      {/* Donut com o total no centro — o anel dá a proporção, o número dá a
          escala, sem precisar de rótulo em cada fatia. */}
      <div className="relative mt-2">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value, name, item) => {
                // `share` vem do payload da própria fatia, então o % do
                // tooltip é sempre o mesmo da lista.
                const share = (item?.payload as Slice | undefined)?.share ?? 0;
                return [`${formatCurrency(Number(value))} · ${formatShare(share)}`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legenda = tabela: identidade por cor E por nome, com o valor exato.
          Lista todas as categorias, inclusive as agrupadas em "Outras". */}
      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-0.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: row.color }}
            />
            <span className="flex-1 min-w-0 truncate text-foreground">{row.name}</span>
            <span className="tabular-nums text-muted-foreground shrink-0">
              {formatShare(row.share)}
            </span>
            <span className="tabular-nums font-medium shrink-0 w-20 text-right">
              {formatCurrency(row.value)}
            </span>
          </li>
        ))}
      </ul>

      {rows.length > MAX_SLICES && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          O gráfico agrupa as {rows.length - MAX_SLICES} categorias menores em
          “Outras”; a lista mostra todas.
        </p>
      )}
    </div>
  );
}
