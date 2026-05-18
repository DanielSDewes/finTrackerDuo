<div align="center">

# FinTrackerDuo

**Plataforma financeira moderna para indivíduos e casais.**
Visão consolidada, cartões com faturas reais, metas com sub-itens, investimentos e relatórios — em uma única interface, com escopo "Individual" ou "Casal" alternável a qualquer momento.

</div>

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Stack técnica](#2-stack-técnica)
3. [Arquitetura](#3-arquitetura)
4. [Estrutura do projeto](#4-estrutura-do-projeto)
5. [Funcionalidades](#5-funcionalidades)
6. [Segurança](#6-segurança)
7. [Padrões de código](#7-padrões-de-código)
8. [Setup local](#8-setup-local)
9. [Deploy](#9-deploy-vercel--supabase)
10. [Migrations](#10-migrations-supabase)

---

## 1. Visão geral

FinTrackerDuo trata o **vínculo entre dois usuários** como feature de primeira classe: cada usuário tem seus próprios dados, e o app oferece um toggle global no header para alternar entre visão **Individual** e **Casal** — recalculando dashboard, transações, cartões, investimentos, metas e relatórios sob o novo escopo, sem duplicação de queries no UI.

**Filosofia técnica:** zero backend customizado. Toda a lógica de negócio mora em PostgreSQL via Supabase — autenticação, RLS, RPC, triggers, encrypted JWT sessions. O cliente Next.js é um shell que renderiza e orquestra; a verdade fica no banco.

---

## 2. Stack técnica

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | RSC + Server Actions disponíveis; deploy Vercel zero-config |
| UI | **React 19**, Tailwind v4, [shadcn/ui](https://ui.shadcn.com) (Radix) | Acessibilidade pronta dos primitives Radix; tema HSL custom via `globals.css` |
| Animações | **Framer Motion** | Transições entre telas, ordering de listas, feedback de seleção |
| Estado servidor | **TanStack Query v5** | Cache, invalidations, optimistic updates, dedupe |
| Estado cliente | **Zustand** (com `persist` para auth/UI) | Mais simples que Redux; persistência local de tema/sidebar/view-mode |
| Forms | **react-hook-form + Zod v4** | Validação tipada, schemas reusados em service/payload |
| Backend / Auth / DB | **Supabase** (PostgreSQL + Auth + RLS + Storage) | SSR via `@supabase/ssr`, RLS substitui controller de autorização |
| Gráficos | **Recharts** | Composição declarativa; suficiente para dashboard/relatórios |
| Ícones | **lucide-react** | Tree-shakeable, consistente com shadcn |
| Toasts | **sonner** | Top-right, dismissible, `richColors` |
| Datas | **date-fns** + `ptBR` locale | Sem timezone surprises com helpers do `lib/utils` |

---

## 3. Arquitetura

### 3.1 Visão de alto nível

```
┌───────────────────────────────────────────────────────────────┐
│                    Browser (Next.js client)                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  React 19 + RSC                                          │ │
│  │   • feature views (cards, goals, transactions, …)        │ │
│  │   • shared components (EmptyState, ConfirmDeleteDialog…) │ │
│  │   • hooks (useScopeFilter, usePartner, useZodForm…)      │ │
│  │   • Zustand stores (auth, ui, cards, goals)              │ │
│  └─────────────────┬────────────────────────────────────────┘ │
│  ┌─────────────────▼────────────────────────────────────────┐ │
│  │  TanStack Query — cache + invalidations por scopeKey     │ │
│  └─────────────────┬────────────────────────────────────────┘ │
│  ┌─────────────────▼────────────────────────────────────────┐ │
│  │  Services (Supabase SDK)                                 │ │
│  │   transactionsService, cardsService, goalsService, …     │ │
│  │   ↳ applyScopeFilter() injeta RLS-friendly filters       │ │
│  └─────────────────┬────────────────────────────────────────┘ │
└────────────────────┼──────────────────────────────────────────┘
                     │ HTTPS + JWT (Supabase session)
                     ▼
┌───────────────────────────────────────────────────────────────┐
│                         Supabase                              │
│  PostgreSQL  │  Auth (JWT)  │  RLS  │  RPCs SECURITY DEFINER  │
└───────────────────────────────────────────────────────────────┘
```

### 3.2 Decisões de arquitetura

**RLS como camada primária de autorização.**
Em vez de espalhar checagens `if (couple.owner_id === user.id)` no client, cada tabela tem políticas `CREATE POLICY` que validam `auth.uid()` contra `user_id` ou contra a tabela `couples`. Mesmo que o cliente envie um filtro errado, o banco recusa. O filtro de escopo no service ([`applyScopeFilter`](src/lib/supabase/filters.ts)) é puramente uma otimização: traz apenas o que será visível, mas o limite real é a política. Ver [seção Segurança](#6-segurança).

**SSR + middleware refresh de sessão.**
[`src/proxy.ts`](src/proxy.ts) é o "middleware" do Next.js (renomeado para `proxy` neste fork do Next 16). Ele intercepta todas as rotas, chama [`updateSession`](src/lib/supabase/middleware.ts), refresca cookies de sessão Supabase, e redireciona: usuário não autenticado em rota privada → `/auth/login`; usuário autenticado em `/auth/*` → `/dashboard`. Nenhuma página privada chega a renderizar sem sessão válida.

**Escopo Individual/Casal como hook único.**
[`useScopeFilter`](src/hooks/use-scope-filter.ts) retorna `{ user, couple, isShared, scopeKey }`. Todo `useQuery` usa `scopeKey` como sufixo da queryKey — quando o usuário troca o toggle no header, **toda** a árvore de queries invalida e refetcha automaticamente. Sem prop drilling, sem `if (viewMode === "couple" && couple)` espalhado em 10+ arquivos.

**Layout master-detail reutilizável.**
Páginas como `cards` e `goals` têm o mesmo shape: uma lista à esquerda, detalhe à direita, abas no mobile. [`SplitPaneView`](src/components/shared/split-pane-view.tsx) parametriza isso por config declarativa — adicionar a próxima feature com esse padrão custa 1 import.

**Forms com hook único.**
[`useZodForm`](src/hooks/use-zod-form.ts) esconde o `as any` necessário pelo resolver Zod v4 + react-hook-form. [`useToastMutation`](src/hooks/use-toast-mutation.ts) absorve o trio `onSuccess`/`onError`/`invalidateQueries`. Um form típico hoje tem ~5 linhas de boilerplate (antes: ~20).

**Server-side e client-side Supabase clients separados.**
[`src/lib/supabase/client.ts`](src/lib/supabase/client.ts) para componentes "use client", [`server.ts`](src/lib/supabase/server.ts) para Server Components/Server Actions, [`middleware.ts`](src/lib/supabase/middleware.ts) para o proxy. Cada um lida com cookies de forma diferente — não dá pra usar o errado por acidente porque os tipos divergem.

### 3.3 Fluxo de dados típico (criar uma sub-meta)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User submit SubgoalForm                                      │
│    └─> useZodForm valida com goalSubgoalSchema (Zod)            │
│                                                                 │
│ 2. mutation.mutate(data) — useToastMutation:                    │
│    └─> goalsService.createSubgoal(payload)                      │
│        └─> supabase.from("goal_subgoals").insert(...)           │
│             ↳ JWT no cookie → RLS valida auth.uid() = user_id   │
│                                                                 │
│ 3. onSuccess automaticamente:                                   │
│    ├─> invalidates: ["subgoals", goalId], ["goals"]             │
│    ├─> toast.success("Sub-meta criada!")                        │
│    └─> chama callback do componente (fecha dialog)              │
│                                                                 │
│ 4. SubgoalDetail re-fetcha por causa do invalidate              │
│    └─> Re-render com a nova sub-meta na lista                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Estrutura do projeto

```
src/
├── app/                        # App Router (Next.js)
│   ├── (app)/                  # Grupo de rotas autenticadas
│   │   ├── layout.tsx          # Sidebar + main, gate de auth via proxy
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── cards/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── investments/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── couple/page.tsx
│   │   └── settings/page.tsx
│   ├── auth/                   # Rotas públicas de login/cadastro
│   │   ├── layout.tsx          # Painel split-screen com branding
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── callback/route.ts   # OAuth/magic-link callback
│   ├── layout.tsx              # <html>, providers (theme, query, auth)
│   └── page.tsx                # Landing
│
├── features/                   # Domain modules — uma pasta por feature
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── cards/
│   │   ├── cards-view.tsx              # Wrapper SplitPaneView
│   │   ├── components/
│   │   │   ├── card-list.tsx           # Painel esquerdo
│   │   │   ├── bill-list.tsx           # Painel central (faturas)
│   │   │   ├── bill-detail.tsx         # Painel direito (lançamentos)
│   │   │   ├── card-form.tsx
│   │   │   ├── card-visual.tsx         # Cartão estilizado
│   │   │   └── transaction-form.tsx    # Lançamento na fatura
│   │   ├── schemas/card.schema.ts      # Zod
│   │   ├── services/cards.service.ts   # Supabase calls
│   │   ├── stores/cards.store.ts       # Zustand: selected card/bill
│   │   └── types/index.ts
│   ├── goals/
│   │   ├── goals-view.tsx
│   │   ├── components/
│   │   │   ├── goal-list.tsx           # Painel esquerdo
│   │   │   ├── subgoal-detail.tsx      # Painel direito + lista de sub-metas
│   │   │   └── subgoal-form.tsx
│   │   ├── goal-form.tsx
│   │   ├── contribution-form.tsx       # Aporte (legado, separado das sub-metas)
│   │   ├── constants.ts                # GOAL_CATEGORIES (ícone+label+value)
│   │   └── stores/goals.store.ts
│   ├── transactions/
│   ├── investments/
│   ├── couple/
│   ├── dashboard/                      # Cards, gráficos, recents
│   ├── reports/
│   ├── settings/
│   └── landing/
│
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                 # Nav colapsável + tooltips
│   │   └── header.tsx                  # Title + toggle Individual/Casal
│   ├── ui/                             # Primitives shadcn (Button, Dialog, …)
│   └── shared/                         # Building blocks reaproveitáveis
│       ├── confirm-delete-dialog.tsx   # AlertDialog padronizado
│       ├── empty-state.tsx             # Ícone + título + descrição + ação
│       ├── row-actions-menu.tsx        # DropdownMenu de Editar/Remover
│       ├── split-pane-view.tsx         # Layout master-detail responsivo
│       ├── month-selector.tsx
│       └── category-icon.tsx
│
├── hooks/                              # Cross-feature hooks
│   ├── use-zod-form.ts                 # useForm + zodResolver + cast
│   ├── use-toast-mutation.ts           # useMutation + toast + invalidate
│   ├── use-scope-filter.ts             # Individual/Casal scoping
│   └── use-partner.ts                  # Resolve partner do casal ativo
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # createBrowserClient
│   │   ├── server.ts                   # createServerClient (RSC)
│   │   ├── middleware.ts               # updateSession para o proxy
│   │   └── filters.ts                  # applyScopeFilter
│   └── utils.ts                        # cn, formatCurrency, formatDate, …
│
├── providers/                          # Root-level React providers
│   ├── auth-provider.tsx               # Mantém auth.store sincronizada
│   ├── query-provider.tsx              # QueryClientProvider
│   └── theme-provider.tsx              # next-themes
│
├── schemas/                            # Zod (auth, transaction, goal, …)
├── services/                           # Não-feature-specific (accounts, categories, transactions, …)
├── stores/                             # Zustand globais (auth, ui)
├── styles/globals.css                  # Variáveis HSL + dark mode
└── types/index.ts                      # DTOs do domínio
```

```
supabase/migrations/
├── 001_initial_schema.sql              # Schema base + RLS de todas as tabelas
├── 002_credit_cards.sql                # Cartões + faturas + transações
├── 003_add_presente_category.sql
├── 004_fix_invite_rls.sql              # Casal: convite por token
├── 005_partner_transaction_rls.sql     # Parceiro pode lançar pro outro
├── 006_credit_card_partner_and_pet.sql
├── 007_soft_delete_card_transactions.sql # RPC SECURITY DEFINER pra evitar conflito UPDATE+SELECT em RLS
└── 008_goal_subgoals.sql               # Sub-metas com link, valor, completed
```

---

## 5. Funcionalidades

### Autenticação
- Cadastro com confirmação obrigatória de e-mail (tela pós-cadastro mostra "verifique sua caixa de mensagens").
- Login detecta o erro específico `email_not_confirmed` e oferece reenvio do e-mail.
- Reset de senha por link mágico (Supabase Auth).
- Sessão JWT refreshada automaticamente pelo middleware a cada navegação.

### Casal (Duo)
- Convite por **token único** copiável (gerado server-side com `gen_random_bytes`).
- Aceite valida na mão se o aceitante não é o próprio dono do convite ([`coupleService.acceptInvite`](src/services/couple.service.ts)).
- Card "ativos" mostra nome + avatar de ambos os parceiros; fallback fetch direto na tabela `profiles` se o join FK falhar.
- Dissolução do vínculo preserva os dados de cada um (apenas muda `status = "dissolved"`).

### Transações
- CRUD com tipo (income/expense), categoria, conta, data, status, tags.
- Recorrência (daily/weekly/monthly/yearly).
- Lançar para o parceiro (transação aparece na conta dele).
- Soft delete via RPC.
- Listagem por mês com totalizadores Receitas/Despesas separados.

### Cartões de crédito
- Cartões com bandeira, cor, limite, dia de fechamento e dia de vencimento — visual real estilizado.
- Faturas geradas automaticamente por mês ao lançar transações (`findOrCreateBill`).
- **Parcelamento** dispersa N parcelas pelas faturas futuras (uma row por parcela, todas com `installment_group_id`).
- Lançamento como **previsão** (laranja) ou **última parcela** (verde).
- Modo "Dividir com casal" cria duas rows (50/50) com o mesmo `shared_group_id`.
- Modo "Lançar para o parceiro" coloca o valor cheio na fatura dele.
- Totalizadores na fatura: total geral + "sua parte" (quando casal compartilhado).

### Metas
- Metas com cor, categoria (viagem, carro, casa…), prazo, valor alvo.
- **Sub-metas** com título, valor estimado, link externo (normalizado para `https://...`), notas e checkbox de concluído.
- Progresso da meta calculado por contagem de sub-metas concluídas + valor estimado.
- Aporte/contribuição financeira separado da estrutura de sub-metas (legado preservado).

### Investimentos
- Portfólio por classe (renda fixa/variável, crypto, FII, outros) + subcategoria + corretora.
- Cálculo automático de valor investido, valor atual, lucro/prejuízo, rentabilidade %.
- Gráfico de alocação (pie chart) + breakdown por classe.

### Dashboard
- Cards de Receitas / Despesas / Saldo / Investimentos com variação % vs. mês anterior.
- Gráfico de fluxo de caixa (6 meses).
- Breakdown por categoria.
- Cartões de crédito do mês + comparativo.
- Lista de transações recentes (top 5).

### Calendário, Relatórios, Configurações
- Calendário lista transações agrupadas por dia.
- Relatórios: fluxo de 12 meses, breakdown por categoria, summary de investimentos.
- Settings: preferências de tema (light/dark/system).

---

## 6. Segurança

### 6.1 Row Level Security (RLS) — autorização no banco

**Todas** as tabelas têm `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` e políticas explícitas para SELECT/INSERT/UPDATE/DELETE. Mesmo que o cliente envie um filtro malicioso, o PostgreSQL nega.

Exemplo — política da tabela `goals` ([`001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)):

```sql
CREATE POLICY "Users can view own goals" ON goals FOR SELECT
  USING (
    auth.uid() = user_id
    OR (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples
      WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );

CREATE POLICY "Users can manage own goals" ON goals FOR ALL
  USING (auth.uid() = user_id);
```

Tradução: você só vê uma meta se for sua *ou* se ela é compartilhada e você é um dos parceiros do casal dela. Você só pode mutar (insert/update/delete) se for sua. O cliente nunca recebe `service_role` key — só a `anon` key com JWT do usuário.

### 6.2 Middleware de sessão (anti-IDOR via redirect)

[`src/proxy.ts`](src/proxy.ts) intercepta todas as rotas, refresca cookies de sessão Supabase via [`updateSession`](src/lib/supabase/middleware.ts), e:

- Sem sessão acessando rota privada → 302 para `/auth/login?redirectTo=...`
- Com sessão acessando `/auth/*` → 302 para `/dashboard`

Nenhuma página privada chega a executar `fetch` se o usuário não está autenticado.

### 6.3 RPCs SECURITY DEFINER para operações que furam RLS

Algumas operações requerem `UPDATE` seguido de `SELECT` na mesma row e, sob RLS estrita, podem ser bloqueadas. A solução é encapsular em uma `FUNCTION ... SECURITY DEFINER` com checagem explícita de `auth.uid()` lá dentro:

```sql
-- 007_soft_delete_card_transactions.sql
CREATE FUNCTION soft_delete_card_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- roda como dono da função, ignora RLS do caller
AS $$
BEGIN
  -- Mas checa manualmente que o caller é o dono
  IF NOT EXISTS (
    SELECT 1 FROM credit_card_transactions
    WHERE id = p_transaction_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE credit_card_transactions
  SET deleted_at = NOW()
  WHERE id = p_transaction_id;
END;
$$;
```

### 6.4 Validação dupla — client + server

**Client:** todo form passa por Zod ([`useZodForm`](src/hooks/use-zod-form.ts)) — bloqueia envio se inválido, mostra mensagens de erro.

**Server:** o Postgres tem `CHECK` constraints (ex.: `amount > 0`, `closing_day BETWEEN 1 AND 31`, `status IN ('open','closed',…)`). Mesmo que o cliente bypasse o Zod, o banco recusa.

```sql
-- 002_credit_cards.sql
CREATE TABLE credit_card_transactions (
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  ...
);
```

### 6.5 Segredos no ambiente

`.env.local` (gitignored) contém `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. A chave `anon` é segura para o client — RLS faz o gating. **A `service_role` key nunca aparece em código frontend.** Apenas migrations/seeds locais ou Edge Functions podem usá-la.

### 6.6 Boas práticas adicionais
- Senhas: mínimo 8 caracteres + ao menos uma maiúscula + ao menos um número ([`registerSchema`](src/schemas/auth.ts)).
- Links externos em sub-metas: renderizados com `rel="noopener noreferrer"` + `target="_blank"`.
- E-mails: confirmação obrigatória; tentativas de login com e-mail não confirmado mostram aviso específico em vez de "credenciais inválidas" genéricas.
- Soft delete em vez de `DELETE` na maioria dos casos (`deleted_at` ou `status = 'cancelled'`).

---

## 7. Padrões de código

### 7.1 Feature-first folder structure

Cada domínio mora em `src/features/<feature>/` com sua própria estrutura interna (components, services, schemas, stores, types). Componentes cross-feature ficam em `src/components/shared/`. Hooks transversais em `src/hooks/`. Isso permite arrancar uma feature inteira sem rasgar o resto do projeto.

### 7.2 Hook `useZodForm` — esconde o `as any` do resolver

**Arquivo:** [`src/hooks/use-zod-form.ts`](src/hooks/use-zod-form.ts)

```ts
export function useZodForm<S extends z.ZodTypeAny, V extends FieldValues = ZodSchemaInput<S>>(
  schema: S,
  options?: Omit<UseFormProps<V>, "resolver">,
): UseFormReturn<V> {
  return useForm<V>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    ...options,
  });
}
```

**Uso real** ([`src/features/auth/login-form.tsx`](src/features/auth/login-form.tsx)):

```ts
const { register, handleSubmit, formState: { errors, isSubmitting } } = useZodForm(loginSchema);
```

Antes: ~7 linhas com `useForm`, `zodResolver`, comment `eslint-disable`, e `as any`. Agora: 1 linha.

### 7.3 Hook `useToastMutation` — boilerplate zero em mutations

**Arquivo:** [`src/hooks/use-toast-mutation.ts`](src/hooks/use-toast-mutation.ts)

Wrapper sobre `useMutation` que aceita `successMessage`, `errorMessage` e `invalidateKeys[]`.

**Uso real** ([`src/features/goals/components/subgoal-form.tsx`](src/features/goals/components/subgoal-form.tsx)):

```ts
const mutation = useToastMutation({
  mutationFn: async (data) => goalsService.createSubgoal({ goal_id, user_id, ...data }),
  invalidateKeys: [["subgoals", goalId], ["goals"]],
  successMessage: subgoal ? "Sub-meta atualizada!" : "Sub-meta criada!",
  errorMessage: "Erro ao salvar sub-meta",
  onSuccess: () => onSuccess?.(),
});
```

### 7.4 Hook `useScopeFilter` — padronização do escopo Individual/Casal

**Arquivo:** [`src/hooks/use-scope-filter.ts`](src/hooks/use-scope-filter.ts)

```ts
export function useScopeFilter() {
  const { user, couple } = useAuthStore();
  const { viewMode } = useUIStore();
  const isShared = viewMode === "couple" && !!couple;
  const scopeKey = isShared && couple ? `couple:${couple.id}` : `user:${user?.id ?? ""}`;
  return { user, couple, viewMode, isShared, scopeKey };
}
```

**Uso real** ([`src/features/dashboard/recent-transactions.tsx`](src/features/dashboard/recent-transactions.tsx)):

```ts
const { user, couple, isShared, scopeKey } = useScopeFilter();

const { data } = useQuery({
  queryKey: ["transactions-recent", scopeKey],  // <- invalida automaticamente quando toggle muda
  queryFn: () => transactionsService.getTransactions(user!.id, couple?.id ?? null, {}, ..., isShared),
  enabled: !!user,
});
```

### 7.5 Helper `applyScopeFilter` — filtro SQL único

**Arquivo:** [`src/lib/supabase/filters.ts`](src/lib/supabase/filters.ts)

Centraliza a expressão `or("user_id.eq.X,and(is_shared.eq.true,couple_id.eq.Y)")` em 7 services.

**Uso real** ([`src/services/goals.service.ts`](src/services/goals.service.ts)):

```ts
async getGoals(userId, coupleId, isShared = false) {
  let query = supabase.from("goals").select("*").neq("status", "cancelled");
  query = applyScopeFilter(query, { userId, coupleId, isShared });
  const { data, error } = await query;
  if (error) throw error;
  return data as Goal[];
}
```

### 7.6 Componente `SplitPaneView` — layouts master-detail

**Arquivo:** [`src/components/shared/split-pane-view.tsx`](src/components/shared/split-pane-view.tsx)

Grid horizontal no desktop + tabs no mobile, com larguras por pane.

**Uso real** ([`src/features/cards/cards-view.tsx`](src/features/cards/cards-view.tsx)):

```tsx
<SplitPaneView
  panes={[
    { id: "cards",  label: "Cartões",     width: "280px", content: <CardList /> },
    { id: "bills",  label: "Faturas",     width: "260px", content: <BillList /> },
    { id: "detail", label: "Lançamentos", width: "1fr",   content: <BillDetail /> },
  ]}
/>
```

Antes: ~30 linhas de JSX duplicadas entre cards-view e goals-view. Agora: 1 import.

### 7.7 Componente `ConfirmDeleteDialog` — confirmações consistentes

**Arquivo:** [`src/components/shared/confirm-delete-dialog.tsx`](src/components/shared/confirm-delete-dialog.tsx)

**Uso real** ([`src/features/goals/components/goal-list.tsx`](src/features/goals/components/goal-list.tsx)):

```tsx
<ConfirmDeleteDialog
  open={!!deleteGoal}
  onOpenChange={(o) => !o && setDeleteGoal(null)}
  title="Cancelar meta"
  confirmLabel="Cancelar meta"
  isPending={deleteMutation.isPending}
  description={<>Tem certeza que deseja cancelar <strong>{deleteGoal?.title}</strong>?</>}
  onConfirm={() => deleteGoal && deleteMutation.mutate(deleteGoal.id)}
/>
```

### 7.8 Componente `RowActionsMenu` — dropdown Editar/Remover

**Arquivo:** [`src/components/shared/row-actions-menu.tsx`](src/components/shared/row-actions-menu.tsx)

**Uso real** ([`src/features/goals/components/subgoal-detail.tsx`](src/features/goals/components/subgoal-detail.tsx)):

```tsx
<RowActionsMenu
  actions={[
    { label: "Editar",  icon: Pencil, onClick: onEdit },
    { label: "Remover", icon: Trash2, destructive: true, onClick: onDelete },
  ]}
/>
```

### 7.9 Convenções de queryKey

Toda query usa o padrão `["resource", scopeKey, ...filters]` — invalidar `["resource"]` invalida todas as variantes; passar o `scopeKey` faz com que mudar de Individual para Casal re-fetche tudo automaticamente.

### 7.10 Tipos compartilhados

Tipos do domínio ([`src/types/index.ts`](src/types/index.ts)) são a fonte da verdade — services retornam o tipo, components consomem o tipo, Zod schemas têm input/output que batem com ele.

### 7.11 Estilo: cores via HSL custom

Em [`src/styles/globals.css`](src/styles/globals.css), todas as cores são tokens HSL:

```css
.dark {
  --primary: 262 83% 65%;
  --success: 142 70% 45%;
  --expense: 0 62.8% 50%;
  ...
}
```

Componentes consomem com `bg-primary`, `text-success`, `bg-[hsl(var(--success)/0.1)]` para opacidades arbitrárias. Trocar a paleta inteira do app é um arquivo.

---

## 8. Setup local

```bash
# Pré-requisitos: Node 20+, npm, conta no Supabase

git clone <repo-url>
cd fintrackerapp
npm install
cp .env.example .env.local
# Preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

npm run dev    # http://localhost:3000
```

**Variáveis de ambiente** ([`.env.example`](.env.example)):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000   # ou domínio Vercel em prod
```

**Scripts:**

| Comando | Ação |
|---|---|
| `npm run dev` | Dev server com hot reload (Turbopack) |
| `npm run build` | Build de produção (gera `.next/`) |
| `npm run start` | Servidor production a partir do build |
| `npm run lint` | ESLint |

---

## 9. Deploy (Vercel + Supabase)

1. **Supabase:** crie o projeto, copie URL e `anon key`, e rode as migrations em ordem (ver [seção 10](#10-migrations-supabase)).
2. **Vercel:** importe o repositório. Adicione as três env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app`).
3. **Supabase → Auth → URL Configuration:** adicione `https://seu-dominio.vercel.app/auth/callback` em "Redirect URLs". Sem isso, o link de confirmação de e-mail e o reset de senha caem em URL errada.
4. **Deploy.** A primeira build deve passar com 18 rotas (15 static + 1 dynamic + middleware proxy).

Validação local antes do push: `npm run build` deve terminar com `✓ Compiled successfully`.

---

## 10. Migrations (Supabase)

Rode em ordem na Supabase SQL Editor (ou via `supabase db push` se usando CLI):

| # | Arquivo | O que faz |
|---|---|---|
| 001 | `001_initial_schema.sql` | Tabelas base (profiles, couples, accounts, transactions, goals, …) + RLS + categorias seed |
| 002 | `002_credit_cards.sql` | Cartões + faturas + transações de cartão + RLS |
| 003 | `003_add_presente_category.sql` | Seed de categoria "Presente" |
| 004 | `004_fix_invite_rls.sql` | Corrige RLS de aceitar convite por token |
| 005 | `005_partner_transaction_rls.sql` | Permite lançar transação na conta do parceiro |
| 006 | `006_credit_card_partner_and_pet.sql` | Lançamento de cartão para parceiro + categoria pet |
| 007 | `007_soft_delete_card_transactions.sql` | RPCs SECURITY DEFINER pra soft delete |
| 008 | `008_goal_subgoals.sql` | **Sub-metas** com link, valor, completed + RLS + trigger de `completed_at` |

---

<div align="center">

Feito com Next.js, Supabase e atenção aos detalhes.

</div>
