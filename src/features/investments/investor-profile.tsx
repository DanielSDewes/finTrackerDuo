"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Scale, Rocket } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { investmentsService } from "@/services/investments.service";
import { formatNumber, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssetClass, InvestorProfile } from "@/types";

const PROFILES: { value: InvestorProfile; label: string; icon: typeof ShieldCheck; desc: string }[] = [
  { value: "conservador", label: "Conservador", icon: ShieldCheck, desc: "Foco em renda fixa e preservação" },
  { value: "moderado", label: "Moderado", icon: Scale, desc: "Equilíbrio entre renda fixa e variável" },
  { value: "arrojado", label: "Arrojado", icon: Rocket, desc: "Maior exposição a renda variável" },
];

// Alocação-alvo (% por classe) por perfil. Cada coluna soma 100%.
export const TARGETS: Record<InvestorProfile, Record<AssetClass, number>> = {
  conservador: { fixed_income: 70, real_estate: 10, variable_income: 10, crypto: 0, other: 10 },
  moderado: { fixed_income: 45, variable_income: 25, real_estate: 15, crypto: 5, other: 10 },
  arrojado: { fixed_income: 20, variable_income: 45, real_estate: 15, crypto: 12, other: 8 },
};

export const CLASS_LABELS: Record<AssetClass, string> = {
  fixed_income: "Renda Fixa",
  variable_income: "Renda Variável",
  real_estate: "FIIs",
  crypto: "Cripto",
  other: "Outros",
};

export const CLASSES: AssetClass[] = ["fixed_income", "variable_income", "real_estate", "crypto", "other"];

export function InvestorProfileCard() {
  const { user, couple, isShared, scopeKey } = useScopeFilter();

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["investor-profile", user?.id],
    queryFn: () => investmentsService.getInvestorProfile(user!.id),
    enabled: !!user,
  });

  const { data: summary } = useQuery({
    queryKey: ["investment-summary", scopeKey],
    queryFn: () => investmentsService.getPortfolioSummary(user!.id, couple?.id, isShared),
    enabled: !!user,
  });

  const setMutation = useToastMutation({
    mutationFn: (p: InvestorProfile) => investmentsService.setInvestorProfile(user!.id, p),
    invalidateKeys: [["investor-profile"]],
    successMessage: "Perfil atualizado!",
    errorMessage: "Erro ao salvar perfil",
  });

  const currentAlloc = useMemo(() => {
    const total = summary?.totalCurrent ?? 0;
    const byClass = summary?.byClass;
    const alloc = {} as Record<AssetClass, number>;
    for (const c of CLASSES) {
      const v = byClass?.[c] ?? 0;
      alloc[c] = total > 0 ? (v / total) * 100 : 0;
    }
    return alloc;
  }, [summary]);

  // Aderência = sobreposição entre carteira atual e alvo (Σ min por classe).
  const adherence = useMemo(() => {
    if (!profile) return null;
    const target = TARGETS[profile];
    return CLASSES.reduce((s, c) => s + Math.min(currentAlloc[c], target[c]), 0);
  }, [profile, currentAlloc]);

  if (loadingProfile) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PROFILES.map((p) => {
          const active = profile === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setMutation.mutate(p.value)}
              disabled={setMutation.isPending}
              className={cn(
                "text-left p-3 rounded-xl border transition-all",
                active
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/50 hover:border-primary/30",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <p.icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">{p.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{p.desc}</p>
            </button>
          );
        })}
      </div>

      {!profile ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Escolha um perfil para ver a aderência da sua carteira.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Aderência da carteira</span>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              (adherence ?? 0) >= 80 ? "text-success" : (adherence ?? 0) >= 50 ? "text-primary" : "text-expense",
            )}>
              {formatNumber(adherence ?? 0, 0)}%
            </span>
          </div>

          <div className="space-y-2.5">
            {CLASSES.map((c) => {
              const cur = currentAlloc[c];
              const tgt = TARGETS[profile][c];
              return (
                <div key={c}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span>{CLASS_LABELS[c]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      atual {formatNumber(cur, 0)}% · alvo {tgt}%
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70 transition-all duration-700" style={{ width: `${Math.min(cur, 100)}%` }} />
                    {/* marcador do alvo */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/60" style={{ left: `${Math.min(tgt, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Barra = alocação atual · traço = alvo do perfil {PROFILES.find((p) => p.value === profile)?.label}.
          </p>
        </div>
      )}
    </div>
  );
}
