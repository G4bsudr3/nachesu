// usa os resolvers de pílula pra decidir se um deliverable em rascunho está,
// de fato, com o conteúdo todo preenchido (só falta o estudante apertar enviar).
//
// usado:
// - na listagem do admin pra destacar "rascunho completo"
// - no drawer pra liberar a ação "marcar como enviado" e mostrar o que falta

import { resolvePill } from "./resolvers";
import type {
  DeliverableContent,
  PillForResolve,
  ResolvedAnswer,
} from "./types";

export type CompletenessPill = {
  id: string;
  title: string;
  /** true se a pílula tem conteúdo aceitável (respondida ou passiva) */
  isAnswered: boolean;
  /** estado bruto resolvido contra o schema da pílula */
  state: ResolvedAnswer["state"];
};

export type Completeness = {
  /** total de pílulas obrigatórias do módulo */
  requiredTotal: number;
  /** quantas obrigatórias têm conteúdo aceitável (respondida ou passiva) */
  requiredAnswered: number;
  /** títulos das obrigatórias que ainda não foram respondidas (compat) */
  missing: string[];
  /** títulos das obrigatórias respondidas (compat) */
  answered: string[];
  /** detalhe por pílula obrigatória (id + título + estado) */
  required: CompletenessPill[];
  /** true quando todas as obrigatórias estão respondidas/passivas */
  isComplete: boolean;
};

const EMPTY: Completeness = {
  requiredTotal: 0,
  requiredAnswered: 0,
  missing: [],
  answered: [],
  required: [],
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
    return {
      requiredTotal: 0,
      requiredAnswered: 0,
      missing: [],
      answered: [],
      required: [],
      isComplete: true,
    };
  }
  const safeContent = (content ?? {}) as DeliverableContent;
  const detail: CompletenessPill[] = [];
  let answeredCount = 0;
  const missingTitles: string[] = [];
  const answeredTitles: string[] = [];
  for (const p of required) {
    const resolved = resolvePill(p, safeContent);
    const ok = isAcceptable(resolved);
    detail.push({ id: p.id, title: p.title, isAnswered: ok, state: resolved.state });
    if (ok) {
      answeredCount += 1;
      answeredTitles.push(p.title);
    } else {
      missingTitles.push(p.title);
    }
  }
  return {
    requiredTotal: required.length,
    requiredAnswered: answeredCount,
    missing: missingTitles,
    answered: answeredTitles,
    required: detail,
    isComplete: answeredCount === required.length,
  };
}
