/**
 * mapa declarativo do fluxo do usuário na plataforma.
 * usado só no admin (/admin/fluxo) pra dar visão do projeto inteiro
 * e apontar onde o estudante costuma travar.
 */

export type LaneId = "publico" | "entrada" | "estudante" | "admin";

export type MetricKey =
  | "pendentes"
  | "ativos"
  | "matriculas"
  | "nunca_comecaram"
  | "parados_7d"
  | "entregas_pendentes"
  | "certificados";

export interface FlowNode {
  id: string;
  lane: LaneId;
  title: string;
  route: string;
  access: "público" | "logado" | "admin";
  role: string;
  /** o que costuma travar aqui */
  risco?: string;
  /** de onde se chega (ids) */
  from?: string[];
  /** pra onde leva (ids) */
  to?: string[];
  metric?: MetricKey;
}

export interface Lane {
  id: LaneId;
  title: string;
  hint: string;
  /** classe tailwind de cor de destaque da faixa */
  accent: string;
}

export const LANES: Lane[] = [
  {
    id: "publico",
    title: "público",
    hint: "quem ainda não entrou",
    accent: "text-perestroika-azul",
  },
  {
    id: "entrada",
    title: "entrada",
    hint: "autenticação e liberação",
    accent: "text-perestroika-laranja",
  },
  {
    id: "estudante",
    title: "estudante",
    hint: "a jornada de estudo",
    accent: "text-perestroika-rosa",
  },
  {
    id: "admin",
    title: "educador e admin",
    hint: "quem opera a plataforma",
    accent: "text-perestroika-vermelho",
  },
];

