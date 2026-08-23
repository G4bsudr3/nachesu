/**
 * versão vigente do aviso de privacidade do tutor de IA.
 *
 * bump this quando o texto do TutorConsentModal / da política mudar de forma
 * material: alunos que aceitaram uma versão anterior serão convidados a
 * reconsentir. use o formato de data ISO (AAAA-MM-DD) da vigência.
 */
export const TUTOR_CONSENT_VERSION = "2026-08-23";

/**
 * regra de aceite:
 * - sem data de aceite  -> precisa consentir.
 * - tem data mas SEM versão (consentimento legado, anterior ao versionamento)
 *   -> mantido como válido (grandfather); não reprompta em massa.
 * - tem data e versão diferente da vigente -> precisa reconsentir.
 */
export function isConsentCurrent(at: string | null, version: string | null): boolean {
  if (!at) return false;
  if (version == null) return true; // legado: aceito antes de existir versão
  return version === TUTOR_CONSENT_VERSION;
}
