"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CreditCard, Users } from "lucide-react";
import { cardsService } from "../services/cards.service";
import { useCardsStore } from "../stores/cards.store";
import { useScopeFilter } from "@/hooks/use-scope-filter";
import { usePartner } from "@/hooks/use-partner";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { CardVisual } from "./card-visual";
import { CardForm } from "./card-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { CreditCard as CreditCardType } from "../types";

export function CardList() {
  const { user, couple, scopeKey } = useScopeFilter();
  const { partnerFirstName } = usePartner();
  const { selectedCardId, setSelectedCard } = useCardsStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editCard, setEditCard] = useState<CreditCardType | null>(null);
  const [deleteCard, setDeleteCard] = useState<CreditCardType | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards", scopeKey],
    queryFn: () => cardsService.getCards(user!.id, couple?.id ?? null),
    enabled: !!user,
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => cardsService.deleteCard(id),
    invalidateKeys: [["cards"]],
    successMessage: "Cartão removido",
    errorMessage: "Erro ao remover cartão",
    onSuccess: () => {
      if (deleteCard?.id === selectedCardId) setSelectedCard(null, null);
      setDeleteCard(null);
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Meus Cartões</h2>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditCard(null); setFormOpen(true); }}
          className="h-8 gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))
        ) : cards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão cadastrado"
            description="Adicione seu primeiro cartão de crédito"
            action={
              <Button size="sm" onClick={() => { setEditCard(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar cartão
              </Button>
            }
          />
        ) : (
          cards.map((card) => (
            <div key={card.id} className="relative group">
              <CardVisual
                card={card}
                size="md"
                selected={selectedCardId === card.id}
                onClick={() =>
                  setSelectedCard(
                    selectedCardId === card.id ? null : card.id,
                    selectedCardId === card.id ? null : card.user_id
                  )
                }
              />

              {/* Usage bars — Consolidado (tudo) + Realizado (sem previsões) */}
              {card.limit_amount > 0 && (() => {
                const consolidated = card.total_used ?? 0;
                const realized = card.total_used_real ?? 0;
                const consolidatedPct = Math.min(100, (consolidated / card.limit_amount) * 100);
                const realizedPct = Math.min(100, (realized / card.limit_amount) * 100);
                return (
                  <div className="mt-1.5 px-1 space-y-1.5">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Limite Consolidado</span>
                        <span>
                          {formatCurrency(consolidated)}
                          {" / "}
                          {formatCurrency(card.limit_amount)}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${consolidatedPct}%`,
                            background: consolidatedPct > 80
                              ? "hsl(var(--expense))"
                              : "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Limite Realizado</span>
                        <span>
                          {formatCurrency(realized)}
                          {" / "}
                          {formatCurrency(card.limit_amount)}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${realizedPct}%`,
                            background: realizedPct > 80
                              ? "hsl(var(--expense))"
                              : "hsl(var(--success))",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="absolute top-2 right-2">
                {card.user_id === user?.id ? (
                  <RowActionsMenu
                    triggerClassName="bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    actions={[
                      {
                        label: "Editar",
                        icon: Pencil,
                        onClick: () => { setEditCard(card); setFormOpen(true); },
                      },
                      {
                        label: "Remover",
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setDeleteCard(card),
                      },
                    ]}
                  />
                ) : (
                  // Cartão do parceiro: só leitura (a RLS impede editar/excluir).
                  <Badge className="gap-1 bg-black/30 text-white border-0 text-[10px] backdrop-blur-sm">
                    <Users className="w-3 h-3" />
                    {partnerFirstName}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Card form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCard ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          </DialogHeader>
          <CardForm card={editCard} onSuccess={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteCard}
        onOpenChange={(o) => !o && setDeleteCard(null)}
        title="Remover cartão"
        isPending={deleteMutation.isPending}
        description={
          <>
            Tem certeza que deseja remover o cartão <strong>{deleteCard?.name}</strong>?
            Todas as faturas e transações serão apagadas.
          </>
        }
        onConfirm={() => deleteCard && deleteMutation.mutate(deleteCard.id)}
      />
    </div>
  );
}
