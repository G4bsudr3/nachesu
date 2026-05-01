import logoPretaUrl from "@/assets/brand/logo-preta.svg";
import logoBegeUrl from "@/assets/brand/logo-bege.svg";

interface ChoraLogoProps {
  variant?: "dark" | "light";
  className?: string;
  /** altura em px ou tailwind class via className */
  height?: number;
}

/**
 * wordmark oficial chŏra lovable da perestroika.
 * usa o svg oficial — não recriar.
 *
 * variant "dark"  = traçado preto (uso sobre fundo bege/claro)
 * variant "light" = traçado bege (uso sobre fundo preto)
 */
export const ChoraLogo = ({
  variant = "dark",
  className,
  height = 36,
}: ChoraLogoProps) => {
  const src = variant === "dark" ? logoPretaUrl : logoBegeUrl;
  return (
    <img
      src={src}
      alt="chŏra lovable"
      style={{ height }}
      className={`w-auto select-none ${className ?? ""}`}
      draggable={false}
    />
  );
};
