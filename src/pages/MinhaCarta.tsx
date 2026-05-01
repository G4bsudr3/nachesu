import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Hourglass, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCard } from "@/features/carta/useMyCard";
import { CartaCompleta, type CartaCompletaData } from "@/components/carta/CartaCompleta";
import { CartaActions } from "@/components/carta/CartaActions";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { PageHeader } from "@/components/layout/PageHeader";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { TarotCard } from "@/components/carta/TarotCard";
import { type Archetype } from "@/components/carta/cartaTokens";
import { NextStepInline } from "@/components/hub/NextStepInline";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MinhaCarta = () => {
  const { user } = useAuth();
  const { card, state, loading, viewCount, firstViewedAt } = useMyCard();
  const [profileNames, setProfileNames] = useState<{ display_name: string | null; nickname: string | null }>({
    display_name: null,
    nickname: null,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, nickname")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfileNames({ display_name: data.display_name, nickname: data.nickname });
      });
  }, [user]);

  return (
    <div className="relative min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader back={{ to: "/app", label: "voltar pro hub" }} />

      <main className="container max-w-5xl pb-24">
        {loading && (
          <EmptyState
            icon={<Loader2 className="h-10 w-10 animate-spin" />}
            titulo="carregando…"
            descricao=""
          />
        )}

        {!loading && state === "none" && (
          <EmptyState
            icon={<LagrimaGradient size={64} />}
            titulo="sua carta ainda não foi escrita"
            descricao="primeiro envia o formulário fbi. depois o frattz lê suas respostas e escreve uma carta personalizada pra você."
            cta={{ to: "/forms", label: "preencher fbi" }}
          />
        )}

        {!loading && state === "gerando" && (
          <EmptyState
            icon={<Sparkles className="h-10 w-10 text-perestroika-laranja" />}
            titulo="sua carta tá sendo escrita"
            descricao="a IA tá lendo as 19 respostas do seu fbi pra identificar seu arquétipo de builder. volta em alguns minutos."
          />
        )}

        {!loading && state === "erro" && (
          <EmptyState
            icon={<Hourglass className="h-10 w-10 text-perestroika-vermelho" />}
            titulo="deu ruim na geração"
            descricao="rolou um erro ao escrever sua carta. o frattz já foi avisado e vai rodar de novo manualmente."
          />
        )}

        {!loading && state === "revisao" && (
          <EmptyState
            icon={<Hourglass className="h-10 w-10 text-perestroika-azul" />}
            titulo="quase lá"
            descricao="sua carta tá pronta, mas o frattz ainda tá revisando antes de liberar. a gente te avisa no whatsapp quando ela publicar."
          />
        )}

        {!loading && state === "publicada" && card && card.archetype && (
          <div className="space-y-6">
            <ViewsBadge count={viewCount} firstViewedAt={firstViewedAt} />
            <CartaCompleta
              data={
                {
                  display_name: profileNames.display_name,
                  nickname: profileNames.nickname,
                  archetype: card.archetype as Archetype,
                  emoji: card.emoji,
                  essence_phrase: card.essence_phrase,
                  tagline: card.tagline,
                  superpower_text: card.superpower_text,
                  shadow_text: card.shadow_text,
                  next_move_text: card.next_move_text,
                  full_text: card.full_text,
              } satisfies CartaCompletaData
              }
              embedded
              cardVisual={
                <TarotCard
                  size="hero"
                  tilt
                  imageUrl={card.image_url}
                  nickname={profileNames.nickname ?? profileNames.display_name}
                  archetype={card.archetype as Archetype}
                />
              }
              actions={
                <CartaActions
                  shareToken={card.share_token}
                  imageUrl={card.image_url}
                  archetype={card.archetype}
                  nickname={profileNames.nickname ?? profileNames.display_name}
                />
              }
            />
            <NextStepInline
              href="/app/prework"
              label="agora bora pro pré-work"
              helper="leituras curtas pra chegar afiado no sábado."
              tone="success"
            />
          </div>
        )}
      </main>
    </div>
  );
};

const EmptyState = ({
  icon,
  titulo,
  descricao,
  cta,
}: {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  cta?: { to: string; label: string };
}) => (
  <div className="flex flex-col items-center text-center gap-6 py-20 px-4">
    <div className="flex items-center justify-center">{icon}</div>
    <h1 className="font-display uppercase text-4xl sm:text-6xl leading-none text-balance max-w-2xl">
      {titulo}
    </h1>
    {descricao && (
      <p className="font-body text-base sm:text-lg text-perestroika-preto/70 max-w-xl text-pretty">
        {descricao}
      </p>
    )}
    {cta && (
      <Link
        to={cta.to}
        className="inline-flex items-center gap-2 min-h-11 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
      >
        {cta.label}
      </Link>
    )}
  </div>
);

const ViewsBadge = ({ count, firstViewedAt }: { count: number; firstViewedAt: string | null }) => {
  if (count === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-perestroika-preto/10 bg-perestroika-preto/[0.03] px-5 py-4">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-perestroika-preto/50" />
          <div className="text-sm">
            <p className="font-display uppercase tracking-wide text-perestroika-preto">ainda ninguém viu</p>
            <p className="text-perestroika-preto/60">compartilha sua carta pra começar a tracionar.</p>
          </div>
        </div>
      </div>
    );
  }

  const fmtDate = firstViewedAt
    ? new Date(firstViewedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-perestroika-laranja/15 via-perestroika-rosa/15 to-perestroika-azul/15 border border-perestroika-preto/10 px-5 py-4">
      <div className="flex items-center gap-3">
        <Eye className="h-5 w-5 text-perestroika-preto" />
        <div className="text-sm">
          <p className="font-display uppercase tracking-wide text-perestroika-preto text-base">
            {count} {count === 1 ? "view" : "views"} na sua carta
          </p>
          {fmtDate && (
            <p className="text-perestroika-preto/60">primeira vez em {fmtDate}.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MinhaCarta;
