"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  CalendarDays,
  TrendingUp,
  Target,
  Heart,
  Settings,
  HelpCircle,
  Lightbulb,
  Search,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Section = {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Palavras-chave usadas pela busca — não precisam aparecer no body. */
  keywords?: string[];
  /** Render the content of the section. */
  body: React.ReactNode;
};

/* -------------------------------------------------------------------------- */
/* Pequenos helpers visuais usados dentro das seções                          */
/* -------------------------------------------------------------------------- */

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 mb-2 text-sm font-semibold text-foreground uppercase tracking-wide">
      {children}
    </h3>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span className="flex-1">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-semibold text-foreground">{children}</span>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <Lightbulb className="w-4 h-4 mt-0.5 text-primary shrink-0" />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Seções                                                                     */
/* -------------------------------------------------------------------------- */

const SECTIONS: Section[] = [
  {
    id: "visao-geral",
    title: "Visão geral",
    icon: HelpCircle,
    keywords: ["introdução", "começar", "como funciona", "individual", "casal", "modo"],
    body: (
      <>
        <Lead>
          O FinTrackerDuo organiza suas finanças em um só lugar. Você pode usar
          de forma <Term>individual</Term> ou conectar uma conta de parceiro
          para o <Term>modo casal</Term>, onde dá pra ver gastos consolidados e
          dividir despesas no 50/50 quando faz sentido.
        </Lead>

        <Subtitle>Conceitos centrais</Subtitle>
        <Bullets
          items={[
            <>
              <Term>Mês corrente</Term> — quase tudo na app é organizado por
              competência mensal (YYYY-MM). Carrosséis e listas trabalham em
              torno do mês selecionado no Dashboard.
            </>,
            <>
              <Term>Categoria</Term> — classifica transações e gastos do
              cartão (Salário, Mercado, Moradia…). Além das padrão, você
              cadastra as suas na tela <Term>Categorias</Term>, marcando onde
              cada uma é usada. As cores alimentam os gráficos.
            </>,
            <>
              <Term>Casal</Term> — quando um casal está ativo, transações
              ganham um toggle "Dividir com casal" e o app oferece visão
              consolidada nos Dashboards/Relatórios.
            </>,
            <>
              <Term>Previsão</Term> — lançamento estimado. Conta no total da
              fatura/mês, mas é claramente marcado pra não confundir com
              realizado.
            </>,
            <>
              <Term>Recorrente</Term> — replica em todas as faturas/meses
              futuros automaticamente. Útil pra Netflix, aluguel, mensalidade.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    keywords: [
      "receitas",
      "despesas",
      "saldo",
      "mês",
      "gráfico",
      "pizza",
      "fluxo de caixa",
      "entradas",
      "saídas",
      "totais",
      "análise",
      "categoria",
      "12 meses",
      "relatório",
      "comparativo",
    ],
    body: (
      <>
        <Lead>
          Visão financeira completa em uma tela só. Use o carrossel de meses
          no topo pra navegar; os blocos que dependem do mês selecionado
          reagem instantaneamente, e os blocos de 12 meses ficam fixos
          olhando pra janela inteira do ano.
        </Lead>

        <Subtitle>Bloco 1 — Mês selecionado</Subtitle>
        <Bullets
          items={[
            <>
              <Term>Receitas do Mês</Term> — soma de todas as transações de
              entrada. Variação % vs. o mês anterior.
            </>,
            <>
              <Term>Despesas do Mês</Term> — transações de saída{" "}
              <em>mais</em> o total das faturas de cartão do mês. Quando há
              cartão, o subtítulo mostra "incl. R$ X em cartões".
            </>,
            <>
              <Term>Saldo do Mês</Term> — Receitas − Despesas. Cor primary
              quando positivo; expense quando negativo.
            </>,
            <>
              <Term>Gastos por Categoria</Term> e{" "}
              <Term>Cartão por categoria</Term> — pizzas com as principais 8
              categorias. Cores vêm da categoria.
            </>,
            <>
              <Term>Fluxo de caixa (6 meses)</Term> — barras de receita vs.
              despesa (com cartão somado nas despesas).
            </>,
          ]}
        />

        <Subtitle>Bloco 2 — Entradas e Saídas listadas</Subtitle>
        <Lead>
          Dois cards com até 200 itens do mês selecionado por tipo. Headers
          mostram contagem + somatório do que está listado. Faturas de cartão
          aparecem em <Term>Saídas</Term> como linhas clicáveis que levam
          pra tela de Cartões.
        </Lead>

        <Subtitle>Bloco 3 — Últimos 12 meses (visão ampla)</Subtitle>
        <Bullets
          items={[
            <>
              <Term>3 stats consolidados</Term> — Total Recebido, Total Gasto
              e Economia Média/Mês ao longo dos 12 meses.
            </>,
            <>
              <Term>Fluxo de Caixa — 12 Meses</Term> — barras de receitas vs.
              despesas mês a mês pra ver tendência de longo prazo.
            </>,
          ]}
        />

        <Subtitle>Bloco 4 — Análise por Categoria (do mês)</Subtitle>
        <Lead>
          Barras horizontais com valor e % por categoria, tabs Despesas/
          Receitas. Mais detalhado que a pizza do bloco 1 — útil pra ver os
          valores absolutos e percentuais de uma vez só.
        </Lead>

        <Subtitle>Bloco 5 — Gastos no Cartão por Categoria — 12 Meses</Subtitle>
        <Lead>
          Consolidado anual de cartões com total no cabeçalho e % de
          participação por categoria. Ajuda a entender onde o cartão está
          sendo mais usado no histórico.
        </Lead>

        <Tip>
          Todos os blocos respeitam o modo individual/casal selecionado.
          Alterne no topo da tela quando quiser ver consolidado.
        </Tip>
      </>
    ),
  },
  {
    id: "transacoes",
    title: "Transações",
    icon: ArrowLeftRight,
    keywords: [
      "lançamento",
      "receita",
      "despesa",
      "categoria",
      "dividir",
      "parceiro",
      "casal",
      "saldo do mês",
      "recorrente",
      "recorrência",
      "mensal",
      "seed",
    ],
    body: (
      <>
        <Lead>
          Onde você lança receitas e despesas avulsas. A lateral lista os meses;
          o painel central mostra dois cards lado a lado (Receitas/Despesas) e
          um card de Saldo do Mês.
        </Lead>

        <Subtitle>Recorrência</Subtitle>
        <Bullets
          items={[
            <>
              Marque o toggle <Term>Recorrente</Term> no form e a transação é
              propagada para os próximos 6 meses automaticamente (data
              deslocada para o mesmo dia, com clamp no último dia do mês).
            </>,
            <>
              Se você abrir um mês "vazio" no futuro (depois dos 6 meses
              iniciais), o sistema verifica recorrentes do mês anterior na
              hora que você lança a primeira transação ali e replica as que
              faltam — assim a série continua sem ação manual.
            </>,
            <>
              <Term>Editar propaga para frente.</Term> Mudar valor, descrição,
              categoria, conta ou observações de uma instância recorrente
              atualiza também todas as cópias dos meses futuros da mesma
              série. <em>Data e status ficam por instância</em> (cada mês
              pode ter sua pequena variação sem mexer no resto). Esse
              comportamento difere do cartão, onde a edição é restrita à
              parcela tocada.
            </>,
            <>
              Todas as cópias compartilham um{" "}
              <Term>recurring_group_id</Term> interno usado pra deduplicar e
              evitar criar a mesma recorrente duas vezes no mesmo mês.
            </>,
          ]}
        />

        <Subtitle>Modo casal</Subtitle>
        <Bullets
          items={[
            <>
              No formulário, o toggle <Term>Dividir com casal</Term> cria 2
              linhas linkadas — cada parceiro paga metade do valor.
            </>,
            <>
              O toggle <Term>Lançar para o parceiro(a)</Term> cria a transação
              cheia <em>na conta do parceiro</em> (útil pra registrar algo que
              ele(a) pagou e você está apenas anotando).
            </>,
            <>
              O botão <Term>Ver transações de [nome]</Term> alterna a tela pra
              perspectiva do parceiro — útil pra revisar o histórico dele(a).
            </>,
          ]}
        />

        <Subtitle>Faturas de cartão como despesa</Subtitle>
        <Lead>
          O card Despesas inclui automaticamente uma linha por cartão com fatura
          {" > "}0 no mês. O valor reflete a sua parte (dono ou parceiro) e
          atualiza ao instante quando você adiciona/remove um lançamento na
          fatura.
        </Lead>
      </>
    ),
  },
  {
    id: "cartoes",
    title: "Cartões",
    icon: CreditCard,
    keywords: [
      "fatura",
      "parcela",
      "parcelamento",
      "parcela antiga",
      "previsão",
      "recorrente",
      "reembolso",
      "reembolsado",
      "limite",
      "consolidado",
      "realizado",
      "fechada",
      "aberta",
      "paga",
      "atrasada",
      "fatura travada",
      "filtro",
      "cleanup",
      "fatura vazia",
      "casal",
      "dividir",
    ],
    body: (
      <>
        <Lead>
          Tela em 3 colunas: lista de cartões, lista de meses de fatura
          (deslizante), e lançamentos do mês escolhido.
        </Lead>

        <Subtitle>Barras de limite</Subtitle>
        <Bullets
          items={[
            <>
              <Term>Limite Consolidado</Term> — soma de <em>todas</em> as
              transações ativas (previsões + realizadas) nas faturas não pagas.
              Atinge vermelho acima de 80%.
            </>,
            <>
              <Term>Limite Realizado</Term> — apenas o que já é confirmado
              (ignora previsões). Tonalidade verde até 80%, vermelha depois.
            </>,
          ]}
        />

        <Subtitle>Faturas — janela deslizante</Subtitle>
        <Lead>
          A coluna do meio mostra ±6 meses ao redor do mês selecionado. Clicar
          num mês faz a janela se reorganizar em torno dele — assim você navega
          longe sem perder contexto.
        </Lead>
        <Bullets
          items={[
            <>
              <Term>Sem fatura</Term> — meses que ainda não têm lançamento
              ficam visíveis com label "sem fatura". O primeiro lançamento
              cria a fatura no banco.
            </>,
            <>
              <Term>Cleanup</Term> — fatura sem lançamentos é{" "}
              <em>removida do banco</em>. A UI continua mostrando o mês na
              janela; você não perde lugar pra criar transações novas depois.
            </>,
            <>
              <Term>Status</Term> — Aberta, Fechada, Paga, Atrasada. Cada um
              tem cor distintiva. Você muda manualmente no dropdown do detalhe.
            </>,
            <>
              <Term>Fatura travada</Term> — qualquer status ≠ Aberta bloqueia
              o botão "Lançar" e mostra um aviso. Pra incluir um novo
              lançamento retroativo, reabra a fatura.
            </>,
          ]}
        />

        <Subtitle>Lançamentos da fatura</Subtitle>
        <Bullets
          items={[
            <>
              <Term>Parcelamento</Term> — você informa o{" "}
              <em>valor de cada parcela</em> (não o total). O sistema replica
              esse valor por N meses e mostra "Total da compra ≈ R$ X em Nx" no
              form como conferência.
            </>,
            <>
              <Term>Parcela antiga</Term> — toggle dentro do bloco de
              parcelamento. Permite começar a contar a partir de um mês
              anterior (1ª parcela em janeiro, por exemplo) e o sistema gera
              cada parcela no mês certo.
            </>,
            <>
              <Term>Previsão</Term> — marca como estimada. <em>Data passa a
              ser opcional</em> nesse caso — se não informar, cai pro 1º do
              mês da fatura internamente, mas continua somando.
            </>,
            <>
              <Term>Recorrente</Term> — replica em todas as faturas futuras já
              existentes <em>e</em> nas que forem criadas depois. Incompatível
              com parcelamento (mensagem clara no form).
            </>,
            <>
              <Term>Reembolsado</Term> — preserva o registro histórico mas o
              exclui dos totais (fatura, breakdown, sua parte). Útil pra
              compras que voltaram pro cartão.
            </>,
            <>
              <Term>Filtros</Term> — chips abaixo da busca ("Previsão" /
              "Parceladas") aparecem quando a fatura tem desses tipos. Click
              isola, click de novo volta pra "Todos".
            </>,
          ]}
        />

        <Tip>
          Em modo casal, a opção <Term>Dividir com casal</Term> cria 2 linhas
          por parcela (uma pra cada parceiro com 50% do valor cada). Reembolsos
          podem ser marcados em cada linha individualmente.
        </Tip>
      </>
    ),
  },
  {
    id: "categorias",
    title: "Categorias",
    icon: Tag,
    keywords: [
      "categoria",
      "cadastro",
      "receita",
      "despesa",
      "cartão",
      "ambas",
      "cor",
      "padrão",
      "excluir",
      "sem categoria",
    ],
    body: (
      <>
        <Lead>
          Cadastre quantas categorias quiser e marque onde cada uma é usada:
          no lançamento de <Term>transações</Term>, no lançamento de{" "}
          <Term>gastos do cartão</Term>, ou em ambos. As categorias padrão do
          app continuam disponíveis e não podem ser editadas.
        </Lead>

        <Subtitle>Regras do cadastro</Subtitle>
        <Bullets
          items={[
            <>
              <Term>Transações</Term> — a categoria aparece no form de
              receitas/despesas. Nesse caso é obrigatório marcar se ela é{" "}
              <Term>Receita</Term> ou <Term>Despesa</Term> (o form de
              transações filtra pela aba selecionada).
            </>,
            <>
              <Term>Cartão de crédito</Term> — a categoria aparece ao lançar
              gastos na fatura. Cartão só registra gastos, então{" "}
              <em>categorias de receita não podem ser de cartão</em>.
            </>,
            <>
              <Term>Ambas</Term> — uma despesa pode valer pros dois mundos
              (ex.: Alimentação no débito e no cartão). No gráfico{" "}
              <Term>Gastos por Categoria</Term> do Dashboard os valores se
              somam numa fatia só.
            </>,
            <>
              <Term>Cor</Term> — escolha na paleta ou personalize. É ela que
              pinta as pizzas e barras do Dashboard.
            </>,
          ]}
        />

        <Subtitle>Edição e exclusão</Subtitle>
        <Bullets
          items={[
            <>
              Editar nome/cor reflete imediatamente em listas e gráficos —
              os lançamentos apontam pra categoria, não pra uma cópia.
            </>,
            <>
              Excluir uma categoria <em>não apaga lançamento nenhum</em>:
              transações e gastos de cartão antigos passam a aparecer como{" "}
              <Term>Sem categoria</Term>.
            </>,
            <>
              Categorias do(a) parceiro(a) ficam visíveis quando o casal está
              ativo, mas só quem criou pode editar/excluir.
            </>,
          ]}
        />

        <Tip>
          Ícones de categoria foram aposentados — a identidade visual agora é
          só a cor, consistente em todos os gráficos e listas.
        </Tip>
      </>
    ),
  },
  {
    id: "calendario",
    title: "Calendário",
    icon: CalendarDays,
    keywords: ["agenda", "evento", "lembrete", "compromisso", "data", "horário"],
    body: (
      <>
        <Lead>
          Agenda de eventos pessoais ou compartilhados com o(a) parceiro(a).
          Útil pra reuniões, lembretes, datas importantes.
        </Lead>

        <Subtitle>O que dá pra fazer</Subtitle>
        <Bullets
          items={[
            <>Criar eventos com data obrigatória e horário opcional (dia todo se vazio).</>,
            <>Atribuir uma cor por evento (visual no calendário).</>,
            <>Compartilhar com o parceiro (toggle <Term>Compartilhar</Term>). Eventos não compartilhados são privados.</>,
            <>
              Lembrete semanal por email é enviado automaticamente listando os
              próximos eventos (gerenciado pelo backend).
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "investimentos",
    title: "Investimentos",
    icon: TrendingUp,
    keywords: [
      "portfólio",
      "ativo",
      "renda fixa",
      "renda variável",
      "cripto",
      "fii",
      "fundos imobiliários",
      "dividendo",
      "yield",
      "rendimento",
      "cotação",
      "dólar",
      "euro",
      "usd",
      "eur",
    ],
    body: (
      <>
        <Lead>
          Portfólio com cards de resumo, alocação por classe de ativo, lista de
          ativos com dividendos e cotação de USD/EUR atualizada diariamente.
        </Lead>

        <Subtitle>Resumo do portfólio</Subtitle>
        <Bullets
          items={[
            <><Term>Total Investido</Term>, <Term>Valor Atual</Term>, <Term>Lucro/Prejuízo</Term> e <Term>Dividendos Recebidos</Term> em cards no topo.</>,
            <><Term>Alocação</Term> em pizza + barras com percentuais por classe (Renda Fixa, Variável, Cripto, FIIs, Outros).</>,
          ]}
        />

        <Subtitle>Cadastro de ativo</Subtitle>
        <Bullets
          items={[
            <>Nome, ticker (opcional), classe, corretora, valor investido, valor atual.</>,
            <>
              <Term>Rendimento automático</Term> (opcional) — informe yield_rate
              + período (diário/mensal/anual). Um job diário recalcula
              current_value com juros compostos. Idempotente: rodar 2× no mesmo
              dia não soma duas vezes.
            </>,
            <>Marcar como <Term>compartilhado</Term> torna visível para o casal.</>,
          ]}
        />

        <Subtitle>Dividendos</Subtitle>
        <Lead>
          Clique numa linha de ativo para abrir o detalhe e ver/lançar
          dividendos. O agregado <Term>dividends_received</Term> é mantido em
          sincronia automaticamente por trigger no banco.
        </Lead>

        <Subtitle>Cotação USD/EUR</Subtitle>
        <Bullets
          items={[
            <>
              No topo da tela. Atualizada uma vez por dia (12:00 UTC = 09:00
              BRT) por job na Vercel, gravando em tabela do Supabase.
            </>,
            <>
              Cada card mostra o valor + variação + timestamp da última
              sincronização para ficar claro o quão fresca está a informação.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "metas",
    title: "Metas",
    icon: Target,
    keywords: ["objetivo", "reserva", "submeta", "contribuição", "progresso"],
    body: (
      <>
        <Lead>
          Metas financeiras com possibilidade de subdividir em <Term>submetas</Term> menores.
        </Lead>
        <Bullets
          items={[
            <>Crie uma meta com valor alvo e descrição.</>,
            <>Adicione contribuições incrementais (cada uma fica registrada).</>,
            <>Quebre em submetas pra acompanhar progresso por etapa (ex.: "Reserva de R$ 50k" → submetas mensais).</>,
            <>Submetas têm sua própria curva de progresso e podem ser marcadas como concluídas.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "casal",
    title: "Casal",
    icon: Heart,
    keywords: ["convite", "parceiro", "compartilhar", "consolidado", "vínculo"],
    body: (
      <>
        <Lead>
          Conecte sua conta com a de outro usuário do app para visualizar e
          gerenciar finanças em conjunto.
        </Lead>

        <Subtitle>Como funciona o convite</Subtitle>
        <Bullets
          items={[
            <>O owner envia um convite digitando o email do parceiro.</>,
            <>
              O parceiro recebe um aviso no app e precisa aceitar. Enquanto não
              aceitar, o vínculo fica <Term>pendente</Term> — sem acesso
              cruzado.
            </>,
            <>
              Aceito o convite, vocês podem alternar entre visão pessoal e
              visão consolidada no Dashboard / Cartões / Relatórios.
            </>,
            <>
              Cada um vê apenas o que está autorizado pela RLS: transações
              próprias, transações compartilhadas explicitamente, e dados
              consolidados em modo casal.
            </>,
          ]}
        />

        <Subtitle>Encerrar vínculo</Subtitle>
        <Lead>
          Qualquer um pode encerrar a qualquer momento. Os dados existentes
          ficam preservados pra cada conta separadamente, mas o acesso cruzado
          é interrompido.
        </Lead>
      </>
    ),
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    keywords: ["tema", "claro", "escuro", "perfil", "logout", "sair", "conta"],
    body: (
      <>
        <Lead>
          Tela onde você ajusta preferências da conta: tema (claro/escuro),
          informações pessoais e desconexão. O cadastro de categorias tem
          tela própria na barra lateral (veja a seção Categorias).
        </Lead>
        <Bullets
          items={[
            <><Term>Tema</Term> — claro, escuro ou conforme sistema.</>,
            <><Term>Perfil</Term> — nome exibido pra você (e pro parceiro).</>,
            <><Term>Encerrar sessão</Term> — logout, mantém os dados.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "faq",
    title: "Perguntas frequentes",
    icon: HelpCircle,
    keywords: [
      "faq",
      "dúvida",
      "problema",
      "erro",
      "spam",
      "email",
      "fatura sumiu",
      "fechada",
      "previsão",
      "cotação atrasada",
    ],
    body: (
      <>
        <Subtitle>"Por que minha fatura sumiu do banco?"</Subtitle>
        <Lead>
          Quando você remove o último lançamento de uma fatura, ela é
          deletada do banco — mantemos apenas faturas com transações reais. A
          célula continua aparecendo na lista deslizante; o primeiro novo
          lançamento recria a fatura automaticamente.
        </Lead>

        <Subtitle>"Marquei como previsão e o valor sumiu do limite realizado?"</Subtitle>
        <Lead>
          É o comportamento esperado. <Term>Limite Realizado</Term> mostra só o
          que já está confirmado. <Term>Limite Consolidado</Term> continua
          incluindo a previsão.
        </Lead>

        <Subtitle>"Fatura está fechada e quero adicionar um lançamento retroativo"</Subtitle>
        <Lead>
          Mude o status da fatura para <Term>Aberta</Term> no dropdown do
          detalhe, adicione o lançamento, e retorne o status pra Fechada
          depois.
        </Lead>

        <Subtitle>"Parcelei mas digitei o valor total errado"</Subtitle>
        <Lead>
          Desde a versão atual o form pede o <Term>valor por parcela</Term>,
          não o total. Cheque o hint "Total da compra ≈ R$ X em Nx" pra
          conferir antes de salvar. Pra ajustar uma compra já lançada, edite
          cada parcela individualmente (o valor por parcela está armazenado).
        </Lead>

        <Subtitle>"O Dólar/Euro está com a cotação de ontem"</Subtitle>
        <Lead>
          Esperado. A cotação é atualizada uma vez por dia (12:00 UTC). O
          timestamp visível em cada card indica exatamente quando foi a última
          atualização.
        </Lead>

        <Subtitle>"Recebi email de confirmação no spam"</Subtitle>
        <Lead>
          Comum em provedores de email transacional. Marque como "não é spam"
          ou adicione o remetente aos contatos para não perder convites de
          casal ou recuperação de senha futuras.
        </Lead>
      </>
    ),
  },
];

/* -------------------------------------------------------------------------- */
/* View                                                                       */
/* -------------------------------------------------------------------------- */

// Normaliza string para comparação case-insensitive sem acento.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function sectionMatches(section: Section, query: string): boolean {
  if (!query) return true;
  const haystack = [
    section.title,
    ...(section.keywords ?? []),
  ]
    .map(normalize)
    .join(" ");
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function HelpView() {
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const [search, setSearch] = useState("");
  // Evita re-scrollar ao montar várias vezes durante o mesmo carregamento.
  const didDeepLink = useRef(false);

  // Deep linking via ?section=<id> — usado pra abrir a Ajuda direto no
  // tópico relevante a partir de pontos do app (ex.: "Saiba mais" no
  // banner de fatura travada).
  useEffect(() => {
    if (didDeepLink.current) return;
    const target = searchParams.get("section");
    if (!target) return;
    const exists = SECTIONS.some((s) => s.id === target);
    if (!exists) return;

    didDeepLink.current = true;
    // Pequeno delay garante que a seção já está no DOM quando o scroll
    // dispara (importante quando o usuário chega via Link cross-route).
    const tid = window.setTimeout(() => {
      setActiveId(target);
      document.getElementById(target)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
    return () => window.clearTimeout(tid);
  }, [searchParams]);

  const normalizedSearch = useMemo(() => normalize(search.trim()), [search]);
  const filteredSections = useMemo(
    () => SECTIONS.filter((s) => sectionMatches(s, normalizedSearch)),
    [normalizedSearch],
  );

  // Scroll suave + atualização do destaque no sumário. Usamos scrollIntoView
  // em vez de hash navigation pra evitar mexer na URL.
  const handleNavigate = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div>
      <Header
        title="Ajuda"
        subtitle="Como o FinTrackerDuo funciona e como tirar o máximo dele"
      />

      <div className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sumário lateral */}
          <aside className="w-full lg:w-64 lg:sticky lg:top-6 shrink-0">
            <Card className="border-border/50">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
                  Sumário
                </p>
                <Input
                  placeholder="Buscar tópico..."
                  leftIcon={<Search />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <nav className="flex flex-col">
                  {filteredSections.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                      Nenhum tópico encontrado para{" "}
                      <span className="font-medium text-foreground">
                        &quot;{search}&quot;
                      </span>
                    </p>
                  ) : (
                    filteredSections.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleNavigate(s.id)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors text-left",
                          activeId === s.id
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <s.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{s.title}</span>
                      </button>
                    ))
                  )}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Conteúdo das seções — quando há busca ativa, mostra só as
              seções que casaram. Sem busca, renderiza todas. */}
          <main className="flex-1 min-w-0 space-y-6">
            {filteredSections.length === 0 ? (
              <Card className="border-border/50 border-dashed">
                <CardContent className="p-10 text-center space-y-2">
                  <Search className="w-6 h-6 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum tópico encontrado para{" "}
                    <span className="font-semibold text-foreground">
                      &quot;{search}&quot;
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs text-primary hover:underline"
                  >
                    Limpar busca
                  </button>
                </CardContent>
              </Card>
            ) : (
              filteredSections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-6">
                  <Card className="border-border/50">
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center gap-3 pb-2 border-b border-border/40">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <s.icon className="w-4 h-4 text-primary" />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight">
                          {s.title}
                        </h2>
                      </div>
                      {s.body}
                    </CardContent>
                  </Card>
                </section>
              ))
            )}

            <p className="text-center text-xs text-muted-foreground py-6">
              Sentiu falta de alguma coisa? Avisa a gente — essa página vai
              crescer junto com o app.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}
