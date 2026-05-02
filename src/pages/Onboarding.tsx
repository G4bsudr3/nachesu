import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EletivaLogo as ChoraLogo } from "@/components/brand/EletivaLogo";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { JourneyMilestone, type MilestoneState } from "@/components/onboarding/JourneyMilestone";
import { JourneyProgress } from "@/components/onboarding/JourneyProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useMyCard } from "@/features/carta/useMyCard";
import { useBuilderLevel } from "@/hooks/useBuilderLevel";
import { useDepth } from "@/hooks/useDepth";
import { getTutorialProgressCount } from "@/features/tutorial/useTutorialProgress";
import { TUTORIAL_TOTAL, TUTORIAL_BUILD_STEPS } from "@/features/tutorial/tutorialSteps";
import { computeNextStep } from "@/lib/journey";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, loading: levelLoading } = useBuilderLevel();
  const { depth } = useDepth(level, levelLoading);
  const { state: cardState } = useMyCard();

  const { data: dashboard, isLoading: loadingData } = useDashboardData();
  const nickname = dashboard?.nicknameDisplay ?? "builder";
  const fbiSubmitted = dashboard?.fbiSubmitted ?? false;
  const preworkStats = dashboard?.preworkStats ?? { total: 0, done: 0, obrigatoriosCompletos: false };
  const ideaCompleted = dashboard?.ideaCompleted ?? false;
  const mission01Submitted = dashboard?.mission01Submitted ?? false;
  const mission02Submitted = dashboard?.mission02Submitted ?? false;

  const [tutorialCount, setTutorialCount] = useState(0);
  useEffect(() => {
    const remote = dashboard?.tutorialStepIds.length ?? 0;
    const local = getTutorialProgressCount();
    setTutorialCount(Math.max(remote, local));
    const onFocus = () => setTutorialCount(Math.max(remote, getTutorialProgressCount()));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dashboard?.tutorialStepIds]);

  const nextStep = computeNextStep({
    fbiSubmitted,
    cardStatus: cardState,
    preworkDone: preworkStats.done,
    preworkTotal: preworkStats.total,
    tutorialCount,
    tutorialTotal: TUTORIAL_TOTAL,
    mission01Submitted,
    mission02Submitted,
    level,
    depth,
  });

  // estados dos 5 marcos
  const cardDone = cardState === "publicada";
  const cardWaiting = cardState === "gerando" || cardState === "revisao" || cardState === "erro";
  const preworkDone = preworkStats.total > 0 && preworkStats.done === preworkStats.total;
  const preworkInProgress = preworkStats.done > 0 && !preworkDone;
  const tutorialDone = tutorialCount >= TUTORIAL_TOTAL;
  const tutorialInProgress = tutorialCount > 0 && !tutorialDone;
  const allMissionsDone = mission01Submitted && mission02Submitted;
  const someMissionsDone = mission01Submitted || mission02Submitted;

  // próxima etapa "ativa" (a primeira não concluída e não bloqueada)
  // regra: tudo depende do fbi. depois disso, carta libera os outros.
  // pré-work e tutorial podem rodar em paralelo após carta publicada/em revisão.
  // missões só liberam após tutorial estar feito (igual journey.ts).
  const fbiState: MilestoneState = fbiSubmitted ? "done" : "active";

  const cartaState: MilestoneState = !fbiSubmitted
    ? "locked"
    : cardDone
      ? "done"
      : cardWaiting
        ? "waiting"
        : "active";

  const preworkUnlocked = fbiSubmitted;
  const preworkState: MilestoneState = !preworkUnlocked
    ? "locked"
    : preworkDone
      ? "done"
      : preworkInProgress
        ? "in-progress"
        : "pending";

  const tutorialUnlocked = fbiSubmitted;
  const tutorialState: MilestoneState = !tutorialUnlocked
    ? "locked"
    : tutorialDone
      ? "done"
      : tutorialInProgress
        ? "in-progress"
        : "pending";

  // missões liberam junto com tudo após fbi (alinhado com dashboard).
  // tutorial é atalho recomendado, não pré-requisito.
  const missoesUnlocked = fbiSubmitted;
  const missoesState: MilestoneState = !missoesUnlocked
    ? "locked"
    : allMissionsDone
      ? "done"
      : someMissionsDone
        ? "in-progress"
        : "pending";

  const milestones = [
    {
      number: 1,
      color: "laranja" as const,
      title: "fbi",
      duration: "uns 10 min",
      description: "ficha de bordo. 19 perguntas curtas pra gente te conhecer e destravar sua carta personalizada.",
      state: fbiState,
      href: "/forms",
      ctaLabel: "preencher fbi",
    },
    {
      number: 2,
      color: "vermelho" as const,
      title: "carta de builder",
      duration: cardWaiting ? "te aviso quando publicar" : "leitura rápida",
      description:
        cardState === "gerando"
          ? "a IA tá lendo suas respostas. volta em alguns minutos."
          : cardState === "revisao"
            ? "tá pronta no banco. o frattz tá revisando antes de liberar."
            : cardState === "erro"
              ? "rolou um erro. o frattz vai rodar de novo."
              : cardDone
                ? "arquétipo, superpoder, sombra e próximo movimento. fica salva pra revisitar."
                : "depois do fbi, IA + frattz escrevem uma carta com seu arquétipo, superpoder, sombra e próximo movimento.",
      state: cartaState,
      href: cardDone ? "/app/carta" : undefined,
      ctaLabel: cardDone ? "ver minha carta" : undefined,
    },
    {
      number: 3,
      color: "rosa" as const,
      title: "pré-work",
      duration: "no seu tempo",
      description:
        "leituras e vídeos curtos pra chegar quente. dois caminhos por item: começa por aqui (direto) ou vai mais fundo (técnica). você escolhe.",
      state: preworkState,
      href: "/app/prework",
      ctaLabel: preworkInProgress ? "continuar pré-work" : "começar pré-work",
      progressLabel: preworkStats.total > 0 ? `${preworkStats.done}/${preworkStats.total} feitos` : undefined,
    },
    {
      number: 4,
      color: "azul" as const,
      title: "tutorial",
      duration: "etapa 00 + 5 etapas",
      description:
        "começa na 00 escolhendo a ideia. depois, 5 etapas de prompts personalizados pra publicar seu primeiro app.",
      state: tutorialState,
      href: "/app/tutorial",
      ctaLabel: tutorialInProgress ? "continuar tutorial" : "começar tutorial",
      progressLabel: (() => {
        if (tutorialCount === 0) return undefined;
        const buildDone = Math.max(0, tutorialCount - (ideaCompleted ? 1 : 0));
        const buildClamped = Math.min(buildDone, TUTORIAL_BUILD_STEPS);
        const ideaTag = ideaCompleted ? "00 ✓" : "00";
        return `${ideaTag} · ${buildClamped}/${TUTORIAL_BUILD_STEPS} etapas`;
      })(),
    },
    {
      number: 5,
      color: "preto" as const,
      title: "missões",
      duration: "uns 10 min cada",
      description:
        "começa pela 01 (manifesto) e siga pra 02 (seu prompt favorito). desafios curtos pra aquecer. o tutorial é o atalho recomendado pra fechar a 01.",
      state: missoesState,
      href: "/app/missoes",
      ctaLabel: someMissionsDone ? "continuar missões" : "ir pra missão 01",
    },
  ];

  const doneCount = milestones.filter((m) => m.state === "done").length;
  const allDone = doneCount === milestones.length;

  const greeting = (() => {
    if (loadingData) return "carregando seu progresso...";
    if (allDone) return "você fechou a trilha. respira.";
    if (!fbiSubmitted) return `boas-vindas, ${nickname}. começa pelo fbi e o resto abre.`;
    if (doneCount >= 3) return `tá quase, ${nickname}. faltam ${milestones.length - doneCount}.`;
    return `bem-vindo de volta, ${nickname}. continua de onde parou.`;
  })();

  return (
    <PageShell decorStar decorStarColor="rosa">
      <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 flex items-center justify-between gap-4">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 font-body text-sm text-perestroika-preto/70 hover:text-perestroika-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto rounded"
        >
          <ArrowLeft className="h-4 w-4" />
          voltar pro hub
        </Link>
        <ChoraLogo className="h-6 w-auto" />
      </header>

      <main className="px-4 sm:px-6 lg:px-8 pb-32 sm:pb-12 max-w-3xl mx-auto">
        <section className="mb-8">
          <p className="font-body text-[11px] uppercase tracking-wide text-perestroika-preto/55 mb-2">
            checklist da jornada
          </p>
          <h1 className="font-display uppercase text-4xl sm:text-5xl leading-[0.9] text-perestroika-preto mb-3 text-balance">
            {allDone ? (
              <>tudo<br />pronto</>
            ) : (
              <>sua trilha<br />em 5 marcos</>
            )}
          </h1>
          <p className="font-body text-base text-perestroika-preto/75 max-w-prose">
            {greeting}
          </p>
        </section>

        <JourneyProgress done={doneCount} total={milestones.length} />

        {/* CTA "continuar de onde parou" — desktop inline, mobile sticky no bottom */}
        {!allDone && nextStep.href && (
          <Link
            to={nextStep.href}
            id="continue-cta"
            aria-describedby="continue-cta-helper"
            className="hidden sm:flex mb-8 items-center gap-4 rounded-3xl bg-perestroika-preto text-perestroika-bege p-5 hover:-translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          >
            <div className="shrink-0 h-12 w-12 rounded-2xl bg-perestroika-bege text-perestroika-preto flex items-center justify-center">
              {nextStep.kind === "carta-gerando" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-[10px] uppercase tracking-wide text-perestroika-bege/60">
                continuar de onde parou
              </p>
              <p className="font-display uppercase text-2xl leading-tight">{nextStep.label}</p>
              <p id="continue-cta-helper" className="mt-1 font-body text-xs text-perestroika-bege/75">
                {nextStep.helper}
              </p>
            </div>
            <ArrowRight className="hidden sm:block h-5 w-5 shrink-0" />
          </Link>
        )}

        {allDone && (
          <div className="mb-8 rounded-3xl border border-perestroika-preto/15 bg-perestroika-bege/60 p-6 flex items-center gap-4">
            <EletivaSymbol size={56} />
            <div className="flex-1">
              <p className="font-display uppercase text-2xl leading-tight text-perestroika-preto">
                você fechou a trilha
              </p>
              <p className="font-body text-sm text-perestroika-preto/70 mt-1">
                hub da turma abre dia 25. até lá, revisita o que quiser.
              </p>
            </div>
          </div>
        )}

        <ol className="space-y-4">
          {milestones.map((m) => (
            <JourneyMilestone key={m.number} {...m} />
          ))}
        </ol>
      </main>

      {/* CTA sticky no mobile */}
      {!allDone && nextStep.href && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 bg-gradient-to-t from-perestroika-bege via-perestroika-bege to-perestroika-bege/0">
          <Link
            to={nextStep.href}
            className="flex items-center justify-between gap-3 rounded-2xl bg-perestroika-preto text-perestroika-bege px-5 py-4 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          >
            <div className="min-w-0 flex-1">
              <p className="font-body text-[10px] uppercase tracking-wide text-perestroika-bege/60">
                continuar
              </p>
              <p className="font-display uppercase text-lg leading-tight truncate">{nextStep.label}</p>
            </div>
            {nextStep.kind === "carta-gerando" ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5 shrink-0" />
            )}
          </Link>
        </div>
      )}
    </PageShell>
  );
};

export default Onboarding;
