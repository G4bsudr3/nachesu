import { Link } from "react-router-dom";
import { LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useMyEnrollments } from "@/hooks/useCourses";
import { usePostEventStatus } from "@/hooks/usePostEventStatus";
import { useEletivaExtras } from "@/features/hub/useEletivaExtras";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";

import { DefinirSenhaCard } from "@/components/DefinirSenhaCard";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { NextActionHero } from "@/components/dashboard/NextActionHero";
import { JourneyChips } from "@/components/dashboard/JourneyChips";
import { ArchiveSection } from "@/components/dashboard/ArchiveSection";
import { EletivaCard } from "@/components/dashboard/EletivaCard";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { ChoraBotFab } from "@/components/dashboard/ChoraBotFab";
import { MobileNav } from "@/components/layout/MobileNav";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { MyCoursesList } from "@/components/dashboard/MyCoursesList";
import { DashboardCommandPanel } from "@/components/dashboard/DashboardCommandPanel";
import { DualEletivasHero } from "@/components/dashboard/DualEletivasHero";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";

const AppDashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: dashboardLoading } = useDashboardData();
  const { data: enrollments } = useMyEnrollments();
  const { slug: activeSlug } = useActiveEletiva();
  // se aluno tem só 1 matrícula, escopa pelo único curso.
  // se tem 2+, usa a slug "atual" escolhida no switcher (com fallback pra primeira).
  const hasMultiple = (enrollments?.length ?? 0) > 1;
  const activeEnrollment =
    enrollments && enrollments.length === 1
      ? enrollments[0]
      : enrollments?.find((e) => e.course?.slug === activeSlug) ??
        enrollments?.[0] ??
        null;
  const activeCourseId = activeEnrollment?.course_id ?? null;
  const { data: eletiva, isLoading: eletivaLoading } = useEletivaProgress(activeCourseId);
  const status = usePostEventStatus();
  const { enabled: extrasEnabled } = useEletivaExtras(activeCourseId);

  const nickname = dashboard?.nicknameDisplay ?? "";
  const hasPassword = dashboard?.profile?.has_password ?? true;

  // estado de carregamento inicial: skeleton que espelha o layout real
  if (!user || dashboardLoading) {
    return <DashboardSkeleton />;
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
            <div className="hidden sm:block font-body text-sm mr-1 text-perestroika-preto/65 truncate max-w-[160px]">
              oi, <span className="font-semibold text-perestroika-preto">{nickname || "..."}</span>
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
            loading={!!activeCourseId && eletivaLoading && !eletiva}
            hasMultiple={hasMultiple}
          />


          {/* 2+ matrículas → hero paralelo com as duas eletivas em peso equivalente */}
          {hasMultiple && <DualEletivasHero />}

          {/* 1 matrícula → hero direto (CTA leva pro módulo atual) */}
          {!hasMultiple && activeCourseId && (
            <EletivaCard snapshot={eletiva ?? undefined} />
          )}

          {/* painel de comando: só na visão de eletiva única (evita fixar em uma das duas) */}
          {!hasMultiple && activeCourseId && (
            <DashboardCommandPanel
              snapshot={eletiva ?? null}
              courseTitle={activeEnrollment?.course?.title}
            />
          )}

          {/* 0 matrículas → estado vazio */}
          {enrollments && enrollments.length === 0 && <MyCoursesList />}

          {/* extras pós-evento Chŏra: só com flag ligada (admin reativa quando precisar) */}
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
        <EletivaFooter tone="dark" />
      </footer>
    </div>
  );
};

export default AppDashboard;
