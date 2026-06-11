"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Tag, ArrowLeftRight, CreditCard } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useToastMutation } from "@/hooks/use-toast-mutation";
import { categoriesService } from "@/services/categories.service";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryForm } from "./category-form";
import type { Category } from "@/types";

export function CategoriesView() {
  const { user, couple } = useAuthStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories", "all", user?.id, couple?.id],
    queryFn: () => categoriesService.getCategories(user!.id, couple?.id),
    enabled: !!user,
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => categoriesService.deleteCategory(id),
    invalidateKeys: [
      ["categories"],
      ["transactions"],
      ["transactions-month"],
      ["transactions-recent"],
      ["category-breakdown"],
      ["category-breakdown-report"],
      ["card-transactions"],
      ["cards"],
    ],
    successMessage: "Categoria excluída",
    errorMessage: "Erro ao excluir categoria",
    onSuccess: () => setDeleteId(null),
  });

  const filtered = (categories ?? []).filter(
    (cat) => !search || cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormOpen(true);
  };

  return (
    <div>
      <Header
        title="Categorias"
        subtitle="Cadastre as categorias usadas em transações e no cartão"
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 sm:max-w-xs w-full">
            <Input
              placeholder="Buscar categoria..."
              leftIcon={<Search />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingCategory(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCategory(null)}>
                <Plus className="w-4 h-4" />
                Nova categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar categoria" : "Nova categoria"}
                </DialogTitle>
              </DialogHeader>
              <CategoryForm
                category={editingCategory}
                onSuccess={() => {
                  setFormOpen(false);
                  setEditingCategory(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* List */}
        <Card className="border-border/50">
          <CardContent className="p-2 sm:p-3">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Tag}
                title={search ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
                description={
                  search
                    ? "Tente outro termo de busca."
                    : "Crie sua primeira categoria para usar nas transações e no cartão."
                }
              />
            ) : (
              <div className="space-y-0.5">
                {filtered.map((cat) => {
                  const isOwn = cat.user_id === user?.id;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors group"
                    >
                      {/* Color dot */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>

                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium truncate">{cat.name}</p>
                          {cat.is_default && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
                              padrão
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {cat.is_transaction && cat.type === "income" && (
                            <Badge variant="income" className="text-[10px] py-0 h-4 flex items-center gap-1">
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              Receita
                            </Badge>
                          )}
                          {cat.is_transaction && cat.type === "expense" && (
                            <Badge variant="expense" className="text-[10px] py-0 h-4 flex items-center gap-1">
                              <ArrowLeftRight className="w-2.5 h-2.5" />
                              Despesa
                            </Badge>
                          )}
                          {cat.is_card && (
                            <Badge variant="info" className="text-[10px] py-0 h-4 flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5" />
                              Cartão
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions — categorias padrão e do parceiro são somente leitura */}
                      {isOwn && (
                        <RowActionsMenu
                          triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                          actions={[
                            { label: "Editar", icon: Pencil, onClick: () => handleEdit(cat) },
                            { label: "Excluir", icon: Trash2, destructive: true, onClick: () => setDeleteId(cat.id) },
                          ]}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir categoria"
        confirmLabel="Excluir"
        description="Os lançamentos que usam esta categoria não serão apagados — eles passam a aparecer como 'Sem categoria'."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
