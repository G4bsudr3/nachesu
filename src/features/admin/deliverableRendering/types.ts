// blocos atômicos que o renderer de entrega monta a partir do conteúdo do estudante
// + schema da pílula. cada resolver de pílula devolve um array desses.

export type AnswerBlock =
  | { kind: "text"; question: string; answer: string; hint?: string }
  | {
      kind: "choice";
      question: string;
      /** valor cru salvo (ex: "b") */
      answer: string;
      /** label resolvido contra schema (ex: "prompt longo") */
      optionLabel?: string;
      /** marcadores opcionais (quiz) */
      isCorrect?: boolean;
      correctLabel?: string;
    }
  | {
      kind: "multi";
      question: string;
      answers: { value: string; label: string }[];
      isCorrect?: boolean;
      correctLabels?: string[];
    }
  | {
      kind: "upload";
      question: string;
      /** signed url (gerada async via signedUrl helper) ou link externo */
      url: string | null;
      kindLabel: "arquivo" | "link";
      filename?: string;
      /** caminho cru no bucket (pra debug) */
      path?: string;
      bucket?: string;
    }
  | {
      kind: "list";
      question: string;
      items: { label: string; value: string }[];
    }
  | {
      kind: "checklist";
      question: string;
      items: { label: string; checked: boolean }[];
    }
  | { kind: "empty"; question: string; hint?: string };

export type PillKind =
  | "pilula_a"
  | "pilula_b"
  | "pilula_c"
  | "exercicio_pbl"
  | "registro";

export type PillSchemaType =
  | "pilula_editorial"
  | "pbl_estruturado"
  | "checklist_pacto"
  | "curated_content_with_questions"
  | "quiz"
  | "radar_form"
  | "bonus_text"
  | "classificador_linear_circular_regenerativo"
  | "pbl_corf_triplo"
  | "guia_de_prompts"
  | "video_embed"
  | "video_with_transcript"
  | undefined;

export type PillForResolve = {
  id: string;
  module_id: string;
  order_index: number;
  kind: PillKind;
  title: string;
  body_md: string | null;
  required: boolean;
  interaction_schema: Record<string, unknown> | null;
};

export type ResolvedAnswer = {
  pillId: string;
  order: number;
  kind: PillKind;
  schemaType: PillSchemaType;
  /** label humano do tipo de pílula (abertura / conteúdo / pbl / reflexão) */
  kindLabel: string;
  title: string;
  required: boolean;
  blocks: AnswerBlock[];
  /** se todos os blocos com resposta existem */
  state: "respondida" | "parcial" | "nao-respondida" | "passiva";
};

export type DeliverableContent = Record<string, unknown>;
