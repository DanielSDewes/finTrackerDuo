"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, Download, ArrowUp, ArrowDown, ChevronsUpDown, Receipt, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatPercent, formatDate, formatNumber, cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import type { Investment, AssetClass } from "@/types";

type Row = Investment & { pl: number; plPct: number; participation: number };
type SortKey =
  | "ticker" | "asset_name" | "quantity" | "average_price" | "current_price"
  | "invested_amount" | "current_value" | "pl" | "plPct" | "participation" | "updated_at";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "ticker", label: "Ticker", align: "left" },
  { key: "asset_name", label: "Nome", align: "left" },
  { key: "quantity", label: "Qtd", align: "right" },
  { key: "average_price", label: "Preço Médio", align: "right" },
  { key: "current_price", label: "Cotação", align: "right" },
  { key: "invested_amount", label: "Investido", align: "right" },
  { key: "current_value", label: "Atual", align: "right" },
  { key: "pl", label: "Ganho/Perda", align: "right" },
  { key: "plPct", label: "%", align: "right" },
  { key: "participation", label: "Part.", align: "right" },
  { key: "updated_at", label: "Atualizado", align: "right" },
];

const CLASS_FILTERS: { value: AssetClass | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "fixed_income", label: "Renda Fixa" },
  { value: "variable_income", label: "Renda Variável" },
  { value: "real_estate", label: "FIIs" },
  { value: "crypto", label: "Cripto" },
  { value: "other", label: "Outros" },
];

const classLabels: Record<string, string> = {
  fixed_income: "Renda Fixa",
  variable_income: "Renda Variável",
  crypto: "Criptomoedas",
  real_estate: "Fundos Imobiliários",
  other: "Outros",
};

function formatQty(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 8 });
}

type PortfolioTableProps = {
  investments: Investment[];
  totalCurrent: number;
  onDetail: (inv: Investment) => void;
  onEdit: (inv: Investment) => void;
  onDelete: (id: string) => void;
};

export function PortfolioTable({ investments, totalCurrent, onDetail, onEdit, onDelete }: PortfolioTableProps) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<AssetClass | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("current_value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo<Row[]>(() => {
    const enriched: Row[] = investments.map((inv) => {
      const pl = inv.current_value - inv.invested_amount;
      return {
        ...inv,
        pl,
        plPct: inv.invested_amount > 0 ? (pl / inv.invested_amount) * 100 : 0,
        participation: totalCurrent > 0 ? (inv.current_value / totalCurrent) * 100 : 0,
      };
    });

    const term = search.trim().toLowerCase();
    const filtered = enriched.filter((r) => {
      if (classFilter !== "all" && r.asset_class !== classFilter) return false;
      if (term && !(`${r.asset_name} ${r.ticker ?? ""}`.toLowerCase().includes(term))) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [investments, totalCurrent, search, classFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Texto começa ascendente; números/datas, descendente (maior primeiro).
      setSortDir(key === "ticker" || key === "asset_name" ? "asc" : "desc");
    }
  };

  const handleExport = () => {
    const headers = [
      "Ticker", "Nome", "Classe", "Corretora", "Quantidade", "Preço Médio", "Cotação Atual",
      "Valor Investido", "Valor Atual", "Ganho/Perda", "Ganho/Perda %", "Participação %", "Atualizado",
    ];
    const data = rows.map((r) => [
      r.ticker ?? "", r.asset_name, classLabels[r.asset_class] ?? r.asset_class, r.broker ?? "",
      r.quantity, r.average_price, r.current_price, r.invested_amount, r.current_value,
      r.pl, r.plPct, r.participation, formatDate(r.updated_at),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`carteira-${stamp}`, headers, data);
  };

  const cell = (r: Row, key: SortKey): ReactNode => {
    switch (key) {
      case "ticker":
        return r.ticker ? <span className="font-medium">{r.ticker}</span> : <span className="text-muted-foreground">—</span>;
      case "asset_name":
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{r.asset_name}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {classLabels[r.asset_class]}{r.broker ? ` · ${r.broker}` : ""}
            </p>
          </div>
        );
      case "quantity": return <span className="tabular-nums">{formatQty(r.quantity)}</span>;
      case "average_price": return <span className="tabular-nums">{formatCurrency(r.average_price)}</span>;
      case "current_price": return <span className="tabular-nums">{formatCurrency(r.current_price)}</span>;
      case "invested_amount": return <span className="tabular-nums">{formatCurrency(r.invested_amount)}</span>;
      case "current_value": return <span className="tabular-nums font-medium">{formatCurrency(r.current_value)}</span>;
      case "pl":
        return (
          <span className={cn("tabular-nums font-medium", r.pl >= 0 ? "text-success" : "text-expense")}>
            {r.pl >= 0 ? "+" : ""}{formatCurrency(r.pl)}
          </span>
        );
      case "plPct":
        return (
          <span className={cn("tabular-nums", r.pl >= 0 ? "text-success" : "text-expense")}>
            {formatPercent(r.plPct)}
          </span>
        );
      case "participation": return <span className="tabular-nums text-muted-foreground">{formatNumber(r.participation, 1)}%</span>;
      case "updated_at": return <span className="tabular-nums text-muted-foreground text-xs">{formatDate(r.updated_at)}</span>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Input
            placeholder="Buscar por nome ou ticker..."
            leftIcon={<Search />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {CLASS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={classFilter === f.value ? "default" : "outline"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setClassFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={handleExport}
            disabled={rows.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap select-none cursor-pointer hover:text-foreground",
                      col.align === "right" ? "text-right" : "text-left",
                    )}
                    onClick={() => toggleSort(col.key)}
                  >
                    <span className={cn("inline-flex items-center gap-1", col.align === "right" && "flex-row-reverse")}>
                      {col.label}
                      {active ? (
                        sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </span>
                  </th>
                );
              })}
              <th className="px-2 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-12 text-center text-muted-foreground">
                  {investments.length === 0 ? "Nenhum ativo cadastrado" : "Nenhum ativo encontrado"}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => onDetail(r)}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-3 py-2.5 whitespace-nowrap", col.align === "right" ? "text-right" : "text-left")}
                    >
                      {cell(r, col.key)}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                      actions={[
                        { label: "Ver detalhes / dividendos", icon: Receipt, onClick: () => onDetail(r) },
                        { label: "Editar", icon: Pencil, onClick: () => onEdit(r) },
                        { label: "Remover", icon: Trash2, destructive: true, onClick: () => onDelete(r.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {rows.length} ativo{rows.length === 1 ? "" : "s"}
          {classFilter !== "all" || search ? " (filtrado)" : ""}
        </p>
      )}
    </div>
  );
}
