import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, X } from "lucide-react";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { useAuth } from "@/contexts/AuthContext";
import { usePostEventStatus } from "@/hooks/usePostEventStatus";
import { FINAL_FEEDBACK_ENABLED } from "@/features/hub/feedbackFinalFlag";
import { supabase } from "@/integrations/supabase/client";

const SESSION_DISMISS_KEY = "chora:feedback-final-nudge-dismissed";
const DISMISS_COUNT_KEY = "chora:feedback-final-nudge-dismiss-count";

const HIDDEN_PREFIXES = [
  "/app/feedback-final",
  "/app/pending",
  "/app/conta",
  "/app/inicio",
  "/auth",
  "/forms",
  "/carta/",
  "/c/",
  "/admin",
];

const COPY_VARIANTS = [
  { label: "fecha o ciclo", text: "{nome}, falta você contar como foi 👀" },
  { label: "4 minutinhos", text: "ô {nome}, conta a sua experiência na eletiva?" },
  { label: "a gente quer saber", text: "{nome}, a sua resposta vale ouro pra próxima turma" },
  { label: "tá esperando você", text: "{nome}, a pesquisa final ainda não tem a sua voz" },
];

const dayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
};

const useNickname = () => {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["profile-nickname", user?.id],
    enabled: !!user,
    staleTime: Infinity,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("nickname, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const raw = data?.nickname || data?.display_name || user.email?.split("@")[0] || "tu";
      return raw.split(" ")[0].toLowerCase();
    },
  });
  return data ?? "tu";
};

export const FeedbackFinalGlobalNudge = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { feedbackFinalDone, loading } = usePostEventStatus();
  const nickname = useNickname();

  const [dismissed, setDismissed] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [chipKilled, setChipKilled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem(SESSION_DISMISS_KEY) === "1");
    const n = parseInt(sessionStorage.getItem(DISMISS_COUNT_KEY) || "0", 10);
    setDismissCount(Number.isFinite(n) ? n : 0);
  }, []);

  const variant = useMemo(() => COPY_VARIANTS[dayOfYear() % COPY_VARIANTS.length], []);

  const onPath = location.pathname;
  const hiddenByRoute =
    !onPath.startsWith("/app") || HIDDEN_PREFIXES.some((p) => onPath.startsWith(p));

  if (!FINAL_FEEDBACK_ENABLED) return null;
  if (!user) return null;
  if (hiddenByRoute) return null;
  if (loading) return null;
  if (feedbackFinalDone) return null;

  const dismiss = () => {
    const next = dismissCount + 1;
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
      sessionStorage.setItem(DISMISS_COUNT_KEY, String(next));
    } catch {
      // ignore
    }
    setDismissCount(next);
    setDismissed(true);
  };

  const killChip = () => {
    setChipKilled(true);
  };

  // após 3 dismisses na sessão, vira chip flutuante discreto
  if (dismissed && dismissCount >= 3) {
    if (chipKilled) return null;
    return (
      <div
        className="fixed right-4 z-30"
        style={{ bottom: "calc(var(--mobile-nav-h, 0px) + 5rem)" }}
      >
        <div className="flex items-center gap-1 rounded-full bg-perestroika-preto pl-3 pr-1 py-1 shadow-lg">
          <Link
            to="/app/feedback-final"
            className="flex items-center gap-2 font-body text-[11px] uppercase tracking-wide text-perestroika-bege"
          >
            <LagrimaGradient size={16} />
            responder pesquisa
          </Link>
          <button
            type="button"
            onClick={killChip}
            aria-label="fechar"
            className="rounded-full p-1 text-perestroika-bege/60 hover:text-perestroika-bege transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  if (dismissed) return null;

  const text = variant.text.replace("{nome}", nickname);

  return (
    <div
      role="region"
      aria-label="convite pra pesquisa final"
      className="sticky top-0 z-40 w-full border-b border-perestroika-rosa/30 bg-perestroika-bege"
    >
      <div
        aria-hidden
        className="h-[3px] w-full"
        style={{
          background:
            "linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
        }}
      />
      <div className="container flex items-center gap-3 px-4 py-2.5">
        <span className="hidden shrink-0 sm:inline-flex">
          <LagrimaGradient size={28} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
            <span className="font-display text-sm uppercase tracking-wide text-perestroika-preto sm:text-base">
              {variant.label}
            </span>
            <span className="font-body text-xs text-perestroika-preto/75 sm:text-sm">{text}</span>
          </p>
        </div>

        <Link
          to="/app/feedback-final"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-perestroika-preto px-3 py-1.5 font-body text-[11px] uppercase tracking-wide text-perestroika-bege transition-transform hover:-translate-y-0.5 sm:text-xs"
        >
          responder
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <button
          type="button"
          onClick={dismiss}
          aria-label="fechar"
          className="shrink-0 rounded-full p-1 text-perestroika-preto/50 transition-colors hover:bg-perestroika-preto/10 hover:text-perestroika-preto"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default FeedbackFinalGlobalNudge;
