import { cn } from "@/lib/utils";
import wordmark from "@/assets/brand/naches-wordmark.png";
import letterU from "@/assets/brand/naches-u.png";

interface NachesULogoProps {
  variant?: "dark" | "light";
  className?: string;
  /** altura visual em px. default 36. */
  height?: number;
  /** mostra o selo "para o ensino médio" embaixo. default true. */
  showSelo?: boolean;
}

/**
 * wordmark NachesU. extensão da marca Naches pra plataforma de
 * eletivas do ensino médio. composição de dois pngs oficiais
 * (wordmark "naches" + letra "U" com pingo) coladinhos.
 *
 * - variant "dark": traçado azul Naches (#1E2BB8) sobre fundo claro
 * - variant "light": invertido pro bege Perestroika sobre fundo escuro
 *
 * drop-in replace do antigo <EletivaLogo />.
 */
export const NachesULogo = ({
  variant = "dark",
  className,
  height = 36,
  showSelo = true,
}: NachesULogoProps) => {
  // light = inverte pra bege; dark = mantém azul nativo do png
  const filterStyle =
    variant === "light"
      ? {
          // mapeia o azul-naches puro pro bege-perestroika #f2e4d8
          filter:
            "brightness(0) invert(0.93) sepia(0.32) saturate(0.42) hue-rotate(345deg)",
        }
      : undefined;

  const seloColor =
    variant === "light" ? "text-brand-bege/85" : "text-naches-azul";

  return (
    <div
      className={cn("inline-flex flex-col items-start leading-none select-none", className)}
      style={{ height: showSelo ? height + Math.max(10, height * 0.28) : height }}
      aria-label="nachesu"
    >
      <span
        className="inline-flex items-end gap-[0.02em]"
        style={{ height }}
      >
        <img
          src={wordmark}
          alt=""
          aria-hidden="true"
          style={{ height: "100%", width: "auto", display: "block", ...filterStyle }}
          draggable={false}
        />
        <img
          src={letterU}
          alt=""
          aria-hidden="true"
          style={{
            height: "100%",
            width: "auto",
            display: "block",
            marginLeft: `-${height * 0.02}px`,
            ...filterStyle,
          }}
          draggable={false}
        />
      </span>
      {showSelo && (
        <span
          className={cn(
            "font-body uppercase tracking-[0.22em] font-semibold mt-1.5",
            seloColor,
          )}
          style={{ fontSize: Math.max(8, height * 0.22) }}
        >
          para o ensino médio
        </span>
      )}
    </div>
  );
};

export default NachesULogo;
