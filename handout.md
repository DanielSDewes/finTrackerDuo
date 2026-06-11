# finTrackerDuo — Handout Técnico

> Documento de referência arquitetural, regras de negócio, padrões de desenvolvimento e contexto persistente para IA.
> Versão: 1.0 — Maio 2026

---

## Índice

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Objetivos do Produto](#2-objetivos-do-produto)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Padrões de Código](#5-padrões-de-código)
6. [Padrões de UI/UX](#6-padrões-de-uiux)
7. [Sistema de Autenticação](#7-sistema-de-autenticação)
8. [Sistema de Casal](#8-sistema-de-casal)
9. [Estrutura do Banco de Dados](#9-estrutura-do-banco-de-dados)
10. [Regras Financeiras](#10-regras-financeiras)
11. [Sistema de Cartões de Crédito](#11-sistema-de-cartões-de-crédito)
12. [Sistema de Investimentos](#12-sistema-de-investimentos)
13. [Dashboard](#13-dashboard)
14. [Performance](#14-performance)
15. [Segurança](#15-segurança)
16. [Qualidade de Código](#16-qualidade-de-código)
17. [Regras para IA](#17-regras-para-ia)
18. [Roadmap Futuro](#18-roadmap-futuro)
19. [Filosofia do Produto](#19-filosofia-do-produto)

---

## 1. Visão Geral do Projeto

### 1.1 Propósito

O **finTrackerDuo** é um SaaS financeiro moderno projetado para indivíduos e casais que desejam controle total sobre suas finanças pessoais e compartilhadas. O sistema vai além de um simples registro de gastos — ele oferece visão analítica, previsão de saldo, controle de cartões de crédito com parcelamentos, gestão de investimentos e metas financeiras, tudo em uma interface premium e intuitiva.

O nome "Duo" reflete o diferencial central do produto: a capacidade de dois usuários conectados (um casal, sócios, familiares) gerenciarem finanças de forma conjunta, mantendo ao mesmo tempo total isolamento e privacidade dos dados individuais de cada um.

### 1.2 Público-Alvo

| Perfil | Descrição |
|---|---|
| **Casal jovem** | 25–40 anos, renda dupla, primeira casa, planejamento financeiro conjunto |
| **Profissional individual** | Freelancer ou CLT que deseja controle granular das finanças pessoais |
| **Investidor iniciante** | Quer acompanhar patrimônio, dividendos e evolução ao longo do tempo |
| **Família pequena** | Dois adultos gerenciando despesas domésticas, cartões e metas compartilhadas |

### 1.3 Diferenciais

- **Modo Duo nativo**: o vínculo entre dois usuários é uma feature de primeira classe, não um add-on
- **Rateio inteligente**: transações e cartões podem ser divididos 50/50 automaticamente entre o casal
- **Cartões com faturas reais**: o sistema simula exatamente como funciona uma fatura de cartão — fechamento, vencimento, parcelamentos em faturas futuras
- **Integração no Dashboard**: faturas de cartão são automaticamente somadas às despesas do mês correto
- **Visual premium**: experiência inspirada em Linear, Stripe e Revolut — minimalista, rápida e confiável
- **Sem server customizado**: toda a lógica de backend roda via Supabase (PostgreSQL + RLS + Auth), eliminando custos de infraestrutura própria

### 1.4 Conceito do Sistema de Casal

O casal no finTrackerDuo funciona como um **escopo financeiro compartilhado opcional**. Cada usuário possui seus dados individuais intactos. Quando dois usuários se vinculam:

- Dados marcados como `is_shared = true` ficam visíveis para ambos
- O dashboard pode alternar entre visão **Individual** e visão **Casal** via toggle
- Cartões, transações e metas podem ser criados como compartilhados ou privados
- O vínculo pode ser encerrado sem perda de dados — cada um mantém o que é seu

---

## 2. Objetivos do Produto

### 2.1 Problemas Resolvidos

| Problema | Solução finTrackerDuo |
|---|---|
| Casais sem visão consolidada das finanças | Dashboard compartilhado com toggle Individual/Casal |
| Controle manual de parcelas de cartão | Sistema automático de faturas com geração de parcelas futuras |
| Gastos de cartão ignorados no orçamento mensal | Faturas de cartão integradas ao total de despesas do dashboard |
| Perda de contexto ao trocar de mês | Seletor de mês persistente; todos os dados se recalculam ao mudar |
| Rateio informal entre parceiros | Transações divididas automaticamente com `shared_group_id` |
| Dados misturados ao terminar relacionamento | Cada dado tem `user_id` como ownership; desvinculação não apaga nada |

### 2.2 Experiência Desejada

O usuário deve abrir o app e em menos de 5 segundos entender:
- Quanto entrou e saiu no mês
- Quanto tem nos cartões de crédito para pagar
- Se está no positivo ou negativo
- O que seu(sua) parceiro(a) gastou (modo casal)

A experiência deve transmitir **confiança e clareza** — como olhar para um painel de instrumentos bem calibrado.

### 2.3 Visão de Escalabilidade

- Multi-tenant por design: cada usuário é isolado via RLS no PostgreSQL
- Zero backend próprio: Supabase gerencia auth, banco e realtime
- Deploy em Vercel com CI/CD automático via GitHub
- Estrutura preparada para Edge Functions quando lógica server-side for necessária
- Arquitetura de features modular: adicionar um novo módulo não impacta os existentes

### 2.4 Visão Mobile-First

Toda interface foi construída com breakpoints mobile como ponto de partida:
- Layouts 1 coluna em mobile, expandindo para 2-3 colunas em desktop
- Painéis de 3 colunas (ex: módulo de cartões) colapsam em tabs no mobile
- Sidebar colapsa em overlay mobile com botão de hamburger no header
- Todos os touch targets têm mínimo de 44px de altura

---

## 3. Arquitetura do Sistema

### 3.1 Visão Macro

```
┌─────────────────────────────────────────────┐
│                   Vercel                     │
│  ┌─────────────────────────────────────────┐ │
│  │         Next.js App Router              │ │
│  │  ┌──────────┐  ┌──────────┐            │ │
│  │  │  Pages   │  │   API    │            │ │
│  │  │ (RSC/CC) │  │  Routes  │            │ │
│  │  └──────────┘  └──────────┘            │ │
│  │  ┌──────────────────────────────────┐  │ │
│  │  │     Client Components            │  │ │
│  │  │  TanStack Query + Zustand        │  │ │
│  │  └──────────────────────────────────┘  │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────┐
│                  Supabase                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │   Auth   │ │ PostgREST│ │  Realtime   │ │
│  │  (JWT)   │ │  (REST)  │ │ (WebSocket) │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │         PostgreSQL + RLS                │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 3.2 Arquitetura Frontend

O frontend segue o modelo **App Router do Next.js 15** com a seguinte divisão:

- **Server Components (RSC)**: páginas estáticas, layouts, metadados — sem estado, sem hooks
- **Client Components (`"use client"`)**: toda interatividade, formulários, queries TanStack, stores Zustand
- **Route Groups**: `(app)` para área autenticada, `auth` para login/registro, separados por layout próprio

O estado da aplicação é dividido em dois níveis:
- **Estado do servidor**: gerenciado por TanStack Query (cache, refetch, mutations)
- **Estado do cliente**: gerenciado por Zustand (UI state, user session, preferências)

### 3.3 Fluxo de Autenticação

```
1. Usuário acessa qualquer rota
2. proxy.ts intercepta a requisição
3. Verifica sessão Supabase via cookie
4. Se não autenticado → redirect /auth/login
5. Se autenticado → AuthProvider carrega profile + couple
6. Stores Zustand são populados (user, couple)
7. TanStack Query inicia fetches com user.id disponível
```

**Importante:** o projeto usa `src/proxy.ts` em vez de `middleware.ts` por questão de compatibilidade com a versão do Next.js em uso. O comportamento é idêntico ao middleware padrão.

### 3.4 Comunicação com Supabase

Todo acesso ao banco é feito via **Supabase JS Client** (`@supabase/supabase-js`):

- Client-side: `createClient()` do `@/lib/supabase/client` — usa cookies de sessão
- Server-side: `createServerClient()` do `@/lib/supabase/server` — para RSC e API routes
- Middleware: `createMiddlewareClient()` do `@/lib/supabase/middleware`

Não existe ORM (Prisma, Drizzle). Todo acesso é via PostgREST (query builder do SDK) ou SQL direto via `supabase.rpc()` para operações que precisam de SECURITY DEFINER.

### 3.5 Gerenciamento de Estado

```
┌─────────────────────────────────────────────┐
│              Zustand Stores                  │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │  auth.store  │  │      ui.store        │ │
│  │  user        │  │  selectedMonth       │ │
│  │  couple      │  │  viewMode (ind/duo)  │ │
│  │  isLoading   │  │  sidebarCollapsed    │ │
│  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────────────────────────────┐   │
│  │         cards.store (UI-only)        │   │
│  │  selectedCardId / selectedBillId     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           TanStack Query Cache               │
│  ["transactions", ...]                       │
│  ["monthly-stats", ...]                      │
│  ["cards", ...]                              │
│  ["cards", "summary", ...]                   │
│  ["bills", cardId]                           │
│  ["card-transactions", billId]               │
│  ["categories", ...]                         │
│  ["couple", userId]                          │
└─────────────────────────────────────────────┘
```

**Regra**: dados que chegam do servidor ficam no TanStack Query. Dados de UI (o que está selecionado, se o sidebar está aberto) ficam no Zustand.

### 3.6 Separação de Responsabilidades

| Camada | Responsabilidade |
|---|---|
| `page.tsx` | Apenas renderiza a View. Sem lógica, sem queries. |
| `*-view.tsx` | Orquestra queries, estado local e composição de componentes |
| `components/` | Componentes puros de UI, recebem props, sem queries diretas |
| `services/*.service.ts` | Acesso ao banco. Retorna dados tipados. Sem estado. |
| `stores/*.store.ts` | Estado global de UI e sessão. Sem chamadas de rede. |
| `schemas/*.ts` | Validação Zod. Fonte de verdade dos tipos de formulário. |

---

## 4. Estrutura de Pastas

```
fintrackerapp/
├── public/                     # Assets estáticos (favicon, imagens)
├── supabase/
│   ├── migrations/             # SQL de criação das tabelas (executar em ordem)
│   │   ├── 001_initial_schema.sql
│   │   └── 002_credit_cards.sql
│   └── fix_*.sql               # Scripts de correção de RLS e funções
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/              # Área autenticada (tem Sidebar + Header)
│   │   │   ├── layout.tsx      # Layout com Sidebar
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── cards/
│   │   │   ├── investments/
│   │   │   ├── goals/
│   │   │   ├── reports/
│   │   │   ├── couple/
│   │   │   ├── settings/
│   │   │   └── calendar/
│   │   ├── auth/               # Área pública de autenticação
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── reset-password/
│   │   │   └── callback/       # OAuth callback do Supabase
│   │   ├── globals.css         # Variáveis CSS e tokens de design
│   │   ├── layout.tsx          # Root layout (Providers)
│   │   └── page.tsx            # Landing page pública
│   ├── components/
│   │   ├── layout/             # Sidebar, Header — estrutura da aplicação
│   │   ├── shared/             # Componentes reutilizáveis entre features
│   │   │   ├── month-selector.tsx
│   │   │   └── category-icon.tsx
│   │   └── ui/                 # Shadcn/UI customizados (button, input, dialog...)
│   ├── features/               # Módulos de domínio
│   │   ├── auth/               # Formulários de login e registro
│   │   ├── cards/              # Módulo completo de cartões de crédito
│   │   │   ├── components/     # CardVisual, CardForm, BillList, BillDetail, etc.
│   │   │   ├── services/       # cards.service.ts
│   │   │   ├── schemas/        # card.schema.ts (Zod)
│   │   │   ├── stores/         # cards.store.ts (UI state)
│   │   │   ├── types/          # index.ts (CreditCard, Bill, Transaction types)
│   │   │   └── cards-view.tsx  # Orquestrador do módulo
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── transactions/       # Listagem e formulário de transações
│   │   ├── investments/        # Gestão de investimentos
│   │   ├── goals/              # Metas financeiras
│   │   ├── reports/            # Relatórios e gráficos
│   │   ├── couple/             # Vínculo e gestão do casal
│   │   ├── settings/           # Configurações do usuário
│   │   └── landing/            # Landing page
│   ├── lib/
│   │   ├── supabase/           # Clientes Supabase (client, server, middleware)
│   │   └── utils.ts            # cn(), formatCurrency(), formatDate(), calculateChange()
│   ├── providers/              # React context providers (Auth, Query, Theme)
│   ├── schemas/                # Schemas Zod globais (transaction, auth, goal...)
│   ├── services/               # Services globais (transactions, categories, accounts...)
│   ├── stores/                 # Stores Zustand globais (auth.store, ui.store)
│   ├── styles/                 # CSS adicional
│   ├── types/                  # Tipos TypeScript globais (index.ts)
│   └── proxy.ts                # Proteção de rotas (equivalente ao middleware.ts)
├── .env.local                  # Variáveis de ambiente (NUNCA commitar)
├── .env.example                # Template de variáveis (commitar)
├── tailwind.config.ts
├── next.config.ts
└── tsconfig.json
```

### 4.1 Convenção de Módulos em `features/`

Cada feature é um módulo autossuficiente:

```
features/cards/
├── components/       # Componentes internos do módulo
├── services/         # Acesso ao banco específico do módulo
├── schemas/          # Zod schemas do módulo
├── stores/           # Estado de UI do módulo (se necessário)
├── types/            # Tipos do domínio do módulo
└── cards-view.tsx    # Entry point do módulo (importado pelo page.tsx)
```

O `page.tsx` em `app/(app)/cards/page.tsx` **apenas** importa e renderiza o `cards-view.tsx`. Nenhuma lógica de negócio vive no `page.tsx`.

---

## 5. Padrões de Código

### 5.1 Nomenclatura

| Tipo | Convenção | Exemplo |
|---|---|---|
| Componentes React | PascalCase | `CardVisual`, `BillDetail` |
| Funções utilitárias | camelCase | `formatCurrency`, `calculateChange` |
| Services | camelCase objeto | `cardsService.getCards()` |
| Stores Zustand | camelCase com prefixo `use` | `useCardsStore`, `useAuthStore` |
| Schemas Zod | camelCase com sufixo `Schema` | `creditCardSchema`, `transactionSchema` |
| Tipos TypeScript | PascalCase | `CreditCard`, `BillStatus` |
| Arquivos de componente | kebab-case | `card-visual.tsx`, `bill-detail.tsx` |
| Arquivos de serviço | kebab-case com `.service` | `cards.service.ts` |
| Arquivos de store | kebab-case com `.store` | `cards.store.ts` |

### 5.2 Tipagem TypeScript

```typescript
// ✅ Sempre usar z.output<> para tipos de formulário
export type CreditCardInput = z.output<typeof creditCardSchema>;

// ✅ Tipos de domínio definidos explicitamente em types/index.ts
export type CreditCard = {
  id: string;
  user_id: string;
  couple_id: string | null;
  // ...
};

// ✅ Usar as any apenas quando necessário (zodResolver tem incompatibilidade conhecida)
resolver: zodResolver(schema) as any,

// ❌ Nunca usar any sem justificativa
const data: any = await fetch(...);
```

### 5.3 Organização de Componentes

```typescript
// Ordem dentro de um componente:
// 1. Imports
// 2. Tipos locais
// 3. Constantes fora do componente
// 4. Props type
// 5. Função do componente
//   a. Stores e contexts
//   b. State local (useState)
//   c. Queries e mutations (TanStack)
//   d. Computed values (useMemo/derivações diretas)
//   e. Handlers
//   f. Effects (useEffect)
//   g. Render (return JSX)
```

### 5.4 Padrão de Queries TanStack

```typescript
// Query key deve ser estável e incluir todos os parâmetros relevantes
const { data, isLoading } = useQuery({
  queryKey: ["cards", user?.id, couple?.id, isShared],
  queryFn: () => cardsService.getCards(user!.id, couple?.id ?? null, isShared),
  enabled: !!user,         // Sempre guardar com enabled quando depende de user
  staleTime: 60_000,       // 1 minuto para dados que mudam pouco
});

// Mutations sempre invalidam as queries relacionadas
const mutation = useMutation({
  mutationFn: (data) => cardsService.createCard(data, user!.id, couple?.id ?? null),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["cards"] });
    // Invalidação por prefixo: ["cards"] invalida ["cards", "summary", ...] também
    toast.success("Cartão criado!");
    onSuccess?.();
  },
  onError: () => toast.error("Erro ao criar cartão"),
});
```

### 5.5 Padrão de Services

```typescript
// Services são objetos com métodos async
// Sempre recebem userId/coupleId como parâmetro (nunca acessam store dentro)
// Sempre lançam o erro para o TanStack Query tratar
export const cardsService = {
  async getCards(userId: string, coupleId: string | null, isShared = false) {
    const supabase = createClient();
    const { data, error } = await query;
    if (error) throw error;
    return data as CreditCard[];
  },
};
```

### 5.6 Comentários

Comentários **não** devem descrever o que o código faz (o código já diz). Devem explicar apenas:
- Por que uma decisão não-óbvia foi tomada
- Workarounds para bugs específicos de bibliotecas
- Invariantes sutis que um futuro dev poderia quebrar sem saber

```typescript
// ✅ Comentário válido: explica um invariante não-óbvio
// RLS: UPDATE policies com USING (deleted_at IS NULL) bloqueiam soft-delete
// porque PostgreSQL reavalia USING como WITH CHECK após a mutation.
// Solução: função SECURITY DEFINER que bypassa RLS mantendo segurança.

// ❌ Comentário inútil
// Busca os cartões do usuário
const cards = await cardsService.getCards(userId);
```

---

## 6. Padrões de UI/UX

### 6.1 Sistema de Cores (CSS Custom Properties)

Todas as cores são definidas em `src/app/globals.css` como variáveis HSL e usadas via `hsl(var(--variable))`:

```css
/* Cores semânticas principais */
--primary            /* Azul/índigo — ações principais */
--success            /* Verde — receitas, positivo */
--expense            /* Vermelho — despesas, negativo */
--warning            /* Âmbar — alertas */
--destructive        /* Vermelho escuro — ações destrutivas */
--muted              /* Cinza claro — backgrounds secundários */
--muted-foreground   /* Cinza médio — textos secundários */
--border             /* Cor da borda padrão */
--card               /* Background de cards */
--popover            /* Background de dropdowns/modais */
--background         /* Background da página */
```

**Tailwind v4 — regra crítica:** as cores customizadas do `tailwind.config.ts` podem não gerar utilities automaticamente. Sempre usar o padrão direto:

```tsx
// ✅ Correto — funciona sempre
className="text-[hsl(var(--success))]"
className="bg-[hsl(var(--expense)/0.1)]"
className="border-[hsl(var(--primary)/0.3)]"

// ❌ Pode falhar no Tailwind v4
className="text-success"
className="bg-expense/10"
```

### 6.2 Identidade Visual

Inspiração: **Linear + Stripe + Revolut**

- **Minimalismo funcional**: cada elemento na tela tem um propósito claro
- **Dark mode**: o app é dark-first; light mode como alternativa
- **Tipografia**: sans-serif limpa, hierarquia clara (3xl bold para valores, sm para labels)
- **Bordas**: sutis (`border-border/50`), nunca grossas
- **Sombras**: usadas com parcimônia, apenas para elevar modais e cards ativos
- **Espaçamento**: grid de 4px (`p-4`, `gap-4`, `space-y-4`)

### 6.3 Componentes Base

**Cards financeiros:**
```tsx
<Card className="border-[hsl(var(--success)/0.3)] hover:border-[hsl(var(--success)/0.5)] transition-colors">
  <CardContent className="p-5">
    <p className="text-sm text-muted-foreground font-medium">Label</p>
    <p className="text-3xl font-bold text-[hsl(var(--success))]">R$ 1.234,56</p>
    <p className="text-xs text-muted-foreground mt-1.5">Subtexto contextual</p>
  </CardContent>
</Card>
```

**Badges de status:**
```tsx
// Usar Badge com variant ou className de cor semântica
<Badge variant="outline" className="text-[10px] py-0 h-4">cartão</Badge>
```

**Inputs de formulário:**
```tsx
// Sempre com Label + mensagem de erro abaixo
<div className="space-y-2">
  <Label htmlFor="field">Label</Label>
  <Input id="field" error={!!errors.field} {...register("field")} />
  {errors.field && <p className="text-xs text-destructive">{errors.field.message}</p>}
</div>
```

### 6.4 Animações

Framer Motion é usado para:
- Entrada de elementos principais (`opacity: 0 → 1`, `y: 16 → 0`)
- Sidebar collapse/expand
- Transições de listas com `AnimatePresence`

```tsx
// Padrão de entrada de seção
<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
```

Animações devem ser **sutis e rápidas** (200–300ms). Nunca devem bloquear interação.

### 6.5 Responsividade

| Breakpoint | Layout |
|---|---|
| `< 768px` (mobile) | 1 coluna, sidebar em overlay, tabs em vez de painéis |
| `768px–1024px` (tablet) | 2 colunas, sidebar colapsada |
| `> 1024px` (desktop) | 3 colunas, sidebar expandida |

```tsx
// Padrão de grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 6.6 Skeletons e Loading States

Todo componente que carrega dados deve ter skeleton:
```tsx
{isLoading ? (
  <Skeleton className="h-8 w-36" />
) : (
  <p>{data.value}</p>
)}
```

Nunca usar spinners soltos sem contexto. Prefira skeletons que espelham o layout real.

---

## 7. Sistema de Autenticação

### 7.1 Fluxo Completo

```
Registro → Supabase Auth → trigger cria profile → redirect /dashboard
Login    → Supabase Auth → cookie de sessão   → redirect /dashboard
Logout   → supabase.auth.signOut()            → redirect /
Recover  → Supabase envia email               → link abre /auth/reset-password
```

### 7.2 Proteção de Rotas

O arquivo `src/proxy.ts` intercepta todas as requisições:

```typescript
// Rotas protegidas: qualquer rota sob /(app)/
// Sem sessão → redirect /auth/login
// Com sessão → passa normalmente
```

A sessão é mantida via cookie `HttpOnly` gerenciado pelo Supabase. Não existe JWT manual no frontend.

### 7.3 AuthProvider

`src/providers/auth-provider.tsx` roda no client e:
1. Subscreve ao `onAuthStateChange` do Supabase
2. Quando há sessão, busca o `profile` e o `couple` do usuário
3. Popula `useAuthStore` com `user` e `couple`
4. Qualquer componente pode acessar `const { user, couple } = useAuthStore()`

### 7.4 Row Level Security (RLS)

**Regra fundamental**: nenhum dado é acessível sem RLS correspondente. Todo `SELECT`, `INSERT`, `UPDATE` e `DELETE` é validado pelo PostgreSQL antes de chegar na aplicação.

```sql
-- Padrão de política ownership
CREATE POLICY "Users can view own records" ON tabela FOR SELECT
  USING (auth.uid() = user_id);

-- Padrão para dados do casal (shared + own)
CREATE POLICY "Users can view own or shared" ON tabela FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );
```

### 7.5 Soft Delete e RLS

**Problema conhecido**: políticas `FOR ALL USING (deleted_at IS NULL)` bloqueiam soft-deletes porque o PostgreSQL reavalia a cláusula `USING` como `WITH CHECK` após a mutation — fazendo o registro atualizado falhar na validação (pois `deleted_at` não é mais `NULL`).

**Solução**: usar função `SECURITY DEFINER` via `supabase.rpc()` para operações de soft-delete que precisam mudar o `deleted_at`:

```sql
CREATE OR REPLACE FUNCTION soft_delete_transaction(transaction_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE transactions
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = transaction_id AND user_id = auth.uid() AND deleted_at IS NULL;
END; $$;
```

---

## 8. Sistema de Casal

### 8.1 Estrutura de Vínculo

```sql
CREATE TABLE couples (
  id           UUID PRIMARY KEY,
  owner_id     UUID REFERENCES profiles(id),  -- quem criou o convite
  partner_id   UUID REFERENCES profiles(id),  -- quem aceitou
  status       TEXT -- 'pending' | 'active' | 'dissolved'
  invite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invite_email TEXT,
);
```

### 8.2 Fluxo de Convite

```
1. Pessoa A → /couple → "Convidar parceiro(a)" → insere email → cria registro couples (status: pending)
2. Banco gera invite_token automaticamente (DEFAULT gen_random_bytes)
3. App gera link: https://app.vercel.app/invite/{token}
4. Pessoa A envia link para Pessoa B (WhatsApp, email, etc.)
5. Pessoa B → cria conta (se não tiver) → /couple → "Aceitar convite" → cola o token
6. coupleService.acceptInvite() → UPDATE couples SET partner_id = B.id, status = 'active'
7. Ambos agora veem o toggle Individual/Casal no header
```

### 8.3 Modos de Visão

O `useUIStore` mantém `viewMode: "individual" | "couple"`. O toggle no Header altera este valor.

Quando `viewMode === "couple"`:
- Queries incluem `isShared = true` e filtram por `couple_id`
- Dashboard soma receitas e despesas de ambos os usuários que marcaram `is_shared = true`
- Novas transações/cartões têm `is_shared` ativado por padrão no formulário

### 8.4 Ownership e Isolamento

Cada registro financeiro tem:
- `user_id`: dono do registro — imutável
- `couple_id`: referência ao casal — opcional, permite visibilidade compartilhada
- `is_shared`: controla se o parceiro pode ver

**Regra**: ao dissolver o casal, os dados de cada um permanecem intactos sob seu `user_id`. O `couple_id` fica como referência histórica; apenas o `status` do casal muda para `dissolved`.

### 8.5 Rateio (Split)

Para transações de cartão divididas 50/50:

```typescript
// splitTransaction() cria dois registros com o mesmo shared_group_id
const sharedGroupId = crypto.randomUUID();
const half = +(amount / 2).toFixed(2);

// Insere uma transação para userId e outra para partnerId
// Ambas com shared_group_id, is_shared: true, amount: half
```

O `shared_group_id` permite identificar e remover as duas partes de um rateio juntas.

---

## 9. Estrutura do Banco de Dados

### 9.1 Tabelas Principais

```
profiles              → dados do usuário (espelho do auth.users)
couples               → vínculo entre dois usuários
categories            → categorias de transação e/ou cartão (padrão + cadastradas pelo usuário)
transactions          → movimentações financeiras (receitas/despesas)
credit_cards          → cartões de crédito cadastrados
credit_card_bills     → faturas mensais de cada cartão
credit_card_transactions → lançamentos nas faturas
investments           → ativos financeiros
goals                 → metas financeiras
goal_contributions    → aportes a cada meta
```

### 9.2 Convenções do Banco

| Campo | Tipo | Regra |
|---|---|---|
| `id` | `UUID DEFAULT uuid_generate_v4()` | Toda tabela |
| `user_id` | `UUID REFERENCES profiles(id)` | Ownership |
| `couple_id` | `UUID REFERENCES couples(id) ON DELETE SET NULL` | Opcional, para dados compartilhados |
| `is_shared` | `BOOLEAN DEFAULT FALSE` | Visibilidade para parceiro |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | Toda tabela |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | Toda tabela (trigger automático) |
| `deleted_at` | `TIMESTAMPTZ` | Tabelas com soft delete |

### 9.3 Trigger de updated_at

```sql
-- Aplicado a todas as tabelas via trigger
CREATE TRIGGER trg_tabela_updated_at
  BEFORE UPDATE ON tabela
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

### 9.4 Soft Delete

Tabelas que usam soft delete: `transactions`, `credit_card_transactions`.

- Registros nunca são `DELETE`d
- `deleted_at` é preenchido com `NOW()` ao "excluir"
- Todas as queries filtram `WHERE deleted_at IS NULL`
- A política RLS de SELECT filtra `.is("deleted_at", null)`

### 9.5 Índices Críticos

```sql
-- Transações
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at);

-- Faturas de cartão
CREATE INDEX idx_credit_card_bills_card_id ON credit_card_bills(card_id);
CREATE INDEX idx_credit_card_bills_month_year ON credit_card_bills(year, month);

-- Transações de cartão
CREATE INDEX idx_cct_bill_id ON credit_card_transactions(bill_id);
CREATE INDEX idx_cct_installment_group ON credit_card_transactions(installment_group_id);
CREATE INDEX idx_cct_deleted_at ON credit_card_transactions(deleted_at);
```

### 9.6 Realtime (planejado)

O Supabase Realtime permite subscrever a mudanças em tabelas via WebSocket. A configuração atual ainda não usa Realtime — toda sincronização é via `invalidateQueries` no TanStack Query após mutations. Realtime será ativado em versões futuras para sincronização automática entre dispositivos.

---

## 10. Regras Financeiras

### 10.1 Tipos de Transação

| Tipo | Regra |
|---|---|
| `income` | Entrada de dinheiro. Soma ao saldo. |
| `expense` | Saída de dinheiro. Subtrai do saldo. |
| ~~`transfer`~~ | **Removido**. Transferências entre contas não são suportadas no modelo atual. |

### 10.2 Cálculo de Totais Mensais

O `getMonthlyStats` retorna `{ income, expense, savings }` para um mês:

```typescript
// Cálculo UTC-safe do último dia do mês
const [year, m] = month.split("-").map(Number);
const endDate = new Date(Date.UTC(year, m, 0)).toISOString().split("T")[0];
// new Date(Date.UTC(year, m, 0)) retorna o último dia do mês anterior ao mês m
// Ex: Date.UTC(2026, 5, 0) = último dia de abril = 30/04/2026
```

**Por que UTC?** `new Date("2026-05-01").getMonth()` retorna resultado dependente do timezone local. Para evitar bugs de "mês errado" em fusos horários negativos, todo cálculo de datas usa `Date.UTC()`.

### 10.3 Despesas Totais com Cartões

O total de despesas no Dashboard = transações de despesa + soma das faturas de cartão do mês:

```typescript
const expense = txExpense + cardExpenseTotal;
// cardExpenseTotal = sum(cardsSummary.map(c => c.monthTotal))
```

Isso significa que se o usuário tem R$ 500 em despesas avulsas e R$ 800 em fatura de cartão, o dashboard mostra R$ 1.300 de despesas no mês.

### 10.4 Categorias

- Categorias padrão (`is_default = true`, `user_id = NULL`) são visíveis para todos
- Usuários cadastram as próprias na tela **Categorias** (`/categories`, `user_id = seu_id`)
- Cada categoria marca onde é usada: `is_transaction` (form de transações) e/ou `is_card` (lançamento de fatura do cartão)
- Categorias de transação têm `type`: `income | expense` (obrigatório); receita nunca pode ser de cartão (CHECK `categories_income_not_card`)
- Categorias só de cartão ficam gravadas com `type = 'expense'` (coluna NOT NULL; gasto por definição)
- `type = 'investment'` é legado: linhas inertes (ambos os flags FALSE) que não aparecem em nenhum form
- Não há mais ícone por categoria — a identidade visual é a cor (`color`), usada nos gráficos e listas
- Excluir categoria não apaga lançamentos: FKs são `ON DELETE SET NULL` e os itens passam a "Sem categoria"

### 10.5 Metas Financeiras

```
goal.current_amount += contribution.amount
goal.status = "completed" quando current_amount >= target_amount
```

Metas podem ser `is_shared = true` para objetivos do casal (viagem, casa, etc.).

### 10.6 Saldo Previsto (Futuro)

Lançamentos futuros (`future_transactions`) serão somados ao saldo atual para projeção. Feature planejada para versão 2.

---

## 11. Sistema de Cartões de Crédito

### 11.1 Modelo de Dados

```
credit_cards (1)
  └── credit_card_bills (N) — uma por mês
        └── credit_card_transactions (N) — lançamentos da fatura
```

### 11.2 Fatura Mensal

Cada fatura (`credit_card_bills`) representa **um mês** de gastos de **um cartão**:

```sql
UNIQUE (card_id, month, year)  -- só existe uma fatura por cartão/mês
```

Faturas são criadas automaticamente (`findOrCreateBill`) no momento do primeiro lançamento. Não são pré-criadas.

**Status possíveis:**
| Status | Significado |
|---|---|
| `open` | Mês em curso, ainda recebendo lançamentos |
| `closed` | Período de compras encerrado, aguardando pagamento |
| `paid` | Fatura paga |
| `overdue` | Fatura vencida e não paga |

### 11.3 Parcelamentos

Ao criar um lançamento parcelado (`is_installment = true`, `installment_total = N`):

```typescript
// Para cada parcela i de 1 a N:
// Calcula o mês/ano alvo a partir do mês da fatura atual
const rawMonth = billMonth + i - 2;
const targetMonth = (((rawMonth % 12) + 12) % 12) + 1;
const targetYear = billYear + Math.floor((billMonth + i - 2) / 12);

// Cria/busca a fatura do mês alvo
// Insere a transação com:
//   amount = total / N (arredondado em 2 casas)
//   installment_number = i
//   installment_total = N
//   is_last_installment = (i === N)
//   installment_group_id = UUID único para o grupo
```

**Por que o cálculo com `billMonth + i - 2`?**
- `i = 1` (primeira parcela): deve cair no mês atual (`billMonth`)
- `i = 2` (segunda parcela): deve cair no próximo mês (`billMonth + 1`)
- `i - 2` ajusta o offset para começar no mês correto

### 11.4 Última Parcela

Lançamentos com `is_last_installment = true` recebem destaque visual no `BillDetail` (borda colorida, badge "última"). Isso permite ao usuário saber que aquele gasto vai desaparecer da fatura no próximo mês.

### 11.5 Recalcular Total da Fatura

Após qualquer mutation em `credit_card_transactions`, o total da fatura é recalculado:

```typescript
async recalculateBillTotal(billId: string) {
  // SUM de todos os amount onde deleted_at IS NULL
  // UPDATE credit_card_bills SET total_amount = resultado
}
```

Isso garante que `credit_card_bills.total_amount` está sempre sincronizado com os lançamentos reais.

### 11.6 Integração com Dashboard

O `cardsService.getCardsSummary(userId, coupleId, month, year)` retorna o `total_amount` de cada fatura para o mês selecionado. O Dashboard soma esses totais às despesas convencionais e os exibe individualmente na lista "Saídas do Mês".

### 11.7 Janela de 12 Meses

O `BillList` exibe uma janela de 13 meses centrada no mês atual (6 antes + atual + 6 depois). Meses sem fatura são exibidos como "sem fatura". O mês atual tem badge "atual".

### 11.8 Visibilidade no Modo Casal

Cartões com `is_shared = true` ficam visíveis para o parceiro no modo casal. A política RLS de `credit_cards`:

```sql
CREATE POLICY "Users can view own credit cards" ON credit_cards FOR SELECT
  USING (
    auth.uid() = user_id OR
    (is_shared = TRUE AND couple_id IN (
      SELECT id FROM couples WHERE owner_id = auth.uid() OR partner_id = auth.uid()
    ))
  );
```

---

## 12. Sistema de Investimentos

### 12.1 Modelo

```typescript
type Investment = {
  asset_class: "fixed_income" | "variable_income" | "crypto" | "real_estate" | "other";
  subcategory: string;          // ex: "CDB", "Ações", "FII"
  broker: string | null;        // corretora
  asset_name: string;           // nome do ativo
  ticker: string | null;        // código do ativo
  quantity: number;             // quantidade de cotas/unidades
  average_price: number;        // preço médio de compra
  current_price: number;        // preço atual (atualizado manualmente)
  invested_amount: number;      // quantidade × preço médio
  current_value: number;        // quantidade × preço atual
  profitability: number | null; // % de rentabilidade
  dividends_received: number;   // dividendos/juros recebidos
  is_shared: boolean;
  purchase_date: string | null;
  maturity_date: string | null; // para renda fixa com vencimento
};
```

### 12.2 Patrimônio Total

O patrimônio é calculado como a soma de `current_value` de todos os investimentos ativos do usuário. Não inclui saldo em conta corrente no modelo atual.

### 12.3 Rentabilidade

```
profitability = ((current_value - invested_amount) / invested_amount) × 100
```

Calculado no frontend ao exibir. Não é persistido (derivado dos campos base).

---

## 13. Dashboard

### 13.1 Métricas Exibidas

| Métrica | Fonte | Fórmula |
|---|---|---|
| Receitas do Mês | `getMonthlyStats` | SUM(amount) WHERE type='income' |
| Despesas do Mês | `getMonthlyStats` + `getCardsSummary` | txExpense + cardExpenseTotal |
| Saldo do Mês | Dashboard | income - expense |
| % Variação vs Anterior | Dashboard | calculateChange(atual, anterior) |

### 13.2 Integração de Cartões no Dashboard

```typescript
// Query separada para faturas de cartão
const { data: cardsSummary } = useQuery({
  queryKey: ["cards", "summary", userId, coupleId, month, year, isShared],
  queryFn: () => cardsService.getCardsSummary(userId, coupleId, month, year, isShared),
});

// Faturas com total > 0 aparecem na lista "Saídas do Mês"
// com ícone do cartão, nome do cartão, status e valor
```

### 13.3 Invalidação Automática

Quando qualquer lançamento de cartão é feito/removido:
```typescript
queryClient.invalidateQueries({ queryKey: ["cards"] });
// Invalida por prefixo: também invalida ["cards", "summary", ...]
// Dashboard re-fetch automaticamente
```

### 13.4 Seletor de Mês

`useUIStore.selectedMonth` (formato `"YYYY-MM"`) é persistido no localStorage via Zustand persist. Ao trocar de mês, todos os componentes que dependem de `selectedMonth` re-renderizam automaticamente porque o valor do store muda.

### 13.5 Toggle Individual/Casal

Disponível no header quando `couple.status === "active"`. Altera `useUIStore.viewMode`. Todas as queries que recebem `isShared` como parâmetro são automaticamente re-executadas.

---

## 14. Performance

### 14.1 TanStack Query — Estratégia de Cache

```typescript
// staleTime padrão: 60 segundos para dados que mudam com interação do usuário
// Dados financeiros não precisam de realtime — o usuário sabe quando mudou
staleTime: 60_000,

// enabled: !!user — nunca fazer query sem usuário autenticado
enabled: !!user,

// Invalidação granular: sempre por prefixo específico
queryClient.invalidateQueries({ queryKey: ["cards"] });
// NÃO: queryClient.invalidateQueries() — invalida tudo, gera refetch desnecessário
```

### 14.2 Query Keys — Hierarquia

```
["cards"]                                    → todos os cartões
["cards", "summary", userId, coupleId, ...]  → resumo para dashboard
["bills", cardId]                            → faturas de um cartão
["card-transactions", billId]                → transações de uma fatura
["transactions"]                             → lista de transações
["monthly-stats", userId, coupleId, month]   → totais mensais
```

### 14.3 Otimização de Queries ao Banco

- Nunca fazer N+1 queries: dados relacionados são buscados em uma única query com joins do PostgREST (`select("*, category:categories(id,name,color,icon)")`)
- `getCards` calcula `total_used` em paralelo com `Promise.all` — não sequencial
- `getMonthlyStats` faz apenas `SELECT type, amount` — sem joins (joins com categories causavam falhas silenciosas no PostgREST quando RLS bloqueava o contexto)

### 14.4 Rendering

- Skeletons em todos os estados de loading — sem layout shift
- `AnimatePresence` usado com `key` estável para evitar re-mount desnecessário
- Listas longas usam `max-h-72 overflow-y-auto` para limitar o DOM — virtualização completa será adicionada conforme necessidade

---

## 15. Segurança

### 15.1 Princípios

1. **Zero Trust Frontend**: o frontend nunca é autoridade final. Toda validação crítica é feita via RLS no PostgreSQL.
2. **Ownership explícito**: todo registro tem `user_id`. O RLS valida `auth.uid() = user_id`.
3. **Isolamento de casal**: dados compartilhados exigem `couple_id` válido — não basta `is_shared = true`.
4. **Nenhuma secret no frontend**: apenas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são expostos. A `service_role_key` nunca vai para o cliente.

### 15.2 Variáveis de Ambiente

```bash
# .env.local (NUNCA commitar)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # chave anon — safe para expor
NEXT_PUBLIC_APP_URL=https://seuapp.vercel.app

# .env.example (commitar — serve de template)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 15.3 Validação de Entrada

Todo formulário usa Zod como schema de validação:
- Validação no cliente via `zodResolver` (UX)
- O banco tem constraints SQL como segunda barreira (CHECK, NOT NULL, UNIQUE)
- A anon key do Supabase não tem permissão de bypass de RLS — RLS é a barreira real

### 15.4 Operações Privilegiadas

Operações que precisam de permissões além do RLS padrão usam funções `SECURITY DEFINER`:

```sql
-- Exemplo: soft delete que modifica deleted_at
-- RLS bloquearia UPDATE quando deleted_at IS NULL é condição USING
CREATE OR REPLACE FUNCTION soft_delete_transaction(transaction_id UUID)
RETURNS void SECURITY DEFINER ...
```

O `GRANT EXECUTE ON FUNCTION ... TO authenticated` garante que apenas usuários autenticados podem chamar.

---

## 16. Qualidade de Código

### 16.1 TypeScript

- `strict: true` no tsconfig
- Zero tolerância a `any` sem justificativa em comentário
- Tipos de domínio em `src/types/index.ts` e `src/features/*/types/`
- Tipos de formulário sempre derivados de `z.output<typeof schema>`
- Build falha se houver erro de tipo (`npx tsc --noEmit` no CI)

### 16.2 Commits

Seguir **Conventional Commits**:
```
feat: adiciona módulo de investimentos
fix: corrige cálculo de última parcela em dezembro
refactor: extrai CategoryIcon para componente compartilhado
chore: atualiza dependências de segurança
docs: atualiza handout com regras de cartão
```

### 16.3 Tratamento de Erros

```typescript
// Services sempre jogam o erro para o TanStack Query tratar
if (error) throw error;

// Mutations capturam no onError
onError: () => toast.error("Mensagem amigável para o usuário"),

// Nunca console.log em produção sem context
// Nunca swallow errors silenciosamente
```

### 16.4 ESLint

Configuração em `eslint.config.mjs`. Regras principais:
- `@typescript-eslint/no-explicit-any` — warning (não error, pois há casos legítimos com zodResolver)
- `react-hooks/rules-of-hooks` — error
- `react-hooks/exhaustive-deps` — warning

---

## 17. Regras para IA

Esta seção define como qualquer IA (Claude, GPT, Gemini, etc.) deve contribuir com o projeto.

### 17.1 Princípios Fundamentais

1. **Manter a arquitetura**: nunca sugerir mudanças estruturais não solicitadas (ex: trocar Zustand por Context API "porque é mais simples")
2. **Não duplicar código**: antes de criar um componente ou função, verificar se já existe algo similar em `components/shared/`, `services/` ou `features/`
3. **Seguir os padrões estabelecidos**: queries com TanStack, estado com Zustand, validação com Zod, UI com Shadcn + Tailwind
4. **Tipagem forte sempre**: nunca usar `any` sem necessidade documentada
5. **Código pronto para produção**: sem TODOs, sem console.logs, sem comentários de placeholder

### 17.2 Antes de Escrever Código

- Ler os arquivos relevantes do módulo (types, service, store) antes de implementar
- Verificar como funcionalidades similares foram implementadas em outros módulos
- Respeitar as convenções de nomes (kebab-case para arquivos, PascalCase para componentes)
- Verificar se o componente precisa invalidar queries relacionadas após mutations

### 17.3 Padrões Obrigatórios

```typescript
// ✅ Query com guard enabled
useQuery({ enabled: !!user, queryKey: [...], queryFn: ... })

// ✅ Cores via CSS custom properties
className="text-[hsl(var(--success))]"

// ✅ Service sem estado interno
export const cardsService = { async getCards(userId, coupleId) { ... } }

// ✅ Formulário com zodResolver
useForm<Schema>({ resolver: zodResolver(schema) as any, defaultValues: ... })

// ✅ Mutation com invalidação
onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cards"] }); }

// ✅ UTC-safe para datas
new Date(Date.UTC(year, month, 0)).toISOString().split("T")[0]
```

### 17.4 Proibições

```typescript
// ❌ Não usar bg-success, text-expense (Tailwind v4 pode não gerar)
// ❌ Não fazer queries dentro de services chamando outros services em loop
// ❌ Não criar estados locais para dados que deveriam estar no TanStack Query
// ❌ Não usar transfer como tipo de transação (foi removido)
// ❌ Não criar páginas sem o padrão page.tsx → *-view.tsx
// ❌ Não commitar .env.local ou credentials
// ❌ Não usar Date locais para cálculos de fim de mês (usar UTC)
// ❌ Não criar políticas RLS com USING (deleted_at IS NULL) em UPDATE (quebra soft delete)
```

### 17.5 Ao Adicionar uma Nova Feature

1. Criar a pasta `src/features/nova-feature/` com a estrutura padrão
2. Definir os tipos em `types/index.ts` ou `features/nova-feature/types/`
3. Criar o schema Zod em `schemas/` ou `features/nova-feature/schemas/`
4. Implementar o service em `services/` ou `features/nova-feature/services/`
5. Criar os componentes internos em `features/nova-feature/components/`
6. Criar o `nova-feature-view.tsx` como orquestrador
7. Criar `src/app/(app)/nova-feature/page.tsx` importando a view
8. Adicionar o item ao sidebar em `components/layout/sidebar.tsx`
9. Criar a migration SQL em `supabase/migrations/` se necessário

### 17.6 Ao Corrigir um Bug

1. Entender a causa raiz antes de propor solução
2. Não usar workarounds que escondem o problema (ex: try/catch silencioso)
3. Verificar se o bug afeta outros módulos com lógica similar
4. Após a correção, verificar `npx tsc --noEmit` para garantir zero erros de tipo

---

## 18. Roadmap Futuro

### 18.1 Curto Prazo (próximas features)

| Feature | Descrição |
|---|---|
| Página `/invite/[token]` | Redireciona o parceiro diretamente para aceitar o convite sem copiar o token manualmente |
| Notificações in-app | Alertas de fatura fechando, meta atingida, parceiro adicionou transação |
| Exportação de dados | CSV/PDF dos extratos mensais |
| Filtros avançados no calendário | Filtrar por categoria, tipo ou valor mínimo |

### 18.2 Médio Prazo

| Feature | Descrição |
|---|---|
| **Lançamentos futuros** | Registrar receitas/despesas previstas e calcular saldo projetado |
| **Recorrências automáticas** | Geração automática de transações recorrentes (aluguel mensal, assinatura) |
| **Orçamento mensal por categoria** | Definir limite de gastos por categoria e alertar ao aproximar |
| **PWA** | Instalável em mobile, notificações push, funcionamento offline básico |
| **Dark/Light mode toggle** | Switch manual de tema |

### 18.3 Longo Prazo

| Feature | Descrição |
|---|---|
| **Open Finance / PIX** | Importação automática de extratos via API bancária (Open Finance Brasil) |
| **Importação OFX/CSV** | Upload de arquivo de extrato bancário |
| **IA Financeira** | Análise preditiva, sugestões de economia, categorização automática |
| **App Mobile nativo** | React Native ou Flutter compartilhando a mesma API Supabase |
| **Múltiplos casais/grupos** | Financeiro familiar com N participantes (não apenas duplas) |
| **Patrimônio líquido** | Visão consolidada: ativos - passivos = PL |
| **Integração corretoras** | Atualização automática de preços de ações/FIIs via API |

---

## 19. Filosofia do Produto

### 19.1 Valores Centrais

**Clareza antes de completude.** Um dashboard que mostra 3 números corretos vale mais que 10 números confusos. Cada informação exibida deve ter contexto e ação associada.

**Confiança através da consistência.** Se o usuário vê R$ 1.200 de despesas em cartão, ele deve conseguir clicar e ver exatamente quais compras compõem esse valor. Nada de "número mágico" sem rastreabilidade.

**Organização sem fricção.** Categorizar, parcelar e compartilhar deve ser rápido. Nenhum fluxo de lançamento deve ter mais de 3 campos obrigatórios. Campos opcionais ficam colapsados ou têm padrões inteligentes.

**Sensação premium.** O app compete visualmente com produtos como Nubank, Revolut e Wise. Cada pixel importa. Animações devem parecer naturais, não decorativas. Cores têm semântica (verde = positivo, vermelho = negativo).

**Poder analítico sem complexidade.** O usuário comum não quer fórmulas — quer respostas: "estou gastando mais que o mês passado?", "quando vai sair minha última parcela?", "quanto o casal gastou com alimentação?". O sistema deve responder a essas perguntas visualmente, sem o usuário ter que calcular nada.

### 19.2 Mantra de Design

> *"A melhor interface é aquela que o usuário não percebe que está usando — só vê o resultado."*

O finTrackerDuo não deve parecer um sistema financeiro corporativo. Deve parecer um assistente financeiro pessoal, discreto, sempre atualizado, que antecipa o que você quer ver.

### 19.3 O que o Sistema Nunca Deve Fazer

- Exibir dados sem contexto (número sem label, porcentagem sem referência)
- Perder dados do usuário por qualquer operação (soft delete é lei)
- Misturar dados do casal com dados individuais sem permissão explícita
- Quebrar o layout em mobile (mobile-first é inegociável)
- Fazer o usuário esperar mais de 200ms sem feedback visual (skeleton, spinner ou otimistic update)

---

*Documento mantido por: equipe finTrackerDuo*
*Última atualização: Maio 2026*
*Para contribuições: abrir PR no repositório com a seção atualizada*
