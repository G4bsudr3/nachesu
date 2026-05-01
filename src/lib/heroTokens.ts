/**
 * Tokens de espaçamento e dimensão do hero do Dashboard.
 *
 * Centraliza os ritmos verticais (xs/sm/md) pra qualquer ajuste futuro
 * acontecer num só lugar. As classes são literais Tailwind pra que o
 * compilador JIT inclua os utilitários no bundle final.
 *
 * Convenção: cada token escala de mobile → tablet → desktop seguindo
 * o ritmo "respiratório" do hero:
 *   - subtitle  : 16 → 20 → 24 px de espaço acima do título
 *   - cta       : 20 → 24 → 28 px de espaço acima do subtítulo
 *   - tese      : 12 → 16 px abaixo do CTA
 *   - bullets   : 20 px abaixo da tese
 *   - hint      :  8 px abaixo do subtítulo (modo "vai mais fundo")
 *
 * Altura do CTA também é tokenizada pra acompanhar a tipografia
 * (12 → 13 → 14 px de inset visual aproximado).
 */
export const heroSpacing = {
  /** espaço entre o título h1 e o subtítulo */
  subtitleTop: "mt-4 sm:mt-5 md:mt-6",
  /** espaço entre o subtítulo e a dica do modo "vai mais fundo" */
  hintTop: "mt-2",
  /** espaço entre o subtítulo (ou hint) e o CTA primário */
  ctaTop: "mt-5 sm:mt-6 md:mt-7",
  /** espaço entre o CTA e a tese de marca */
  teseTop: "mt-3 sm:mt-4",
  /** espaço entre a tese e o bloco de bullets */
  bulletsTop: "mt-5",
} as const;

export const heroSizing = {
  /** altura mínima do CTA primário, escalando com a tipografia */
  ctaMinHeight: "min-h-12 sm:min-h-[52px] md:min-h-14",
  /** padding horizontal do CTA primário */
  ctaPaddingX: "px-5 sm:px-6",
} as const;
