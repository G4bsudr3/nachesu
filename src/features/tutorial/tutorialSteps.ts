export interface FbiData {
  nickname?: string | null;
  trabalho?: string | null;
  ideia_gaveta?: string | null;
  maior_desafio?: string | null;
  expectativa_chora?: string | null;
}

export interface TutorialShortcut {
  label: string;
  url: string;
  external: boolean;
}

export interface TutorialDeepBlock {
  title: string;
  body: string;
  link?: { label: string; url: string };
}

export interface TutorialStep {
  id: string;
  number: string;
  title: string;
  duration: string;
  description: string;
  where: string;
  prompt: string;
  hint: string;
  whyItMatters: string;
  shortcuts: TutorialShortcut[];
  /** bloco "começa por aqui" — fundamentos pra quem tá começando. */
  noviceBlock?: TutorialDeepBlock;
  /** bloco "vai mais fundo" — camada técnica opcional. */
  expertBlock?: TutorialDeepBlock;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "ideia",
    number: "01",
    title: "transforma sua ideia em prompt",
    duration: "5 min",
    description: "usa esse prompt no ChatGPT/Claude pra virar um brief que o lovable vai transformar em app",
    where: "LLM externa (ChatGPT, Claude, Gemini)",
    whyItMatters: "porque ir direto pro lovable sem um brief é como pedir comida sem cardápio.",
    shortcuts: [
      { label: "abrir chatgpt", url: "https://chat.openai.com", external: true },
      { label: "abrir claude", url: "https://claude.ai", external: true },
      { label: "abrir gemini", url: "https://gemini.google.com", external: true },
    ],
    prompt: `oi! preciso da sua ajuda pra montar um brief pro lovable construir meu primeiro app.

contexto:
- minha profissão: {trabalho}
- ideia que quero construir: {ideia_gaveta}
- maior desafio hoje: {maior_desafio}
- o que quero sair com nessa eletiva: {expectativa_chora}

monta pra mim um BRIEFING COMPLETO pra colar no lovable, com essa estrutura:

## o que é
1-2 frases sobre o app

## quem usa
2-3 perfis de usuário

## telas principais
lista de 3 a 5 telas com o que cada uma mostra

## o que cada tela faz
ações principais por tela

## aparência
vibe visual (ex: minimalista, cores, tipografia)

## dados de exemplo
dados fictícios realistas pra popular o app (5-10 itens por tela)

IMPORTANTE: escreve TUDO em português do brasil. seja específico, nada genérico.`,
    hint: "💡 quando tiver a resposta, copia INTEIRO e guarda pra próxima etapa.",
    noviceBlock: {
      title: "começa por aqui",
      body: "se nunca usou ChatGPT/Claude pra brief, o segredo é dar contexto antes de pedir. um prompt bom tem 4 partes: contexto (quem você é), objetivo (o que quer), restrições (o que evitar) e exemplo (uma referência). o template aqui já vem com tudo. só substitui as chaves {} pelas suas respostas e cola.",
      link: { label: "tutorial básico de ChatGPT", url: "https://help.openai.com/en/articles/6783457-what-is-chatgpt" },
    },
    expertBlock: {
      title: "vai mais fundo",
      body: "pra brief técnico, organiza o prompt em tags XML (<contexto>, <restricoes>, <output>). claude lê seções marcadas melhor que markdown puro. peça pra LLM gerar user stories antes do brief, depois alinha em chat mode no lovable, depois plan mode. resultado: protótipo mais fiel em menos iterações.",
      link: { label: "guia de prompting do lovable", url: "https://docs.lovable.dev/prompting/prompting-one" },
    },
  },
  {
    id: "cria",
    number: "02",
    title: "cria seu protótipo no lovable",
    duration: "10-15 min",
    description: "cola o brief da etapa anterior no lovable e deixa ele trabalhar",
    where: "lovable.dev",
    whyItMatters: "porque aqui sua ideia ganha forma. é o momento que vira algo clicável.",
    shortcuts: [
      { label: "abrir lovable", url: "https://lovable.dev/invite/3PLAIFF", external: true },
    ],
    prompt: "(sem prompt novo — cola aqui a RESPOSTA que a IA gerou na etapa anterior)",
    hint: `1. vai pra lovable.dev
2. se tá sem conta, cria uma (grátis, 5 créditos por dia)
3. cola o briefing completo da etapa anterior no chat
4. espera o lovable gerar seu protótipo (3-5 min)
5. testa: clica nos botões, navega entre telas
6. se deu erro, clica em "try to fix" ou cola o erro no chat`,
    noviceBlock: {
      title: "começa por aqui",
      body: "a tela do lovable tem 4 áreas: preview (esquerda, atualiza ao vivo conforme você pede), chat (direita, onde você conversa com a IA), publish (canto superior direito) e dev mode (canto, mostra o código). quando o lovable demora, tá pensando, não travou. respira e espera os 3-5 min.",
      link: { label: "tour da interface do lovable", url: "https://docs.lovable.dev/introduction/getting-started" },
    },
    expertBlock: {
      title: "vai mais fundo",
      body: "ativa chat mode antes de pedir código pra alinhar o plano sem gastar crédito de build. plan mode aprova arquitetura inteira de uma vez (rotas + schema + componentes). resultado: ~30-50% menos créditos no mesmo trabalho. e usa @nome-de-arquivo pra referenciar contexto específico.",
      link: { label: "modes do lovable", url: "https://docs.lovable.dev/features/labs" },
    },
  },
  {
    id: "melhora",
    number: "03",
    title: "refina com gosto / quero / e se",
    duration: "15-20 min",
    description: "conversa direto com o lovable pra ajustar o que não ficou do seu jeito",
    where: "chat do lovable",
    whyItMatters: "porque a primeira versão nunca é a final. iterar é o superpoder.",
    shortcuts: [],
    prompt: `quero melhorar meu protótipo. olha com olho crítico e me ajuda com:

O QUE EU GOSTO:
- [preenche 1 ou 2 coisas que ficaram boas]

O QUE EU QUERO MUDAR:
- [preenche os ajustes específicos que queres]

E SE:
- [uma ideia ousada que você quer testar]

ÁREA DE FOCO:
- visual / cores / tipografia
- funcionalidade
- navegação
- textos/copy

aplica no meu protótipo e me mostra o resultado.`,
    hint: "💡 quanto mais específico você for, melhor. em vez de 'tá feio', fala 'o card principal precisa ser maior com sombra mais suave'.",
    noviceBlock: {
      title: "começa por aqui",
      body: "aponta UM problema por vez, com referência concreta. evita 'tá feio' ou 'melhora isso'. usa: 'esse card precisa borda mais grossa', 'o título tá pequeno, dobra', 'esse botão deveria ser laranja'. lovable lê ao pé da letra, então quanto mais específico, melhor o resultado vem de primeira.",
      link: { label: "como pedir mudanças", url: "https://docs.lovable.dev/prompting/prompting-one" },
    },
    expertBlock: {
      title: "vai mais fundo",
      body: "edit dev mode resolve ajustes pontuais (cor, padding, copy de botão) sem gastar crédito de chat. plan mode é pra refatoração grande (schema novo, feature inteira). select-to-edit aponta direto no elemento dentro do preview e mostra o componente exato. combina os três conforme o tamanho da mudança.",
      link: { label: "edit modes docs", url: "https://docs.lovable.dev/features/labs" },
    },
  },
  {
    id: "backend",
    number: "04",
    title: "adiciona dados + superpoderes (opcional)",
    duration: "10-15 min",
    description: "conecta um banco de dados e adiciona IA ao seu app",
    where: "chat do lovable",
    whyItMatters: "porque app sem dados reais é demo. com dados vira produto.",
    shortcuts: [
      { label: "docs lovable cloud", url: "https://docs.lovable.dev/features/cloud", external: true },
      { label: "docs lovable ai", url: "https://docs.lovable.dev/features/ai", external: true },
    ],
    prompt: `quero que meu app salve dados de verdade e tenha inteligência.

adiciona:
1. login com email e senha
2. banco de dados pra salvar os dados principais do app
3. cada usuário vê só os próprios dados
4. um assistente inteligente que conversa sobre {ideia_gaveta} com tom amigável em português

ativa o lovable cloud e o lovable ai.`,
    hint: "💡 essa etapa é opcional. se seu app tá bom sem isso, pula.",
    noviceBlock: {
      title: "começa por aqui",
      body: "frontend é o que você vê na tela. backend é onde os dados ficam salvos mesmo depois de fechar o navegador. lovable cloud entrega isso pronto: login, banco, arquivos e IA, tudo num clique. sem cadastro em outra ferramenta, sem chave de API, sem cartão. é só pedir no chat.",
      link: { label: "o que é lovable cloud", url: "https://docs.lovable.dev/features/cloud" },
    },
    expertBlock: {
      title: "vai mais fundo",
      body: "padrões que evitam dor: roles em tabela separada (nunca na profiles, senão vira escalada de privilégio), security definer function pra checar role sem loop de RLS, RLS em toda tabela de usuário, FK pra auth.users só com on delete cascade. pra IA, usa o gateway com tool calling em vez de parsear string da resposta.",
      link: { label: "padrão user_roles + has_role", url: "https://docs.lovable.dev/features/cloud" },
    },
  },
  {
    id: "publica",
    number: "05",
    title: "publica e compartilha no grupo",
    duration: "5 min",
    description: "sobe seu app e mostra pra turma",
    where: "lovable + whatsapp",
    whyItMatters: "porque o que tá no computador não existe. o que tá na internet, sim.",
    shortcuts: [
      { label: "ir pra missão 01", url: "/app/missoes#m01", external: false },
    ],
    prompt: "(sem prompt — só ação)",
    hint: `1. clica em "publish" no canto superior direito do lovable
2. escolhe um nome pra URL (ex: meuapp.lovable.app)
3. copia o link final
4. vai no nosso grupo do whatsapp e cola o link
5. conta em 1 parágrafo: o que é, o que aprendeu fazendo`,
    noviceBlock: {
      title: "começa por aqui",
      body: "publish gera uma url tipo meuapp.lovable.app, gratuita pra sempre. você compartilha onde quiser (whatsapp, instagram, linkedin). cada vez que fizer mudança e clicar publish de novo, a url atualiza no mesmo endereço. quem já tem o link vê a versão mais nova sem precisar fazer nada.",
      link: { label: "como publicar", url: "https://docs.lovable.dev/features/publish" },
    },
    expertBlock: {
      title: "vai mais fundo",
      body: "domínio próprio: settings → custom domain → cadastra seu domínio → adiciona CNAME no seu DNS apontando pro lovable. ssl e cdn entram automático, sem config. propaga em ~10 min. pra produção séria, ativa github sync pra ter histórico de commits e poder reverter.",
      link: { label: "custom domain docs", url: "https://docs.lovable.dev/features/custom-domain" },
    },
  },
];

/** id reservado pra etapa 00 (escolha da ideia). não conta como etapa de construção. */
export const IDEA_STEP_ID = "ideia-base";

/** etapas de construção (01 a 05). usado pra desbloquear missão 01 sem etapa 00. */
export const TUTORIAL_BUILD_STEPS = TUTORIAL_STEPS.length;

/** total real do tutorial: etapa 00 + 5 de construção. */
export const TUTORIAL_TOTAL = TUTORIAL_STEPS.length + 1;

const FALLBACKS: Record<string, string> = {
  nickname: "você",
  trabalho: "o que você faz",
  ideia_gaveta: "uma ideia que você quer tirar da gaveta",
  maior_desafio: "criar algo com IA",
  expectativa_chora: "sair do chora com algo real",
};

export const interpolatePrompt = (
  template: string,
  fbi: FbiData | null,
  overrides?: { ideia_gaveta?: string | null },
): string => {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === "ideia_gaveta" && overrides?.ideia_gaveta && overrides.ideia_gaveta.trim()) {
      return overrides.ideia_gaveta.trim();
    }
    const value = fbi?.[key as keyof FbiData];
    if (value && String(value).trim()) return String(value).trim();
    return FALLBACKS[key] ?? `{${key}}`;
  });
};
