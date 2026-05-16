"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, Pencil, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cardsService } from "../services/cards.service";
import { useCardsStore } from "../stores/cards.store";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { CardVisual } from "./card-visual";
import { CardForm } from "./card-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreditCard as CreditCardType } from "../types";

export function CardList() {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const { selectedCardId, setSelectedCard } = useCardsStore();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editCard, setEditCard] = useState<CreditCardType | null>(null);
  const [deleteCard, setDeleteCard] = useState<CreditCardType | null>(null);

  const isShared = viewMode === "couple";

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards", user?.id, couple?.id, isShared],
    queryFn: () => cardsService.getCards(user!.id, couple?.id ?? null, isShared),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cardsService.deleteCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      if (deleteCard?.id === selectedCardId) setSelectedCard(null, null);
      toast.success("Cartão removido");
      setDeleteCard(null);
    },
    onError: () => toast.error("Erro ao remover cartão"),
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
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum cartão cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione seu primeiro cartão de crédito</p>
            </div>
            <Button size="sm" onClick={() => { setEditCard(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar cartão
            </Button>
          </div>
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

              {/* Usage bar */}
              {card.limit_amount > 0 && (
                <div className="mt-1.5 px-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Utilizado</span>
                    <span>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(card.total_used ?? 0)}
                      {" / "}
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(card.limit_amount)}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((card.total_used ?? 0) / card.limit_amount) * 100)}%`,
                        background: ((card.total_used ?? 0) / card.limit_amount) > 0.8
                          ? "hsl(var(--expense))"
                          : "hsl(var(--primary))",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditCard(card); setFormOpen(true); }}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteCard(card)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteCard} onOpenChange={(o) => !o && setDeleteCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o cartão <strong>{deleteCard?.name}</strong>? Todas as faturas e transações serão apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteCard && deleteMutation.mutate(deleteCard.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
