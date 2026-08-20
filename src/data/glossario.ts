import { ELETIVA_ACCENT } from "@/lib/eletivaTheme";
/**
 * glossário das eletivas: termos que se repetem nas módulos das duas trilhas.
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
  ia: ELETIVA_ACCENT["ia-na-pratica"],
  circular: ELETIVA_ACCENT["economia-circular"],
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
    sinonimos: ["elevator pitch"],
  },
  {
    termo: "proposta de valor",
    definicao:
      "a frase que diz pra quem você resolve, qual dor resolve e o que muda na vida dessa pessoa.",
    tags: ["ia", "circular"],
    sinonimos: ["value proposition"],
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
  {
    termo: "case",
    definicao:
      "um exemplo real de alguém que resolveu um problema parecido. serve de referência pra entender o que funcionou e o que não funcionou.",
    tags: ["ia", "circular"],
    sinonimos: ["estudo de caso", "caso"],
  },
  {
    termo: "insight",
    definicao:
      "uma descoberta que muda como você enxerga o problema. geralmente vem de observar uma pessoa ou dado de perto.",
    tags: ["ia", "circular"],
    sinonimos: ["descoberta", "percepção"],
  },
  {
    termo: "template",
    definicao:
      "um modelo pronto que você preenche com o seu conteúdo. economiza tempo e deixa a estrutura consistente.",
    tags: ["ia", "circular"],
    sinonimos: ["modelo", "molde"],
  },
  {
    termo: "ideação",
    definicao:
      "o momento de gerar muitas ideias, sem julgar ainda. quanto mais opções, maior a chance de encontrar uma boa solução.",
    tags: ["ia", "circular"],
    sinonimos: ["geração de ideias", "criação de ideias"],
  },
  {
    termo: "sprint",
    definicao:
      "período curto e focado em entregar uma parte do projeto. no final, você tem algo concreto pra testar ou mostrar.",
    tags: ["ia", "circular"],
    sinonimos: ["ciclo", "janela de entrega"],
  },
  {
    termo: "brainstorm",
    definicao:
      "reunião rápida pra jogar ideias na mesa sem censura. depois de colocar tudo, você organiza e escolhe as melhores.",
    tags: ["ia", "circular"],
    sinonimos: ["tempestade de ideias", "roda de ideias"],
  },
  {
    termo: "engajamento",
    definicao:
      "quanto a pessoa se envolve com o que você criou. pode ser tempo, interação, compartilhamento ou repetição de uso.",
    tags: ["ia", "circular"],
    sinonimos: ["envolvimento", "participação"],
  },
  {
    termo: "benchmark",
    definicao:
      "olhar o que outros fazem de melhor pra usar como referência. não é copiar, é aprender com o que já está no mercado.",
    tags: ["ia", "circular"],
    sinonimos: ["referência", "comparação"],
  },
  {
    termo: "pivotar",
    definicao:
      "mudar de direção no projeto sem desistir do problema. você guarda o que aprendeu e testa uma nova hipótese.",
    tags: ["ia", "circular"],
    sinonimos: ["pivot", "mudar de direção"],
  },
  {
    termo: "dashboard",
    definicao:
      "painel visual que mostra números e indicadores de um jeito rápido de entender. ajuda a acompanhar se algo está indo bem.",
    tags: ["ia", "circular"],
    sinonimos: ["painel", "painel de controle"],
  },
  {
    termo: "segmento",
    definicao:
      "um grupo específico de pessoas com características parecidas. focar num segmento ajuda a resolver melhor o problema dele.",
    tags: ["ia", "circular"],
    sinonimos: ["segmentação", "nicho"],
  },
  {
    termo: "priorização",
    definicao:
      "escolher o que fazer primeiro entre várias opções. boa priorização considera impacto, esforço e risco.",
    tags: ["ia", "circular"],
    sinonimos: ["priorizar", "escolha de prioridades"],
  },
  {
    termo: "build",
    definicao:
      "a versão construída do produto, o ato de montar algo. depois de validar, você builda a próxima versão.",
    tags: ["ia"],
    sinonimos: ["construção", "versão", "buildar"],
  },

  // ia na prática
  {
    termo: "prompt",
    definicao:
      "a instrução que você dá pra ia. quanto mais claro o objetivo, o contexto e o formato, melhor a resposta.",
    tags: ["ia"],
  },
  {
    termo: "prompt engineering",
    definicao:
      "a prática de escrever prompts melhores, testando variações pequenas pra tirar respostas mais úteis da ia.",
    tags: ["ia"],
    sinonimos: ["engenharia de prompt"],
  },
  {
    termo: "corf",
    definicao:
      "mnemônico pra estruturar um prompt: contexto, objetivo, regras e formato. ajuda a não esquecer nada importante.",
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
    termo: "chatgpt",
    definicao:
      "assistente de ia da openai. você conversa por texto e ele gera, resume, organiza e responde de várias formas.",
    tags: ["ia"],
  },
  {
    termo: "claude",
    definicao:
      "assistente de ia da anthropic. bom pra textos longos, análise de documentos e raciocínio mais cuidadoso.",
    tags: ["ia"],
  },
  {
    termo: "gemini",
    definicao:
      "assistente de ia do google. conecta com busca, youtube e outros produtos da google de forma nativa.",
    tags: ["ia"],
  },
  {
    termo: "cloud",
    definicao:
      "computação na nuvem. seus arquivos e programas ficam em servidores remotos, acessíveis de qualquer lugar por internet.",
    tags: ["ia"],
    sinonimos: ["nuvem"],
  },
  {
    termo: "banco de dados",
    definicao:
      "lugar onde informações são guardadas de forma organizada, pra seu app consultar, salvar e atualizar dados.",
    tags: ["ia"],
    sinonimos: ["database", "db"],
  },
  {
    termo: "stack",
    definicao:
      "conjunto de tecnologias que fazem seu app funcionar: front, back, banco, hospedagem, ferramentas de ia.",
    tags: ["ia"],
  },
  {
    termo: "no-code",
    definicao:
      "montar software sem escrever código, arrastando peças e configurando regras. ideal pra prototipar rápido.",
    tags: ["ia"],
  },
  {
    termo: "low-code",
    definicao:
      "montar software com pouco código, usando blocos prontos e pequenos scripts quando precisa de lógica extra.",
    tags: ["ia"],
  },
  {
    termo: "lovable",
    definicao:
      "a ferramenta onde você constrói sua plataforma conversando com a ia, sem precisar saber programar.",
    tags: ["ia"],
  },
  {
    termo: "figma",
    definicao:
      "ferramenta de design de interfaces. você desenha telas, componentes e protótipos clicáveis antes de construir.",
    tags: ["ia"],
  },
  {
    termo: "dev",
    definicao:
      "abreviação de desenvolvedor. a pessoa que programa, ou o próprio ato de desenvolver software.",
    tags: ["ia"],
    sinonimos: ["developer", "desenvolvedor"],
  },
  {
    termo: "framework",
    definicao:
      "conjunto de ferramentas e regras que acelera a construção de software. dá estrutura pra você não começar do zero.",
    tags: ["ia"],
  },
  {
    termo: "app web",
    definicao:
      "aplicativo que roda no navegador, sem precisar instalar. acessível por link, funciona em qualquer celular ou computador.",
    tags: ["ia"],
    sinonimos: ["aplicativo web", "webapp"],
  },
  {
    termo: "landing page",
    definicao:
      "página simples com um único objetivo: explicar uma ideia e fazer o visitante agir, como se cadastrar ou comprar.",
    tags: ["ia"],
    sinonimos: ["landing pages", "página de captura"],
  },
  {
    termo: "automação",
    definicao:
      "fazer uma tarefa repetitiva acontecer sozinha, disparada por um gatilho. economiza tempo e reduz erro humano.",
    tags: ["ia"],
    sinonimos: ["automações", "workflow"],
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
    termo: "métrica",
    definicao:
      "número que mede se algo está funcionando. exemplo: quantas pessoas usaram, quantas voltaram, quanto tempo ficaram.",
    tags: ["ia"],
    sinonimos: ["métricas", "indicador"],
  },
  {
    termo: "viabilidade",
    definicao:
      "análise se a ideia é possível de fazer agora, considerando tempo, custo, tecnologia e interesse das pessoas.",
    tags: ["ia"],
  },
  {
    termo: "jbtd",
    definicao:
      "abreviação de jobs-to-be-done. foco no trabalho que a pessoa contrata seu produto pra fazer, não só no perfil dela.",
    tags: ["ia"],
    sinonimos: ["jobs to be done"],
  },
  {
    termo: "feature",
    definicao:
      "funcionalidade específica do produto. uma parte do que seu app faz, como login, busca ou notificação.",
    tags: ["ia"],
    sinonimos: ["funcionalidade"],
  },
  {
    termo: "bug",
    definicao:
      "erro no software que faz algo sair diferente do esperado. toda ferramenta tem, e a boa prática é reportar e corrigir.",
    tags: ["ia"],
  },
  {
    termo: "backlog",
    definicao:
      "lista de coisas a fazer no produto no futuro. novas ideias, bugs e melhorias ficam guardadas lá até serem priorizadas.",
    tags: ["ia"],
  },
  {
    termo: "polish",
    definicao:
      "capricho final: ajustes de design, microtextos, animações e consistência que fazem o produto parecer acabado.",
    tags: ["ia"],
  },
  {
    termo: "storytelling",
    definicao:
      "arte de contar uma história com propósito. no pitch, você usa storytelling pra fazer a ideia emocionar e fazer sentido.",
    tags: ["ia"],
    sinonimos: ["narrativa", "narrativa de produto"],
  },
  {
    termo: "portfólio",
    definicao:
      "coleção dos seus melhores projetos. mostra o que você pensou, fez e aprendeu, muito mais do que um currículo.",
    tags: ["ia"],
    sinonimos: ["portfolio"],
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
    termo: "persona",
    definicao:
      "arquétipo do usuário que você resolve: nome, idade, rotina, dores e objetivos. ajuda a tomar decisão de produto.",
    tags: ["ia"],
  },
  {
    termo: "usuário",
    definicao:
      "a pessoa específica que vai usar o que você criou. quanto mais concreta, melhor a decisão de produto.",
    tags: ["ia"],
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
    termo: "interface",
    definicao:
      "a parte visível do produto: tela, botão, texto. é por onde a pessoa usa o que você fez.",
    tags: ["ia"],
    sinonimos: ["ui"],
  },
  {
    termo: "ux",
    definicao:
      "experiência do usuário. tudo que a pessoa sente, pensa e encontra ao usar o seu produto, do começo ao fim.",
    tags: ["ia"],
    sinonimos: ["user experience", "experiência do usuário"],
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
    sinonimos: ["3p", "impacto triplo", "triple bottom line"],
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
      "fundação que organizou os princípios da economia circular usados nas módulos: eliminar resíduo, circular material, regenerar a natureza.",
    tags: ["circular"],
    sinonimos: ["fundação ellen macarthur"],
  },
  {
    termo: "simbiose industrial",
    definicao:
      "quando a sobra de um negócio vira matéria-prima de outro. o resíduo de um é o insumo do vizinho.",
    tags: ["circular"],
  },
  {
    termo: "lean canvas",
    definicao:
      "uma versão enxuta do canvas de negócio, feita pra caber em uma página e ser testada rápido. ajuda a descrever problema, solução, vantagem e métricas.",
    tags: ["circular"],
    sinonimos: ["lean"],
  },
  {
    termo: "escalar",
    definicao:
      "fazer algo crescer de forma que continue funcionando. não é só ficar maior, é aumentar o alcance sem perder qualidade.",
    tags: ["circular"],
    sinonimos: ["escala", "escalabilidade"],
  },
  {
    termo: "resíduo",
    definicao:
      "tudo que sobra de um processo e não tem mais uso planejado. na economia circular, resíduo vira insumo de outro ciclo.",
    tags: ["circular"],
    sinonimos: ["sobra", "resto", "dejeto"],
  },
  {
    termo: "b2b",
    definicao:
      "abreviação de business-to-business. negócio que vende pra outras empresas, não pra pessoa final.",
    tags: ["circular"],
    sinonimos: ["business to business", "empresa para empresa"],
  },
  {
    termo: "b2c",
    definicao:
      "abreviação de business-to-consumer. negócio que vende direto pra pessoa final, como você compra no mercado.",
    tags: ["circular"],
    sinonimos: ["business to consumer", "empresa para consumidor"],
  },
  {
    termo: "trade-off",
    definicao:
      "quando escolher uma coisa significa abrir mão de outra. toda decisão tem trade-offs, e a boa escolha é consciente deles.",
    tags: ["circular"],
    sinonimos: ["troca", "custo de oportunidade"],
  },
  {
    termo: "aterro",
    definicao:
      "lugar onde resíduos são enterrados. na economia circular, o objetivo é mandar o mínimo possível pro aterro.",
    tags: ["circular"],
    sinonimos: ["aterro sanitário", "lixão"],
  },
  {
    termo: "design thinking",
    definicao:
      "forma de resolver problemas colocando a pessoa usuária no centro. empatiza, define, idea, prototipa e testa em ciclos curtos.",
    tags: ["circular"],
    sinonimos: ["pensamento de design"],
  },
  {
    termo: "insumo",
    definicao:
      "qualquer recurso que entra no processo pra produzir algo: material, energia, informação ou trabalho.",
    tags: ["circular"],
    sinonimos: ["matéria-prima", "recurso de entrada"],
  },
  {
    termo: "modelo de negócio",
    definicao:
      "descrição de como uma empresa cria valor, entrega pra quem precisa e ganha dinheiro pra continuar existindo.",
    tags: ["circular"],
    sinonimos: ["modelo de negócios", "modelo empresarial"],
  },
  {
    termo: "esg",
    definicao:
      "abreviação de environmental, social, governance. critérios que medem se uma empresa cuida de meio ambiente, pessoas e boa gestão.",
    tags: ["circular"],
    sinonimos: ["ambiental, social e governança"],
  },
  {
    termo: "biomimética",
    definicao:
      "inspirar soluções em estratégias da natureza. como o bambu resiste ao vento, ou como floresta recicla nutrientes sem lixo.",
    tags: ["circular"],
    sinonimos: ["biomimicry", "inspiração na natureza"],
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
