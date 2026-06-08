// usa os resolvers de pílula pra decidir se um deliverable em rascunho está,
// de fato, com o conteúdo todo preenchido (só falta o estudante apertar enviar).
//
// usado:
// - na listagem do admin pra destacar "rascunho completo"
// - no drawer pra liberar a ação "marcar como enviado"

import { resolvePill } from "./resolvers";
import type {
  DeliverableContent,
  PillForResolve,
  ResolvedAnswer,
} from "./types";

export type Completeness = {
  /** total de pílulas obrigatórias do módulo */
  requiredTotal: number;
  /** quantas obrigatórias têm conteúdo aceitável (respondida ou passiva) */
  requiredAnswered: number;
  /** lista de títulos das pílulas obrigatórias que ainda não foram respondidas */
  missing: string[];
  /** true quando todas as obrigatórias estão respondidas/passivas */
  isComplete: boolean;
};

const EMPTY: Completeness = {
  requiredTotal: 0,
  requiredAnswered: 0,
  missing: [],
  isComplete: false,
};

const isAcceptable = (a: ResolvedAnswer): boolean =>
  a.state === "respondida" || a.state === "passiva";

export function computeCompleteness(
  pills: PillForResolve[] | null | undefined,
  content: DeliverableContent | null | undefined,
): Completeness {
  if (!pills || pills.length === 0) return EMPTY;
  const required = pills.filter((p) => p.required);
  if (required.length === 0) {
    return { requiredTotal: 0, requiredAnswered: 0, missing: [], isComplete: true };
  }
  const safeContent = (content ?? {}) as DeliverableContent;
  let answered = 0;
  const missing: string[] = [];
  for (const p of required) {
    const resolved = resolvePill(p, safeContent);
    if (isAcceptable(resolved)) answered += 1;
    else missing.push(p.title);
  }
  return {
    requiredTotal: required.length,
    requiredAnswered: answered,
    missing,
    isComplete: answered === required.length,
  };
}
