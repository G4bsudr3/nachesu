import { z } from "zod";

/**
 * fbi v2 — 19 perguntas em 4 seções (identidade, logística, o que te move, bônus).
 * pre-fill conversacional vindo de invited_participants.
 * tom: lowercase, perestroika, direto.
 */

export type FbiFieldType = "text" | "textarea" | "boolean" | "select" | "number";
export type FbiSection = "identidade" | "logistica" | "move" | "bonus";

export const fbiFieldKeys = [
  // identidade (9)
  "nome",
  "nickname",
  "idade",
  "instagram",
  "linkedin",
  "trabalho",
  "cidade",
  "ja_fez_perestroika",
  "quais_cursos_perestroika",
  // logística (2)
  "restricao_alimentar",
  "locomocao",
  // o que te move (6)
  "expectativa_chora",
  "maior_desafio",
  "experiencia_lovable",
  "ultima_criacao_orgulho",
  "ideia_gaveta",
  "perde_nocao_tempo",
  // bônus (1, inline no review)
  "algo_mais",
] as const;

export type FbiFieldKey = (typeof fbiFieldKeys)[number];

export type FbiData = Partial<Record<FbiFieldKey, string | number | boolean | null>>;

export interface FbiStep {
  /** chave do campo na tabela ou marcador especial */
  key: FbiFieldKey | "welcome" | "review" | "transition-logistica" | "transition-move";
  section?: FbiSection;
  /** texto curto exibido no topo (ex: "01 / 18") */
  badge?: string;
  /** título grande (display) — sem ponto final */
  title: string;
  /** subtítulo opcional, body */
  hint?: string;
  /** placeholder do input */
  placeholder?: string;
  /** tipo de input */
  type?: FbiFieldType;
  /** opções pra select */
  options?: { value: string; label: string }[];
  /** opcional: pode pular este step */
  optional?: boolean;
  /** se este step só aparece quando outro campo tem valor específico */
  showWhen?: { field: FbiFieldKey; equals: string | boolean };
  /** label conversacional pra confirmar valor pre-fill ("a gente tem **X**, confere?") */
  confirmKey?: FbiFieldKey;
  /** label da transição (apenas pra transition-*) */
  transitionLabel?: string;
  /** subtítulo pequeno da transição */
  transitionSub?: string;
}

const requiredText = (msg: string, max = 255) =>
  z.string().trim().min(1, msg).max(max);
const optionalText = (max = 255) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const fbiFieldSchemas: Record<FbiFieldKey, z.ZodTypeAny> = {
  nome: requiredText("qual é o seu nome?", 120),
  nickname: requiredText("qual é o seu apelido?", 60),
  idade: z
    .union([
      z.number().int().min(14, "entre 14 e 99, por favor").max(99, "entre 14 e 99, por favor"),
      z
        .string()
        .regex(/^\d+$/, "só números aqui")
        .transform((s) => parseInt(s, 10))
        .pipe(z.number().int().min(14, "entre 14 e 99, por favor").max(99, "entre 14 e 99, por favor")),
    ]),
  instagram: optionalText(120),
  linkedin: optionalText(255),
  trabalho: requiredText("conta o que você faz", 200),
  cidade: requiredText("de onde você é?", 80),
  ja_fez_perestroika: z.union([z.literal("sim"), z.literal("nao")], {
    message: "sim ou não?",
  }),
  quais_cursos_perestroika: optionalText(400),
  restricao_alimentar: optionalText(400),
  locomocao: optionalText(400),
  expectativa_chora: requiredText("conta um pouco mais (mín 10)", 800).refine(
    (v) => v.length >= 10,
    "conta um pouco mais (mín 10)",
  ),
  maior_desafio: requiredText("conta um pouco mais (mín 10)", 800).refine(
    (v) => v.length >= 10,
    "conta um pouco mais (mín 10)",
  ),
  experiencia_lovable: z.union(
    [z.literal("nunca-usei"), z.literal("ja-mexi"), z.literal("ja-publiquei"), z.literal("uso-diario")],
    { message: "escolhe uma opção" },
  ),
  ultima_criacao_orgulho: requiredText("conta um pouco mais (mín 10)", 800).refine(
    (v) => v.length >= 10,
    "conta um pouco mais (mín 10)",
  ),
  ideia_gaveta: requiredText("conta um pouco mais (mín 10)", 800).refine(
    (v) => v.length >= 10,
    "conta um pouco mais (mín 10)",
  ),
  perde_nocao_tempo: requiredText("conta um pouco mais (mín 10)", 800).refine(
    (v) => v.length >= 10,
    "conta um pouco mais (mín 10)",
  ),
  algo_mais: optionalText(800),
};

