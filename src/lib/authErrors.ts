/**
 * Mapa centralizado de mensagens de erro de auth (magic link, OTP, signup).
 * Padronizado em pt-BR + en-US, escolhe automaticamente baseado no idioma do navegador.
 *
 * Códigos vêm do Supabase Auth (hash ou query params):
 *  - error: "access_denied", "server_error", "unauthorized_client", etc.
 *  - error_code: "otp_expired", "otp_disabled", "user_not_found", etc.
 *  - error_description: texto humano (em inglês) que pode conter "expired", "invalid", etc.
 *
 * Ref: https://supabase.com/docs/reference/auth/error-codes
 */

export type AuthErrorLocale = "pt-BR" | "en-US";

export interface ResolvedAuthError {
  /** Mensagem principal pra mostrar no toast. */
  title: string;
  /** Categoria semântica pra UX condicional (ex: pré-preencher email, sugerir reenvio). */
  kind:
    | "expired"
    | "denied"
    | "invalid"
    | "rate_limited"
    | "server"
    | "unknown";
  /** Tempo recomendado de exibição em ms. */
  duration: number;
}

interface AuthErrorInput {
  error?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
}

const MESSAGES: Record<
  ResolvedAuthError["kind"],
  Record<AuthErrorLocale, string>
> = {
  expired: {
    "pt-BR":
      "esse link já foi usado ou expirou. pede um novo aqui embaixo. dica: abre o link no mesmo dispositivo onde pediu.",
    "en-US":
      "this link was already used or has expired. request a new one below. tip: open the link on the same device where you requested it.",
  },
  denied: {
    "pt-BR":
      "acesso negado. confere se o email tá certo ou pede um novo link aqui embaixo.",
    "en-US":
      "access denied. double-check your email or request a new link below.",
  },
  invalid: {
    "pt-BR":
      "esse link tá inválido. pede um novo aqui embaixo e abre no mesmo dispositivo.",
    "en-US":
      "this link is invalid. request a new one below and open it on the same device.",
  },
  rate_limited: {
    "pt-BR":
      "calma aí, muitas tentativas seguidas. espera uns segundos e tenta de novo.",
    "en-US":
      "easy there, too many attempts in a row. wait a few seconds and try again.",
  },
  server: {
    "pt-BR":
      "deu ruim no nosso lado. respira, tenta de novo em alguns segundos.",
    "en-US": "something broke on our end. take a breath and try again in a few seconds.",
  },
  unknown: {
    "pt-BR": "deu ruim no login, tenta de novo.",
    "en-US": "login failed, please try again.",
  },
};

/**
 * Mensagens estáticas de UX do fluxo de auth (não vindas de erro do Supabase).
 * Use `t(key)` pra pegar a string no idioma do navegador.
 */
const UI_MESSAGES = {
  forgot_email_required: {
    "pt-BR": "coloca o seu email primeiro",
    "en-US": "enter your email first",
  },
  forgot_link_sent: {
    "pt-BR": "te mandamos um link pra redefinir a senha. olha sua caixa (e o spam).",
    "en-US": "we sent you a link to reset your password. check your inbox (and spam).",
  },
  forgot_generic_error: {
    "pt-BR": "deu erro ao mandar o link, tenta de novo?",
    "en-US": "couldn't send the link, want to try again?",
  },
  reset_passwords_dont_match: {
    "pt-BR": "as senhas não batem",
    "en-US": "passwords don't match",
  },
  reset_password_too_weak: {
    "pt-BR": "senha muito fraca. mistura letras, números e tamanho 8+",
    "en-US": "password too weak. mix letters, numbers and use 8+ characters",
  },
  reset_success: {
    "pt-BR": "senha redefinida! entrando…",
    "en-US": "password reset! signing you in…",
  },
  reset_save_error: {
    "pt-BR": "não consegui salvar a senha",
    "en-US": "couldn't save your new password",
  },
  reset_link_invalid_title: {
    "pt-BR": "link\ninválido",
    "en-US": "invalid\nlink",
  },
  reset_link_invalid_body: {
    "pt-BR": "esse link de recuperação expirou ou já foi usado. pede um novo na tela de entrada.",
    "en-US": "this recovery link has expired or was already used. request a new one on the sign-in page.",
  },
  // Detecção de status de conta no /auth
  no_account_creating: {
    "pt-BR": "ainda não tem conta com esse email. mandamos um link mágico pra você criar agora 🤙",
    "en-US": "no account with this email yet. we sent you a magic link to create one now 🤙",
  },
  account_no_password: {
    "pt-BR": "essa conta ainda não tem senha. te mandamos um link mágico pra entrar e definir uma.",
    "en-US": "this account doesn't have a password yet. we sent you a magic link so you can sign in and set one.",
  },
  password_login_blocked_no_password: {
    "pt-BR": "ainda não definiu senha. usa o link mágico (deixa o campo de senha em branco) ou clica em \"esqueci minha senha\".",
    "en-US": "no password set yet. use the magic link (leave password blank) or click \"forgot password\".",
  },
} as const;

