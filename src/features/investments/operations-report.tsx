"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Download } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { investmentsService } from "@/services/investments.service";
import { formatCurrency, formatDate, formatNumber, cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OPERATION_LABELS } from "./asset-detail-dialog";

export function OperationsReport() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["investment-transactions-all", scopeKey],
    queryFn: () => investmentsService.getAllTransactions(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const realizedTotal = operations.reduce((s, o) => s + (o.realized_gain ?? 0), 0);

  const handleExport = () => {
    const headers = [
      "Data", "Ativo", "Ticker", "Tipo", "Quantidade",
      "Preço Unitário", "Custos", "Total", "Resultado Realizado",
    ];
    const rows = operations.map((o) => [
      formatDate(o.date), o.assetName, o.ticker ?? "", OPERATION_LABELS[o.kind],
      o.quantity, o.unit_price, o.fees, o.total, o.realized_gain ?? "",
    ]);
    downloadCsv(`movimentacoes-${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          Movimentações
        </h2>
        <div className="flex items-center gap-3">
          {realizedTotal !== 0 && (
            <span className="text-sm">
              <span className="text-muted-foreground">Resultado realizado: </span>
              <span className={cn("font-semibold tabular-nums", realizedTotal >= 0 ? "text-success" : "text-expense")}>
                {realizedTotal >= 0 ? "+" : ""}{formatCurrency(realizedTotal)}
              </span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={handleExport}
            disabled={operations.length === 0}
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : operations.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma operação registrada. Lance compras e vendas na tela de detalhes de cada ativo.
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30 text-muted-foreground">
                    <th className="px-3 py-2.5 text-left font-medium">Data</th>
                    <th className="px-3 py-2.5 text-left font-medium">Ativo</th>
                    <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
                    <th className="px-3 py-2.5 text-right font-medium">Qtd</th>
                    <th className="px-3 py-2.5 text-right font-medium">Preço</th>
                    <th className="px-3 py-2.5 text-right font-medium">Custos</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    <th className="px-3 py-2.5 text-right font-medium">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((o) => (
                    <tr key={o.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">{formatDate(o.date)}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{o.ticker || o.assetName}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{OPERATION_LABELS[o.kind]}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(o.quantity, o.quantity % 1 === 0 ? 0 : 8)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{o.unit_price > 0 ? formatCurrency(o.unit_price) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{o.fees > 0 ? formatCurrency(o.fees) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">{o.total > 0 ? formatCurrency(o.total) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {o.kind === "sell" && o.realized_gain != null ? (
                          <span className={o.realized_gain >= 0 ? "text-success" : "text-expense"}>
                            {o.realized_gain >= 0 ? "+" : ""}{formatCurrency(o.realized_gain)}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
