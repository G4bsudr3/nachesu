import { useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { useEletivaProgress } from "@/hooks/useEletivaProgress";
import { useCourseBySlug } from "@/hooks/useCourses";
import { finishMessage, trailMessages } from "@/lib/trailMessages";
import { cn } from "@/lib/utils";

const trailColorByOrder: Record<number, string> = {
  1: "#fe7b02",
  2: "#fd4644",
  3: "#f756a6",
  4: "#6f77fc",
};

/**
 * tela cheia de marco entre trilhas. signature moment: pose celebrating,
 * tipografia gigante, fundo preto, faixa de cor da trilha que acabou.
 *
 * disparada por `/app/eletiva/:slug/marco/:trail` onde `trail` = order_index
 * da trilha recém-concluída (1-4). se for a última trilha do curso, vira
 * variante "fim da eletiva".
 */
const Marco = () => {
  const { slug, trail: trailParam } = useParams<{ slug: string; trail: string }>();
  const finishedOrder = Number(trailParam);
  const navigate = useNavigate();

  const { data: course } = useCourseBySlug(slug);
  const { data: snapshot } = useEletivaProgress(course?.id ?? null);

  const finishedTrail = useMemo(
    () => snapshot?.trails.find((t) => t.order_index === finishedOrder) ?? null,
    [snapshot, finishedOrder],
  );

  const nextTrail = useMemo(
    () => snapshot?.trails.find((t) => t.order_index === finishedOrder + 1) ?? null,
    [snapshot, finishedOrder],
  );

  const nextFirstModule = useMemo(() => {
    if (!nextTrail || !snapshot) return null;
    return (
      snapshot.modules
        .filter((m) => m.trail_id === nextTrail.id)
        .sort((a, b) => a.number - b.number)[0] ?? null
    );
  }, [nextTrail, snapshot]);

  const isFinale = !nextTrail && !!finishedTrail;
  const trailColor = trailColorByOrder[finishedOrder] ?? finishedTrail?.color ?? "#fe7b02";

  // suprime o banner duplicado quando o aluno seguir pro próximo módulo
  useEffect(() => {
    if (!nextTrail || typeof window === "undefined") return;
    window.localStorage.setItem(
      `trail-transition-${nextTrail.id}`,
      new Date().toISOString(),
    );
  }, [nextTrail]);

  if (!slug || Number.isNaN(finishedOrder) || finishedOrder < 1 || finishedOrder > 4) {
    return <Navigate to="/app" replace />;
  }

  const msg = isFinale
    ? finishMessage
    : trailMessages[finishedOrder + 1] ?? {
        eyebrow: `fim da trilha ${finishedOrder}`,
        head: "nova trilha começa aqui",
        sub: "respira um pouco. olha pra trás e segue.",
      };

  const goNext = () => {
    if (isFinale) {
      navigate(`/app/eletiva/${slug}`);
      return;
    }
    if (nextFirstModule) {
      navigate(`/app/eletiva/${slug}/modulo/${nextFirstModule.number}`);
      return;
    }
    navigate("/app");
  };

  return (
    <div className="relative min-h-dvh bg-perestroika-preto text-perestroika-bege font-body [overflow-x:clip] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* faixa de cor da trilha concluída */}
      <div
        className="absolute inset-x-0 top-0 h-1.5 z-20"
        style={{ backgroundColor: trailColor }}
        aria-hidden="true"
      />

      {/* logo discreto no topo */}
      <header className="absolute top-0 inset-x-0 z-10 px-4 sm:px-6 pt-6">
        <Link to="/app" aria-label="ir pro início" className="inline-block">
          <NachesULogo variant="ink" height={24} showSelo={false} />
        </Link>
      </header>

      {/* estrela decorativa sutil ao fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: trailColor }}
      />

      <main className="relative z-10 container max-w-3xl min-h-dvh flex flex-col justify-center pt-24 pb-12">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="font-body text-[11px] uppercase tracking-[0.3em] text-perestroika-bege/65 inline-flex items-center gap-2 mb-6"
        >
          <Sparkles className="h-3 w-3" /> {msg.eyebrow}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: -3 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 -ml-2"
          role="img"
          aria-label="joão-de-barro celebrando"
        >
          <EletivaSymbol size={180} pose="celebrating" rotate={-3} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="font-display uppercase text-5xl sm:text-7xl leading-[0.9] mb-5 max-w-2xl"
        >
          {msg.head}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="font-body text-base sm:text-lg text-perestroika-bege/85 max-w-xl mb-10"
        >
          {msg.sub}
        </motion.p>

        {/* chips de progresso de trilhas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="flex items-center gap-2 mb-10"
          aria-label={`trilhas concluídas: ${finishedOrder} de 4`}
        >
          {[1, 2, 3, 4].map((n) => {
            const done = n <= finishedOrder;
            const isCurrent = n === finishedOrder;
            return (
              <div
                key={n}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  done ? "w-12 sm:w-16" : "w-8",
                )}
                style={{
                  backgroundColor: done
                    ? isCurrent
                      ? trailColor
                      : "rgba(242,228,216,0.55)"
                    : "rgba(242,228,216,0.15)",
                }}
              />
            );
          })}
          <span className="ml-3 font-body text-[11px] uppercase tracking-wide text-perestroika-bege/55">
            {finishedOrder}/4
          </span>
        </motion.div>

        {/* o que vem a seguir */}
        {!isFinale && nextTrail && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="rounded-2xl border border-perestroika-bege/15 bg-perestroika-bege/[0.04] p-5 mb-8 max-w-xl"
          >
            <p className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-bege/55 mb-2">
              próxima trilha
            </p>
            <p className="font-display uppercase text-2xl text-perestroika-bege">
              {nextTrail.title}
            </p>
            {nextTrail.description && (
              <p className="font-body text-sm text-perestroika-bege/70 mt-2">
                {nextTrail.description}
              </p>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege text-perestroika-preto px-6 py-3 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
          >
            {isFinale
              ? "ver minha eletiva"
              : nextFirstModule
                ? `começar trilha ${finishedOrder + 1}`
                : "voltar pro início"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/app"
            className="font-body text-xs uppercase tracking-wide text-perestroika-bege/65 hover:text-perestroika-bege px-3 py-2"
          >
            voltar pro início
          </Link>
        </motion.div>
      </main>
    </div>
  );
};

export default Marco;
