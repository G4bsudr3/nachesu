import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { PageHeader } from "@/components/layout/PageHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { ChoraBotFab } from "@/components/dashboard/ChoraBotFab";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { EstrelaPerestroika } from "@/components/brand/EstrelaPerestroika";
import { TrilhaColumn } from "@/components/eletiva/TrilhaColumn";

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

const Trilhas = () => {
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { data, isLoading } = useEletivaProgress();

  if (isLoading || !data) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="motion-safe:animate-pulse">
          <LagrimaGradient size={56} />
          <span className="sr-only">carregando trilhas</span>
        </div>
      </div>
    );
  }

  const { trails, modules, progressByModuleId, unlockedModuleIds, totalCompleted, totalPublished } = data;

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <EstrelaPerestroika
          size={320}
          color="rosa"
          className="absolute -left-24 -bottom-24 opacity-20 motion-safe:animate-spin-slow"
        />
      </div>

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

          <header className="mb-8 sm:mb-10">
            <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60 mb-2">
              eletiva ia na prática
            </p>
            <h1 className="font-display uppercase text-4xl sm:text-5xl lg:text-6xl leading-[0.9] mb-3">
              o mapa inteiro
            </h1>
            <p className="font-body text-base text-perestroika-preto/75 max-w-2xl">
              4 trilhas, 20 módulos. {totalCompleted} de {totalPublished} módulos liberados já são seus.
            </p>
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
