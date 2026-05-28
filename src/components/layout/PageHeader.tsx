import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
  /** oculta o sino de notificações (default: false). */
  hideBell?: boolean;
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
  const logo = (
    <ChoraLogo variant="dark" />
  );

  return (
    <header
      className={cn(
        "container max-w-5xl flex items-center justify-between gap-2 sm:gap-3 pt-8 pb-4 relative z-10",
        className,
      )}
    >
      {/* esquerda: back ou logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        {back ? (
          <Link
            to={back.to}
            className="inline-flex items-center gap-1.5 sm:gap-2 min-h-11 font-body text-sm uppercase tracking-wide hover:gap-2 sm:hover:gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{back.label ?? "voltar"}</span>
          </Link>
        ) : (
          showLogo &&
          (logoLink ? (
            <Link
              to={logoLink}
              className="inline-flex min-h-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
            >
              {logo}
            </Link>
          ) : (
            logo
          ))
        )}
      </div>

      {/* direita: logo (se back ativo) + ações */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {back && showLogo && (
          <span className="hidden sm:inline-flex items-center">{logo}</span>
        )}
        {!hideBell && <NotificationBell />}
        {actions}
      </div>
    </header>
  );
};
