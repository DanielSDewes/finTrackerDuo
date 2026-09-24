"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Search, Pencil, Trash2, Tag, ArrowLeftRight, CreditCard,
  EyeOff, Eye, Loader2, Lock,
} from "lucide-react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RowActionsMenu } from "@/components/shared/row-actions-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryForm } from "./category-form";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

// Chips de situação. Inativas continuam listadas (é de lá que se reativa),
// então "Ativas" é o padrão para a lista não encher de categoria aposentada.
const ACTIVE_FILTERS: { value: "active" | "inactive" | "all"; label: string }[] = [
  { value: "active", label: "Ativas" },
  { value: "inactive", label: "Inativas" },
  { value: "all", label: "Todas" },
];

/** As chaves que dependem do nome/cor/uso de uma categoria. */
const CATEGORY_INVALIDATE_KEYS = [
  ["categories"],
  ["transactions"],
  ["transactions-month"],
  ["transactions-recent"],
  ["category-breakdown"],
  ["category-breakdown-report"],
  ["card-transactions"],
  ["cards"],
  ["spend-search"],
];

export function CategoriesView() {
  const { user, couple } = useAuthStore();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  // Categoria escolhida para exclusão. O diálogo só decide entre "excluir" e
  // "só dá pra inativar" depois de contar o uso no banco.
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"active" | "inactive" | "all">("active");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories", "all", user?.id, couple?.id],
    queryFn: () => categoriesService.getCategories(user!.id, couple?.id),
    enabled: !!user,
  });

  // Uso da categoria alvo — é o que separa exclusão de inativação.
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["category-usage", deleteTarget?.id],
    queryFn: () => categoriesService.countCategoryUsage(deleteTarget!.id),
    enabled: !!deleteTarget,
    // Sempre refaz a contagem ao abrir: um lançamento pode ter entrado desde
    // a última vez, e aqui um número velho significa perder classificação.
    staleTime: 0,
    gcTime: 0,
  });

  const deleteMutation = useToastMutation({
    mutationFn: (id: string) => categoriesService.deleteCategory(id),
    invalidateKeys: CATEGORY_INVALIDATE_KEYS,
    successMessage: "Categoria excluída",
    onSuccess: () => setDeleteTarget(null),
    // Sem errorMessage fixo: o caminho de erro que importa aqui é a corrida —
    // um lançamento entrou entre a contagem e o delete, e o service recusou.
    // A mensagem dele diz quantos, o que um texto genérico esconderia.
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir categoria");
      // Recontar: a lista some do bloqueio e o diálogo passa a oferecer inativar.
      queryClient.invalidateQueries({ queryKey: ["category-usage"] });
    },
  });

  const toggleActiveMutation = useToastMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoriesService.setCategoryActive(id, isActive),
    invalidateKeys: CATEGORY_INVALIDATE_KEYS,
    errorMessage: "Erro ao atualizar categoria",
    // Mensagem depende da direção, e o hook só aceita texto fixo — por isso
    // o toast sai daqui em vez de successMessage.
    onSuccess: (_data, vars) => {
      setDeleteTarget(null);
      toast.success(vars.isActive ? "Categoria reativada" : "Categoria inativada");
    },
  });

  const filtered = (categories ?? []).filter((cat) => {
    if (search && !cat.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeFilter === "active" && !cat.is_active) return false;
    if (activeFilter === "inactive" && cat.is_active) return false;
    return true;
  });

  const inactiveCount = (categories ?? []).filter((c) => !c.is_active).length;

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormOpen(true);
  };

  // Estados do diálogo de exclusão.
  const blocked = !!usage && usage.total > 0;

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

        {/* Situação — só aparece quando há o que separar */}
        {inactiveCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-0.5">
              Situação
            </span>
            {ACTIVE_FILTERS.map(({ value, label }) => (
              <Button
                key={value}
                variant={activeFilter === value ? "default" : "outline"}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setActiveFilter(value)}
              >
                {label}
                {value === "inactive" && ` (${inactiveCount})`}
              </Button>
            ))}
          </div>
        )}

        {/* Grade de categorias — 4 por linha em telas grandes, reduzindo para
            3/2/1 conforme a largura diminui. */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="h-4 w-28 mt-3" />
                  <Skeleton className="h-4 w-20 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={search ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
            description={
              search
                ? "Tente outro termo de busca."
                : activeFilter === "inactive"
                  ? "Nenhuma categoria inativa."
                  : "Crie sua primeira categoria para usar nas transações e no cartão."
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((cat) => {
              // Categorias padrão agora têm dono (cada usuário tem a sua
              // cópia), então também caem aqui como editáveis. Só as do
              // parceiro, vindas pelo couple_id, seguem somente leitura.
              const isOwn = cat.user_id === user?.id;
              return (
                <Card
                  key={cat.id}
                  className={cn(
                    "group border-border/50 hover:border-primary/20 hover:shadow-md transition-all",
                    !cat.is_active && "opacity-60 bg-muted/30",
                  )}
                >
                  <CardContent className="p-4">
                    {/* Topo: cor + ações (categorias do parceiro são só leitura) */}
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>
                      {isOwn && (
                        <RowActionsMenu
                          triggerClassName="opacity-0 group-hover:opacity-100 transition-opacity"
                          actions={[
                            { label: "Editar", icon: Pencil, onClick: () => handleEdit(cat) },
                            cat.is_active
                              ? {
                                  label: "Inativar",
                                  icon: EyeOff,
                                  onClick: () =>
                                    toggleActiveMutation.mutate({ id: cat.id, isActive: false }),
                                }
                              : {
                                  label: "Reativar",
                                  icon: Eye,
                                  onClick: () =>
                                    toggleActiveMutation.mutate({ id: cat.id, isActive: true }),
                                },
                            {
                              label: "Excluir",
                              icon: Trash2,
                              destructive: true,
                              separator: true,
                              onClick: () => setDeleteTarget(cat),
                            },
                          ]}
                        />
                      )}
                    </div>

                    {/* Nome + badges de situação */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate flex-1 min-w-0">{cat.name}</p>
                      {!cat.is_active && (
                        <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">
                          inativa
                        </Badge>
                      )}
                      {cat.is_default && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0">
                          padrão
                        </Badge>
                      )}
                    </div>

                    {/* Onde é usada */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Exclusão: só liberada quando a categoria não tem nenhum lançamento.
          Com uso, o diálogo vira o caminho da inativação. */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {usageLoading
                ? "Verificando uso da categoria"
                : blocked
                  ? "Categoria em uso"
                  : "Excluir categoria"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {usageLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Contando os lançamentos de “{deleteTarget?.name}”...
                  </span>
                ) : blocked ? (
                  <div className="space-y-2">
                    <p>
                      “{deleteTarget?.name}” não pode ser excluída porque já tem{" "}
                      <strong>{usage!.total}</strong> lançamento
                      {usage!.total === 1 ? "" : "s"}:
                    </p>
                    <ul className="text-sm list-disc pl-5 space-y-0.5">
                      {usage!.transactions > 0 && (
                        <li>
                          {usage!.transactions} em transações
                        </li>
                      )}
                      {usage!.cardTransactions > 0 && (
                        <li>
                          {usage!.cardTransactions} na fatura do cartão
                        </li>
                      )}
                      {usage!.futureTransactions > 0 && (
                        <li>
                          {usage!.futureTransactions} em lançamentos agendados
                        </li>
                      )}
                    </ul>
                    <p>
                      Inative a categoria: ela sai dos seletores de novos
                      lançamentos e o histórico continua classificado.
                    </p>
                  </div>
                ) : (
                  <span>
                    “{deleteTarget?.name}” não é usada por nenhum lançamento e
                    será removida definitivamente.
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            {!usageLoading &&
              (blocked ? (
                <AlertDialogAction
                  disabled={toggleActiveMutation.isPending || !deleteTarget?.is_active}
                  onClick={(e) => {
                    e.preventDefault();
                    if (deleteTarget) {
                      toggleActiveMutation.mutate({ id: deleteTarget.id, isActive: false });
                    }
                  }}
                >
                  {toggleActiveMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-1" />
                      Inativando...
                    </>
                  ) : !deleteTarget?.is_active ? (
                    <>
                      <Lock className="w-4 h-4 mr-1" />
                      Já está inativa
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Inativar categoria
                    </>
                  )}
                </AlertDialogAction>
              ) : (
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={deleteMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                  }}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 mr-1" />
                      Excluindo...
                    </>
                  ) : (
                    "Excluir"
                  )}
                </AlertDialogAction>
              ))}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
