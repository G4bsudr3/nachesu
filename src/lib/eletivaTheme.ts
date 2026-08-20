/**
 * fonte única de cor por eletiva.
 *
 * regra: a plataforma tem UMA pele (bege perestroika). o que muda entre
 * eletivas é só o acento e a cor de cada trilha. nada de paleta paralela
 * hardcoded em página: se precisar de cor de eletiva, importa daqui.
 *
 * as cores de trilha aqui espelham a coluna `trails.color` no banco e
 * servem de fallback quando o banco vier nulo.
 */

export type EletivaSlug = "ia-na-pratica" | "economia-circular";

/** papel de fundo, igual nas duas eletivas: bege perestroika */
export const PAPER = "#f2e4d8";

/** acento principal de cada eletiva (card, barra de progresso, certificado) */
export const ELETIVA_ACCENT: Record<string, string> = {
  "ia-na-pratica": "#f756a6", // rosa perestroika
  "economia-circular": "#F25E3D", // laranja dudu
};

/** cor de cada trilha, por order_index (1-4) */
export const TRAIL_COLORS: Record<string, Record<number, string>> = {
  "ia-na-pratica": {
    1: "#fe7b02", // fundamentos & ia — laranja
    2: "#fd4644", // problema & decisão — vermelho
    3: "#f756a6", // construção no lovable — rosa
    4: "#8A85BF", // validação & evolução — lilás
  },
  "economia-circular": {
    1: "#F25E3D", // enxergar — laranja
    2: "#F2BC57", // entender — amarelo
    3: "#75BF9C", // criar — verde
    4: "#448FF2", // validar — azul
  },
};

export const accentFor = (slug?: string | null): string =>
  (slug && ELETIVA_ACCENT[slug]) || ELETIVA_ACCENT["ia-na-pratica"];

export const trailColorFor = (slug: string | undefined | null, orderIndex: number): string =>
  (slug && TRAIL_COLORS[slug]?.[orderIndex]) ??
  TRAIL_COLORS["ia-na-pratica"][orderIndex] ??
  "#090909";
