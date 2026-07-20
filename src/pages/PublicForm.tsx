import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NachesULogo } from "@/components/brand/NachesULogo";
import { PageHeader } from "@/components/layout/PageHeader";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { EletivaSymbol } from "@/components/brand/EletivaSymbol";
import { usePublicFbiForm } from "@/features/fbi/usePublicFbiForm";
import {
  fbiFieldSchemas,
  fbiSteps,
  getThemeForField,
  totalQuestionSteps,
  type FbiData,
  type FbiFieldKey,
  type FbiStep,
} from "@/features/fbi/schema";
import { FbiThemeProgress } from "@/features/fbi/FbiThemeProgress";
import { FbiSectionTransition } from "@/features/fbi/FbiSectionTransition";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

type Phase = "email" | "form" | "done" | "already" | "not-invited";

const PublicForm = () => {
  const [phase, setPhase] = useState<Phase>("email");
  const [email, setEmail] = useState("");
  const [validating, setValidating] = useState(false);
  const [prefill, setPrefill] = useState<FbiData>({});
  const [prefillKeys, setPrefillKeys] = useState<Set<keyof FbiData>>(new Set());
  const [invitedId, setInvitedId] = useState("");

  const handleEmailSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("coloca um email válido");
      return;
    }
    setValidating(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-public-email`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await resp.json();

      if (!data.valid) {
        setPhase("not-invited");
        return;
      }

      if (data.already_submitted) {
        setPhase("already");
        return;
      }

      setPrefill(data.prefill ?? {});
      setPrefillKeys(new Set(Object.keys(data.prefill ?? {})) as Set<keyof FbiData>);
      setInvitedId(data.invited_participant_id ?? "");
      setEmail(trimmed);
      setPhase("form");
    } catch (e) {
      logger.error(e);
      toast.error("deu erro ao validar. tenta de novo?");
    } finally {
      setValidating(false);
    }
  };

  if (phase === "email") {
    return (
      <EmailScreen
        email={email}
        setEmail={setEmail}
        onSubmit={handleEmailSubmit}
        validating={validating}
      />
    );
  }

  if (phase === "not-invited") {
    return <NotInvitedScreen onBack={() => setPhase("email")} />;
  }

  if (phase === "already") {
    return <AlreadySubmittedScreen />;
  }

  if (phase === "done") {
    return <DoneScreen />;
  }

  return (
    <PublicFbiFormFlow
      email={email}
      prefill={prefill}
      prefillKeys={prefillKeys}
      invitedId={invitedId}
      onDone={() => setPhase("done")}
    />
  );
};

/* ===== EMAIL SCREEN ===== */

const EmailScreen = ({
  email,
  setEmail,
  onSubmit,
  validating,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: () => void;
  validating: boolean;
}) => (
  <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
    <PageHeader
        layout="split"
      borderless
      logoLink="/"
      actions={
        <Link
          to="/auth"
          className="inline-flex items-center min-h-10 rounded-full bg-perestroika-preto text-perestroika-bege px-4 sm:px-5 py-2 font-body text-xs sm:text-sm uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
        >
          entrar
        </Link>
      }
    />
    <main className="flex-1 container max-w-3xl flex flex-col justify-center py-20">
      <span className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/50">
        formulário básico de identidade
      </span>
      <h1 className="mt-3 font-display uppercase text-5xl sm:text-6xl lg:text-7xl leading-[0.92] text-balance">
        fbi.
      </h1>
      <p className="mt-6 font-body text-base text-perestroika-preto/75 max-w-lg text-pretty">
        19 perguntas para a gente se conhecer melhor antes da imersão. coloca o email que você usou na inscrição.
      </p>
      <div className="mt-10 max-w-lg">
        <input
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="seu email de inscrição"
          className="w-full h-14 px-4 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={validating}
          className="mt-4 inline-flex items-center gap-2 px-7 h-14 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 transition-transform"
        >
          {validating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              verificando…
            </>
          ) : (
            <>
              começar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </main>
    <footer className="container max-w-5xl py-10">
      <EletivaFooter />
    </footer>
  </div>
);

/* ===== NOT INVITED ===== */

const FormShell = ({
  children,
  gradient = false,
}: {
  children: React.ReactNode;
  gradient?: boolean;
}) => (
  <div
    className={`min-h-dvh ${gradient ? "bg-gradient-screen" : "bg-perestroika-bege"} text-perestroika-preto font-body flex flex-col`}
  >
    <PageHeader
      layout="split"
      borderless
      logoLink="/"
      actions={
        <Link
          to="/auth"
          className="inline-flex items-center min-h-10 rounded-full bg-perestroika-preto text-perestroika-bege px-4 sm:px-5 py-2 font-body text-xs sm:text-sm uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
        >
          entrar
        </Link>
      }
    />
    <main className="flex-1 container max-w-3xl flex flex-col items-center justify-center py-16 text-center">
      {children}
    </main>
    <footer className="container max-w-5xl py-10">
      <EletivaFooter />
    </footer>
  </div>
);

const NotInvitedScreen = ({ onBack }: { onBack: () => void }) => (
  <FormShell>
    <h1 className="font-display uppercase text-4xl sm:text-6xl leading-[0.92]">
      esse email não está
      <br />
      na nossa lista.
    </h1>
    <p className="mt-6 font-body text-base text-perestroika-preto/75 max-w-md">
      confere se é o mesmo que você usou na inscrição. se tiver dúvida, fala com a gente no grupo do whatsapp.
    </p>
    <button
      type="button"
      onClick={onBack}
      className="mt-10 inline-flex items-center gap-2 px-6 h-12 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] transition-transform"
    >
      <ArrowLeft className="h-4 w-4" />
      tentar outro email
    </button>
  </FormShell>
);

/* ===== ALREADY SUBMITTED ===== */

const AlreadySubmittedScreen = () => (
  <FormShell>
    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs uppercase tracking-wide bg-perestroika-preto text-perestroika-bege">
      <Check className="h-3 w-3" /> enviado
    </span>
    <h1 className="mt-6 font-display uppercase text-5xl sm:text-7xl leading-[0.92]">
      fbi já
      <br />
      recebido.
    </h1>
    <p className="mt-6 font-body text-base text-perestroika-preto/75 max-w-md">
      suas respostas estão com a gente. para editar, faz login no hub com esse email.
    </p>
    <a
      href="/auth"
      className="mt-10 inline-flex items-center gap-2 px-6 h-12 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] transition-transform"
    >
      ir para o login
      <ArrowRight className="h-4 w-4" />
    </a>
  </FormShell>
);

/* ===== DONE ===== */

const DoneScreen = () => {
  const { user } = useAuth();
  const hubHref = user ? "/app" : "/";
  const hubLabel = user ? "voltar pro hub" : "voltar pro início";

  return (
    <FormShell gradient>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        <EletivaSymbol size={140} pose="celebrating" />
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-10 font-display uppercase text-5xl sm:text-7xl leading-[0.92]"
      >
        recebido.
        <br />
        até logo.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 font-body text-base text-perestroika-preto/70 max-w-md"
      >
        {user
          ? "tudo certo. agora é só voltar pro hub e seguir com a preparação."
          : "quando o hub abrir, você loga com esse email e cai direto no painel sem preencher de novo."}
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 flex flex-col sm:flex-row items-center gap-3"
      >
        <a
          href={hubHref}
          className="inline-flex items-center gap-2 px-6 h-12 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
        >
          {hubLabel}
          <ArrowRight className="h-4 w-4" />
        </a>
        {!user && (
          <a
            href="/auth"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-full border border-perestroika-preto/30 font-body text-sm uppercase tracking-wide hover:bg-perestroika-preto/5 transition-colors"
          >
            ir para o login
          </a>
        )}
      </motion.div>
    </FormShell>
  );
};


/* ===== FORM FLOW ===== */

const PublicFbiFormFlow = ({
  email,
  prefill,
  prefillKeys,
  invitedId,
  onDone,
}: {
  email: string;
  prefill: FbiData;
  prefillKeys: Set<keyof FbiData>;
  invitedId: string;
  onDone: () => void;
}) => {
  const reduceMotion = useReducedMotion();
  const { data, setField, submit, flush, saveStatus, submitted } =
    usePublicFbiForm(email, prefill, prefillKeys, invitedId);

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (submitted) onDone();
  }, [submitted, onDone]);

  const visibleSteps = useMemo(() => {
    return fbiSteps.map((s, idx) => ({ s, idx, visible: isStepVisible(s, data) }));
  }, [data]);

  const step = fbiSteps[stepIndex];
  const isFirst = stepIndex === 0;
  const isReview = step?.key === "review";
  const isTransition = typeof step?.key === "string" && step.key.startsWith("transition-");

  const questionNumber = useMemo(() => {
    if (!step || !step.section || isTransition) return 0;
    return (
      visibleSteps
        .slice(0, stepIndex)
        .filter(({ s, visible }) => visible && s.section && !String(s.key).startsWith("transition-"))
        .length + 1
    );
  }, [step, stepIndex, visibleSteps, isTransition]);

  const validateCurrent = (): string | null => {
    if (!step || step.key === "welcome" || step.key === "review" || isTransition) return null;
    const key = step.key as FbiFieldKey;
    const schema = fbiFieldSchemas[key];
    const value = data[key];
    if ((value === undefined || value === "" || value === null) && step.optional) return null;
    const result = schema.safeParse(value === "" ? undefined : value);
    if (result.success) return null;
    return result.error.issues[0]?.message ?? "campo inválido";
  };

  const findNextVisible = (from: number): number => {
    for (let i = from + 1; i < fbiSteps.length; i++) {
      if (isStepVisible(fbiSteps[i], data)) return i;
    }
    return fbiSteps.length - 1;
  };
  const findPrevVisible = (from: number): number => {
    for (let i = from - 1; i >= 0; i--) {
      if (isStepVisible(fbiSteps[i], data)) return i;
    }
    return 0;
  };

  const goNext = async () => {
    const err = validateCurrent();
    if (err) { setError(err); return; }
    setError(null);
    await flush();
    setDirection(1);
    setStepIndex((i) => findNextVisible(i));
  };

  const goPrev = async () => {
    setError(null);
    await flush();
    setDirection(-1);
    setStepIndex((i) => findPrevVisible(i));
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    const res = await submit();
    setSubmitting(false);
    if (!res.ok) {
      toast.error("não foi possível enviar agora. tenta em instantes?");
      return;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step?.type !== "textarea") {
      e.preventDefault();
      void goNext();
    }
  };

  const progress = step?.key === "welcome" ? 0 : isReview ? 1 : questionNumber / totalQuestionSteps;
  const activeTheme =
    step && step.section
      ? step.section
      : step && step.key !== "welcome" && step.key !== "review"
        ? getThemeForField(step.key as FbiFieldKey)?.key
        : undefined;
  const showThemeProgress = step?.key !== "welcome";

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body flex flex-col">
      <header className="sticky top-0 z-30 bg-perestroika-bege/90 backdrop-blur border-b border-perestroika-preto/5">
        <div className="container max-w-5xl flex items-center justify-between pt-6 pb-3">
          <NachesULogo variant="ink" />
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <span className="font-body text-xs text-perestroika-preto/50 hidden sm:inline truncate max-w-[200px]">
              {email}
            </span>
          </div>
        </div>

        <div className="container max-w-5xl pb-3">
          {showThemeProgress && <FbiThemeProgress data={data} activeTheme={activeTheme} />}
          <div className="h-1 w-full bg-perestroika-preto/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-perestroika-preto rounded-full"
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl py-10 sm:py-14 pb-32 md:pb-14 relative">
        <EletivaSymbol
          size={72}
          className="hidden lg:block absolute right-6 top-6 opacity-90"
          rotate={8}
          pose="peeking"
        />
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={stepIndex}
            custom={direction}
            initial={reduceMotion ? false : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            {step.key === "welcome" ? (
              <WelcomeStep onStart={() => { setDirection(1); setStepIndex(findNextVisible(0)); }} />
            ) : isTransition ? (
              <FbiSectionTransition
                label={step.transitionLabel ?? step.title}
                sub={step.transitionSub}
                onContinue={() => { setDirection(1); setStepIndex((i) => findNextVisible(i)); }}
              />
            ) : step.key === "review" ? (
              <ReviewStep
                data={data}
                algoMais={(data.algo_mais as string) ?? ""}
                onAlgoMaisChange={(v) => setField("algo_mais", v)}
                onEdit={(idx) => { setDirection(-1); setStepIndex(idx); }}
              />
            ) : (
              <QuestionStep
                step={step}
                value={data[step.key as FbiFieldKey]}
                prefillValue={prefillKeys.has(step.confirmKey ?? (step.key as FbiFieldKey)) ? prefill[step.confirmKey ?? (step.key as FbiFieldKey)] : undefined}
                onChange={(v) => { setError(null); setField(step.key as FbiFieldKey, v as never); }}
                error={error}
                onKeyDown={onKeyDown}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {step.key !== "welcome" && !isReview && !isTransition && (
        <nav className="fixed md:static bottom-0 left-0 right-0 z-20 bg-perestroika-bege/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-perestroika-preto/10 pb-[env(safe-area-inset-bottom)]">
          <div className="container max-w-3xl py-4 md:pb-10 flex items-center justify-between gap-4">
            <button type="button" onClick={goPrev} disabled={isFirst}
              className="inline-flex items-center gap-2 min-h-11 px-2 font-body text-sm uppercase tracking-wide hover:opacity-60 disabled:opacity-30 transition-opacity">
              <ArrowLeft className="h-4 w-4" /> voltar
            </button>
            <button type="button" onClick={goNext}
              className="inline-flex items-center gap-2 px-6 h-12 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform">
              próxima <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      {isReview && (
        <nav className="fixed md:static bottom-0 left-0 right-0 z-20 bg-perestroika-bege/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-perestroika-preto/10 pb-[env(safe-area-inset-bottom)]">
          <div className="container max-w-3xl py-4 md:pb-10 flex items-center justify-between gap-4">
            <button type="button" onClick={goPrev}
              className="inline-flex items-center gap-2 min-h-11 px-2 font-body text-sm uppercase tracking-wide hover:opacity-60 transition-opacity">
              <ArrowLeft className="h-4 w-4" /> voltar e editar
            </button>
            <button type="button" onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 px-6 h-12 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform">
              enviar fbi <Check className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      <footer className="container max-w-3xl py-6 hidden md:block">
        <p className="font-body text-xs text-perestroika-preto/50 text-center">
          salva sozinho. pode fechar e voltar quando quiser.
        </p>
      </footer>

      <AnimatePresence>
        {confirming && (
          <ConfirmDialog
            submitting={submitting}
            onCancel={() => setConfirming(false)}
            onConfirm={handleFinalSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ===== SHARED SUBCOMPONENTS ===== */

const isStepVisible = (s: FbiStep, data: FbiData): boolean => {
  if (!s.showWhen) return true;
  return data[s.showWhen.field] === s.showWhen.equals;
};

const formatPrefillDisplay = (v: unknown, step: FbiStep): string => {
  if (v === null || v === undefined) return "";
  if (step.type === "select") {
    const opt = step.options?.find((o) => o.value === v);
    return opt?.label ?? String(v);
  }
  return String(v);
};

const SaveIndicator = ({ status }: { status: "idle" | "saving" | "saved" | "error" }) => {
  if (status === "idle") return null;
  const map = {
    saving: { label: "salvando…", classes: "text-perestroika-preto/50" },
    saved: { label: "salvo", classes: "text-perestroika-preto/60" },
    error: { label: "erro ao salvar", classes: "text-perestroika-vermelho" },
  } as const;
  const { label, classes } = map[status];
  return (
    <span className={`hidden sm:inline-flex items-center gap-1.5 font-body text-xs uppercase tracking-wide ${classes}`}>
      {status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "saved" && <Check className="h-3 w-3" />}
      {label}
    </span>
  );
};

const WelcomeStep = ({ onStart }: { onStart: () => void }) => (
  <div>
    <span className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/50">
      primeira missão
    </span>
    <h1 className="mt-3 font-display uppercase text-5xl sm:text-7xl leading-[0.92] text-balance">
      {fbiSteps[0].title}
    </h1>
    <ul className="mt-8 space-y-2 font-body text-base sm:text-lg text-perestroika-preto/75 max-w-lg">
      <li>· 19 perguntas para a gente se conhecer melhor.</li>
      <li>· o que você já respondeu na inscrição está aqui. é só conferir e editar se precisar.</li>
      <li>· 3 minutos se você já estava na lista. 6 se está começando do zero.</li>
      <li>· salva sozinho. pode parar e voltar.</li>
    </ul>
    <button
      type="button"
      onClick={onStart}
      className="mt-12 inline-flex items-center gap-2 px-7 h-14 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
    >
      começar
      <ArrowRight className="h-4 w-4" />
    </button>
  </div>
);

const QuestionStep = ({
  step, value, prefillValue, onChange, error, onKeyDown,
}: {
  step: FbiStep;
  value: string | number | boolean | null | undefined;
  prefillValue?: string | number | boolean | null | undefined;
  onChange: (v: string | number | boolean) => void;
  error: string | null;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) => {
  const inputBase =
    "w-full h-14 px-4 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors";

  const prefillDisplay =
    prefillValue !== undefined && prefillValue !== null && prefillValue !== ""
      ? formatPrefillDisplay(prefillValue, step)
      : "";

  return (
    <div>
      {step.badge && (
        <span className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/50">
          {step.badge}
          {step.optional && " · opcional"}
        </span>
      )}
      <h2 className="mt-3 font-display uppercase text-4xl sm:text-6xl leading-[0.92] text-balance">
        {step.title}
      </h2>
      {step.hint && (
        <p className="mt-5 font-body text-base text-perestroika-preto/70 max-w-lg">{step.hint}</p>
      )}
      {prefillDisplay && (
        <p className="mt-4 font-body text-sm text-perestroika-preto/80 bg-perestroika-preto/5 border border-perestroika-preto/10 rounded-2xl px-4 py-3 max-w-lg">
          a gente tem <strong className="font-semibold">{prefillDisplay}</strong> aqui. está certo?
        </p>
      )}
      <div className="mt-10 max-w-lg">
        {step.type === "text" && (
          <input type="text" autoFocus value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown} placeholder={step.placeholder} className={inputBase} />
        )}
        {step.type === "number" && (
          <input type="number" inputMode="numeric" min={14} max={99} autoFocus
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => { const v = e.target.value; if (v === "") onChange(""); else onChange(parseInt(v, 10)); }}
            onKeyDown={onKeyDown} placeholder={step.placeholder} className={inputBase} />
        )}
        {step.type === "textarea" && (
          <textarea autoFocus value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}
            placeholder={step.placeholder} rows={6}
            className="w-full p-4 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors resize-y" />
        )}
        {step.type === "boolean" && (
          <div className="flex gap-3">
            {[{ v: true, label: "sim" }, { v: false, label: "não" }].map((opt) => (
              <button key={String(opt.v)} type="button" onClick={() => onChange(opt.v)}
                className={`flex-1 h-14 rounded-2xl border font-body text-base uppercase tracking-wide transition-all ${
                  value === opt.v ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                    : "border-perestroika-preto/20 hover:border-perestroika-preto/50"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {step.type === "select" && (
          <div className="flex flex-col gap-2">
            {step.options?.map((opt) => (
              <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
                className={`text-left px-4 h-14 rounded-2xl border font-body text-base transition-all ${
                  value === opt.value ? "bg-perestroika-preto text-perestroika-bege border-perestroika-preto"
                    : "border-perestroika-preto/20 hover:border-perestroika-preto/50"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-3 font-body text-sm text-perestroika-vermelho">{error}</p>}
      </div>
    </div>
  );
};

const ReviewStep = ({
  data, algoMais, onAlgoMaisChange, onEdit,
}: {
  data: FbiData; algoMais: string; onAlgoMaisChange: (v: string) => void; onEdit: (idx: number) => void;
}) => {
  const grouped = useMemo(() => {
    const sections: { label: string; items: { s: FbiStep; idx: number }[] }[] = [];
    const sectionLabels: Record<string, string> = { identidade: "identidade", logistica: "logística", move: "o que te move" };
    const map = new Map<string, { s: FbiStep; idx: number }[]>();
    fbiSteps.forEach((s, idx) => {
      if (!s.section || String(s.key).startsWith("transition-") || s.key === "algo_mais") return;
      if (!isStepVisible(s, data)) return;
      const arr = map.get(s.section) ?? [];
      arr.push({ s, idx });
      map.set(s.section, arr);
    });
    ["identidade", "logistica", "move"].forEach((key) => {
      const items = map.get(key);
      if (items && items.length > 0) sections.push({ label: sectionLabels[key], items });
    });
    return sections;
  }, [data]);

  return (
    <div>
      <span className="font-body text-xs uppercase tracking-[0.2em] text-perestroika-preto/50">revisão</span>
      <h2 className="mt-3 font-display uppercase text-5xl sm:text-7xl leading-[0.92]">
        {fbiSteps[fbiSteps.length - 1].title}
      </h2>
      <p className="mt-5 font-body text-base text-perestroika-preto/70 max-w-lg">
        {fbiSteps[fbiSteps.length - 1].hint}
      </p>
      <div className="mt-10 space-y-10">
        {grouped.map((g) => (
          <section key={g.label}>
            <h3 className="font-display uppercase text-xl text-perestroika-preto/60 mb-3">{g.label}</h3>
            <ul className="divide-y divide-perestroika-preto/10 border-y border-perestroika-preto/10">
              {g.items.map(({ s, idx }) => {
                const raw = data[s.key as FbiFieldKey];
                const display = formatReviewValue(s, raw);
                return (
                  <li key={s.key as string} className="py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs uppercase tracking-wide text-perestroika-preto/50">{s.badge}</p>
                      <p className="mt-1 font-body text-sm sm:text-base text-perestroika-preto break-words whitespace-pre-wrap">
                        {display || <span className="text-perestroika-preto/40 italic">—</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => onEdit(idx)}
                      className="inline-flex items-center min-h-11 px-2 font-body text-xs uppercase tracking-wide underline underline-offset-4 hover:opacity-60 transition-opacity shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded">
                      editar
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <section className="mt-12 rounded-3xl border border-perestroika-preto/15 bg-perestroika-preto/[0.03] p-6">
        <h3 className="font-display uppercase text-2xl sm:text-3xl leading-tight">
          antes de enviar,<br />mais uma se você quiser
        </h3>
        <p className="mt-3 font-body text-sm text-perestroika-preto/70">
          algo importante que a gente ainda não perguntou? alergia, restrição, desejo, segredo. fique à vontade. pode pular.
        </p>
        <textarea value={algoMais} onChange={(e) => onAlgoMaisChange(e.target.value)} placeholder="opcional" rows={4}
          className="mt-4 w-full p-4 rounded-2xl bg-transparent border border-perestroika-preto/20 focus:border-perestroika-preto focus:outline-none font-body text-base placeholder:text-perestroika-preto/40 transition-colors resize-y" />
      </section>
      <p className="mt-6 font-body text-xs text-perestroika-preto/50">
        ao enviar, suas respostas viram só leitura.
      </p>
    </div>
  );
};

const formatReviewValue = (step: FbiStep, raw: unknown): string => {
  if (raw === null || raw === undefined || raw === "") return "";
  if (step.type === "boolean") return raw ? "sim" : "não";
  if (step.type === "select") {
    const opt = step.options?.find((o) => o.value === raw);
    return opt?.label ?? String(raw);
  }
  return String(raw);
};

const ConfirmDialog = ({
  submitting, onCancel, onConfirm,
}: { submitting: boolean; onCancel: () => void; onConfirm: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-perestroika-preto/40 backdrop-blur-sm flex items-center justify-center p-6"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      className="bg-perestroika-bege rounded-3xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}
    >
      <h3 className="font-display uppercase text-3xl sm:text-4xl leading-none">podemos enviar?</h3>
      <p className="mt-4 font-body text-sm text-perestroika-preto/70">
        depois de enviar você não consegue mais editar por aqui.
      </p>
      <div className="mt-8 flex gap-3 justify-end">
        <button type="button" onClick={onCancel} disabled={submitting}
          className="px-5 h-11 rounded-full font-body text-sm uppercase tracking-wide hover:opacity-60 transition-opacity disabled:opacity-30">
          rever respostas
        </button>
        <button type="button" onClick={onConfirm} disabled={submitting}
          className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-perestroika-preto text-perestroika-bege font-body text-sm uppercase tracking-wide hover:scale-[1.02] disabled:opacity-60 transition-transform">
          {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" />enviando…</>) : (<>enviar agora<Check className="h-4 w-4" /></>)}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default PublicForm;
