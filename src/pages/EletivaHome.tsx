import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, Compass, MessageCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useCourseBySlug, useMyEnrollments } from "@/hooks/useCourses";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { EletivaOnboardingOverlay } from "@/components/eletiva/EletivaOnboardingOverlay";

const EletivaHome = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setSlug } = useActiveEletiva();
  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const { data: snapshot, isLoading: snapLoading } = useEletivaProgress(course?.id ?? null);

  // sincroniza switcher quando o aluno entra direto via /app/eletiva/:slug
  useEffect(() => {
    if (slug) setSlug(slug);
  }, [slug, setSlug]);

  if (!slug) return <Navigate to="/app" replace />;

  const loading = courseLoading || enrollmentsLoading;
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
        <PageHeader showLogo logoLink="/app" />
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
        <PageHeader showLogo logoLink="/app" />
        <main className="container max-w-2xl pt-10 pb-20 text-center space-y-4">
          <EletivaSymbol size={80} pose="resting" />
          <h1 className="font-display uppercase text-3xl">acesso restrito</h1>
          <p className="font-body text-sm text-perestroika-preto/75">
            você não está matriculado em <strong>{course.title.toLowerCase()}</strong>.
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

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body [overflow-x:clip]">
      <PageHeader showLogo logoLink="/app" />

      <main className="container max-w-3xl pt-6 pb-16 sm:pt-10">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border-2 border-perestroika-preto bg-perestroika-bege p-6 sm:p-10 mb-8"
        >
          <p className="font-body text-xs uppercase tracking-[0.3em] text-perestroika-preto/55 mb-3">
            sua eletiva
          </p>
          <h1 className="font-display uppercase text-5xl sm:text-7xl leading-[0.9] mb-4">
            {course.title.toLowerCase()}
          </h1>
          {course.subtitle && (
            <p className="font-body text-base sm:text-lg text-perestroika-preto/75 max-w-xl mb-5">
              {course.subtitle}
            </p>
          )}
          <div className="flex items-center gap-3 mb-6">
            {course.professor_avatar_url && (
              <img
                src={course.professor_avatar_url}
                alt={course.professor_name}
                className="h-10 w-10 rounded-full object-cover border border-perestroika-preto/15"
                loading="lazy"
              />
            )}
            <div>
              <p className="font-body text-[11px] uppercase tracking-[0.2em] text-perestroika-preto/55">
                quem te guia
              </p>
              <p className="font-body text-sm font-medium">{course.professor_name.toLowerCase()}</p>
            </div>
          </div>

          {totalPublished > 0 && (
            <div className="rounded-2xl border border-perestroika-preto/15 bg-perestroika-bege p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/60">
                  seu progresso
                </p>
                <p className="font-body text-sm tabular-nums text-perestroika-preto/75">
                  {totalCompleted}/{totalPublished} módulos · {progressPct}%
                </p>
              </div>
              <div className="h-2 rounded-full bg-perestroika-preto/10 overflow-hidden">
                <motion.div
                  className="h-full bg-perestroika-preto"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          )}
        </motion.section>

        {/* próximo passo único */}
        {!snapLoading && current && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border-2 border-perestroika-preto bg-perestroika-preto text-perestroika-bege p-6 sm:p-8 mb-8"
          >
            <p className="font-body text-[11px] uppercase tracking-[0.25em] text-perestroika-bege/60 mb-2 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> próximo passo
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
              onClick={() => navigate(`/app/modulo/${current.number}`)}
              className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-6 py-3 font-body font-medium text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
            >
              continuar de onde parou <ArrowRight className="h-4 w-4" />
            </button>
          </motion.section>
        )}

        {/* atalhos */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Link
            to={`/app/trilhas?eletiva=${course.slug}`}
            className="group flex items-start gap-4 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 hover:border-perestroika-preto transition-colors"
          >
            <div className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-perestroika-preto text-perestroika-bege">
              <Compass className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display uppercase text-2xl leading-tight">mapa</p>
              <p className="font-body text-sm text-perestroika-preto/70 mt-1">
                4 trilhas, 5 módulos cada.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-perestroika-preto/40 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/app/tutor"
            className="group flex items-start gap-4 rounded-2xl border-2 border-perestroika-preto/15 bg-perestroika-bege p-5 hover:border-perestroika-preto transition-colors"
          >
            <div className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-perestroika-preto text-perestroika-bege">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-display uppercase text-2xl leading-tight">tutor IA</p>
              <p className="font-body text-sm text-perestroika-preto/70 mt-1">
                tira dúvida a qualquer hora.
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
                leituras, slides, referências.
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
    </div>
  );
};

export default EletivaHome;
