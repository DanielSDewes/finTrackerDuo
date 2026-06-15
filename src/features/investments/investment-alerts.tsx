"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Scale, BellOff, Target, type LucideIcon } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { investmentsService } from "@/services/investments.service";
import { formatNumber, formatDate, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { TARGETS, CLASS_LABELS, CLASSES } from "./investor-profile";
import type { AssetClass } from "@/types";

type Severity = "info" | "warning" | "success";
type Alert = { id: string; severity: Severity; icon: LucideIcon; title: string; desc: string };

const SEVERITY_STYLES: Record<Severity, string> = {
  info: "text-primary bg-primary/10",
  warning: "text-amber-500 bg-amber-500/10",
  success: "text-success bg-success/10",
};

function avgMonthlyDividends(received: { received_at: string; amount: number }[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);
  return received.filter((d) => d.received_at >= start).reduce((s, d) => s + d.amount, 0) / 12;
}

export function InvestmentAlerts() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["investment-summary", scopeKey],
    queryFn: () => investmentsService.getPortfolioSummary(user!.id, couple?.id, isShared),
    enabled: !!user,
  });
  const { data: profile } = useQuery({
    queryKey: ["investor-profile", user?.id],
    queryFn: () => investmentsService.getInvestorProfile(user!.id),
    enabled: !!user,
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["investment-goals", scopeKey],
    queryFn: () => investmentsService.listGoals(user!.id, couple?.id, isShared),
    enabled: !!user,
  });
  const { data: dividends = [] } = useQuery({
    queryKey: ["investment-dividends-all", scopeKey],
    queryFn: () => investmentsService.getAllDividends(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const alerts = useMemo<Alert[]>(() => {
    const out: Alert[] = [];
    const investments = summary?.investments ?? [];
    const totalCurrent = summary?.totalCurrent ?? 0;
    const avgMonthly = avgMonthlyDividends(dividends);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // 1) Títulos vencendo em até 60 dias.
    for (const inv of investments) {
      if (!inv.maturity_date || inv.maturity_date < todayStr) continue;
      const days = Math.ceil((new Date(inv.maturity_date).getTime() - today.getTime()) / 86_400_000);
      if (days <= 60) {
        out.push({
          id: `mat-${inv.id}`,
          severity: "warning",
          icon: CalendarClock,
          title: `${inv.asset_name} vence em ${days} dia${days === 1 ? "" : "s"}`,
          desc: `Vencimento em ${formatDate(inv.maturity_date)}.`,
        });
      }
    }

    // 2) Metas atingidas ou quase.
    for (const goal of goals) {
      const measure = goal.kind === "monthly_income" ? avgMonthly : totalCurrent;
      const pct = goal.target_amount > 0 ? (measure / goal.target_amount) * 100 : 0;
      if (pct >= 100) {
        out.push({ id: `goal-${goal.id}`, severity: "success", icon: CheckCircle2, title: `Meta atingida: ${goal.title}`, desc: "Parabéns! Você bateu o alvo." });
      } else if (pct >= 80) {
        out.push({ id: `goal-${goal.id}`, severity: "info", icon: Target, title: `Quase lá: ${goal.title}`, desc: `${formatNumber(pct, 0)}% concluído.` });
      }
    }

    // 3) Rebalanceamento vs perfil.
    if (profile && totalCurrent > 0) {
      const target = TARGETS[profile];
      let worst: { c: AssetClass; dev: number; cur: number } | null = null;
      for (const c of CLASSES) {
        const cur = ((summary?.byClass?.[c] ?? 0) / totalCurrent) * 100;
        const dev = Math.abs(cur - target[c]);
        if (!worst || dev > worst.dev) worst = { c, dev, cur };
      }
      if (worst && worst.dev > 10) {
        out.push({
          id: "rebalance",
          severity: "warning",
          icon: Scale,
          title: "Carteira fora do perfil",
          desc: `${CLASS_LABELS[worst.c]} está em ${formatNumber(worst.cur, 0)}% (alvo ${target[worst.c]}%). Considere rebalancear.`,
        });
      }
    }

    return out;
  }, [summary, profile, goals, dividends]);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (alerts.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        <BellOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Tudo em ordem — nenhum alerta no momento.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/40">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", SEVERITY_STYLES[a.severity])}>
            <a.icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{a.title}</p>
            <p className="text-xs text-muted-foreground">{a.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
