import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** se passado, renderiza link de voltar à direita. */
  back?: { to: string; label?: string };
  /** ações no canto direito (menu perfil, etc). */
  actions?: ReactNode;
  /** mostra logo NachesU centralizada. default true. */
  showLogo?: boolean;
  /** envolve a logo num Link to=/ (útil em páginas públicas). default false. */
  logoLink?: string;
  /** altura visual da logo (px). default 28 (compacto pro header). */
  logoHeight?: number;
  /** variante da logo. default "ink" (preta). */
  logoVariant?: "ink" | "dark" | "light";
  /** remove a divisória inferior (útil em páginas públicas). default false. */
  borderless?: boolean;
  /** classes extras pro <header>. */
  className?: string;
}

/**
 * header padrão do hub: logo centralizada + back/ações à direita,
 * com divisória sutil separando do conteúdo da página.
 */
export const PageHeader = ({
  back,
  actions,
  showLogo = true,
  logoLink,
  logoHeight = 28,
  logoVariant = "ink",
  borderless = false,
  className,
}: PageHeaderProps) => {
  const logo = (
    <NachesULogo variant={logoVariant} height={logoHeight} showSelo={false} />
  );

  const backLabel = back?.label ?? "voltar";
  const backLink = back ? (
    <Link
      to={back.to}
      aria-label={backLabel}
      className="inline-flex items-center gap-1.5 sm:gap-2 min-h-11 px-1 font-body text-sm uppercase tracking-wide hover:gap-2 sm:hover:gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline truncate">{backLabel}</span>
    </Link>
  ) : null;

  return (
    <header
      className={cn(
        "relative z-10",
        !borderless && "shadow-[0_2px_8px_-4px_rgba(9,9,9,0.08)]",
        className,
      )}
    >
      <div className="container max-w-5xl relative flex items-center justify-between gap-2 sm:gap-3 pt-6 pb-4 flex-nowrap min-h-[64px]">
        {/* esquerda: back */}
        <div className="flex flex-1 items-center justify-start gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
          {backLink}
        </div>

        {/* logo absolutamente centralizada */}
        {showLogo && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            {logoLink ? (
              <Link
                to={logoLink}
                className="inline-flex items-center pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
                aria-label="ir pra home"
              >
                {logo}
              </Link>
            ) : (
              <span className="inline-flex items-center">{logo}</span>
            )}
          </div>
        )}

        {/* direita: ações */}
        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
          {actions}
        </div>
      </div>
    </header>
  );
};
