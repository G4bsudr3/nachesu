import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeedbackFinalFlow } from "@/components/hub/FeedbackFinalFlow";
import { useFeedbackFinal } from "@/features/hub/useFeedbackFinal";
import { FINAL_FEEDBACK_ENABLED } from "@/features/hub/feedbackFinalFlag";
import { useUserRole } from "@/hooks/useUserRole";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { Award, ArrowLeft, Loader2 } from "lucide-react";

interface ProfileData {
  display_name: string | null;
  nickname: string | null;
}

interface CardData {
  archetype: string | null;
}

const ThanksScreen = () => (
  <div className="flex flex-col items-center text-center py-16 sm:py-24">
    <LagrimaGradient size={72} />
    <p className="mt-8 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-laranja">
      pesquisa enviada
    </p>
    <h1 className="mt-3 font-display uppercase text-5xl sm:text-7xl leading-[0.9] max-w-2xl text-balance">
      valeu por construir junto
    </h1>
    <p className="mt-5 font-body text-perestroika-preto/70 max-w-md text-balance">
      tuas respostas chegaram. agora é a parte boa: pega teu certificado oficial pra postar onde for.
    </p>

    <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
      <Link
        to="/app/certificado"
        className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
      >
        <Award className="w-4 h-4" />
        baixar certificado
      </Link>
      <Link
        to="/app/hub"
        className="inline-flex items-center gap-2 rounded-full bg-white border border-perestroika-preto/15 text-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
      >
        <ArrowLeft className="w-4 h-4" />
        voltar pro hub
      </Link>
    </div>
  </div>
);

const FeedbackFinal = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { alreadyAnswered } = useFeedbackFinal();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [p, c] = await Promise.all([
        supabase.from("profiles").select("display_name, nickname").eq("user_id", user.id).maybeSingle(),
        supabase.from("builder_cards").select("archetype").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setProfile(p.data ?? null);
      setCard(c.data ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!FINAL_FEEDBACK_ENABLED && !isAdmin) return <Navigate to="/app/hub" replace />;

  const fullName = profile?.display_name ?? profile?.nickname ?? "builder";

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto">
      <PageHeader back={{ to: "/app/hub", label: "voltar pro hub" }} />
      <main className="container max-w-3xl pb-20">
        {loading || alreadyAnswered === null ? (
          <div className="min-h-[60vh] flex items-center justify-center text-perestroika-preto/40">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : alreadyAnswered ? (
          <ThanksScreen />
        ) : (
          <FeedbackFinalFlow
            fullName={fullName}
            userId={user?.id ?? null}
          />
        )}
      </main>
    </div>
  );
};

export default FeedbackFinal;
