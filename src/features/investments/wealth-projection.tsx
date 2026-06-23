"use client";

import { useMemo, useState } from "react";
import { addMonths, differenceInMonths, format, parseISO } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, CalendarClock, RotateCcw } from "lucide-react";
import { formatCurrency, formatNumber, formatDateFull } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Investment, YieldPeriod } from "@/types";

// Dias por mês usados para anualizar/mensalizar a taxa diária — média do ano
// (365/12) para casar com a composição diária do accrue_investment_yields.
const DAYS_PER_MONTH = 365 / 12;
const MAX_MONTHS = 600; // 50 anos — teto de sanidade da projeção

// Converte a taxa de rendimento de um ativo (fração, no período informado)
// para uma taxa mensal efetiva equivalente. Ativos sem rendimento → 0.
function monthlyRateOf(rate: number | null, period: YieldPeriod | null): number {
  if (rate == null || !period) return 0;
  switch (period) {
    case "daily":
      return Math.pow(1 + rate, DAYS_PER_MONTH) - 1;
    case "monthly":
      return rate;
    case "annual":
      return Math.pow(1 + rate, 1 / 12) - 1;
    default:
      return 0;
  }
}

const PRESETS = [
  { label: "6 meses", months: 6 },
  { label: "1 ano", months: 12 },
  { label: "2 anos", months: 24 },
  { label: "5 anos", months: 60 },
  { label: "10 anos", months: 120 },
];

type WealthProjectionProps = {
  investments: Investment[];
  totalCurrent: number;
  /** Aporte mensal sugerido — média dos aportes já agendados nos próximos meses. */
  suggestedContribution?: number;
  /** Quantos meses futuros têm aporte agendado (para o texto explicativo). */
  upcomingMonths?: number;
  isLoading?: boolean;
};

