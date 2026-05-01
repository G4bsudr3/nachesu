// schema + tipos da pesquisa final do evento.
// 9 perguntas em 4 blocos: warm-up, notas, impacto, coração aberto.

export interface FeedbackFinalDraft {
  geral: string;
  mais_gostou: string;
  menos_gostou: string;
  conteudo_faltou: string;
  nota_imersao: number | null;
  nota_profs: number | null;
  melhoria_entregas: number | null;
  nps_recomendacao: number | null;
  coracao_aberto: string;
}

export const EMPTY_DRAFT: FeedbackFinalDraft = {
  geral: "",
  mais_gostou: "",
  menos_gostou: "",
  conteudo_faltou: "",
  nota_imersao: null,
  nota_profs: null,
  melhoria_entregas: null,
  nps_recomendacao: null,
  coracao_aberto: "",
};

export interface StepDef {
  id: keyof FeedbackFinalDraft;
  block: number;
  blockLabel: string;
  kind: "text" | "slider" | "scale";
  question: string;
  helper?: string;
  required: boolean;
  placeholder?: string;
  /** texto explicando o significado das pontas no slider/escala */
  scaleLabels?: { low: string; high: string };
  /** range pra slider (0-10 ou 1-5) */
  range?: { min: number; max: number };
}

export const STEPS: StepDef[] = [
  {
    id: "geral",
    block: 1,
    blockLabel: "primeiras impressões",
    kind: "text",
    question: "de modo geral, como foi pra você?",
    helper: "responde no seu tempo, no seu jeito.",
    required: false,
    placeholder: "conta como tá saindo daqui…",
  },
  {
    id: "mais_gostou",
    block: 1,
    blockLabel: "primeiras impressões",
    kind: "text",
    question: "o que você MAIS gostou de ver ou fazer?",
    helper: "pode ser um momento, um conteúdo, uma pessoa.",
    required: false,
    placeholder: "o que ficou marcado…",
  },
  {
    id: "menos_gostou",
    block: 1,
    blockLabel: "primeiras impressões",
    kind: "text",
    question: "e o que MENOS gostou?",
    helper: "manda real, isso ajuda a próxima edição a ser melhor.",
    required: false,
    placeholder: "fala sem filtro…",
  },
  {
    id: "conteudo_faltou",
    block: 2,
    blockLabel: "o que faltou",
    kind: "text",
    question: "tem algum conteúdo que você não viu, mas sentiu falta?",
    helper: "pode ser tema, ferramenta, um aprofundamento que ficou no ar.",
    required: false,
    placeholder: "o que você gostaria de ter visto…",
  },
  {
    id: "nota_imersao",
    block: 2,
    blockLabel: "o que faltou",
    kind: "slider",
    question: "qual nota você daria pra imersão?",
    helper: "0 = horrível · 10 = mudou minha vida.",
    required: true,
    range: { min: 0, max: 10 },
    scaleLabels: { low: "péssima", high: "incrível" },
  },
  {
    id: "nota_profs",
    block: 2,
    blockLabel: "o que faltou",
    kind: "slider",
    question: "qual nota você daria pros profs?",
    helper: "considera presença, clareza, energia.",
    required: true,
    range: { min: 0, max: 10 },
    scaleLabels: { low: "fraca", high: "afiada" },
  },
  {
    id: "melhoria_entregas",
    block: 3,
    blockLabel: "impacto",
    kind: "scale",
    question: "saindo daqui, suas entregas profissionais vão melhorar?",
    helper: "1 = nada vai mudar · 5 = com certeza absoluta.",
    required: true,
    range: { min: 1, max: 5 },
    scaleLabels: { low: "nada", high: "com certeza" },
  },
  {
    id: "nps_recomendacao",
    block: 3,
    blockLabel: "impacto",
    kind: "slider",
    question: "indicaria pra um amigo fazer a próxima edição?",
    helper: "0 = jamais · 10 = já tô indicando.",
    required: true,
    range: { min: 0, max: 10 },
    scaleLabels: { low: "não", high: "com certeza" },
  },
  {
    id: "coracao_aberto",
    block: 4,
    blockLabel: "coração aberto",
    kind: "text",
    question: "abre o coração, queremos ouvir você ♡",
    helper: "qualquer coisa que ficou, da mais boba à mais profunda.",
    required: false,
    placeholder: "escreve à vontade…",
  },
];

export const isStepFilled = (step: StepDef, draft: FeedbackFinalDraft): boolean => {
  const v = draft[step.id];
  if (step.kind === "text") return typeof v === "string" && v.trim().length > 0;
  return typeof v === "number";
};

export const isStepValid = (step: StepDef, draft: FeedbackFinalDraft): boolean => {
  if (!step.required) return true;
  return isStepFilled(step, draft);
};
