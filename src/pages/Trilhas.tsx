import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useCourseBySlug, useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { PageHeader } from "@/components/layout/PageHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ChoraBotFab } from "@/components/dashboard/ChoraBotFab";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { TrilhaColumn } from "@/components/eletiva/TrilhaColumn";
import { EletivaSwitcher } from "@/components/dashboard/EletivaSwitcher";

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

const Trilhas = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const [params] = useSearchParams();
  const slug = params.get("eletiva") ?? undefined;
  const { data: enrollments } = useMyEnrollments();
  const { slug: activeSlug } = useActiveEletiva();
  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  // fallback: slug ativa salva > primeira matrícula
  const fallbackCourse = !slug
    ? enrollments?.find((e) => e.course?.slug === activeSlug)?.course ??
      enrollments?.[0]?.course ??
      null
    : null;
  const activeCourse = course ?? fallbackCourse;
  const { data, isLoading } = useEletivaProgress(activeCourse?.id ?? null);

  // matriculado nesse curso?
  const isEnrolled = !!enrollments?.some((e) => e.course_id === activeCourse?.id);


  if (isLoading || courseLoading || !data) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="motion-safe:animate-pulse">
            <EletivaSymbol size={72} pose="building" />
          </div>
          <p className="font-body text-xs text-perestroika-preto/55">preparando o barro...</p>
          <span className="sr-only">carregando trilhas</span>
        </div>
      </div>
    );
  }

  // sem curso ativo (nem slug válido nem matrícula): bloqueia acesso
  if (!activeCourse || !isEnrolled) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <EletivaSymbol size={80} pose="resting" />
          <h1 className="font-display uppercase text-3xl">acesso restrito</h1>
          <p className="font-body text-sm text-perestroika-preto/75">
            você não está matriculado nessa eletiva. volte ao painel pra ver as suas.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto px-5 py-2.5 font-body text-sm text-perestroika-bege"
          >
            <ArrowLeft className="h-4 w-4" /> voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  const { trails, modules, progressByModuleId, unlockedModuleIds, totalCompleted, totalPublished } = data;

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        actions={
          <>
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
        style={{ paddingBottom: "calc(var(--mobile-nav-h, 0px) + 5rem)" }}
      >
        <div className="container max-w-6xl pt-6 sm:pt-10">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 font-body text-sm text-perestroika-preto/70 hover:text-perestroika-preto mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            voltar
          </Link>

          <header className="mb-8 sm:mb-10 space-y-4">
            <div>
              <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-2">
                eletiva {activeCourse.title.toLowerCase()}
              </p>
              <h1 className="font-display uppercase text-4xl sm:text-5xl lg:text-6xl leading-[0.9] mb-3">
                o mapa inteiro
              </h1>
              <p className="font-body text-base text-perestroika-preto/75 max-w-2xl">
                com {activeCourse.professor_name.toLowerCase()}. {totalCompleted} de {totalPublished} módulos liberados já são seus.
              </p>
            </div>
            <EletivaSwitcher />
          </header>

          {trails.length === 0 ? (
            <p className="font-body text-perestroika-preto/60 italic">
              as trilhas estão sendo preparadas.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
              {trails.map((trail, idx) => {
                const trailModules = modules
                  .filter((m) => m.trail_id === trail.id)
                  .sort((a, b) => a.number - b.number);
                return (
                  <TrilhaColumn
                    key={trail.id}
                    trail={trail}
                    modules={trailModules}
                    progressByModuleId={progressByModuleId}
                    unlockedModuleIds={unlockedModuleIds}
                    fallbackColor={trailColorByOrder[trail.order_index] ?? "#090909"}
                    columnIndex={idx}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ChoraBotFab />
      <MobileNav />
    </div>
  );
};

export default Trilhas;