export function WealthProjection({
  investments,
  totalCurrent,
  suggestedContribution = 0,
  upcomingMonths = 0,
  isLoading,
}: WealthProjectionProps) {
  const today = useMemo(() => new Date(), []);

  // Rendimento médio da carteira: média das taxas mensais efetivas dos ativos,
  // ponderada pelo valor atual. É o ponto de partida — ancorado nos dados reais.
  const blendedAnnualPct = useMemo(() => {
    if (totalCurrent <= 0) return 0;
    const weightedMonthly = investments.reduce(
      (acc, inv) => acc + inv.current_value * monthlyRateOf(inv.yield_rate, inv.yield_period),
      0,
    ) / totalCurrent;
    return (Math.pow(1 + weightedMonthly, 12) - 1) * 100;
  }, [investments, totalCurrent]);

  // Taxa efetiva = override do usuário, ou o rendimento da carteira enquanto
  // não for editado (assim acompanha a carteira até alguém mexer).
  const [rateOverride, setRateOverride] = useState<number | null>(null);
  const annualRate = rateOverride ?? Number(blendedAnnualPct.toFixed(2));

  // Aporte mensal = override do usuário, ou a sugestão (aportes já agendados)
  // enquanto não for editado.
  const [contributionOverride, setContributionOverride] = useState<number | null>(null);
  const monthlyContribution = contributionOverride ?? Number(suggestedContribution.toFixed(2));

  const [targetDate, setTargetDate] = useState(() =>
    format(addMonths(new Date(), 12), "yyyy-MM-dd"),
  );

  const months = useMemo(() => {
    const target = parseISO(targetDate);
    if (Number.isNaN(target.getTime())) return 0;
    return Math.min(Math.max(differenceInMonths(target, today), 0), MAX_MONTHS);
  }, [targetDate, today]);

  const projection = useMemo(() => {
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    let balance = totalCurrent;
    let contributed = totalCurrent; // principal + aportes (linha de referência)
    const series = [{
      label: format(today, "MMM/yy"),
      total: Math.round(balance),
      aportado: Math.round(contributed),
    }];
    // Amostra ~24 pontos no gráfico, independente do horizonte.
    const step = Math.max(1, Math.ceil(months / 24));
    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      contributed += monthlyContribution;
      if (m % step === 0 || m === months) {
        series.push({
          label: format(addMonths(today, m), "MMM/yy"),
          total: Math.round(balance),
          aportado: Math.round(contributed),
        });
      }
    }
    const aportesTotal = monthlyContribution * months;
    return {
      final: balance,
      aportesTotal,
      yield: balance - totalCurrent - aportesTotal,
      series,
    };
  }, [totalCurrent, annualRate, monthlyContribution, months, today]);

  const targetLabel = months > 0 ? formatDateFull(parseISO(targetDate)) : "—";
  const yearsLabel = useMemo(() => {
    const y = Math.floor(months / 12);
    const m = months % 12;
    return [y > 0 ? `${y} ano${y > 1 ? "s" : ""}` : null, m > 0 ? `${m} ${m > 1 ? "meses" : "mês"}` : null]
      .filter(Boolean)
      .join(" e ") || "menos de um mês";
  }, [months]);

  const hasYieldingAssets = investments.some((inv) => inv.yield_rate != null && inv.yield_period);

  const stats = [
    { label: "Valor projetado", value: projection.final, color: "text-success" },
    { label: "Valor hoje", value: totalCurrent, color: "" },
    { label: "Aportes no período", value: projection.aportesTotal, color: "" },
    { label: "Rendimento estimado", value: projection.yield, color: "text-primary" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" />
          Projeção de patrimônio
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Quanto seu patrimônio acumula até uma data, partindo do valor atual e do
          rendimento médio da carteira.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            {/* Atalhos de prazo */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-0.5">
                Prazo
              </span>
              {PRESETS.map((preset) => (
                <Button
                  key={preset.months}
                  type="button"
                  variant={months === preset.months ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setTargetDate(format(addMonths(today, preset.months), "yyyy-MM-dd"))}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Controles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proj-date" className="text-xs">Data alvo</Label>
                <Input
                  id="proj-date"
                  type="date"
                  min={format(addMonths(today, 1), "yyyy-MM-dd")}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="proj-contrib" className="text-xs">Aporte mensal</Label>
                  {contributionOverride != null && suggestedContribution > 0 && (
                    <button
                      type="button"
                      onClick={() => setContributionOverride(null)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      title="Usar os aportes já agendados"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      agendado
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    id="proj-contrib"
                    type="number"
                    step="100"
                    value={Number.isFinite(monthlyContribution) ? monthlyContribution : ""}
                    onChange={(e) => setContributionOverride(parseFloat(e.target.value) || 0)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="proj-rate" className="text-xs">Rendimento</Label>
                  {rateOverride != null && (
                    <button
                      type="button"
                      onClick={() => setRateOverride(null)}
                      className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      title="Usar o rendimento médio da carteira"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      carteira
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="proj-rate"
                    type="number"
                    step="0.5"
                    value={Number.isFinite(annualRate) ? annualRate : ""}
                    onChange={(e) => setRateOverride(parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    % a.a.
                  </span>
                </div>
              </div>
            </div>

            {suggestedContribution > 0 && contributionOverride == null && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="w-3 h-3 shrink-0" />
                Aporte estimado a partir de {upcomingMonths} {upcomingMonths === 1 ? "mês" : "meses"} de
                despesas já agendadas na categoria &ldquo;Investimento&rdquo;.
              </p>
            )}

            {/* Resultado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="p-3 rounded-xl border border-border/40 bg-muted/20">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className={`text-sm font-bold tabular-nums mt-0.5 ${s.color}`}>
                    {formatCurrency(s.value)}
                  </p>
                </div>
              ))}
            </div>

            {months > 0 ? (
              <p className="text-xs text-muted-foreground">
                Em <span className="font-medium text-foreground">{yearsLabel}</span>
                {" "}({targetLabel}) você teria{" "}
                <span className="font-semibold text-success">{formatCurrency(projection.final)}</span>.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Escolha uma data futura para projetar.</p>
            )}

            {months > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projection.series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${formatNumber(Number(v) / 1000, 0)}k`} width={56} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    formatter={(v, n) => [formatCurrency(Number(v)), n === "total" ? "Patrimônio" : "Investido"]}
                  />
                  <Line type="monotone" dataKey="aportado" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="total" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {!hasYieldingAssets && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 shrink-0" />
                Nenhum ativo com rendimento automático cadastrado — informe uma taxa
                acima para simular o crescimento.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
