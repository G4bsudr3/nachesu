/** nível do builder no lovable, derivado da resposta `experiencia_lovable` no fbi. */

export type BuilderLevel = "novato" | "iniciante" | "intermediario" | "avancado";

export const FBI_TO_LEVEL: Record<string, BuilderLevel> = {
  "nunca-usei": "novato",
  "ja-mexi": "iniciante",
  "ja-publiquei": "intermediario",
  "uso-diario": "avancado",
};

export const fbiAnswerToLevel = (answer: string | null | undefined): BuilderLevel => {
  if (!answer) return "novato";
  return FBI_TO_LEVEL[answer.trim()] ?? "novato";
};

export const levelLabel = (level: BuilderLevel): string => {
  switch (level) {
    case "novato": return "novato";
    case "iniciante": return "iniciante";
    case "intermediario": return "intermediário";
    case "avancado": return "avançado";
  }
};

/** classe tailwind pra background da pílula de nível. tons da paleta perestroika. */
export const levelToneClass = (level: BuilderLevel): string => {
  switch (level) {
    case "novato": return "bg-perestroika-rosa/20 text-perestroika-preto border-perestroika-rosa/40";
    case "iniciante": return "bg-perestroika-laranja/20 text-perestroika-preto border-perestroika-laranja/40";
    case "intermediario": return "bg-perestroika-azul/20 text-perestroika-preto border-perestroika-azul/40";
    case "avancado": return "bg-perestroika-preto text-perestroika-bege border-perestroika-preto";
  }
};

export const isAdvanced = (level: BuilderLevel): boolean =>
  level === "intermediario" || level === "avancado";

export const isNovice = (level: BuilderLevel): boolean =>
  level === "novato" || level === "iniciante";