/** schema final pro submit */
export const fbiSubmitSchema = z.object(fbiFieldSchemas as never);

/** definição de cada step na ordem em que aparece */
export const fbiSteps: FbiStep[] = [
  {
    key: "welcome",
    title: "fbi. formulário básico de identidade.",
    hint: "19 perguntas para a gente se conhecer melhor antes da imersão. o que você já respondeu na inscrição está aqui, é só conferir e editar se precisar. salva sozinho enquanto você responde.",
  },

  // ============ identidade ============
  {
    key: "nome",
    section: "identidade",
    badge: "01 / 18",
    title: "qual é o seu nome?",
    hint: "nome completo, do jeito que você prefere ser chamado.",
    placeholder: "ex: maria silva",
    type: "text",
    confirmKey: "nome",
  },
  {
    key: "nickname",
    section: "identidade",
    badge: "02 / 18",
    title: "e como gostam de te chamar?",
    hint: "vai aparecer no hub e nas dinâmicas.",
    placeholder: "ex: maria, mari, lila…",
    type: "text",
    confirmKey: "nickname",
  },
  {
    key: "idade",
    section: "identidade",
    badge: "03 / 17",
    title: "quantos anos você tem?",
    hint: "ajuda a calibrar as referências.",
    placeholder: "ex: 32",
    type: "number",
  },
  {
    key: "instagram",
    section: "identidade",
    badge: "04 / 17",
    title: "seu instagram?",
    hint: "opcional. ajuda a turma a te achar depois do evento.",
    placeholder: "@seuhandle",
    type: "text",
    optional: true,
    confirmKey: "instagram",
  },
  {
    key: "linkedin",
    section: "identidade",
    badge: "05 / 17",
    title: "seu linkedin?",
    hint: "opcional. para conectar com a turma depois.",
    placeholder: "linkedin.com/in/...",
    type: "text",
    optional: true,
  },
  {
    key: "trabalho",
    section: "identidade",
    badge: "06 / 17",
    title: "o que você faz?",
    hint: "ocupação, cargo ou papel. descreva à vontade, com o máximo de detalhe que quiser.",
    placeholder: "ex: designer de produto, fundador, estudante…",
    type: "text",
  },
  {
    key: "cidade",
    section: "identidade",
    badge: "07 / 17",
    title: "de onde você é?",
    hint: "cidade onde mora hoje.",
    placeholder: "ex: porto alegre",
    type: "text",
    confirmKey: "cidade",
  },
  {
    key: "ja_fez_perestroika",
    section: "identidade",
    badge: "08 / 17",
    title: "já fez algum curso da perestroika?",
    type: "select",
    options: [
      { value: "sim", label: "sim" },
      { value: "nao", label: "não" },
    ],
    confirmKey: "ja_fez_perestroika",
  },
  {
    key: "quais_cursos_perestroika",
    section: "identidade",
    badge: "09 / 17",
    title: "quais cursos?",
    hint: "lista os que você lembra.",
    placeholder: "ex: pensamento estratégico, ux research…",
    type: "textarea",
    optional: true,
    showWhen: { field: "ja_fez_perestroika", equals: "sim" },
    confirmKey: "quais_cursos_perestroika",
  },

  // ============ transition: logística ============
  {
    key: "transition-logistica",
    section: "logistica",
    title: "02 / logística",
    transitionLabel: "02 / logística",
    transitionSub: "para a gente te receber bem.",
  },

  // ============ logística ============
  {
    key: "restricao_alimentar",
    section: "logistica",
    badge: "10 / 17",
    title: "alguma restrição alimentar?",
    hint: "queremos garantir que sua alimentação durante o evento atenda sua restrição. quanto mais detalhe, melhor pra gente combinar com a cozinha.",
    placeholder: "vegana, intolerante a lactose, celíaca, alergias… ou 'como de tudo'",
    type: "textarea",
    optional: true,
  },
  {
    key: "locomocao",
    section: "logistica",
    badge: "11 / 17",
    title: "precisa de algo especial para locomoção?",
    hint: "queremos que o espaço funcione bem para você.",
    placeholder: "cadeirante, dificuldade em escadas, etc. fique tranquilo se não precisar de nada",
    type: "textarea",
    optional: true,
  },

  // ============ transition: o que te move ============
  {
    key: "transition-move",
    section: "move",
    title: "03 / o que te move",
    transitionLabel: "03 / o que te move",
    transitionSub: "a parte boa.",
  },

  // ============ o que te move ============
  {
    key: "expectativa_chora",
    section: "move",
    badge: "12 / 17",
    title: "o que você espera dos 2 dias?",
    hint: "uma expectativa clara ajuda a gente a entregar.",
    placeholder: "o que seria sucesso para você?",
    type: "textarea",
    confirmKey: "expectativa_chora",
  },
  {
    key: "maior_desafio",
    section: "move",
    badge: "13 / 17",
    title: "qual seu maior desafio hoje para criar com ia?",
    hint: "o que mais te trava na hora de tirar uma ideia do papel.",
    placeholder: "conta a principal trava",
    type: "textarea",
    confirmKey: "maior_desafio",
  },
  {
    key: "experiencia_lovable",
    section: "move",
    badge: "14 / 17",
    title: "sua experiência com lovable hoje?",
    type: "select",
    options: [
      { value: "nunca-usei", label: "nunca usei" },
      { value: "ja-mexi", label: "já mexi um pouco" },
      { value: "ja-publiquei", label: "já publiquei algum projeto" },
      { value: "uso-diario", label: "uso quase todo dia" },
    ],
    confirmKey: "experiencia_lovable",
  },
  {
    key: "ultima_criacao_orgulho",
    section: "move",
    badge: "15 / 17",
    title: "qual a última coisa que você criou e ficou orgulhoso?",
    hint: "pode ser projeto, post, conversa, refeição, qualquer coisa.",
    placeholder: "conta para a gente",
    type: "textarea",
  },
  {
    key: "ideia_gaveta",
    section: "move",
    badge: "16 / 17",
    title: "tem alguma ideia na gaveta esperando o momento?",
    hint: "pode ser vaga ou clara. responde com suas palavras.",
    placeholder: "descreve a ideia",
    type: "textarea",
  },
  {
    key: "perde_nocao_tempo",
    section: "move",
    badge: "17 / 17",
    title: "o que te faz perder a noção do tempo?",
    hint: "aquilo que você faz e, quando vê, já passaram horas.",
    placeholder: "conta para a gente",
    type: "textarea",
  },

  // ============ review (algo_mais inline) ============
  {
    key: "review",
    title: "tudo certo?",
    hint: "dá uma conferida nas respostas. depois de enviar, vira só leitura.",
  },
];