export const FLOW_NODES: FlowNode[] = [
  // público
  {
    id: "home",
    lane: "publico",
    title: "home",
    route: "/",
    access: "público",
    role: "primeira impressão: o que é a NachesU, como funciona, faq.",
    to: ["eletivas-publicas", "auth"],
    risco: "se a pessoa não entende em 5 segundos que precisa de e-mail da escola, ela tenta entrar e falha.",
  },
  {
    id: "eletivas-publicas",
    lane: "publico",
    title: "vitrine das eletivas",
    route: "/eletivas",
    access: "público",
    role: "detalhe das duas eletivas, trilhas e educadores.",
    from: ["home"],
    to: ["auth"],
  },
  {
    id: "acompanhamento",
    lane: "publico",
    title: "painel da escola",
    route: "/acompanhamento",
    access: "público",
    role: "acompanhamento da coordenação, protegido por senha.",
    risco: "senha compartilhada por fora do produto: sem trilha de quem acessou.",
  },

  // entrada
  {
    id: "auth",
    lane: "entrada",
    title: "entrar",
    route: "/auth",
    access: "público",
    role: "link mágico ou senha. e-mail precisa estar na lista liberada.",
    from: ["home", "eletivas-publicas"],
    to: ["pending", "dashboard"],
    risco: "e-mail fora da lista é barrado aqui, e o estudante não sabe a quem pedir acesso.",
  },
  {
    id: "comecar",
    lane: "entrada",
    title: "começar",
    route: "/comecar",
    access: "público",
    role: "porta de entrada guiada pra quem chega por convite.",
    to: ["auth"],
  },
  {
    id: "reset",
    lane: "entrada",
    title: "redefinir senha",
    route: "/reset-password",
    access: "público",
    role: "retorno do e-mail de recuperação.",
    from: ["auth"],
    to: ["dashboard"],
  },
  {
    id: "pending",
    lane: "entrada",
    title: "aguardando liberação",
    route: "/app/pending",
    access: "logado",
    role: "perfil criado mas ainda não aprovado por um admin.",
    from: ["auth"],
    to: ["dashboard"],
    metric: "pendentes",
    risco: "gargalo clássico: ninguém aprova e o estudante desiste sem aviso.",
  },

  // estudante
  {
    id: "dashboard",
    lane: "estudante",
    title: "início",
    route: "/app",
    access: "logado",
    role: "saudação, escolha da eletiva e um próximo passo único.",
    from: ["auth", "pending"],
    to: ["eletiva", "tutor", "notificacoes"],
    metric: "ativos",
  },
  {
    id: "minhas-eletivas",
    lane: "estudante",
    title: "minhas eletivas",
    route: "/app/eletivas",
    access: "logado",
    role: "lista das matrículas quando são duas.",
    from: ["dashboard"],
    to: ["eletiva"],
    metric: "matriculas",
  },
  {
    id: "eletiva",
    lane: "estudante",
    title: "mapa da eletiva",
    route: "/app/eletiva/:slug",
    access: "logado",
    role: "trilhas, módulos e progresso em porcentagem.",
    from: ["dashboard", "minhas-eletivas"],
    to: ["modulo", "marco", "certificado"],
    metric: "nunca_comecaram",
    risco: "quem nunca abre um módulo trava aqui: o mapa informa, mas não empurra.",
  },
  {
    id: "modulo",
    lane: "estudante",
    title: "módulo",
    route: "/app/eletiva/:slug/modulo/:n",
    access: "logado",
    role: "pílulas, exercício e registro. o coração do produto.",
    from: ["eletiva"],
    to: ["eletiva", "tutor"],
    metric: "parados_7d",
    risco: "exercícios com upload de vídeo e envio de entrega são os pontos de abandono.",
  },
  {
    id: "marco",
    lane: "estudante",
    title: "marco da trilha",
    route: "/app/eletiva/:slug/marco/:trail",
    access: "logado",
    role: "celebração ao fechar uma trilha.",
    from: ["eletiva"],
  },
  {
    id: "certificado",
    lane: "estudante",
    title: "certificado",
    route: "/app/eletiva/:slug/certificado",
    access: "logado",
    role: "liberado só com 100% do curso concluído.",
    from: ["eletiva"],
    metric: "certificados",
  },
  {
    id: "tutor",
    lane: "estudante",
    title: "tutor IA",
    route: "/app/tutor",
    access: "logado",
    role: "joão-de-barro responde dúvidas no escopo da eletiva.",
    from: ["dashboard", "modulo"],
  },
  {
    id: "glossario",
    lane: "estudante",
    title: "glossário",
    route: "/app/glossario",
    access: "logado",
    role: "definições curtas, linkadas na primeira aparição do termo.",
    from: ["modulo"],
  },
  {
    id: "notificacoes",
    lane: "estudante",
    title: "avisos",
    route: "/app/notificacoes",
    access: "logado",
    role: "feedback de entrega, módulo liberado, nudge de evasão.",
    from: ["dashboard"],
    to: ["modulo"],
  },
  {
    id: "conta",
    lane: "estudante",
    title: "conta",
    route: "/app/conta",
    access: "logado",
    role: "perfil, senha e preferências.",
    from: ["dashboard"],
  },

  // admin
  {
    id: "admin-home",
    lane: "admin",
    title: "início admin",
    route: "/admin",
    access: "admin",
    role: "fila de ação e métricas das duas eletivas.",
    to: ["admin-entregas", "admin-risco", "admin-pendentes"],
  },
  {
    id: "admin-pendentes",
    lane: "admin",
    title: "pendentes",
    route: "/admin/pending",
    access: "admin",
    role: "aprovar quem está esperando liberação.",
    from: ["admin-home"],
    metric: "pendentes",
  },
  {
    id: "admin-entregas",
    lane: "admin",
    title: "entregas",
    route: "/admin/entregas",
    access: "admin",
    role: "corrigir e devolver feedback.",
    from: ["admin-home"],
    metric: "entregas_pendentes",
    risco: "entrega parada aqui é estudante esperando resposta.",
  },
  {
    id: "admin-risco",
    lane: "admin",
    title: "risco",
    route: "/admin/risco",
    access: "admin",
    role: "quem sumiu e quem nunca começou.",
    from: ["admin-home"],
    metric: "parados_7d",
  },
  {
    id: "admin-modulos",
    lane: "admin",
    title: "módulos",
    route: "/admin/eletiva/:slug/modulos",
    access: "admin",
    role: "conteúdo, vídeos e painel do exercício.",
    from: ["admin-home"],
    to: ["admin-publicacao"],
  },
  {
    id: "admin-publicacao",
    lane: "admin",
    title: "publicação",
    route: "/admin/publicacao",
    access: "admin",
    role: "liberar módulo pra turma.",
    from: ["admin-modulos"],
    risco: "módulo não liberado = estudante sem próximo passo, sem aviso nenhum.",
  },
  {
    id: "admin-convites",
    lane: "admin",
    title: "convites",
    route: "/admin/convites",
    access: "admin",
    role: "cadastrar e enviar acesso por e-mail.",
    from: ["admin-home"],
    to: ["auth"],
  },
  {
    id: "admin-pulso",
    lane: "admin",
    title: "pulso",
    route: "/admin/pulso",
    access: "admin",
    role: "leitura do feedback módulo a módulo.",
    from: ["admin-home"],
  },
];

export const METRIC_LABEL: Record<MetricKey, string> = {
  pendentes: "aguardando aprovação",
  ativos: "estudantes ativos",
  matriculas: "matrículas",
  nunca_comecaram: "nunca abriram um módulo",
  parados_7d: "parados há 7+ dias",
  entregas_pendentes: "entregas sem correção",
  certificados: "certificados emitidos",
};

/** acima desse valor o número vira alerta visual */
export const METRIC_ALERT_ABOVE: Partial<Record<MetricKey, number>> = {
  pendentes: 0,
  nunca_comecaram: 0,
  parados_7d: 0,
  entregas_pendentes: 0,
};

export const nodeById = (id: string) => FLOW_NODES.find((n) => n.id === id);

export const flowToMarkdown = (metrics?: Partial<Record<MetricKey, number>>) => {
  const lines: string[] = ["# fluxo do usuário · NachesU", ""];
  for (const lane of LANES) {
    lines.push(`## ${lane.title} (${lane.hint})`, "");
    for (const n of FLOW_NODES.filter((x) => x.lane === lane.id)) {
      const m =
        n.metric && metrics?.[n.metric] !== undefined
          ? ` [${METRIC_LABEL[n.metric]}: ${metrics[n.metric]}]`
          : "";
      lines.push(`- **${n.title}** \`${n.route}\` (${n.access})${m}`);
      lines.push(`  - ${n.role}`);
      if (n.risco) lines.push(`  - risco: ${n.risco}`);
    }
    lines.push("");
  }
  return lines.join("\n");
};
