import { cn } from "@/lib/utils";

interface EletivaLogoProps {
  variant?: "dark" | "light";
  className?: string;
  /** altura visual em px. default 36. */
  height?: number;
  /** mostra o selo "sebrae" embaixo. default true. */
  showSelo?: boolean;
}

/**
 * wordmark da eletiva sebrae. placeholder textual em league gothic
 * até o asset oficial chegar. drop-in replace do <ChoraLogo />:
 * mesmas props (variant + className + height).
 *
 * variant "dark"  = traçado preto (uso sobre fundo bege/claro)
 * variant "light" = traçado bege (uso sobre fundo escuro)
 *
 * quando o svg oficial chegar, troca o conteúdo do componente
 * sem mexer em nenhum import existente.
 */
export const EletivaLogo = ({
  variant = "dark",
  className,
  height = 36,
  showSelo = true,
}: EletivaLogoProps) => {
  const colorClass = variant === "dark" ? "text-brand-preto" : "text-brand-bege";
  const seloColorClass = variant === "dark" ? "text-accent" : "text-brand-bege";

  return (
    <div
      className={cn("inline-flex flex-col items-start leading-none select-none", colorClass, className)}
      style={{ height }}
      aria-label="eletiva sebrae"
    >
      <span
        className="font-display uppercase tracking-tight"
        style={{ fontSize: height * 0.78, lineHeight: 0.85 }}
      >
        eletiva
      </span>
      {showSelo && (
        <span
          className={cn("font-body uppercase tracking-[0.18em] font-bold mt-0.5", seloColorClass)}
          style={{ fontSize: Math.max(8, height * 0.22) }}
        >
          escola sebrae
        </span>
      )}
    </div>
  );
};
