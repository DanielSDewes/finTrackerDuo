/**
 * Traduções amigáveis para erros do Supabase Auth.
 *
 * O Supabase devolve mensagens em inglês e técnicas demais para o usuário
 * final (ex.: "Password has been pwned" ou "User already registered"). Aqui
 * mapeamos os códigos/strings que o SDK envia para texto em PT-BR com tom
 * acolhedor e instrução clara do próximo passo.
 *
 * Estratégia: tentamos casar por `code` quando disponível (mais estável);
 * caso contrário, fazemos um fallback por keywords na mensagem em inglês.
 */

type AuthLikeError =
  | { code?: string; message?: string; status?: number }
  | { message?: string }
  | Error
  | null
  | undefined;

type FriendlyAuthMessage = {
  /** Título curto para o toast. */
  title: string;
  /** Descrição mais detalhada (1-2 linhas). */
  description: string;
};

/**
 * Retorna texto amigável para um erro de autenticação. Se não houver match,
 * cai num fallback genérico que preserva a mensagem original como descrição
 * (assim ainda dá pra debugar sem expor "Internal server error" sozinho).
 */
export function translateAuthError(
  error: AuthLikeError,
  fallbackTitle = "Não foi possível continuar",
): FriendlyAuthMessage {
  const code = (error as { code?: string } | null)?.code ?? "";
  const raw = (error as { message?: string } | null)?.message ?? "";
  const msg = raw.toLowerCase();

  // ─── Senha vazada / fraca ─────────────────────────────────────────────────
  // O Supabase Auth, com leaked-password protection ativada, recusa senhas
  // encontradas no HaveIBeenPwned. Vem com code "weak_password" + texto que
  // menciona "pwned" / "compromised" / "leaked".
  if (
    code === "weak_password" ||
    msg.includes("pwned") ||
    msg.includes("compromised") ||
    msg.includes("leaked") ||
    msg.includes("has been found in a data breach")
  ) {
    return {
      title: "Senha vazada em um vazamento de dados",
      description:
        "Essa senha já apareceu em vazamentos públicos e não pode ser usada. Escolha uma combinação inédita — idealmente longa (12+ caracteres) e exclusiva pra esse app.",
    };
  }

  // Senha muito curta / regras de força do Supabase (sem ser vazamento).
  if (
    code === "password_too_short" ||
    msg.includes("password should be at least") ||
    msg.includes("password is too weak")
  ) {
    return {
      title: "Senha muito fraca",
      description:
        "Use no mínimo 8 caracteres, misturando letras, números e símbolos. Quanto maior e mais variada, melhor.",
    };
  }

  // ─── Email já cadastrado ──────────────────────────────────────────────────
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already exists")
  ) {
    return {
      title: "Esse email já tem conta",
      description:
        "Use a opção de login com o email informado, ou clique em \"Esqueceu a senha?\" pra recuperar o acesso.",
    };
  }

  // ─── Credenciais inválidas no login ───────────────────────────────────────
  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login credentials") ||
    msg.includes("invalid email or password")
  ) {
    return {
      title: "Email ou senha incorretos",
      description:
        "Confira os dados digitados. Se esqueceu a senha, use a opção de recuperação no formulário de login.",
    };
  }

  // ─── Email ainda não confirmado ───────────────────────────────────────────
  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("confirm your email")
  ) {
    return {
      title: "Confirme seu email primeiro",
      description:
        "Enviamos um link de confirmação no cadastro. Verifique sua caixa de entrada (e o spam) antes de tentar entrar de novo.",
    };
  }

  // ─── Rate limit ───────────────────────────────────────────────────────────
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) {
    return {
      title: "Muitas tentativas em pouco tempo",
      description:
        "Aguarde alguns minutos e tente novamente. Se persistir, troque de rede ou limpe os cookies do site.",
    };
  }

  // ─── Falha genérica ───────────────────────────────────────────────────────
  return {
    title: fallbackTitle,
    description:
      raw || "Erro desconhecido. Se persistir, tente recarregar a página.",
  };
}
