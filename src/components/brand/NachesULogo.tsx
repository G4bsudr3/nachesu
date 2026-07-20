import { cn } from "@/lib/utils";
import nachesuWordmark from "@/assets/brand/nachesu-wordmark.png";
import letterN from "@/assets/brand/naches-n.png";
import letterU from "@/assets/brand/naches-u.png";

interface NachesULogoProps {
  variant?: "dark" | "light" | "ink";
  className?: string;
  /** altura visual em px. default 36. */
  height?: number;
  /** mostra o selo "para o ensino médio" embaixo. default true. */
  showSelo?: boolean;
  /** só o monograma N+U (sem o "aches"). útil pra avatares, favicon, headers compactos. */
  iconOnly?: boolean;
}

/**
 * wordmark NachesU oficial. lockup completo "nachesU" como uma única
 * imagem (não compõe mais wordmark + U separados, evita desalinhamento).
 *
 * variant "dark" azul Naches (#1E2BB8), "light" bege Perestroika, "ink" preto.
 *
 * iconOnly mostra só os dois símbolos N + U pra contextos compactos.
 */
export const NachesULogo = ({
  variant = "dark",
  className,
  height = 36,
  showSelo = true,
  iconOnly = false,
}: NachesULogoProps) => {
  const inkColor =
    variant === "light" ? "#f2e4d8" : variant === "ink" ? "#090909" : "#1E2BB8";
  const seloColor =
    variant === "light"
      ? "text-brand-bege/85"
      : variant === "ink"
        ? "text-perestroika-preto"
        : "text-naches-azul";

  const Mark = ({ src, ratio }: { src: string; ratio: string }) => (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        height: "100%",
        aspectRatio: ratio,
        backgroundColor: inkColor,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );

  return (
    <div
      className={cn("inline-flex flex-col items-start leading-none select-none shrink-0", className)}
      aria-label="nachesu"
    >
      <span className="inline-flex items-center" style={{ height, gap: `${height * 0.06}px` }}>
        {iconOnly ? (
          <>
            <Mark src={letterN} ratio="1511 / 1023" />
            <Mark src={letterU} ratio="1500 / 1024" />
          </>
        ) : (
          <Mark src={nachesuWordmark} ratio="1288 / 358" />
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
