// metadados por rota — fonte única de verdade pra título, descrição e og:image
// usados pelo <SeoRouter />. eletivas ainda recebem override dinâmico pelo slug.

export const SITE_URL = "https://chorahub.lovable.app";
export const DEFAULT_OG = "/og-image.png";

export type RouteSeo = {
  title: string;
  description: string;
  image?: string;
  /** se omitido: noindex pra rotas /app|/admin, index pro resto. */
  index?: boolean;
};

const baseDesc =
  "eletiva da naches u em parceria com a escola sebrae. 4 trilhas, 20 módulos e tutor ia em cada uma.";

export const ROUTE_SEO: Record<string, RouteSeo> = {
  "/": {
    title: "eletiva ia na prática · naches u × escola sebrae",
    description: `${baseDesc} construa com ia em projetos reais. vai lá e cria.`,
    image: DEFAULT_OG,
    index: true,
  },
  "/auth": {
    title: "entrar · eletiva ia na prática",
    description: "acesse sua eletiva pra continuar a trilha.",
    index: true,
  },
  "/forms": {
    title: "formulário · eletiva ia na prática",
    description: "responda o formulário pra entrar na eletiva.",
    index: true,
  },
  "/app": {
    title: "meu painel · eletiva ia na prática",
    description: "seu progresso, sua trilha atual e o próximo módulo liberado.",
  },
  "/app/eletivas": {
    title: "minhas eletivas · eletiva ia na prática",
    description: "veja suas matrículas e escolha qual eletiva acessar agora.",
  },
  "/app/trilhas": {
    title: "trilhas · eletiva ia na prática",
    description: "as 4 trilhas da sua eletiva e os 20 módulos liberados conforme você avança.",
  },
  "/app/tutor": {
    title: "tutor ia · eletiva ia na prática",
    description: "converse com o tutor da sua trilha e desbloqueie o próximo passo.",
  },
  "/app/chora-bot": {
    title: "tutor ia · eletiva ia na prática",
    description: "converse com o tutor da sua trilha e desbloqueie o próximo passo.",
  },
  "/app/conta": {
    title: "minha conta · eletiva ia na prática",
    description: "atualize seus dados e preferências.",
  },
};

/**
 * eletivas conhecidas. usado pra trocar título/descrição/og-image quando
 * o aluno está dentro de uma eletiva específica (?eletiva=slug ou activeSlug).
 */
export const ELETIVA_SEO: Record<
  string,
  { titleShort: string; description: string; image: string }
> = {
  "ia-na-pratica": {
    titleShort: "ia na prática",
    description:
      "trilha da eletiva ia na prática. construa seu primeiro app com ia em 20 módulos.",
    image: "/og/eletiva-ia-na-pratica.jpg",
  },
  "economia-circular": {
    titleShort: "economia circular",
    description:
      "trilha da eletiva economia circular & negócios regenerativos. ideias que regeneram, com ia do lado.",
    image: "/og/eletiva-economia-circular.jpg",
  },
};

/** retorna metadado pra uma rota, com fallback genérico. */
export function getRouteSeo(pathname: string): RouteSeo {
  const exact = ROUTE_SEO[pathname];
  if (exact) return exact;

  // prefix match pra rotas dinâmicas (/app/modulo/:id, /app/hub/*, etc.)
  const prefixes = Object.keys(ROUTE_SEO)
    .filter((k) => k !== "/" && pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length);
  if (prefixes[0]) return ROUTE_SEO[prefixes[0]];

  return {
    title: "eletiva ia na prática · naches u × escola sebrae",
    description: baseDesc,
    image: DEFAULT_OG,
  };
}

/** decide indexação automática se o config não disser nada. */
export function shouldIndex(pathname: string, override?: boolean): boolean {
  if (typeof override === "boolean") return override;
  if (pathname.startsWith("/app") || pathname.startsWith("/admin")) return false;
  return true;
}
