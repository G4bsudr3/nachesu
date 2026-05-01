/** Lista dos 5 emails com acesso completo (admins de fato).
 * Usada como gate de UX no client. Não substitui RLS nem app_role. */
export const ALLOWED_EMAILS = new Set([
  "hey@frattz.com",
  "mateusfrattezi@gmail.com",
  "frattz@naches.app",
  "pamela@perestroika.com.br",
  "helena@perestroika.com.br",
]);

export type AccessLevel = "full" | "gated";

export const isFullAccess = (email?: string | null): boolean => {
  if (!email) return false;
  return ALLOWED_EMAILS.has(email.trim().toLowerCase());
};

/** Mensagem padrão exibida pra gated users tentando acessar features bloqueadas */
export const GATED_LOCK_MESSAGE =
  "essa parte abre durante a imersão, fica de olho no whatsapp 🤙";

export const GATED_BADGE_LABEL = "libera durante a semana";

/** Como exibir o card "hub da turma" no dashboard:
 * - "hidden": esconde completamente até o dia 25 (recomendado pré-evento)
 * - "locked": mostra travado com badge "em breve" e cta "abre dia 25"
 * - "open": liberado, redireciona pro hub
 */
export type HubDisplayMode = "hidden" | "locked" | "open";
export const HUB_DISPLAY_MODE: HubDisplayMode = "open";

/** @deprecated use HUB_DISPLAY_MODE. mantido pra compat retro. */
export const COMING_SOON_HUB: boolean = (HUB_DISPLAY_MODE as HubDisplayMode) !== "open";

