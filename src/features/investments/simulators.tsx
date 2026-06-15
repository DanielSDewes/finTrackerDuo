"use client";

import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Flame } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function NumberField({
  id, label, value, onChange, step = "1", suffix,
}: {
  id: string; label: string; value: number; onChange: (n: number) => void; step?: string; suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function CompoundSimulator() {
  const [initial, setInitial] = useState(1000);
  const [monthly, setMonthly] = useState(500);
  const [annualRate, setAnnualRate] = useState(10);
  const [years, setYears] = useState(10);

  const result = useMemo(() => {
    const months = Math.min(Math.max(Math.round(years * 12), 0), 720);
    const i = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    let balance = initial;
    const series: { label: string; aportado: number; total: number }[] = [];
    let contributed = initial;
    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + i) + monthly;
      contributed += monthly;
      if (m % 12 === 0 || m === months) {
        series.push({
          label: `${Math.round(m / 12)}a`,
          aportado: Math.round(contributed),
          total: Math.round(balance),
        });
      }
    }
    return {
      series,
      final: balance,
      contributed,
      interest: balance - contributed,
    };
  }, [initial, monthly, annualRate, years]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Juros compostos com aportes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumberField id="c-init" label="Aporte inicial" value={initial} onChange={setInitial} step="100" />
          <NumberField id="c-month" label="Aporte mensal" value={monthly} onChange={setMonthly} step="100" />
          <NumberField id="c-rate" label="Rendimento" value={annualRate} onChange={setAnnualRate} step="0.5" suffix="% a.a." />
          <NumberField id="c-years" label="Prazo" value={years} onChange={setYears} step="1" suffix="anos" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Valor final", value: result.final, color: "text-success" },
            { label: "Total aportado", value: result.contributed, color: "" },
            { label: "Juros", value: result.interest, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-xl border border-border/40 bg-muted/20">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className={`text-sm font-bold tabular-nums mt-0.5 ${s.color}`}>{formatCurrency(s.value)}</p>
            </div>
          ))}
        </div>

        {result.series.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={result.series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${formatNumber(Number(v) / 1000, 0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                formatter={(v, n) => [formatCurrency(Number(v)), n === "total" ? "Patrimônio" : "Aportado"]}
              />
              <Line type="monotone" dataKey="aportado" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="total" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function FireSimulator() {
  const [monthlyIncome, setMonthlyIncome] = useState(5000);
  const [withdrawalRate, setWithdrawalRate] = useState(4);
  const [currentEquity, setCurrentEquity] = useState(50000);
  const [monthlyContribution, setMonthlyContribution] = useState(2000);
  const [annualReturn, setAnnualReturn] = useState(6);

  const result = useMemo(() => {
    const required = withdrawalRate > 0 ? (monthlyIncome * 12) / (withdrawalRate / 100) : Infinity;
    const i = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
    let balance = currentEquity;
    let months = 0;
    const cap = 1200; // 100 anos
    while (balance < required && months < cap) {
      balance = balance * (1 + i) + monthlyContribution;
      months++;
    }
    const reached = balance >= required;
    return {
      required,
      reached,
      years: Math.floor(months / 12),
      months: months % 12,
      capped: months >= cap && !reached,
    };
  }, [monthlyIncome, withdrawalRate, currentEquity, monthlyContribution, annualReturn]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          Independência financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <NumberField id="f-income" label="Renda passiva desejada" value={monthlyIncome} onChange={setMonthlyIncome} step="500" suffix="/mês" />
          <NumberField id="f-wr" label="Taxa de retirada" value={withdrawalRate} onChange={setWithdrawalRate} step="0.5" suffix="% a.a." />
          <NumberField id="f-equity" label="Patrimônio atual" value={currentEquity} onChange={setCurrentEquity} step="1000" />
          <NumberField id="f-contrib" label="Aporte mensal" value={monthlyContribution} onChange={setMonthlyContribution} step="100" />
          <NumberField id="f-return" label="Retorno real" value={annualReturn} onChange={setAnnualReturn} step="0.5" suffix="% a.a." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-border/40 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Patrimônio necessário</p>
            <p className="text-sm font-bold tabular-nums mt-0.5 text-primary">
              {Number.isFinite(result.required) ? formatCurrency(result.required) : "—"}
            </p>
          </div>
          <div className="p-3 rounded-xl border border-border/40 bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Tempo estimado</p>
            <p className="text-sm font-bold mt-0.5">
              {result.capped
                ? "Mais de 100 anos"
                : result.years === 0 && result.months === 0
                  ? "Já atingido 🎉"
                  : `${result.years > 0 ? `${result.years}a ` : ""}${result.months}m`}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Estimativa pela regra da taxa de retirada segura (ex.: 4% = patrimônio de 25× a renda anual).
        </p>
      </CardContent>
    </Card>
  );
}

export function Simulators() {
  return (
    <div className="space-y-4">
      <CompoundSimulator />
      <FireSimulator />
    </div>
  );
}