export type UiMessageKey = keyof typeof UI_MESSAGES;

const detectLocale = (): AuthErrorLocale => {
  if (typeof navigator === "undefined") return "pt-BR";
  const lang = (navigator.language || "pt-BR").toLowerCase();
  return lang.startsWith("pt") ? "pt-BR" : "en-US";
};

const decode = (raw?: string | null) => {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " "));
  } catch {
    return raw;
  }
};

const classify = (input: AuthErrorInput): ResolvedAuthError["kind"] => {
  const code = (input.errorCode || "").toLowerCase();
  const error = (input.error || "").toLowerCase();
  const desc = decode(input.errorDescription).toLowerCase();

  // Expired: otp_expired, signup_disabled token expirado, link de magic link queimado
  if (
    code === "otp_expired" ||
    code === "expired_token" ||
    desc.includes("expired") ||
    desc.includes("expirado")
  ) {
    return "expired";
  }

  // Invalid: One-time token not found, invalid_grant, etc
  if (
    code === "invalid_grant" ||
    code === "validation_failed" ||
    code === "bad_oauth_state" ||
    desc.includes("invalid") ||
    desc.includes("not found") ||
    desc.includes("inválido")
  ) {
    return "invalid";
  }

  // Rate limit
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    desc.includes("rate limit") ||
    desc.includes("too many")
  ) {
    return "rate_limited";
  }

  // Server-side
  if (
    error === "server_error" ||
    error === "temporarily_unavailable" ||
    desc.includes("internal") ||
    desc.includes("unexpected")
  ) {
    return "server";
  }

  // Access denied genérico (vem com otp_expired na maioria das vezes,
  // mas pode chegar sem error_code em fluxos OAuth)
  if (error === "access_denied" || error === "unauthorized_client") {
    return "denied";
  }

  return "unknown";
};

/**
 * Recebe os params de erro do Supabase e devolve título + categoria pra exibir no toast.
 */
export const resolveAuthError = (
  input: AuthErrorInput,
  locale: AuthErrorLocale = detectLocale(),
): ResolvedAuthError => {
  const kind = classify(input);
  const title = MESSAGES[kind][locale];
  const duration = kind === "expired" || kind === "invalid" ? 9000 : 7000;
  return { title, kind, duration };
};

/**
 * Helper pra extrair os 3 params de erro de uma URL (search + hash).
 * Retorna null se não houver nenhum erro presente.
 */
export const readAuthErrorFromUrl = (
  search: URLSearchParams,
  hash: string,
): AuthErrorInput | null => {
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(cleanHash);
  const error = search.get("error") || hashParams.get("error");
  const errorCode = search.get("error_code") || hashParams.get("error_code");
  const errorDescription =
    search.get("error_description") || hashParams.get("error_description");
  if (!error && !errorCode && !errorDescription) return null;
  return { error, errorCode, errorDescription };
};

/**
 * Pega uma string de UI no idioma do navegador.
 */
export const t = (key: UiMessageKey, locale: AuthErrorLocale = detectLocale()): string => {
  return UI_MESSAGES[key][locale];
};
