import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** se passado, renderiza link de voltar à esquerda. */
  back?: { to: string; label?: string };
  /** ações no canto direito (botões de sair, settings, etc). */
  actions?: ReactNode;
  /** mostra ChoraLogo no centro (entre back e actions) ou à esquerda quando não há back. default true. */
  showLogo?: boolean;
  /** envolve a logo num Link to=/ (útil em páginas públicas). default false. */
  logoLink?: string;
  /** classes extras pro <header>. */
  className?: string;
}

/**
 * header padrão de toda page do hub. centraliza o padrão container max-w-5xl,
 * pt-8 pb-4, gap responsivo (2 sm:3) e min-h-11 nos clicáveis. evita 9 cópias
 * com variações sutis. mobile-first: em ≤360px o nickname/label do back encolhe
 * mas mantém touch target.
 */
export const PageHeader = ({
  back,
  actions,
  showLogo = true,
  logoLink,
  className,
  hideBell = false,
}: PageHeaderProps) => {
  const { user } = useAuth();
  const logo = (
    <ChoraLogo variant="dark" />
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
        "container max-w-5xl flex items-center justify-between gap-2 sm:gap-3 pt-8 pb-4 relative z-10 flex-nowrap",
        className,
      )}
    >
      {/* esquerda: logo sempre, encolhe se faltar espaço */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
        {showLogo &&
          (logoLink ? (
            <Link
              to={logoLink}
              className="inline-flex min-h-11 items-center min-w-0 max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded [&_svg]:max-w-full [&_svg]:h-auto"
            >
              {logo}
            </Link>
          ) : (
            <span className="inline-flex min-w-0 max-w-full [&_svg]:max-w-full [&_svg]:h-auto">
              {logo}
            </span>
          ))}
      </div>

      {/* direita: back + ações, nunca quebra */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 flex-nowrap">
        {backLink}
        {user && !hideBell && <NotificationBell />}
        {actions}
      </div>
    </header>
  );
};
