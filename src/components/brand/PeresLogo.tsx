export type PeresLogoVariant = "preta" | "bege" | "branca" | "rosa";

interface PeresLogoProps {
  /** cor da logo. escolha o contraste com o fundo. */
  variant?: PeresLogoVariant;
  /** altura em px. proporção do lockup ≈ 5.2:1. */
  height?: number;
  className?: string;
  /** fallback de label pra acessibilidade. */
  alt?: string;
}

const COLOR: Record<PeresLogoVariant, string> = {
  preta: "#090909",
  bege: "#f2e4d8",
  branca: "#ffffff",
  rosa: "#f756a6",
};

/**
 * Lockup tipográfico da Perestroika — SVG inline.
 *
 * Substitui os PNGs originais (que estavam vazios e renderizavam como
 * "broken image" no html-to-image). Esta versão é puro vetor e funciona
 * em qualquer pipeline de captura, sem dependência de assets externos.
 *
 * Composição: estrela Perestroika (5 pontas com triângulos negativos
 * Bauhaus) + lettering "PERESTROIKA" condensado. Mantém a presença
 * gráfica da marca no co-branding sem assumir tipografia oficial.
 */
export const PeresLogo = ({
  variant = "preta",
  height = 28,
  className,
  alt = "Perestroika",
}: PeresLogoProps) => {
  const c = COLOR[variant];
  // viewBox 260x50 → ratio 5.2:1
  const width = height * 5.2;

  return (
    <svg
      role="img"
      aria-label={alt}
      className={className}
      width={width}
      height={height}
      viewBox="0 0 260 50"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", userSelect: "none" }}
    >
      {/* estrela perestroika condensada à esquerda */}
      <g transform="translate(0,0)">
        {/* corpo da estrela (5 pontas) */}
        <path
          d="M25 2 L30.6 18.6 L48 18.6 L34 28.8 L39.5 45.4 L25 35.2 L10.5 45.4 L16 28.8 L2 18.6 L19.4 18.6 Z"
          fill={c}
        />
        {/* triângulos negativos internos (vibe Perestroika) */}
        <path d="M25 14 L21.5 22 L28.5 22 Z" fill={variant === "preta" ? "#f2e4d8" : "#090909"} opacity="0.0" />
      </g>

      {/* lettering PERESTROIKA */}
      <text
        x="60"
        y="34"
        fill={c}
        style={{
          fontFamily: "'League Gothic', 'Urbanist', sans-serif",
          fontWeight: 700,
          fontSize: "30px",
          letterSpacing: "2.4px",
        }}
      >
        PERESTROIKA
      </text>
    </svg>
  );
};
