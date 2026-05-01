import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Copy, Clock, MapPin, AlertTriangle, RefreshCw, LogIn, WifiOff, ShieldAlert, ServerCrash, Loader2, ExternalLink, Gift, X, Sparkles, GraduationCap } from "lucide-react";
import { TrailBreadcrumb } from "@/components/hub/TrailBreadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  TUTORIAL_STEPS,
  TUTORIAL_TOTAL,
  TUTORIAL_BUILD_STEPS,
  IDEA_STEP_ID,
  type FbiData,
  type TutorialStep,
  interpolatePrompt,
} from "@/features/tutorial/tutorialSteps";
import { useTutorialProgress } from "@/features/tutorial/useTutorialProgress";
import { useTutorialIdea } from "@/features/tutorial/useTutorialIdea";
import { TutorialStepper } from "@/components/tutorial/TutorialStepper";
import { IdeaStep } from "@/components/tutorial/IdeaStep";
import { useBuilderLevel } from "@/hooks/useBuilderLevel";
import { isAdvanced, isNovice, type BuilderLevel } from "@/lib/builderLevel";

const PromptBlock = ({ prompt }: { prompt: string }) => {
  const [fallback, setFallback] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
        toast.success("copiado");
        return;
      }
      throw new Error("clipboard indisponível");
    } catch {
      setFallback(true);
      toast.error("copia manual abaixo");
    }
  };

  return (
    <div className="rounded-2xl bg-perestroika-preto text-perestroika-bege p-4 sm:p-5">
      {/* mobile: botão fora do bloco pra não cobrir texto; sm+: absolute como antes */}
      <div className="flex justify-end mb-3 sm:hidden">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege text-perestroika-preto px-3 py-2 text-xs uppercase tracking-wide font-body hover:bg-perestroika-laranja hover:text-perestroika-bege transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-bege focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-preto"
          aria-label="copiar prompt"
        >
          <Copy className="h-3 w-3" />
          copiar
        </button>
      </div>
      <div className="relative">
        <pre className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed sm:pr-28">
          {prompt}
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="hidden sm:inline-flex absolute top-0 right-0 items-center gap-1.5 rounded-full bg-perestroika-bege text-perestroika-preto px-3 py-1.5 text-xs uppercase tracking-wide font-body hover:bg-perestroika-laranja hover:text-perestroika-bege transition-colors min-h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-bege focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-preto"
          aria-label="copiar prompt"
        >
          <Copy className="h-3 w-3" />
          copiar
        </button>
      </div>
      {fallback && (
        <Textarea
          readOnly
          value={prompt}
          className="mt-3 bg-perestroika-bege text-perestroika-preto font-body text-sm min-h-32"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
    </div>
  );
};

const INVITE_DISMISS_KEY = "chora:lovable-invite-dismissed";

const StepBlock = ({
  step,
  fbi,
  chosenIdea,
  isCompleted,
  onToggle,
  level,
}: {
  step: TutorialStep;
  fbi: FbiData | null;
  chosenIdea: string | null;
  isCompleted: boolean;
  onToggle: () => void;
  level: BuilderLevel;
}) => {
  const [inviteDismissed, setInviteDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(INVITE_DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });
  const dismissInvite = () => {
    try { localStorage.setItem(INVITE_DISMISS_KEY, "true"); } catch { /* ignore */ }
    setInviteDismissed(true);
  };
  const rendered = interpolatePrompt(step.prompt, fbi, { ideia_gaveta: chosenIdea });
  return (
    <AccordionItem
      value={step.id}
      className="border border-perestroika-preto/10 rounded-3xl bg-perestroika-bege/80 backdrop-blur px-5 sm:px-7 data-[state=open]:border-perestroika-preto/30 transition-colors"
    >
      <AccordionTrigger className="hover:no-underline py-4 sm:py-6 [&[data-state=open]>svg]:text-perestroika-preto">
        <div className="flex items-center gap-3 sm:gap-5 flex-1 text-left">
          <span
            className={`font-display text-2xl sm:text-4xl leading-none shrink-0 ${
              isCompleted ? "text-perestroika-preto/40 line-through" : "text-perestroika-preto"
            }`}
          >
            {step.number}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display uppercase text-lg sm:text-2xl leading-tight text-balance">
              {step.title}
            </h2>
            <div className="flex items-center gap-3 mt-0.5 sm:mt-1 font-body text-xs sm:text-sm text-perestroika-preto/60">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {step.duration}
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-perestroika-azul">
                  <Check className="h-3 w-3" />
                  feito
                </span>
              )}
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-6 pt-2">
        <div className="flex flex-col gap-5">
          <p className="font-body text-sm sm:text-base text-perestroika-preto/85 italic text-pretty">
            {step.whyItMatters}
          </p>
          <p className="font-body text-sm sm:text-base text-perestroika-preto/80 text-pretty">
            {step.description}
          </p>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-perestroika-preto/60 font-body">
            <MapPin className="h-3 w-3" />
            onde: <span className="text-perestroika-preto/90 normal-case tracking-normal">{step.where}</span>
          </div>

          {/* convites de profundidade: escolhe sua entrada antes do prompt */}
          {(step.noviceBlock || step.expertBlock) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {step.noviceBlock && (
                <details
                  className="group rounded-2xl border border-perestroika-rosa/30 bg-perestroika-rosa/[0.06] overflow-hidden transition-colors hover:border-perestroika-rosa/60 open:hover:border-perestroika-rosa/30"
                  open={isNovice(level)}
                >
                  <summary className="cursor-pointer list-none flex items-start gap-3 px-4 py-3.5 select-none min-h-[64px]">
                    <Sparkles className="h-5 w-5 text-perestroika-rosa shrink-0 mt-0.5" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-body text-sm font-semibold uppercase tracking-wide text-perestroika-preto">
                        {step.noviceBlock.title}
                      </span>
                      <span className="block font-body text-xs text-perestroika-preto/65 mt-0.5">
                        fundamentos da etapa
                      </span>
                    </span>
                    <span className="text-xs uppercase tracking-wide text-perestroika-preto/55 group-open:hidden shrink-0 mt-1">abrir</span>
                    <span className="text-xs uppercase tracking-wide text-perestroika-preto/55 hidden group-open:inline shrink-0 mt-1">fechar</span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 border-t border-perestroika-rosa/20">
                    <p className="font-body text-sm text-perestroika-preto/85 text-pretty mt-3">{step.noviceBlock.body}</p>
                    {step.noviceBlock.link && (
                      <a
                        href={step.noviceBlock.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 min-h-11 px-1 font-body text-xs uppercase tracking-wide text-perestroika-preto hover:gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
                      >
                        {step.noviceBlock.link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </details>
              )}
              {step.expertBlock && (
                <details
                  className="group rounded-2xl border border-perestroika-azul/30 bg-perestroika-azul/[0.06] overflow-hidden transition-colors hover:border-perestroika-azul/60 open:hover:border-perestroika-azul/30"
                  open={isAdvanced(level)}
                >
                  <summary className="cursor-pointer list-none flex items-start gap-3 px-4 py-3.5 select-none min-h-[64px]">
                    <GraduationCap className="h-5 w-5 text-perestroika-azul shrink-0 mt-0.5" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-body text-sm font-semibold uppercase tracking-wide text-perestroika-preto">
                        {step.expertBlock.title}
                      </span>
                      <span className="block font-body text-xs text-perestroika-preto/65 mt-0.5">
                        camada técnica opcional
                      </span>
                    </span>
                    <span className="text-xs uppercase tracking-wide text-perestroika-preto/55 group-open:hidden shrink-0 mt-1">abrir</span>
                    <span className="text-xs uppercase tracking-wide text-perestroika-preto/55 hidden group-open:inline shrink-0 mt-1">fechar</span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 border-t border-perestroika-azul/20">
                    <p className="font-body text-sm text-perestroika-preto/85 text-pretty mt-3">{step.expertBlock.body}</p>
                    {step.expertBlock.link && (
                      <a
                        href={step.expertBlock.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 min-h-11 px-1 font-body text-xs uppercase tracking-wide text-perestroika-preto hover:gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-azul focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
                      >
                        {step.expertBlock.link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}

          {step.id === "cria" && !inviteDismissed && (
            <div className="rounded-2xl border border-perestroika-laranja/40 bg-perestroika-laranja/15 p-4 flex items-center gap-3 group relative">
              <Gift className="h-5 w-5 text-perestroika-laranja shrink-0" />
              <a
                href="https://lovable.dev/invite/3PLAIFF"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 hover:opacity-90"
              >
                <p className="font-body text-sm font-semibold text-perestroika-preto">
                  ainda sem conta no lovable?
                </p>
                <p className="mt-0.5 font-body text-xs text-perestroika-preto/75 text-pretty">
                  abre por aqui e ganha +10 créditos de boas-vindas.
                </p>
              </a>
              <a
                href="https://lovable.dev/invite/3PLAIFF"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 min-h-10 rounded-full bg-perestroika-laranja text-perestroika-bege px-3 py-2 text-xs uppercase tracking-wide font-body group-hover:gap-2 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-laranja focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
              >
                pegar +10
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={dismissInvite}
                aria-label="já tenho conta, dispensar"
                className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-perestroika-preto/50 hover:text-perestroika-preto hover:bg-perestroika-preto/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <PromptBlock prompt={rendered} />
          <p className="font-body text-sm text-perestroika-preto/75 whitespace-pre-line text-pretty">
            {step.hint}
          </p>
          {(() => {
            // pra avançado, esconder atalhos LLM externa na etapa 01 (já tem rotina própria)
            const visibleShortcuts = step.id === "ideia" && isAdvanced(level)
              ? step.shortcuts.filter((s) => !["chat.openai.com", "claude.ai", "gemini.google.com"].some((d) => s.url.includes(d)))
              : step.shortcuts;
            return visibleShortcuts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {visibleShortcuts.map((s) => (
                  s.external ? (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege border border-perestroika-preto/20 px-3 py-2 text-xs uppercase tracking-wide font-body text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                    >
                      {s.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      key={s.url}
                      to={s.url}
                      className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-2 text-xs uppercase tracking-wide font-body hover:bg-perestroika-azul transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                    >
                      {s.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )
                ))}
              </div>
            ) : null;
          })()}

          <label className="flex items-center gap-3 cursor-pointer min-h-11 select-none">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={onToggle}
              className="h-5 w-5 border-perestroika-preto/40 data-[state=checked]:bg-perestroika-azul data-[state=checked]:border-perestroika-azul data-[state=checked]:text-perestroika-bege"
            />
            <span className="font-body text-sm uppercase tracking-wide text-perestroika-preto">
              marquei como feito
            </span>
          </label>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

type FbiCache = {
  data: FbiData | null;
  error: string | null;
  fetchedAt: number;
};

const FBI_CACHE_KEY = (uid: string) => `chora-tutorial-fbi:${uid}`;

const readFbiCache = (uid: string | undefined): FbiCache | null => {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(FBI_CACHE_KEY(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      data: parsed.data ?? null,
      error: typeof parsed.error === "string" ? parsed.error : null,
      fetchedAt: typeof parsed.fetchedAt === "number" ? parsed.fetchedAt : 0,
    };
  } catch {
    return null;
  }
};

const writeFbiCache = (uid: string, cache: FbiCache) => {
  try {
    localStorage.setItem(FBI_CACHE_KEY(uid), JSON.stringify(cache));
  } catch {
    // ignora
  }
};

const formatRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "agora há pouco";
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
};

type FbiErrorKind = "auth" | "permission" | "timeout" | "offline" | "notfound" | "unknown";

type FbiErrorInfo = {
  kind: FbiErrorKind;
  title: string;
  message: string;
  suggestion: string;
  raw: string;
};

const classifyFbiError = (err: unknown): FbiErrorInfo => {
  const e = (err ?? {}) as { message?: string; code?: string; status?: number; name?: string };
  const raw = e.message || "erro desconhecido";
  const msg = raw.toLowerCase();
  const code = (e.code || "").toUpperCase();
  const status = e.status ?? 0;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      kind: "offline",
      title: "você tá offline",
      message: "sem internet pra alcançar o servidor.",
      suggestion: "reconecta e tenta de novo. seus prompts seguem com o cache local enquanto isso.",
      raw,
    };
  }
  if (status === 401 || code === "PGRST301" || msg.includes("jwt") || msg.includes("not authenticated")) {
    return {
      kind: "auth",
      title: "sessão expirou",
      message: "sua sessão acabou e o servidor recusou a leitura.",
      suggestion: "sai e entra de novo pra renovar o login.",
      raw,
    };
  }
  if (status === 403 || code === "42501" || msg.includes("permission") || msg.includes("rls")) {
    return {
      kind: "permission",
      title: "sem permissão",
      message: "o servidor bloqueou o acesso ao seu fbi.",
      suggestion: "pinga o frattz no whatsapp se isso persistir.",
      raw,
    };
  }
  if (e.name === "AbortError" || msg.includes("timeout") || msg.includes("timed out") || status === 504) {
    return {
      kind: "timeout",
      title: "demorou demais",
      message: "o servidor não respondeu a tempo.",
      suggestion: "tenta de novo em alguns segundos.",
      raw,
    };
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror") || status === 0) {
    return {
      kind: "offline",
      title: "rede instável",
      message: "não consegui falar com o servidor.",
      suggestion: "checa sua conexão e tenta de novo.",
      raw,
    };
  }
  if (status >= 500) {
    return {
      kind: "unknown",
      title: "servidor com soluço",
      message: "algo quebrou do nosso lado.",
      suggestion: "tenta de novo em um minuto. se continuar, avisa o frattz.",
      raw,
    };
  }
  return {
    kind: "unknown",
    title: "erro ao carregar fbi",
    message: raw,
    suggestion: "tenta de novo. se persistir, avisa o frattz.",
    raw,
  };
};

type FbiField = { key: keyof FbiData; label: string };

const FBI_FIELDS: FbiField[] = [
  { key: "nickname", label: "nickname" },
  { key: "trabalho", label: "trabalho" },
  { key: "expectativa_chora", label: "expectativa" },
  { key: "maior_desafio", label: "maior desafio" },
  { key: "ideia_gaveta", label: "ideia na gaveta" },
];

const FbiIncrementalLoader = ({ fbi }: { fbi: FbiData | null }) => {
  // revela cada campo progressivamente em ~140ms pra reduzir sensação de espera
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    FBI_FIELDS.forEach((_, i) => {
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 140 * (i + 1)));
    });
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      className="mt-6 rounded-2xl border border-perestroika-preto/10 bg-perestroika-bege/60 p-4 sm:p-5"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 mb-3 font-body text-xs uppercase tracking-wide text-perestroika-preto/70">
        <Loader2 className="h-3 w-3 animate-spin" />
        carregando seu fbi
      </div>
      <ul className="flex flex-col gap-1.5">
        {FBI_FIELDS.map((f, i) => {
          const isVisible = i < revealed;
          const value = fbi?.[f.key];
          const hasValue = typeof value === "string" && value.trim().length > 0;
          return (
            <li
              key={f.key}
              className={`flex items-center gap-2 text-sm font-body transition-all duration-300 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}
            >
              {hasValue ? (
                <Check className="h-3.5 w-3.5 text-perestroika-azul shrink-0" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-perestroika-preto/25 shrink-0" />
              )}
              <span className="text-perestroika-preto/55 uppercase tracking-wide text-xs w-32 shrink-0">
                {f.label}
              </span>
              {hasValue ? (
                <span className="text-perestroika-preto/85 truncate">{value as string}</span>
              ) : (
                <span className="h-2.5 flex-1 rounded bg-perestroika-preto/10 animate-pulse max-w-48" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const Tutorial = () => {
  const { user, signOut } = useAuth();
  const { level } = useBuilderLevel();
  const navigate = useNavigate();
  // hidrata do cache sincronamente pra evitar skeleton infinito ao voltar
  const initialCache = readFbiCache(user?.id);
  const [fbi, setFbi] = useState<FbiData | null>(initialCache?.data ?? null);
  const [loadingFbi, setLoadingFbi] = useState(!initialCache);
  const [fbiError, setFbiError] = useState<FbiErrorInfo | null>(
    initialCache?.error ? classifyFbiError({ message: initialCache.error }) : null,
  );
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(
    initialCache?.fetchedAt ?? null,
  );
  const [retryNonce, setRetryNonce] = useState(0);
  const { completed, toggle: rawToggle, count } = useTutorialProgress();
  const { idea: chosenIdea, loading: ideaLoading, saving: ideaSaving, save: saveIdea } = useTutorialIdea();
  const [openStep, setOpenStep] = useState<string | undefined>(undefined);
  const [autoOpened, setAutoOpened] = useState(false);
  const [mission01Submitted, setMission01Submitted] = useState<boolean | null>(null);

  const ideaCompleted = completed.has(IDEA_STEP_ID);

  const nextPendingStep = useMemo(() => {
    if (!ideaCompleted) return IDEA_STEP_ID;
    return TUTORIAL_STEPS.find((s) => !completed.has(s.id))?.id;
  }, [completed, ideaCompleted]);

  // wrap toggle pra auto-avançar pra próxima etapa pendente ao concluir a atual
  const toggle = useCallback(
    (id: string) => {
      const wasCompleted = completed.has(id);
      rawToggle(id);
      if (!wasCompleted && id === openStep) {
        const allOrder = [IDEA_STEP_ID, ...TUTORIAL_STEPS.map((s) => s.id)];
        const next = allOrder.find((sid) => sid !== id && !completed.has(sid));
        if (next) {
          setTimeout(() => setOpenStep(next), 250);
        } else {
          setTimeout(() => setOpenStep(undefined), 250);
        }
      }
    },
    [completed, rawToggle, openStep],
  );

  // abre automaticamente a próxima etapa não concluída na primeira carga
  useEffect(() => {
    if (autoOpened) return;
    if (loadingFbi || ideaLoading) return;
    setOpenStep(nextPendingStep);
    setAutoOpened(true);
  }, [autoOpened, loadingFbi, nextPendingStep]);

  // carrega status da missão 01 pra fechar o loop tutorial → missão
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: m } = await supabase
        .from("missions")
        .select("id")
        .eq("ordem", 1)
        .maybeSingle();
      if (cancelled || !m) return;
      const { data: sub } = await supabase
        .from("mission_submissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("mission_id", m.id)
        .maybeSingle();
      if (cancelled) return;
      setMission01Submitted(Boolean(sub));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // toast quando fecha tutorial inteiro (00 + 5) → missão 01 (uma vez por aluno via localStorage)
  useEffect(() => {
    if (count !== TUTORIAL_TOTAL) return;
    if (mission01Submitted !== false) return;
    const flagKey = "chora:tutorial-toast-6-6";
    try {
      if (localStorage.getItem(flagKey) === "true") return;
      localStorage.setItem(flagKey, "true");
    } catch {
      // ignora
    }
    toast.success("fechou o tutorial 🔥", {
      description: "agora cola o link na missão 01 pra fechar o ciclo.",
      duration: 8000,
      action: {
        label: "ir pra missão 01",
        onClick: () => navigate("/app/missoes#m01"),
      },
    });
  }, [count, mission01Submitted, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const cached = readFbiCache(user.id);
    if (cached) {
      // já temos algo: refresh silencioso, sem voltar pro skeleton
      setFbi(cached.data);
      setFbiError(cached.error ? classifyFbiError({ message: cached.error }) : null);
      setLastFetchedAt(cached.fetchedAt);
      setLoadingFbi(false);
    } else {
      setLoadingFbi(true);
      setFbiError(null);
    }
    (async () => {
      const { data, error } = await supabase
        .from("fbi_responses")
        .select("nickname, trabalho, ideia_gaveta, maior_desafio, expectativa_chora")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .order("submitted", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      const now = Date.now();
      if (error) {
        const info = classifyFbiError(error);
        // fallback: prioriza cache em disco; se não tiver, mantém o que já estava em memória
        const fallbackData = cached?.data ?? fbi ?? null;
        setFbi(fallbackData);
        setFbiError(info);
        writeFbiCache(user.id, { data: fallbackData, error: info.raw, fetchedAt: now });
      } else {
        setFbi(data ?? null);
        setFbiError(null);
        writeFbiCache(user.id, { data: data ?? null, error: null, fetchedAt: now });
      }
      setLastFetchedAt(now);
      setLoadingFbi(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, retryNonce]);

  const handleRetry = useCallback(() => setRetryNonce((n) => n + 1), []);

  const hasFbi = Boolean(
    fbi && (fbi.trabalho || fbi.ideia_gaveta || fbi.maior_desafio || fbi.expectativa_chora),
  );

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <header className="container max-w-3xl flex items-center justify-between pt-8 pb-4">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 min-h-11 font-body text-sm uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
        >
          <ArrowLeft className="h-4 w-4" />
          voltar
        </Link>
        <ChoraLogo variant="dark" />
      </header>

      <section className="container max-w-3xl pt-2 pb-2">
        <TrailBreadcrumb
          current="tutorial"
          progress={{
            fbi: "done",
            carta: "done",
            prework: "done",
            tutorial: "current",
            missoes: count >= TUTORIAL_TOTAL ? "current" : "todo",
          }}
          level={level}
        />
      </section>

      <section className="container max-w-3xl pt-6 pb-10">
        <h1 className="font-display uppercase text-5xl sm:text-7xl leading-none text-balance">
          tutorial
        </h1>
        <p className="mt-5 font-body text-base sm:text-lg text-perestroika-preto/75 text-pretty">
          1 min pra escolher a ideia + 5 etapas pra construir. cada prompt já vem personalizado com a sua escolha.
        </p>
        <TutorialStepper
          steps={TUTORIAL_STEPS}
          completed={completed}
          current={openStep ?? nextPendingStep}
          onSelect={(id) => setOpenStep(id)}
          ideaStep={{ id: IDEA_STEP_ID, number: "00", title: "sua ideia" }}
        />

        {loadingFbi && (
          <FbiIncrementalLoader fbi={fbi} />
        )}

        {!loadingFbi && fbiError && (
          (() => {
            const isSoft = hasFbi; // tem fallback => alerta laranja; senão vermelho
            const ErrIcon =
              fbiError.kind === "offline"
                ? WifiOff
                : fbiError.kind === "permission" || fbiError.kind === "auth"
                  ? ShieldAlert
                  : fbiError.kind === "unknown"
                    ? ServerCrash
                    : AlertTriangle;
            return (
              <div
                role="alert"
                className={`mt-6 rounded-2xl border p-4 flex items-start gap-3 ${
                  isSoft
                    ? "border-perestroika-laranja/40 bg-perestroika-laranja/10"
                    : "border-perestroika-vermelho/40 bg-perestroika-vermelho/10"
                }`}
              >
                <ErrIcon
                  className={`h-5 w-5 shrink-0 mt-0.5 ${
                    isSoft ? "text-perestroika-laranja" : "text-perestroika-vermelho"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-perestroika-preto">
                    {fbiError.title}
                    {isSoft && " (usando cache)"}
                  </p>
                  <p className="mt-1 font-body text-sm text-perestroika-preto/85">
                    {fbiError.message}
                  </p>
                  <p className="mt-1 font-body text-sm text-perestroika-preto/70">
                    {fbiError.suggestion}
                  </p>
                  {lastFetchedAt && (
                    <p className="mt-1 font-body text-xs text-perestroika-preto/55">
                      última tentativa {formatRelative(lastFetchedAt)}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className={`inline-flex items-center gap-1.5 rounded-full bg-perestroika-preto text-perestroika-bege px-3 py-2 text-xs uppercase tracking-wide font-body transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege ${
                        isSoft
                          ? "hover:bg-perestroika-laranja focus-visible:ring-perestroika-laranja"
                          : "hover:bg-perestroika-vermelho focus-visible:ring-perestroika-vermelho"
                      }`}
                    >
                      <RefreshCw className="h-3 w-3" />
                      tentar de novo
                    </button>
                    {fbiError.kind === "auth" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await signOut();
                          navigate("/auth");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-perestroika-bege text-perestroika-preto border border-perestroika-preto/30 px-3 py-2 text-xs uppercase tracking-wide font-body hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
                      >
                        <LogIn className="h-3 w-3" />
                        entrar de novo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {!loadingFbi && !fbiError && !hasFbi && (
          <div className="mt-6 rounded-2xl border border-perestroika-laranja/40 bg-perestroika-laranja/10 p-4 font-body text-sm text-perestroika-preto/80">
            responde o{" "}
            <Link to="/forms" className="underline font-semibold hover:text-perestroika-laranja focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-laranja focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded">
              fbi
            </Link>{" "}
            primeiro pra os prompts virem personalizados com a sua ideia.
          </div>
        )}
      </section>

      <section className="container max-w-3xl pb-24">
        <Accordion
          type="single"
          collapsible
          value={openStep}
          onValueChange={(v) => setOpenStep(v || undefined)}
          className="flex flex-col gap-4"
        >
          <IdeaStep
            fbiIdea={fbi?.ideia_gaveta ?? null}
            savedIdea={chosenIdea}
            isCompleted={ideaCompleted}
            saving={ideaSaving}
            onSave={async (next) => {
              const result = await saveIdea(next);
              if (!ideaCompleted) rawToggle(IDEA_STEP_ID);
              return result;
            }}
            onAfterSave={() => {
              const firstPending = TUTORIAL_STEPS.find((s) => !completed.has(s.id))?.id;
              setTimeout(() => setOpenStep(firstPending ?? undefined), 250);
            }}
          />
          {TUTORIAL_STEPS.map((step) => (
            <StepBlock
              key={step.id}
              step={step}
              fbi={fbi}
              chosenIdea={chosenIdea?.idea ?? null}
              isCompleted={completed.has(step.id)}
              onToggle={() => toggle(step.id)}
              level={level}
            />
          ))}
        </Accordion>
      </section>

      <footer className="container max-w-3xl py-10">
        <p className="font-body text-xs text-perestroika-preto/60 text-center">
          chora lovable 2026 · vai lá e cria
        </p>
      </footer>
    </div>
  );
};

export default Tutorial;
