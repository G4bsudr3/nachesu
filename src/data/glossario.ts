/**
 * glossário das eletivas: termos que se repetem nas aulas das duas trilhas.
 * lista fixa (sem banco). definição curta, lowercase, "você", máx 2 frases.
 */

export type GlossarioTag = "ia" | "circular";

export interface GlossarioTermo {
  termo: string;
  definicao: string;
  /** de qual eletiva o termo vem. duas tags = comum às duas. */
  tags: GlossarioTag[];
  /** variações que também devem casar na busca. */
  sinonimos?: string[];
}

export const TAG_LABEL: Record<GlossarioTag, string> = {
  ia: "ia na prática",
  circular: "economia circular",
};

export const TAG_COLOR: Record<GlossarioTag, string> = {
  ia: "#fe7b02",
  circular: "#8A85BF",
};

/** tira acento e caixa pra busca e ordenação funcionarem com "protótipo" e "prototipo". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const TERMOS: GlossarioTermo[] = [
  // comuns às duas eletivas
  {
    termo: "pbl",
    definicao:
      "aprendizagem baseada em problema. você aprende resolvendo um caso real, não decorando teoria antes.",
    tags: ["ia", "circular"],
    sinonimos: ["aprendizagem baseada em problemas", "problem based learning"],
  },
  {
    termo: "pílula",
    definicao:
      "cada bloco curto dentro do módulo: um vídeo, uma leitura ou um exercício. o módulo é feito de pílulas.",
    tags: ["ia", "circular"],
  },
  {
    termo: "trilha",
    definicao:
      "conjunto de 5 módulos com um mesmo foco. cada eletiva tem 4 trilhas, do começo até a entrega final.",
    tags: ["ia", "circular"],
  },
  {
    termo: "registro",
    definicao:
      "a síntese curta que você envia no fim do módulo. é o que mostra o que você fez e o que ficou de aprendizado.",
    tags: ["ia", "circular"],
    sinonimos: ["entrega", "evidência de módulo"],
  },
  {
    termo: "protótipo",
    definicao:
      "uma versão simples e rápida da sua ideia, feita pra ser testada com gente de verdade. não precisa estar bonita nem completa.",
    tags: ["ia", "circular"],
  },
  {
    termo: "validação",
    definicao:
      "checar se a sua ideia resolve mesmo o problema, com evidência de fora e não com achismo.",
    tags: ["ia", "circular"],
    sinonimos: ["validar"],
  },
  {
    termo: "hipótese",
    definicao:
      "uma aposta sua ainda não confirmada, escrita de um jeito testável: se acontecer x, espero y.",
    tags: ["ia", "circular"],
  },
  {
    termo: "evidência",
    definicao:
      "o que você observou de fato: fala de usuário, número, foto, print. serve pra sustentar uma decisão.",
    tags: ["ia", "circular"],
  },
  {
    termo: "iteração",
    definicao:
      "melhorar a ideia em voltas curtas: testa, aprende, ajusta, testa de novo. cada volta é uma iteração.",
    tags: ["ia", "circular"],
    sinonimos: ["iterar", "v2"],
  },
  {
    termo: "pitch",
    definicao:
      "apresentação curta, de 2 a 3 minutos, que explica o problema, a solução e por que ela importa.",
    tags: ["ia", "circular"],
  },
  {
    termo: "proposta de valor",
    definicao:
      "a frase que diz pra quem você resolve, qual dor resolve e o que muda na vida dessa pessoa.",
    tags: ["ia", "circular"],
  },
  {
    termo: "canvas",
    definicao:
      "um quadro de uma página que organiza as partes do seu negócio ou da sua ideia lado a lado.",
    tags: ["ia", "circular"],
    sinonimos: ["bmc", "business model canvas"],
  },
  {
    termo: "stakeholder",
    definicao:
      "qualquer pessoa ou grupo afetado pela sua ideia ou que pode afetar ela: usuário, escola, vizinhança, fornecedor.",
    tags: ["ia", "circular"],
    sinonimos: ["ator", "parte interessada"],
  },
  {
    termo: "feedback",
    definicao:
      "devolutiva sobre o que você fez. o útil aponta o que funcionou, o que travou e o próximo passo.",
    tags: ["ia", "circular"],
  },

  // ia na prática
  {
    termo: "prompt",
    definicao:
      "a instrução que você dá pra ia. quanto mais claro o objetivo, o contexto e o formato, melhor a resposta.",
    tags: ["ia"],
  },
  {
    termo: "contexto",
    definicao:
      "tudo que você entrega junto do pedido pra ia entender a situação: quem é o usuário, o que já existe, qual limite.",
    tags: ["ia"],
  },
  {
    termo: "alucinação",
    definicao:
      "quando a ia responde com confiança uma informação errada ou inventada. por isso você confere antes de usar.",
    tags: ["ia"],
    sinonimos: ["alucinar"],
  },
  {
    termo: "modelo de linguagem",
    definicao:
      "o sistema por trás da ia de texto. ele prevê a próxima palavra a partir do que já foi escrito, não consulta uma verdade pronta.",
    tags: ["ia"],
    sinonimos: ["llm", "modelo"],
  },
  {
    termo: "mvp",
    definicao:
      "produto mínimo viável. a menor versão que já entrega valor de verdade pra alguém usar.",
    tags: ["ia"],
    sinonimos: ["produto mínimo viável"],
  },
  {
    termo: "mlp",
    definicao:
      "produto mínimo amável. é o mvp com um cuidado a mais, o suficiente pra pessoa gostar de usar, não só conseguir usar.",
    tags: ["ia"],
    sinonimos: ["mínimo lovable", "minimum lovable product"],
  },
  {
    termo: "mvt",
    definicao:
      "mínima tração viável. o menor sinal concreto de que gente usa e volta a usar o que você criou.",
    tags: ["ia"],
    sinonimos: ["tração"],
  },
  {
    termo: "briefing",
    definicao:
      "o resumo do que precisa ser feito: problema, usuário, objetivo e limites. é o que você entrega pra ia antes de construir.",
    tags: ["ia"],
    sinonimos: ["brief"],
  },
  {
    termo: "escopo",
    definicao:
      "o que entra e o que fica de fora do seu projeto agora. escopo aberto demais é o jeito mais rápido de não terminar nada.",
    tags: ["ia"],
  },
  {
    termo: "usuário",
    definicao:
      "a pessoa específica que vai usar o que você criou. quanto mais concreta, melhor a decisão de produto.",
    tags: ["ia"],
    sinonimos: ["persona"],
  },
  {
    termo: "dor",
    definicao:
      "o incômodo real da pessoa, do jeito que ela viveu. dor boa vem com cena e frequência, não com adjetivo.",
    tags: ["ia"],
    sinonimos: ["problema real"],
  },
  {
    termo: "deploy",
    definicao:
      "publicar o projeto pra ele ficar acessível por um link, fora da sua tela de edição.",
    tags: ["ia"],
    sinonimos: ["publicar"],
  },
  {
    termo: "lovable",
    definicao:
      "a ferramenta onde você constrói sua plataforma conversando com a ia, sem precisar saber programar.",
    tags: ["ia"],
  },
  {
    termo: "interface",
    definicao:
      "a parte visível do produto: tela, botão, texto. é por onde a pessoa usa o que você fez.",
    tags: ["ia"],
    sinonimos: ["ui"],
  },
  {
    termo: "teste com usuário",
    definicao:
      "pedir pra alguém usar o seu protótipo na sua frente, sem você explicar nada, e observar onde trava.",
    tags: ["ia"],
    sinonimos: ["teste de usabilidade"],
  },

  // economia circular
  {
    termo: "economia linear",
    definicao:
      "o modelo extrai, produz, usa e descarta. tudo vira lixo no fim da linha.",
    tags: ["circular"],
    sinonimos: ["linear"],
  },
  {
    termo: "economia circular",
    definicao:
      "modelo onde o material volta pro ciclo em vez de virar lixo: reuso, reparo, reciclagem, novo uso.",
    tags: ["circular"],
    sinonimos: ["circular"],
  },
  {
    termo: "regenerativo",
    definicao:
      "vai além de poluir menos: o negócio devolve mais do que tira, deixando o sistema melhor do que encontrou.",
    tags: ["circular"],
    sinonimos: ["regeneração"],
  },
  {
    termo: "pensamento sistêmico",
    definicao:
      "olhar as conexões e não só as partes. entender de onde vem, por onde passa e pra onde vai cada coisa.",
    tags: ["circular"],
    sinonimos: ["sistema", "pensar em sistemas"],
  },
  {
    termo: "fluxo de material",
    definicao:
      "o caminho que um recurso faz: entra, é usado, sobra, vai embora. mapear o fluxo mostra onde tem desperdício.",
    tags: ["circular"],
    sinonimos: ["mapa de fluxo"],
  },
  {
    termo: "6 r's",
    definicao:
      "recusar, reduzir, reutilizar, reparar, recircular e repensar. seis formas de tirar material do descarte.",
    tags: ["circular"],
    sinonimos: ["seis erres", "6 erres"],
  },
  {
    termo: "ciclo biológico",
    definicao:
      "materiais que voltam com segurança pra natureza, como resto de comida virando composto.",
    tags: ["circular"],
    sinonimos: ["nutriente biológico", "compostagem"],
  },
  {
    termo: "ciclo técnico",
    definicao:
      "materiais que circulam entre pessoas e máquinas, como plástico, metal e eletrônico, sem virar lixo.",
    tags: ["circular"],
    sinonimos: ["nutriente técnico"],
  },
  {
    termo: "externalidade",
    definicao:
      "efeito que sobra pros outros e não aparece no preço: fumaça no ar, lixo no rio, barulho no bairro.",
    tags: ["circular"],
  },
  {
    termo: "impacto",
    definicao:
      "a mudança real que a sua ação provoca em gente, lugar ou ambiente. positivo ou negativo, e de preferência medido.",
    tags: ["circular"],
    sinonimos: ["3p", "impacto triplo"],
  },
  {
    termo: "experimento de baixo custo",
    definicao:
      "um teste rápido e barato pra checar uma hipótese antes de investir tempo e dinheiro na solução inteira.",
    tags: ["circular"],
    sinonimos: ["experimento"],
  },
  {
    termo: "mini-dossiê",
    definicao:
      "o documento final da eletiva: problema, sistema mapeado, ideia, teste e resultado, tudo num lugar só.",
    tags: ["circular"],
    sinonimos: ["dossiê"],
  },
  {
    termo: "ellen macarthur",
    definicao:
      "fundação que organizou os princípios da economia circular usados nas aulas: eliminar resíduo, circular material, regenerar a natureza.",
    tags: ["circular"],
    sinonimos: ["fundação ellen macarthur"],
  },
  {
    termo: "simbiose industrial",
    definicao:
      "quando a sobra de um negócio vira matéria-prima de outro. o resíduo de um é o insumo do vizinho.",
    tags: ["circular"],
  },
];

/** ordenado sem acento pra a lista sair na ordem que a pessoa espera. */
export const GLOSSARIO: GlossarioTermo[] = [...TERMOS].sort((a, b) =>
  normalize(a.termo).localeCompare(normalize(b.termo), "pt-BR"),
);

/** busca por termo, sinônimo ou definição, ignorando acento e caixa. */
export function filtrarGlossario(
  termos: GlossarioTermo[],
  query: string,
  tag: GlossarioTag | "todas",
): GlossarioTermo[] {
  const q = normalize(query);
  return termos.filter((t) => {
    if (tag !== "todas" && !t.tags.includes(tag)) return false;
    if (!q) return true;
    const haystack = [t.termo, t.definicao, ...(t.sinonimos ?? [])].map(normalize);
    return haystack.some((h) => h.includes(q));
  });
}

/** letra inicial (sem acento, maiúscula) pra agrupar a lista. */
export function inicial(termo: string): string {
  const n = normalize(termo);
  const first = n.charAt(0);
  return /[a-z]/.test(first) ? first.toUpperCase() : "#";
}
