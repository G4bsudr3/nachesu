/** computa o "próximo passo" da jornada do aluno no hub.
 *  função pura: recebe flags de estado e devolve um CTA único.
 */
import type { BuilderLevel } from "@/lib/builderLevel";
import type { DepthPref } from "@/hooks/useDepth";

export type JourneyKind =
  | "fbi"
  | "carta-gerando"
  | "prework-start"
  | "prework-continue"
  | "tutorial-start"
  | "tutorial-continue"
  | "missao01"
  | "missao02"
  | "done";

export interface JourneyInput {
  fbiSubmitted: boolean;
  cardStatus: "none" | "gerando" | "revisao" | "publicada" | "erro";
  preworkDone: number;
  preworkTotal: number;
  tutorialCount: number;
  tutorialTotal: number;
  mission01Submitted: boolean;
  mission02Submitted: boolean;
  level?: BuilderLevel;
  depth?: DepthPref;
}

export interface JourneyStep {
  label: string;
  helper: string;
  href: string | null;
  kind: JourneyKind;
}

export const computeNextStep = (i: JourneyInput): JourneyStep => {
  if (!i.fbiSubmitted) {
    return {
      label: "preencher fbi",
      helper: "uns 10 min · libera sua carta personalizada quando quiser fazer",
      href: "/forms",
      kind: "fbi",
    };
  }

  if (i.cardStatus === "gerando" || i.cardStatus === "revisao" || i.cardStatus === "erro") {
    return {
      label: "sua carta tá sendo escrita",
      helper: "a equipe da escola está finalizando. te avisamos quando publicar.",
      href: "/app/carta",
      kind: "carta-gerando",
    };
  }

  const preworkPct = i.preworkTotal === 0 ? 0 : i.preworkDone / i.preworkTotal;

  if (i.preworkTotal > 0 && i.preworkDone === 0) {
    return {
      label: "começar pré-work",
      helper: `${i.preworkTotal} itens com profundidade que você escolhe`,
      href: "/app/prework",
      kind: "prework-start",
    };
  }

  if (preworkPct < 0.5) {
    return {
      label: `continuar pré-work (${i.preworkDone}/${i.preworkTotal})`,
      helper: "leituras curtas, profundidade opcional em cada uma",
      href: "/app/prework",
      kind: "prework-continue",
    };
  }

  if (i.tutorialCount === 0) {
    const helper =
      i.depth === "vai-mais-fundo"
        ? "etapa 00 (escolher ideia) + 5 etapas com camada técnica em cada uma. tem o caminho direto se preferir."
        : i.depth === "comeca-por-aqui"
          ? "etapa 00 (escolher ideia) + 5 etapas no caminho mais direto. tem camada técnica opcional pra ir mais fundo."
          : "etapa 00 (escolher ideia) + 5 etapas. em cada uma você escolhe se começa por aqui ou vai mais fundo.";
    return {
      label: "fazer o tutorial pra construir seu manifesto",
      helper,
      href: "/app/tutorial",
      kind: "tutorial-start",
    };
  }

  if (i.tutorialCount < i.tutorialTotal) {
    return {
      label: `continuar tutorial (${i.tutorialCount}/${i.tutorialTotal})`,
      helper: "você tá no meio. retoma de onde parou.",
      href: "/app/tutorial",
      kind: "tutorial-continue",
    };
  }

  if (!i.mission01Submitted) {
    return {
      label: "publicar manifesto e enviar missão 01",
      helper: "fechar o ciclo do tutorial",
      href: "/app/missoes#m01",
      kind: "missao01",
    };
  }

  if (!i.mission02Submitted) {
    return {
      label: "ir pra missão 02: seu prompt favorito",
      helper: "uns 10 min, no seu tempo",
      href: "/app/missoes",
      kind: "missao02",
    };
  }

  return {
    label: "revisita o que quiser",
    helper: "hub da turma libera dia 25",
    href: null,
    kind: "done",
  };
};
