/**
 * checa se o conteúdo de uma entrega tem alguma resposta de verdade.
 * usado pra decidir se o rascunho pode ser promovido pra "enviado" quando o
 * módulo fecha sozinho (pelo check das pílulas) em vez do botão concluir.
 */
export function hasDeliverableAnswers(content: unknown): boolean {
  if (content == null) return false;
  if (typeof content === "string") return content.trim().length > 0;
  if (typeof content === "number" || typeof content === "boolean") return true;
  if (Array.isArray(content)) return content.some((v) => hasDeliverableAnswers(v));
  if (typeof content === "object") {
    return Object.values(content as Record<string, unknown>).some((v) =>
      hasDeliverableAnswers(v),
    );
  }
  return false;
}
