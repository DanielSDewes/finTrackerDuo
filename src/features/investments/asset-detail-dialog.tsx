"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  CalendarDays,
  Wallet,
  Percent,
  Loader2,
} from "lucide-react";
import { dividendSchema, type DividendInput } from "@/schemas/investment";
import { investmentsService } from "@/services/investments.service";
import { useAuthStore } from "@/stores/auth.store";
import { useZodForm } from "@/hooks/use-zod-form";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import type { Investment } from "@/types";

const periodLabel: Record<string, string> = {
  daily: "ao dia",
  monthly: "ao mês",
  annual: "ao ano",
};

type AssetDetailDialogProps = {
  investment: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AssetDetailDialog({ investment, open, onOpenChange }: AssetDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{investment?.asset_name ?? "Ativo"}</DialogTitle>
        </DialogHeader>
        {investment && <AssetDetailContent investment={investment} />}
      </DialogContent>
    </Dialog>
  );
}

function AssetDetailContent({ investment }: { investment: Investment }) {
  const { user } = useAuthStore();
  const [adding, setAdding] = useState(false);

  const { data: dividends = [], isLoading } = useQuery({
    queryKey: ["investment-dividends", investment.id],
    queryFn: () => investmentsService.listDividends(investment.id),
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => investmentsService.deleteDividend(id),
    invalidateKeys: [
      ["investment-dividends", investment.id],
      ["investment-summary"],
    ],
    successMessage: "Dividendo removido",
    errorMessage: "Erro ao remover dividendo",
  });

  const pl = investment.current_value - investment.invested_amount;
  const plPct = investment.invested_amount > 0
    ? (pl / investment.invested_amount) * 100
    : 0;
  const isProfitable = pl >= 0;

  const yieldDisplay = investment.yield_rate != null && investment.yield_period
    ? `${(investment.yield_rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 4 })}% ${periodLabel[investment.yield_period]}`
    : null;

  return (
    <div className="space-y-4">
      {/* Métricas resumidas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl border border-border/40 bg-muted/20">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Wallet className="w-3 h-3" />
            Valor investido
          </p>
          <p className="text-sm font-semibold mt-1 tabular-nums">
            {formatCurrency(investment.invested_amount)}
          </p>
        </div>
        <div className="p-3 rounded-xl border border-border/40 bg-muted/20">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Valor atual
          </p>
          <p className="text-sm font-semibold mt-1 tabular-nums">
            {formatCurrency(investment.current_value)}
          </p>
          <p className={`text-[11px] font-medium mt-0.5 ${isProfitable ? "text-success" : "text-expense"}`}>
            {isProfitable ? "+" : ""}{formatCurrency(pl)} ({formatPercent(plPct)})
          </p>
        </div>
      </div>

      {yieldDisplay && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border/40 bg-primary/5">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Rendimento automático</p>
            <p className="text-sm font-medium">{yieldDisplay}</p>
          </div>
          {investment.last_yield_at && (
            <Badge variant="outline" className="text-[10px]">
              <CalendarDays className="w-2.5 h-2.5 mr-1" />
              {formatDate(investment.last_yield_at)}
            </Badge>
          )}
        </div>
      )}

      {/* Histórico de dividendos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Dividendos</h3>
            <p className="text-[11px] text-muted-foreground">
              Total recebido:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(investment.dividends_received)}
              </span>
            </p>
          </div>
          <Button
            size="sm"
            variant={adding ? "secondary" : "default"}
            className="h-7 text-xs gap-1"
            onClick={() => setAdding((v) => !v)}
          >
            <Plus className="w-3.5 h-3.5" />
            {adding ? "Cancelar" : "Lançar"}
          </Button>
        </div>

        {adding && user && (
          <DividendForm
            investmentId={investment.id}
            userId={user.id}
            onDone={() => setAdding(false)}
          />
        )}

        <div className="rounded-xl border border-border/40 divide-y divide-border/40">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-3">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : dividends.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              {isProfitable ? <TrendingUp className="w-6 h-6 mx-auto mb-1.5 opacity-40" /> : <TrendingDown className="w-6 h-6 mx-auto mb-1.5 opacity-40" />}
              Nenhum dividendo lançado ainda
            </div>
          ) : (
            dividends.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(d.amount)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(d.received_at)}
                    {d.notes ? ` · ${d.notes}` : ""}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(d.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DividendForm({
  investmentId,
  userId,
  onDone,
}: {
  investmentId: string;
  userId: string;
  onDone: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useZodForm(dividendSchema, {
    defaultValues: {
      amount: 0,
      received_at: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  const mutation = useToastMutation({
    mutationFn: (data: DividendInput) =>
      investmentsService.addDividend({
        investment_id: investmentId,
        user_id: userId,
        amount: data.amount,
        received_at: data.received_at,
        notes: data.notes ?? null,
      }),
    invalidateKeys: [
      ["investment-dividends", investmentId],
      ["investment-summary"],
    ],
    successMessage: "Dividendo lançado!",
    errorMessage: "Erro ao lançar dividendo",
    onSuccess: () => onDone(),
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data as DividendInput))}
      className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="div-amount" className="text-xs">Valor (R$)</Label>
          <Input
            id="div-amount"
            type="number"
            step="0.01"
            error={!!errors.amount}
            {...register("amount")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="div-date" className="text-xs">Data</Label>
          <Input
            id="div-date"
            type="date"
            error={!!errors.received_at}
            {...register("received_at")}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="div-notes" className="text-xs">Observação (opcional)</Label>
        <Textarea
          id="div-notes"
          rows={2}
          placeholder="Ex: JCP referente a out/24"
          {...register("notes")}
        />
      </div>
      <Button type="submit" size="sm" className="w-full h-8" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <><Loader2 className="animate-spin w-3.5 h-3.5 mr-1" /> Salvando...</>
        ) : (
          "Adicionar dividendo"
        )}
      </Button>
    </form>
  );
}
