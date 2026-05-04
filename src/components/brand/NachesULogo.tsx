import { cn } from "@/lib/utils";
import wordmark from "@/assets/brand/naches-wordmark.png";
import letterU from "@/assets/brand/naches-u.png";
import letterN from "@/assets/brand/naches-n.png";

interface NachesULogoProps {
  variant?: "dark" | "light";
  className?: string;
  /** altura visual em px. default 36. */
  height?: number;
  /** mostra o selo "para o ensino médio" embaixo. default true. */
  showSelo?: boolean;
  /** só o monograma N+U (sem o wordmark "aches"). útil pra avatares, favicon, headers compactos. */
  iconOnly?: boolean;
}

/**
 * wordmark NachesU. naches (lockup oficial) + letra U coladinha,
 * formando "nachesU". em iconOnly usa o monograma N + U.
 *
 * variant "dark" mantém o azul nativo Naches (#1E2BB8).
 * variant "light" recolore via CSS mask pro bege Perestroika.
 *
 * pngs já vêm com fundo transparente.
 */
export const NachesULogo = ({
  variant = "dark",
  className,
  height = 36,
  showSelo = true,
  iconOnly = false,
}: NachesULogoProps) => {
  const isLight = variant === "light";
  // cor do "tinta" do logo: light = bege; dark = azul naches nativo do png (renderiza img cru)
  const inkColor = isLight ? "#f2e4d8" : "#1E2BB8";
  const seloColor = isLight ? "text-brand-bege/85" : "text-naches-azul";

  // helper: renderiza png recolorido via mask (preserva forma exata)
  const Mark = ({ src, alt }: { src: string; alt: string }) => (
    <span
      role="img"
      aria-label={alt}
      style={{
        display: "inline-block",
        height: "100%",
        // largura proporcional definida pelo asset; usamos aspect via background-size contain
        // truque: usamos div com mask
        backgroundColor: inkColor,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "left center",
        maskPosition: "left center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        // largura calculada com aspect-ratio do png
        aspectRatio: src === wordmark ? "1238 / 471" : src === letterN ? "1511 / 1023" : "1500 / 1024",
      }}
    />
  );

  return (
    <div
      className={cn("inline-flex flex-col items-start leading-none select-none", className)}
      aria-label="nachesu"
    >
      <span className="inline-flex items-center" style={{ height, gap: `${height * 0.04}px` }}>
        {iconOnly ? (
          <>
            <Mark src={letterN} alt="naches" />
            <Mark src={letterU} alt="u" />
          </>
        ) : (
          <>
            <Mark src={wordmark} alt="naches" />
            <Mark src={letterU} alt="u" />
          </>
        )}
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
