"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ShieldCheck, History } from "lucide-react";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { investmentsService } from "@/services/investments.service";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditAction, AuditEntity } from "@/types";

const ACTION_META: Record<AuditAction, { label: string; icon: typeof Plus; style: string }> = {
  create: { label: "Criou", icon: Plus, style: "text-success bg-success/10" },
  update: { label: "Atualizou", icon: Pencil, style: "text-primary bg-primary/10" },
  delete: { label: "Removeu", icon: Trash2, style: "text-expense bg-expense/10" },
};

const ENTITY_LABELS: Record<AuditEntity, string> = {
  investment: "ativo",
  operation: "operação",
  dividend: "provento",
  goal: "meta",
};

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function InvestmentAudit() {
  const { user } = useScopeFilter();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["investment-audit", user?.id],
    queryFn: () => investmentsService.listAuditLog(user!.id),
    enabled: !!user,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Histórico de alterações nos seus investimentos.
      </p>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : entries.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Nenhuma alteração registrada ainda.
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 divide-y divide-border/40">
          {entries.map((e) => {
            const meta = ACTION_META[e.action];
            return (
              <div key={e.id} className="flex items-center gap-3 p-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", meta.style)}>
                  <meta.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{meta.label}</span>{" "}
                    {ENTITY_LABELS[e.entity]} <span className="font-medium">{e.label}</span>
                    {e.detail ? <span className="text-muted-foreground"> · {e.detail}</span> : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{formatStamp(e.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl border border-border/40 bg-muted/20">
        <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          Backup automático, controle de permissões (RLS por usuário/casal) e criptografia em repouso
          são providos pela infraestrutura do Supabase.
        </p>
      </div>
    </div>
  );
}