export const totalQuestionSteps = fbiSteps.filter(
  (s) => s.section && !String(s.key).startsWith("transition-"),
).length;

/** agrupamento temático pras 4 seções */
export interface FbiTheme {
  key: FbiSection;
  label: string;
  fields: FbiFieldKey[];
}

export const fbiThemes: FbiTheme[] = [
  {
    key: "identidade",
    label: "identidade",
    fields: [
      "nome",
      "nickname",
      "idade",
      "instagram",
      "linkedin",
      "trabalho",
      "cidade",
      "ja_fez_perestroika",
      "quais_cursos_perestroika",
    ],
  },
  {
    key: "logistica",
    label: "logística",
    fields: ["restricao_alimentar", "locomocao"],
  },
  {
    key: "move",
    label: "o que te move",
    fields: [
      "expectativa_chora",
      "maior_desafio",
      "experiencia_lovable",
      "ultima_criacao_orgulho",
      "ideia_gaveta",
      "perde_nocao_tempo",
    ],
  },
  {
    key: "bonus",
    label: "bônus",
    fields: ["algo_mais"],
  },
];

export const getThemeForField = (key: FbiFieldKey): FbiTheme | undefined =>
  fbiThemes.find((t) => t.fields.includes(key));

export const getSectionLabel = (section: FbiSection): string =>
  fbiThemes.find((t) => t.key === section)?.label ?? section;
