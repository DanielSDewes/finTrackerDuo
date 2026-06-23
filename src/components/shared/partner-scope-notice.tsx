"use client";

import { Lock } from "lucide-react";
import { usePartner } from "@/hooks/use-partner";
import { EmptyState } from "@/components/shared/empty-state";

/**
 * Aviso exibido no modo "Ver como Parceiro" nas telas cujos dados do parceiro
 * NÃO são visíveis por RLS (investimentos, metas, agenda) — ali a visibilidade
 * do casal cobre só itens compartilhados, então mostrar dados parciais
 * enganaria. O modo cobre de fato transações e cartões.
 */
export function PartnerScopeNotice({ noun }: { noun: string }) {
  const { partnerFirstName } = usePartner();
  return (
    <div className="p-4 sm:p-6">
      <EmptyState
        variant="full"
        icon={Lock}
        title={`${noun} de ${partnerFirstName} são privados`}
        description="No modo “Ver como Parceiro” aparecem apenas as transações e os cartões do parceiro. Investimentos, metas e agenda continuam privados."
      />
    </div>
  );
}
