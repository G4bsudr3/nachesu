import { useEffect, useRef } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Lock, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCourseBySlug, useMyEnrollments } from "@/hooks/useCourses";
import { useEletivaProgress, type EletivaSnapshot } from "@/hooks/useEletivaProgress";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { MobileNav } from "@/components/layout/MobileNav";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { EletivaOnboardingOverlay } from "@/components/eletiva/EletivaOnboardingOverlay";


const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02", // fundamentos & ia — laranja
  2: "#fd4644", // problema & decisão — vermelho
  3: "#f756a6", // construção no lovable — rosa
  4: "#8A85BF", // validação & evolução — lilás
};

type ModuleState = "done" | "current" | "available" | "scheduled" | "locked";

const moduleState = (
  m: EletivaSnapshot["modules"][number],
  snapshot: EletivaSnapshot,
): ModuleState => {
  const prog = snapshot.progressByModuleId[m.id];
  if (prog?.completed_at) return "done";
  const available = m.published && (!m.available_from || new Date(m.available_from).getTime() <= Date.now());
  if (!available) return "scheduled";
  if (!snapshot.unlockedModuleIds.has(m.id)) return "locked";
  if (snapshot.currentModule?.id === m.id) return "current";
  return "available";
};

const ModulesByTrail = ({ snapshot, onPick }: { snapshot: EletivaSnapshot; onPick: (n: number) => void }) => {
  if (!snapshot.trails.length) return null;
  return (
    <section
      aria-labelledby="modulos-title"
      className="rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege/55 p-6 sm:p-8"
    >
      <header className="mb-8">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-2">
          O MAPA DA ELETIVA
        </p>
        <h2 id="modulos-title" className="font-display uppercase text-3xl sm:text-4xl leading-[0.95]">
          as etapas da sua jornada
        </h2>
      </header>

      <div className="space-y-10">
        {snapshot.trails.map((trail) => {
          const trailModules = snapshot.modules
            .filter((m) => m.trail_id === trail.id)
            .sort((a, b) => a.number - b.number);
          if (!trailModules.length) return null;
          const color = trail.color ?? trailColorByOrder[trail.order_index] ?? "#090909";
          const done = trailModules.filter((m) => snapshot.progressByModuleId[m.id]?.completed_at).length;
          const trailPct = Math.round((done / trailModules.length) * 100);
          return (
            <div key={trail.id}>
              <div className="mb-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <h3 className="font-display uppercase text-lg sm:text-xl leading-none truncate">
                      {trail.title.toLowerCase()}
                    </h3>
                  </div>
                  <span className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55 tabular-nums shrink-0">
                    {done}/{trailModules.length}
                  </span>
                </div>
                <div className="h-[3px] rounded-full bg-perestroika-preto/8 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${trailPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trailModules.map((m) => {
                  const state = moduleState(m, snapshot);
                  const clickable = state === "current" || state === "available" || state === "done";
                  const Icon =
                    state === "done"
                      ? CheckCircle2
                      : state === "scheduled"
                        ? Clock
                        : state === "locked"
                          ? Lock
                          : ArrowRight;
                  const stateLabel =
                    state === "done"
                      ? "concluído"
                      : state === "current"
                        ? "continuar"
                        : state === "available"
                          ? "abrir"
                          : state === "scheduled"
                            ? m.available_from
                              ? `libera ${new Date(m.available_from).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
                              : "em breve"
                            : "termine o anterior";
                  const base =
                    "group relative flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-all w-full";
                  const variant =
                    state === "current"
                      ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege shadow-[0_4px_0_0_rgba(9,9,9,0.15)]"
                      : state === "done"
                        ? "border-perestroika-preto/20 bg-perestroika-bege hover:border-perestroika-preto/60"
                        : state === "available"
                          ? "border-perestroika-preto/25 bg-perestroika-bege hover:border-perestroika-preto hover:-translate-y-0.5"
                          : "border-perestroika-preto/10 bg-perestroika-preto/[0.02] text-perestroika-preto/50 cursor-not-allowed";
                  const numColor =
                    state === "current"
                      ? "text-perestroika-bege"
                      : state === "locked" || state === "scheduled"
                        ? "text-perestroika-preto/35"
                        : undefined;
                  return (
                    <li key={m.id} id={`modulo-${m.number}`} className="scroll-mt-28">
                      {state === "current" && (
                        <p
                          className="mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-body text-[10px] uppercase tracking-[0.18em] text-perestroika-bege"
                          style={{ backgroundColor: color }}
                        >
                          continue por aqui
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickable && onPick(m.number)}
                        className={`${base} ${variant}`}
                        aria-label={`módulo ${m.number} ${m.title} — ${stateLabel}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            aria-hidden
                            className={`font-display text-2xl leading-none shrink-0 tabular-nums ${numColor ?? ""}`}
                            style={numColor ? undefined : { color }}
                          >
                            {String(m.number).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="font-body text-sm font-medium leading-snug truncate">
                              {m.title.toLowerCase()}
                            </p>
                            <p className="font-body text-[10px] uppercase tracking-[0.15em] opacity-65 mt-0.5">
                              {stateLabel}
                            </p>
                          </div>
                        </div>
                        <Icon className="h-4 w-4 shrink-0 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
};


const EletivaHome = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setSlug } = useActiveEletiva();
  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: snapshot, isLoading: snapLoading } = useEletivaProgress(course?.id ?? null);

  // card de materiais só existe se houver material publicado pra essa eletiva
  const { data: materialsCount } = useQuery({
    queryKey: ["hub-materials-count", course?.id],
    enabled: !!course?.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hub_materials")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .eq("course_id", course!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (slug) setSlug(slug);
  }, [slug, setSlug]);

  // ao abrir o mapa, leva o estudante direto pro módulo onde ele parou
  const scrolledTo = useRef<number | null>(null);
  const currentNumber = snapshot?.currentModule?.number ?? null;
  useEffect(() => {
    if (currentNumber === null || scrolledTo.current === currentNumber) return;
    const el = document.getElementById(`modulo-${currentNumber}`);
    if (!el) return;
    scrolledTo.current = currentNumber;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [currentNumber]);



  if (!slug) return <Navigate to="/app" replace />;

  // inclui snapLoading pra evitar flash de "0/0 módulos · 0%" no hero
  const loading = courseLoading || enrollmentsLoading || (!!course?.id && snapLoading && !snapshot);
  if (loading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="motion-safe:animate-pulse">
            <EletivaSymbol size={72} pose="thinking" />
          </div>
          <p className="font-body text-xs text-perestroika-preto/55">abrindo a eletiva...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" back={{ to: "/app", label: "voltar" }} actions={<AuthedHeaderActions />} />
        <main className="container max-w-2xl pt-10 pb-20 text-center">
          <h1 className="font-display uppercase text-4xl mb-3">eletiva não encontrada</h1>
          <p className="font-body text-perestroika-preto/70 mb-6">esse link não bateu com nenhuma eletiva ativa.</p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 font-body text-sm uppercase tracking-wide"
          >
            voltar pro início
          </Link>
        </main>
      </div>
    );
  }

  const isEnrolled = !!enrollments?.some((e) => e.course_id === course.id);
  if (!isEnrolled) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
        <PageHeader showLogo logoLink="/app" back={{ to: "/app", label: "voltar" }} actions={<AuthedHeaderActions />} />
        <main className="container max-w-2xl pt-10 pb-20 text-center space-y-4">
          <EletivaSymbol size={80} pose="resting" />
          <h1 className="font-display uppercase text-3xl">acesso restrito</h1>
          <p className="font-body text-sm text-perestroika-preto/75">
            <strong>{course.title.toLowerCase()}</strong> não tá na sua lista. fala com o educador se isso parece errado.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 font-body text-sm"
          >
            voltar
          </Link>
        </main>
      </div>
    );
  }

  const current = snapshot?.currentModule ?? null;
  const totalCompleted = snapshot?.totalCompleted ?? 0;
  const totalPublished = snapshot?.totalPublished ?? 0;
  const progressPct = totalPublished > 0 ? Math.round((totalCompleted / totalPublished) * 100) : 0;
  const tutorTo = current ? `/app/tutor?module=${current.number}` : "/app/tutor";
  const courseAccent = course.slug === "economia-circular" ? "#8A85BF" : "#f756a6";
  return (
    <div
      data-eletiva={course.slug === "economia-circular" ? "ecc" : undefined}
      className="relative min-h-dvh bg-background text-foreground font-body [overflow-x:clip]"
    >
      <PageHeader showLogo logoLink="/app" back={{ to: "/app", label: "voltar" }} actions={<AuthedHeaderActions />} />

      <main className="container max-w-3xl pt-6 pb-[calc(4rem+var(--mobile-nav-h,0px))] sm:pt-10 sm:pb-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto/15 bg-perestroika-bege pt-8 sm:pt-12 p-6 sm:p-10 mb-6"
        >
          <div
            aria-hidden
            className="absolute top-0 inset-x-0 h-1.5 sm:h-2"
            style={{ backgroundColor: courseAccent }}
          />

          {/* mascote do tutor no topo do hero — reduzido no mobile pra não colidir com o h1 */}
          <div
            aria-hidden
            className="absolute top-2 right-2 sm:top-6 sm:right-6 pointer-events-none z-0"
          >
            <span className="block sm:hidden">
              <EletivaSymbol size={52} pose="talking" className="opacity-60" />
            </span>
            <span className="hidden sm:block">
              <EletivaSymbol size={80} pose="talking" />
            </span>
          </div>

          <p className="relative z-10 font-body text-[11px] uppercase tracking-[0.3em] text-perestroika-preto/60 mb-1">
            sua eletiva
          </p>
          <h1 className="relative z-10 font-display uppercase text-[42px] sm:text-7xl leading-[0.9] sm:leading-[0.85] mb-3 max-w-[14ch] sm:max-w-[18ch] text-perestroika-preto">
            {course.title.toLowerCase()}
          </h1>
          {course.subtitle && (
            <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-lg sm:max-w-xl mb-6">
              {course.subtitle}
            </p>
          )}

          {/* quem te guia + progresso */}
          <div className="flex flex-wrap items-end gap-x-8 gap-y-5 pb-5 mb-5 border-b border-perestroika-preto/10">
            <div className="flex items-center gap-3 min-w-0">
              {course.professor_avatar_url && (
                <img
                  src={course.professor_avatar_url}
                  alt={course.professor_name}
                  width={52}
                  height={52}
                  decoding="async"
                  className="h-13 w-13 rounded-full object-cover border-2 border-perestroika-preto/15 shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/65 mb-0.5">
                  quem te guia
                </p>
                <p className="font-body text-sm font-semibold truncate">{course.professor_name.toLowerCase()}</p>
              </div>
            </div>

            {totalPublished > 0 && (
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-baseline justify-between mb-2 gap-3">
                  <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/65">
                    seu progresso
                  </p>
                  <p className="font-body text-sm font-semibold tabular-nums text-perestroika-preto">
                    {totalCompleted}/{totalPublished} · {progressPct}%
                  </p>
                </div>
                <div className="h-2 rounded-full bg-perestroika-preto/15 overflow-hidden border border-perestroika-preto/10">
                  <motion.div
                    className="h-full bg-perestroika-preto"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* próximo passo integrado no hero */}
          {!snapLoading && current && (
            <div className="rounded-2xl border-2 border-perestroika-preto/30 bg-perestroika-bege/80 p-5 sm:p-6 shadow-sm">
              <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/60 mb-2 inline-flex items-center gap-2">
                <EletivaSymbol size={20} pose="building" /> próximo passo
              </p>
              <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[0.95] text-perestroika-preto mb-2">
                módulo {String(current.number).padStart(2, "0")} · {current.title.toLowerCase()}
              </h2>
              {current.objective && (
                <p className="font-body text-sm text-perestroika-preto/80 mb-4 max-w-lg">
                  {current.objective}
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate(`/app/eletiva/${slug}/modulo/${current.number}`)}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 font-body font-semibold text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
              >
                continuar de onde parou <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* certificado liberado: aparece só quando 100% dos módulos publicados foram concluídos */}
          {!snapLoading && totalPublished > 0 && totalCompleted >= totalPublished && (
            <div
              className="rounded-2xl border-2 p-5 sm:p-6 shadow-sm"
              style={{
                borderColor: slug === "economia-circular" ? "#8A85BF" : "#f756a6",
                background:
                  slug === "economia-circular"
                    ? "linear-gradient(135deg, rgba(138,133,191,0.16), rgba(242,228,216,0.6))"
                    : "linear-gradient(135deg, rgba(247,86,166,0.16), rgba(242,228,216,0.6))",
              }}
            >
              <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/70 mb-2">
                você chegou até o fim
              </p>
              <h2 className="font-display uppercase text-2xl sm:text-3xl leading-[0.95] text-perestroika-preto mb-2">
                seu certificado tá liberado
              </h2>
              <p className="font-body text-sm text-perestroika-preto/80 mb-4 max-w-lg">
                100% da eletiva concluída. baixe seu certificado oficial em alta resolução.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/app/eletiva/${slug}/certificado`)}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-5 py-2.5 font-body font-semibold text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
              >
                baixar certificado <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

        </motion.section>

        {/* mapa de módulos com estado */}
        {snapshot && (
          <div className="mb-6">
            <ModulesByTrail snapshot={snapshot} onPick={(n) => navigate(`/app/eletiva/${slug}/modulo/${n}`)} />
          </div>
        )}

        {/* atalhos */}
        <section className={`grid gap-4 ${(materialsCount ?? 0) > 0 ? "sm:grid-cols-2" : ""}`}>
          <Link
            to={tutorTo}
            className="group flex items-start gap-4 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 hover:border-perestroika-preto transition-colors"
          >
            <div className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-perestroika-preto text-perestroika-bege">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display uppercase text-2xl leading-tight">tutor IA</p>
              <p className="font-body text-sm text-perestroika-preto/70 mt-1">
                {current
                  ? `com contexto das pílulas do módulo ${String(current.number).padStart(2, "0")}.`
                  : course.slug === "economia-circular"
                    ? "discute hipótese, sistema, evidência."
                    : "tira dúvida de prompt, código, escopo."}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-perestroika-preto/60 group-hover:translate-x-1 transition-transform" />
          </Link>

          {(materialsCount ?? 0) > 0 && (
          <Link
            to="/app/hub/materiais"
            className="group flex items-start gap-4 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 hover:border-perestroika-preto transition-colors"
          >
            <div className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-perestroika-preto text-perestroika-bege">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display uppercase text-2xl leading-tight">materiais</p>
              <p className="font-body text-sm text-perestroika-preto/70 mt-1">
                tudo que rola na eletiva: leitura, slide, link.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-perestroika-preto/60 group-hover:translate-x-1 transition-transform" />
          </Link>
          )}
        </section>
      </main>

      <EletivaOnboardingOverlay
        slug={course.slug}
        courseTitle={course.title}
        professorName={course.professor_name}
      />

      <EletivaFooter />
      <MobileNav />
    </div>
  );
};

export default EletivaHome;
