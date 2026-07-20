import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Lock, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
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
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
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
      className="rounded-3xl border-2 border-perestroika-preto/15 bg-white/55 p-5 sm:p-6"
    >
      <header className="mb-5">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-1">
          mapa da eletiva
        </p>
        <h2 id="modulos-title" className="font-display uppercase text-2xl sm:text-3xl leading-none">
          mapa da eletiva
        </h2>
      </header>

      <div className="space-y-6">
        {snapshot.trails.map((trail) => {
          const trailModules = snapshot.modules
            .filter((m) => m.trail_id === trail.id)
            .sort((a, b) => a.number - b.number);
          if (!trailModules.length) return null;
          const color = trail.color ?? trailColorByOrder[trail.order_index] ?? "#090909";
          const done = trailModules.filter((m) => snapshot.progressByModuleId[m.id]?.completed_at).length;
          return (
            <div key={trail.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-body text-sm">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-display uppercase text-base">{trail.title.toLowerCase()}</span>
                </span>
                <span className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/55 tabular-nums">
                  {done}/{trailModules.length}
                </span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    "group flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors";
                  const variant =
                    state === "current"
                      ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
                      : state === "done"
                        ? "border-perestroika-preto/20 bg-perestroika-bege"
                        : state === "available"
                          ? "border-perestroika-preto/30 bg-perestroika-bege hover:border-perestroika-preto"
                          : "border-perestroika-preto/10 bg-perestroika-preto/[0.03] text-perestroika-preto/55 cursor-not-allowed";
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickable && onPick(m.number)}
                        className={`${base} ${variant} w-full`}
                        aria-label={`módulo ${m.number} ${m.title} — ${stateLabel}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            aria-hidden
                            className="font-display text-xl shrink-0 tabular-nums"
                            style={{ color: state === "current" ? undefined : color }}
                          >
                            {String(m.number).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="font-body text-sm font-medium truncate">{m.title.toLowerCase()}</p>
                            <p className="font-body text-[10px] uppercase tracking-wide opacity-70">
                              {stateLabel}
                            </p>
                          </div>
                        </div>
                        <Icon className="h-4 w-4 shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
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

  useEffect(() => {
    if (slug) setSlug(slug);
  }, [slug, setSlug]);

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

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      <PageHeader showLogo logoLink="/app" back={{ to: "/app", label: "voltar" }} actions={<AuthedHeaderActions />} />

      <main className="container max-w-3xl pt-6 pb-[calc(4rem+var(--mobile-nav-h,0px))] sm:pt-10 sm:pb-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-6 sm:p-10 mb-6"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.3em] text-perestroika-preto/55 mb-4">
            sua eletiva
          </p>
          <h1 className="font-display uppercase text-5xl sm:text-7xl leading-[0.9] mb-4">
            {course.title.toLowerCase()}
          </h1>
          {course.subtitle && (
            <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-xl mb-8">
              {course.subtitle}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-8 gap-y-5 pt-6 border-t border-perestroika-preto/10">
            <div className="flex items-center gap-3 min-w-0">
              {course.professor_avatar_url && (
                <img
                  src={course.professor_avatar_url}
                  alt={course.professor_name}
                  className="h-12 w-12 rounded-full object-cover border border-perestroika-preto/10 shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/55 mb-0.5">
                  quem te guia
                </p>
                <p className="font-body text-sm font-medium truncate">{course.professor_name.toLowerCase()}</p>
              </div>
            </div>

            {totalPublished > 0 && (
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-baseline justify-between mb-2 gap-3">
                  <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/55">
                    seu progresso
                  </p>
                  <p className="font-body text-xs tabular-nums text-perestroika-preto/70">
                    {totalCompleted}/{totalPublished} · {progressPct}%
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-perestroika-preto/10 overflow-hidden">
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

        </motion.section>

        {/* próximo passo único + estado da entrega */}
        {!snapLoading && current && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-6 sm:p-8 mb-6"
          >
            <p className="font-body text-[11px] uppercase tracking-[0.25em] text-perestroika-bege/60 mb-2 inline-flex items-center gap-2">
              <EletivaSymbol size={22} pose="building" /> próximo passo
            </p>
            <h2 className="font-display uppercase text-3xl sm:text-4xl leading-[0.95] mb-3">
              módulo {String(current.number).padStart(2, "0")} · {current.title.toLowerCase()}
            </h2>
            {current.objective && (
              <p className="font-body text-sm sm:text-base text-perestroika-bege/80 mb-5 max-w-lg">
                {current.objective}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate(`/app/eletiva/${slug}/modulo/${current.number}`)}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
            >
              continuar de onde parou <ArrowRight className="h-4 w-4" />
            </button>

          </motion.section>
        )}

        {/* mapa de módulos com estado */}
        {snapshot && (
          <div className="mb-6">
            <ModulesByTrail snapshot={snapshot} onPick={(n) => navigate(`/app/eletiva/${slug}/modulo/${n}`)} />
          </div>
        )}

        {/* atalhos */}
        <section className="grid gap-4 sm:grid-cols-2">
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
            <ArrowRight className="h-4 w-4 text-perestroika-preto/40 group-hover:translate-x-1 transition-transform" />
          </Link>

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
            <ArrowRight className="h-4 w-4 text-perestroika-preto/40 group-hover:translate-x-1 transition-transform" />
          </Link>
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
