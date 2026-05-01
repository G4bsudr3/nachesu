import type { BuilderLevel } from "@/lib/builderLevel";
import type { PreworkItem } from "./usePrework";

/** override de descrição/url/duração por nível pra cada item core (chave = `ordem` do banco). */
export const OVERRIDES_BY_LEVEL: Record<
  number,
  Partial<Record<BuilderLevel, Partial<Pick<PreworkItem, "descricao" | "url" | "duracao_min">>>>
> = {
  // 1: boas-vindas à imersão
  1: {
    novato: { descricao: "guia rápido do que vai rolar nos 2 dias. dá pra começar por aqui sem se preocupar em entender tudo, ou ir mais fundo nos cases que te chamarem atenção." },
    iniciante: { descricao: "guia rápido do que vai rolar nos 2 dias. começa pela visão geral, depois vai mais fundo no fluxo da imersão se quiser." },
  },
  // 3: a arte do prompt
  3: {
    novato: { descricao: "começa por aqui pelos 3 primeiros tópicos pra entender a base. se rolar curiosidade, vai mais fundo no resto, sem pressão." },
    iniciante: { descricao: "começa por aqui pelo guia inteiro. se quiser ir mais fundo, abre os exemplos linkados ao longo do texto." },
    intermediario: { descricao: "começa por aqui pulando o que você já usa. vai mais fundo em chat mode, plan mode ou edit mode se algum ainda for novidade." },
    avancado: { descricao: "vai mais fundo direto na parte de chat mode + plan mode pra economia de créditos. o resto fica como referência rápida." },
  },
  // 5: quando reverter
  5: {
    novato: { descricao: "se rolar erro, esse botão volta pra última versão que funcionava. começa por aqui pra saber onde fica antes de precisar." },
  },
  // 6: mostre teu prompt no grupo
  6: {
    avancado: { descricao: "se quiser, compartilha um prompt seu no grupo pra circular ideia entre quem tá explorando caminhos parecidos." },
  },
};

/** itens injetados no front, posicionados antes ou depois de um item core (por `ordem`). */
export interface ExtraItem {
  id: string; // estável, usado pra progresso em localStorage
  insertAtOrdem: number; // injetar antes do item core com essa ordem
  forLevels: BuilderLevel[];
  data: Omit<PreworkItem, "id" | "ordem"> & { obrigatorio?: boolean };
}

export const EXTRA_ITEMS: ExtraItem[] = [
  // === NOVATO/INICIANTE: introdução fundamental antes de tudo ===
  {
    id: "extra:video-comeca-aqui",
    insertAtOrdem: 1,
    forLevels: ["novato", "iniciante"],
    data: {
      tipo: "video",
      titulo: "vídeo: começa por aqui (10 min)",
      descricao: "vídeo oficial do lovable mostrando como funciona na prática. em inglês, mas o visual entrega.",
      url: "https://www.youtube.com/watch?v=4NpUPggv3oU",
      duracao_min: 10,
      obrigatorio: false,
    },
  },
  {
    id: "extra:o-que-e-lovable",
    insertAtOrdem: 1,
    forLevels: ["novato", "iniciante"],
    data: {
      tipo: "leitura",
      titulo: "o que é o lovable",
      descricao: "antes de tudo, entende o que é. lovable é um chat que vira app. você fala, ele constrói.",
      url: "https://docs.lovable.dev/introduction",
      duracao_min: 3,
      obrigatorio: true,
    },
  },
  {
    id: "extra:anatomia-da-tela",
    insertAtOrdem: 3,
    forLevels: ["novato", "iniciante"],
    data: {
      tipo: "leitura",
      titulo: "anatomia da tela do lovable",
      descricao: "preview, chat, dev mode, publish. essas 4 áreas é tudo.",
      url: "https://docs.lovable.dev/introduction/getting-started",
      duracao_min: 5,
      obrigatorio: false,
    },
  },

  // === INTERMEDIÁRIO/AVANÇADO: aprofundamento técnico ===
  {
    id: "extra:changelog-2026",
    insertAtOrdem: 1,
    forLevels: ["intermediario", "avancado"],
    data: {
      tipo: "leitura",
      titulo: "o que mudou no lovable em 2026",
      descricao: "vê as features novas. provavelmente metade você ainda não usou.",
      url: "https://docs.lovable.dev/changelog",
      duracao_min: 5,
      obrigatorio: false,
    },
  },
  {
    id: "extra:lovable-cloud",
    insertAtOrdem: 4,
    forLevels: ["intermediario", "avancado"],
    data: {
      tipo: "leitura",
      titulo: "lovable cloud: backend sem dor",
      descricao: "auth, db, edge functions, storage. é supabase nativo embutido. não precisa criar conta.",
      url: "https://docs.lovable.dev/features/cloud",
      duracao_min: 10,
      obrigatorio: false,
    },
  },
  {
    id: "extra:lovable-ai",
    insertAtOrdem: 4,
    forLevels: ["intermediario", "avancado"],
    data: {
      tipo: "leitura",
      titulo: "lovable AI gateway",
      descricao: "claude, gpt-5, gemini sem precisar de api key. usa direto nas edge functions.",
      url: "https://docs.lovable.dev/features/ai",
      duracao_min: 8,
      obrigatorio: false,
    },
  },
  {
    id: "extra:integracoes",
    insertAtOrdem: 5,
    forLevels: ["intermediario", "avancado"],
    data: {
      tipo: "leitura",
      titulo: "integrações nativas",
      descricao: "twilio, slack, stripe, granola, notion. zero n8n, zero make.",
      url: "https://docs.lovable.dev/integrations",
      duracao_min: 10,
      obrigatorio: false,
    },
  },
];

/** mensagem contextual no topo da página por nível. */
export const LEVEL_INTRO: Record<BuilderLevel, string> = {
  novato: "em cada item você escolhe a profundidade: começa por aqui pra entender o essencial, ou vai mais fundo se a curiosidade pedir.",
  iniciante: "em cada item você escolhe: começa por aqui pra firmar a base, ou vai mais fundo onde quiser esticar.",
  intermediario: "em cada item você escolhe: começa por aqui pra revisar o que já viu, ou vai mais fundo direto onde tiver novidade.",
  avancado: "em cada item você escolhe a profundidade. tem camada técnica disponível em cloud, ai gateway e integrações nativas se quiser ir mais fundo.",
};
