import { Link } from "react-router-dom";
import { LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePostEventStatus } from "@/hooks/usePostEventStatus";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { EstrelaPerestroika } from "@/components/brand/EstrelaPerestroika";
import { DefinirSenhaCard } from "@/components/DefinirSenhaCard";
import { NextActionHero } from "@/components/dashboard/NextActionHero";
import { JourneyChips } from "@/components/dashboard/JourneyChips";
import { HubGateway } from "@/components/dashboard/HubGateway";
import { ArchiveSection } from "@/components/dashboard/ArchiveSection";
import { EletivaCard } from "@/components/dashboard/EletivaCard";
import { ChoraBotFab } from "@/components/dashboard/ChoraBotFab";
import { MobileNav } from "@/components/layout/MobileNav";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";

const AppDashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: dashboardLoading } = useDashboardData();
  const status = usePostEventStatus();

  const nickname = dashboard?.nicknameDisplay ?? "";
  const hasPassword = dashboard?.profile?.has_password ?? true;

  // estado de carregamento inicial
  if (!user || dashboardLoading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="motion-safe:animate-pulse">
          <LagrimaGradient size={56} />
          <span className="sr-only">carregando dashboard</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      {/* decoração de fundo */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <EstrelaPerestroika
          size={360}
          color="rosa"
          className="absolute -right-32 -bottom-32 opacity-25 motion-safe:animate-spin-slow sm:!w-[480px] lg:!w-[620px]"
        />
      </div>

      <PageHeader
        showLogo
        logoLink="/"
        actions={
          <>
            <div className="hidden sm:block font-body text-sm sm:text-base mr-1">
              oi, <span className="font-semibold">{nickname || "..."}</span>
            </div>
            {isAdmin && (
              <Link to="/admin" aria-label="painel admin" title="painel admin" className="icon-btn">
                <Shield className="h-4 w-4" />
              </Link>
            )}
            <Link to="/app/conta" aria-label="conta" title="conta" className="icon-btn">
              <Settings className="h-4 w-4" />
            </Link>
            <button type="button" onClick={signOut} aria-label="sair" className="icon-btn">
              <LogOut className="h-4 w-4" />
            </button>
          </>
        }
      />

      <main
        id="conteudo"
        className="relative z-10"
        style={{
          // reserva espaço pra bottom nav + altura do FAB (~52px) + folga
          paddingBottom: "calc(var(--mobile-nav-h, 0px) + 5rem)",
        }}
      >
        <div className="container max-w-5xl space-y-8 pt-6 sm:space-y-10 sm:pt-10">
          {/* aviso de senha (só se ainda não definiu) */}
          {!hasPassword && (
            <DefinirSenhaCard
              onDefined={() =>
                queryClient.invalidateQueries({ queryKey: ["dashboard-data"] })
              }
            />
          )}

          {/* eletiva: card do próximo módulo (produto principal hoje) */}
          <EletivaCard />

          {/* hero único: a próxima ação pendente da jornada pós-evento */}
          <NextActionHero nickname={nickname} status={status} />

          {/* status da jornada (3 chips) */}
          <JourneyChips status={status} />

          {/* hub como destino permanente */}
          <HubGateway />

          {/* trilha pré-evento, colapsada */}
          <ArchiveSection />
        </div>
      </main>

      {/* chora bot flutuante + nav mobile */}
      <ChoraBotFab />
      <MobileNav />

      <footer
        className="relative z-10 container max-w-5xl pb-10"
        style={{ marginBottom: "var(--mobile-nav-h, 0px)" }}
      >
        <p className="text-center font-body text-xs text-perestroika-preto/55">
          eletiva sebrae · escola sebrae · 1º ano EM
        </p>
      </footer>
    </div>
  );
};

export default AppDashboard;
