import { Link } from "react-router-dom";
import { LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { usePostEventStatus } from "@/hooks/usePostEventStatus";
import { useEletivaExtras } from "@/features/hub/useEletivaExtras";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";

import { DefinirSenhaCard } from "@/components/DefinirSenhaCard";
import { NextActionHero } from "@/components/dashboard/NextActionHero";
import { JourneyChips } from "@/components/dashboard/JourneyChips";
import { HubGateway } from "@/components/dashboard/HubGateway";
import { ArchiveSection } from "@/components/dashboard/ArchiveSection";
import { EletivaCard } from "@/components/dashboard/EletivaCard";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { TrailsProgress } from "@/components/dashboard/TrailsProgress";
import { ChoraBotFab } from "@/components/dashboard/ChoraBotFab";
import { MobileNav } from "@/components/layout/MobileNav";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { MyCoursesList } from "@/components/dashboard/MyCoursesList";

const AppDashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: dashboardLoading } = useDashboardData();
  const { data: eletiva } = useEletivaProgress();
  const status = usePostEventStatus();
  const { enabled: extrasEnabled } = useEletivaExtras();

  const nickname = dashboard?.nicknameDisplay ?? "";
  const hasPassword = dashboard?.profile?.has_password ?? true;

  // estado de carregamento inicial
  if (!user || dashboardLoading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="motion-safe:animate-pulse">
            <EletivaSymbol size={72} pose="building" />
          </div>
          <p className="font-body text-xs text-perestroika-preto/55">construindo seu ninho...</p>
          <span className="sr-only">carregando dashboard</span>
        </div>
      </div>
    );
  }

  // calcula dias desde a última atividade (start_at ou completed_at mais recente)
  const daysSinceLastActivity: number | null = (() => {
    if (!eletiva) return null;
    let mostRecent = 0;
    for (const p of Object.values(eletiva.progressByModuleId)) {
      const ts = Math.max(
        p.completed_at ? new Date(p.completed_at).getTime() : 0,
        p.started_at ? new Date(p.started_at).getTime() : 0,
      );
      if (ts > mostRecent) mostRecent = ts;
    }
    if (mostRecent === 0) return null;
    return Math.floor((Date.now() - mostRecent) / (1000 * 60 * 60 * 24));
  })();

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
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

          {/* 1. saudação contextual */}
          <DashboardGreeting
            nickname={nickname}
            totalCompleted={eletiva?.totalCompleted ?? 0}
            totalPublished={eletiva?.totalPublished ?? 0}
            daysSinceLastActivity={daysSinceLastActivity}
          />

          {/* 2. hero único: próximo módulo da eletiva */}
          <EletivaCard snapshot={eletiva ?? undefined} />

          {/* 3. progresso visual das 4 trilhas */}
          {eletiva && eletiva.totalPublished > 0 && (
            <TrailsProgress snapshot={eletiva} />
          )}

          {/* 4. apoio: tutor IA + materiais (e extras se admin ligar a flag) */}
          <HubGateway />

          {/* 5. extras pós-evento Chŏra: só com flag ligada (admin reativa quando precisar) */}
          {extrasEnabled && (
            <>
              <NextActionHero nickname={nickname} status={status} />
              <JourneyChips status={status} />
              <ArchiveSection />
            </>
          )}
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
