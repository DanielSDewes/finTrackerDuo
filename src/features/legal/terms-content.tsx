import type { ReactNode } from "react";
import { TERMS_VERSION, TERMS_UPDATED } from "@/features/legal/terms-version";

export { TERMS_VERSION, TERMS_UPDATED };

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">
        {n}. {title}
      </h3>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/**
 * Termos de Uso e Política de Privacidade do FinTrackerDuo.
 * Documento exibido no cadastro (com aceite obrigatório) e na página /termos.
 */
export function TermsContent() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">
          Termos de Uso e Política de Privacidade
        </h2>
        <p className="text-xs text-muted-foreground">
          Versão {TERMS_VERSION} — Última atualização: {TERMS_UPDATED}
        </p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Estes Termos de Uso e Política de Privacidade (&ldquo;Termos&rdquo;) regulam o acesso
        e a utilização da plataforma FinTrackerDuo (&ldquo;Plataforma&rdquo;,
        &ldquo;Aplicativo&rdquo; ou &ldquo;Serviço&rdquo;). Ao criar uma conta, marcar a opção de
        aceite e/ou utilizar o Serviço, você (&ldquo;Usuário&rdquo;) declara ter lido, compreendido
        e concordado integralmente com estes Termos. Caso não concorde, não crie uma conta e não
        utilize a Plataforma.
      </p>

      <Section n="1" title="Aceitação e Capacidade">
        <p>
          O aceite destes Termos é condição indispensável para a criação da conta e o uso do
          Serviço. Ao aceitar, o Usuário declara ser plenamente capaz nos termos da lei civil e
          ter, no mínimo, 18 (dezoito) anos de idade. O uso por menores ou incapazes é vedado.
        </p>
        <p>
          O Usuário é o único responsável pela veracidade das declarações prestadas e pela
          observância destes Termos por quaisquer pessoas a quem conceda acesso à sua conta.
        </p>
      </Section>

      <Section n="2" title="Descrição do Serviço">
        <p>
          O FinTrackerDuo é uma ferramenta de organização e acompanhamento financeiro pessoal e
          compartilhado (modo casal), de caráter meramente informativo e de apoio à gestão pessoal.
          As funcionalidades incluem, sem limitação:
        </p>
        <Bullets
          items={[
            "Registro e categorização de receitas, despesas e transferências, inclusive lançamentos recorrentes e agendados;",
            "Gestão de contas e carteiras, com saldos informados pelo Usuário;",
            "Cartões de crédito, faturas, parcelamentos, previsões (forecasts), reembolsos e divisão de gastos;",
            "Carteira de investimentos, com aportes, proventos/dividendos, rendimento automático estimado e indicadores de rentabilidade;",
            "Metas financeiras, sub-metas e aportes;",
            "Agenda/calendário de eventos e lembretes;",
            "Relatórios, gráficos e indicadores consolidados;",
            "Modo casal: vínculo entre dois usuários mediante convite, com compartilhamento e gestão conjunta de dados marcados como compartilhados.",
          ]}
        />
        <p>
          O Serviço <strong>não</strong> executa, intermedia, custodia ou processa pagamentos,
          transferências, aplicações financeiras ou quaisquer operações reais. Todos os valores,
          saldos, cotações e cálculos têm finalidade exclusivamente informativa.
        </p>
      </Section>

      <Section n="3" title="Cadastro e Segurança da Conta">
        <p>
          A criação da conta exige nome, e-mail e senha, geridos por nosso provedor de
          autenticação. O Usuário compromete-se a fornecer informações corretas e a mantê-las
          atualizadas. As credenciais são pessoais e intransferíveis.
        </p>
        <p>
          O Usuário é integral e exclusivamente responsável pela guarda de suas credenciais e por
          todas as atividades realizadas em sua conta, devendo notificar-nos imediatamente sobre
          qualquer uso não autorizado. Não nos responsabilizamos por perdas decorrentes de
          compartilhamento, descuido ou comprometimento das credenciais do Usuário.
        </p>
      </Section>

      <Section n="4" title="Dados Coletados e Armazenados">
        <p>
          Para prestar o Serviço, coletamos e armazenamos os dados inseridos pelo Usuário e os
          gerados pelo uso da Plataforma, incluindo, sem limitação:
        </p>
        <Bullets
          items={[
            "Dados cadastrais: nome, e-mail, telefone (opcional), foto/avatar, moeda e idioma de preferência;",
            "Dados de autenticação: credenciais geridas pelo provedor de autenticação (a senha é armazenada de forma criptografada por ele, sem acesso por nós);",
            "Dados financeiros informados: contas, saldos, categorias, receitas, despesas, transferências, notas, anotações, tags e anexos;",
            "Dados de cartões de crédito: nome, bandeira, limite, dias de fechamento/vencimento, faturas, lançamentos, parcelamentos e divisões;",
            "Dados de investimentos: ativos, classe, corretora, ticker, quantidades, preços, valores investidos, rentabilidade, proventos e parâmetros de rendimento;",
            "Metas, sub-metas, aportes e eventuais links cadastrados;",
            "Eventos de agenda: títulos, datas, horários e descrições;",
            "Dados de relacionamento (modo casal): vínculo entre usuários e identificação do parceiro;",
            "Dados técnicos e de uso: registros de acesso, preferências de interface e informações necessárias ao funcionamento e segurança da Plataforma.",
          ]}
        />
        <p>
          <strong>Importante:</strong> não solicitamos nem devemos receber dados bancários reais
          (senhas de banco, números completos de cartão, tokens, credenciais de instituições
          financeiras). O Usuário não deve inserir tais dados; ao fazê-lo, assume integralmente os
          riscos correspondentes.
        </p>
      </Section>

      <Section n="5" title="Finalidade, Base Legal e Tratamento (LGPD)">
        <p>
          O tratamento de dados pessoais observa a Lei nº 13.709/2018 (LGPD). Os dados são tratados
          para: (i) execução do contrato e prestação das funcionalidades; (ii) cumprimento de
          obrigações legais e regulatórias; e (iii) mediante o consentimento manifestado no aceite
          destes Termos, em especial para o tratamento de dados financeiros fornecidos pelo
          Usuário.
        </p>
        <p>
          Os dados podem ser armazenados e processados por provedores de infraestrutura em nuvem e
          serviços de terceiros (sub-operadores), inclusive em servidores localizados fora do
          Brasil, sempre com o objetivo de viabilizar o Serviço. Não vendemos dados pessoais.
        </p>
        <p>
          <strong>Direitos do titular:</strong> nos termos da LGPD, o Usuário pode solicitar
          confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação e
          informações sobre compartilhamento, bem como revogar o consentimento, ciente de que a
          revogação pode inviabilizar o uso do Serviço.
        </p>
      </Section>

      <Section n="6" title="Modo Casal e Compartilhamento de Dados">
        <p>
          Ao gerar ou aceitar um convite de vínculo, o Usuário autoriza, de forma livre e
          consciente, o compartilhamento de dados marcados como compartilhados com o parceiro
          vinculado, o qual poderá visualizar e, conforme a funcionalidade, criar, editar e excluir
          tais registros, inclusive lançar transações em nome do outro.
        </p>
        <p>
          O Usuário é exclusivamente responsável pela escolha do parceiro com quem se vincula e
          pelos dados que decide compartilhar. <strong>Não nos responsabilizamos</strong> por
          divergências, conflitos, uso indevido, acesso ou alterações realizadas pelo parceiro
          vinculado, tampouco mediamos eventuais disputas entre os usuários do casal. O encerramento
          do vínculo é realizado exclusivamente pela função própria da Plataforma e não apaga
          retroativamente o histórico já registrado.
        </p>
      </Section>

      <Section n="7" title="Responsabilidades do Usuário">
        <Bullets
          items={[
            "Inserir e conferir a exatidão de todos os dados, valores, datas, taxas, cotações e demais informações;",
            "Utilizar a Plataforma apenas para fins lícitos e em conformidade com estes Termos e a legislação aplicável;",
            "Não inserir conteúdo ilegal, de terceiros sem autorização, ou dados sensíveis desnecessários;",
            "Não tentar burlar mecanismos de segurança, acessar dados de terceiros, sobrecarregar, realizar engenharia reversa ou explorar vulnerabilidades do Serviço;",
            "Manter cópias próprias das informações que considerar relevantes.",
          ]}
        />
      </Section>

      <Section n="8" title="Ausência de Aconselhamento e Caráter Informativo">
        <p>
          O FinTrackerDuo <strong>não presta</strong> consultoria ou aconselhamento financeiro,
          contábil, tributário, jurídico ou de investimentos, e não constitui recomendação de
          compra, venda ou manutenção de quaisquer ativos. As informações, projeções, simulações de
          rendimento, cálculos de faturas, rentabilidade, cotações e indicadores são
          <strong> estimativas de caráter informativo</strong>, podendo conter imprecisões, atrasos
          ou erros, e não refletem necessariamente valores reais de mercado.
        </p>
        <p>
          Quaisquer decisões tomadas pelo Usuário com base nas informações da Plataforma são de sua
          <strong> exclusiva e integral responsabilidade</strong>. Recomenda-se a consulta a
          profissionais habilitados antes de qualquer decisão financeira.
        </p>
      </Section>

      <Section n="9" title="Isenção de Garantias">
        <p>
          O Serviço é fornecido <strong>&ldquo;no estado em que se encontra&rdquo; e
          &ldquo;conforme disponível&rdquo;</strong> (&ldquo;as is&rdquo; e &ldquo;as
          available&rdquo;), sem garantias de qualquer natureza, expressas ou implícitas, na máxima
          extensão permitida pela legislação aplicável. Não garantimos que o Serviço será
          ininterrupto, livre de erros, seguro contra falhas, vírus ou acessos indevidos, nem que os
          cálculos, cotações e resultados serão exatos, completos ou adequados a qualquer finalidade
          específica.
        </p>
      </Section>

      <Section n="10" title="Limitação e Isenção de Responsabilidade">
        <p>
          Na máxima extensão permitida pela legislação aplicável, o FinTrackerDuo, seus
          desenvolvedores, mantenedores, fornecedores e colaboradores <strong>não serão
          responsáveis</strong> por quaisquer danos diretos, indiretos, incidentais, especiais,
          consequenciais ou punitivos, incluindo, sem limitação:
        </p>
        <Bullets
          items={[
            "Perdas financeiras, lucros cessantes, prejuízos ou decisões tomadas com base nas informações da Plataforma;",
            "Erros, imprecisões ou desatualização de dados, cálculos automáticos (incluindo rendimentos e faturas), cotações ou projeções;",
            "Indisponibilidade, interrupção, lentidão, falhas técnicas, perda, corrupção ou exclusão de dados;",
            "Acessos não autorizados, vazamentos ou incidentes decorrentes de fatores fora de nosso controle razoável;",
            "Atos, omissões, acessos ou alterações realizadas pelo parceiro vinculado no modo casal;",
            "Condutas de terceiros, serviços de sub-operadores ou eventos de força maior e caso fortuito.",
          ]}
        />
        <p>
          O uso da Plataforma é feito por conta e risco do Usuário. Caso alguma limitação acima não
          seja admitida pela legislação aplicável, a responsabilidade ficará limitada ao mínimo
          permitido por lei e, em qualquer hipótese, restrita a danos diretos e comprovados,
          observando-se que o Serviço pode ser oferecido sem custo ao Usuário.
        </p>
      </Section>

      <Section n="11" title="Indenização">
        <p>
          O Usuário concorda em isentar, defender e indenizar o FinTrackerDuo e seus responsáveis
          por quaisquer reclamações, perdas, danos, obrigações e despesas (inclusive honorários)
          decorrentes do uso do Serviço, da violação destes Termos ou da violação de direitos de
          terceiros, inclusive em relação a dados inseridos ou compartilhados pelo Usuário.
        </p>
      </Section>

      <Section n="12" title="Propriedade Intelectual">
        <p>
          A Plataforma, sua marca, identidade visual, código e demais elementos são protegidos e
          pertencem ao FinTrackerDuo ou a seus licenciadores. Os dados inseridos permanecem de
          titularidade do Usuário, que concede licença limitada para tratá-los exclusivamente para a
          prestação do Serviço.
        </p>
      </Section>

      <Section n="13" title="Disponibilidade, Alterações e Encerramento">
        <p>
          Podemos, a qualquer tempo e sem aviso prévio, alterar, suspender ou descontinuar, total ou
          parcialmente, o Serviço ou suas funcionalidades. O Usuário pode encerrar sua conta a
          qualquer momento; a exclusão da conta acarreta a eliminação ou anonimização dos dados
          associados, ressalvadas as hipóteses de guarda exigidas por lei.
        </p>
      </Section>

      <Section n="14" title="Alterações dos Termos">
        <p>
          Estes Termos podem ser atualizados periodicamente. A versão vigente será sempre a
          disponibilizada na Plataforma. Alterações relevantes poderão exigir novo aceite. O uso
          continuado após a publicação de alterações implica concordância com a versão atualizada.
        </p>
      </Section>

      <Section n="15" title="Lei Aplicável e Foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
          do domicílio do Usuário para dirimir eventuais controvérsias, quando assim exigido pela
          legislação consumerista; nas demais hipóteses, o foro da comarca do responsável pela
          Plataforma, com renúncia a qualquer outro.
        </p>
      </Section>

      <Section n="16" title="Contato">
        <p>
          Dúvidas, solicitações relativas a dados pessoais ou comunicações sobre estes Termos podem
          ser encaminhadas pelos canais de suporte indicados na Plataforma.
        </p>
      </Section>

      <p className="text-sm font-medium text-foreground leading-relaxed">
        Ao marcar a opção de aceite e criar sua conta, o Usuário declara que leu e concordou com
        estes Termos de Uso e com a Política de Privacidade, isentando o FinTrackerDuo de
        responsabilidade na forma aqui prevista.
      </p>
    </div>
  );
}
