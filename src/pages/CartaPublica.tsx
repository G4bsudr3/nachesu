import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { PageHeader } from "@/components/layout/PageHeader";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { TarotCard } from "@/components/carta/TarotCard";
import { ARCHETYPE_TOKENS, getArchetypeView, type Archetype } from "@/components/carta/cartaTokens";
import { detectGender, firstNameDisplay } from "@/lib/gender";

interface PublicCard {
  archetype: Archetype;
  emoji: string | null;
  tagline: string | null;
  essence_phrase: string | null;
  superpower_preview: string | null;
  display_name: string | null;
  nickname: string | null;
  is_published: boolean;
  image_url?: string | null;
}

/** /carta/:token — página pública (acessível sem login) com hero teaser do
 * arquétipo do builder. CTA pra logar e ver carta completa (se for o dono)
 * ou conhecer o chŏra lovable (visitante). */
const CartaPublica = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState<PublicCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_public_card_by_token", { _token: token });
      const row = Array.isArray(data) ? data[0] : null;
      if (cancelled) return;
      if (error || !row) {
        setNotFound(true);
      } else {
        setCard(row as PublicCard);
        // marca primeira visualização (fire-and-forget)
        supabase.rpc("mark_card_first_view", { _token: token }).then(() => {});
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // atualiza title client-side (SPA) — crawlers pegam via edge function
  useEffect(() => {
    if (!card) return;
    const g = detectGender(card.display_name ?? card.nickname);
    const archLabel = getArchetypeView(card.archetype, g).label;
    const nome = card.nickname || firstNameDisplay(card.display_name) || "builder";
    document.title = `${nome} é ${archLabel} ${card.emoji ?? ""} · chŏra lovable`;
  }, [card]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-perestroika-bege flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-perestroika-preto/40" />
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto flex flex-col items-center justify-center px-6 text-center gap-6">
        <LagrimaGradient size={80} />
        <h1 className="font-display uppercase text-5xl sm:text-7xl leading-none">
          carta não encontrada
        </h1>
        <p className="font-body text-base sm:text-lg text-perestroika-preto/70 max-w-md">
          essa carta não existe, ainda não foi publicada ou o link tá errado.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-11 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
        >
          conhecer o chŏra lovable
        </Link>
      </div>
    );
  }

  const tokens = ARCHETYPE_TOKENS[card.archetype];
  const gender = detectGender(card.display_name ?? card.nickname);
  const view = getArchetypeView(card.archetype, gender);
  const nome = card.nickname || firstNameDisplay(card.display_name).toLowerCase() || "builder";
  const archLabel = view.label;
  const splitAt = Math.ceil(archLabel.length / 2);
  const archStart = archLabel.slice(0, splitAt);
  const archEnd = archLabel.slice(splitAt);

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        actions={
          !user && (
            <Link
              to="/auth"
              className="inline-flex items-center min-h-11 px-2 text-xs sm:text-sm uppercase tracking-wide text-perestroika-preto/70 hover:text-perestroika-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded"
            >
              entrar
            </Link>
          )
        }
      />

      {/* HERO TEASER — carta centralizada com fade+scale, texto embaixo */}
      <section className="relative px-6 lg:px-16 py-12 lg:py-20 overflow-hidden text-center">
        <p className="font-body text-[10px] lg:text-xs uppercase tracking-[0.3em] text-perestroika-preto/55 mb-6 lg:mb-8">
          uma carta pra <span className="text-perestroika-preto font-semibold">{nome}</span>
        </p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-sm mx-auto mb-10 lg:mb-14"
        >
          <TarotCard
            size="hero"
            tilt={false}
            imageUrl={card.image_url ?? null}
            nickname={card.nickname ?? card.display_name}
            archetype={card.archetype}
            gender={gender}
          />
        </motion.div>

        <p className="font-body text-base lg:text-lg mb-1">{nome},</p>
        <p className="font-body text-xs lg:text-sm uppercase tracking-[0.2em] text-perestroika-preto/60 mb-6 lg:mb-8">
          é {view.artigo}
        </p>
        <h1 className="font-display uppercase leading-[0.85] tracking-tight">
          <span
            className="block"
            style={{ fontSize: "clamp(3.5rem, 12vw, 10rem)" }}
          >
            <span className={tokens.gradient?.text ?? view.text}>{archStart}</span>
            <span className="text-perestroika-preto">{archEnd}</span>
          </span>
        </h1>
        <p className="text-2xl lg:text-3xl mt-2">{card.emoji ?? view.emoji}</p>

        {card.essence_phrase && (
          <p
            className={`font-body italic text-lg lg:text-2xl mt-8 lg:mt-12 max-w-2xl mx-auto text-perestroika-preto/85`}
          >
            "{card.essence_phrase}"
          </p>
        )}

        {card.tagline && (
          <p className="font-body text-sm lg:text-base uppercase tracking-[0.15em] text-perestroika-preto/50 mt-6 lg:mt-8">
            {card.tagline}
          </p>
        )}
      </section>

      {/* TEASER do superpoder (só primeiro parágrafo) */}
      {card.superpower_preview && (
        <>
          <div className="px-6 lg:px-16">
            <div className="h-px bg-perestroika-preto/10" />
          </div>
          <section className="px-6 lg:px-16 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-3">
              <div className="text-[10px] lg:text-xs uppercase tracking-[0.25em] text-perestroika-rosa mb-2">
                § 01
              </div>
              <h2 className="font-display uppercase text-4xl lg:text-5xl leading-[0.9] text-perestroika-rosa">
                seu superpoder
              </h2>
            </div>
            <div className="lg:col-span-8 lg:col-start-5 space-y-5">
              <p className="text-base lg:text-lg leading-relaxed text-perestroika-preto/90">
                {card.superpower_preview}
              </p>
              <p className="text-sm italic text-perestroika-preto/40">
                quer ver o resto da carta? entra com seu email pra desbloquear.
              </p>
            </div>
          </section>
        </>
      )}

      {/* CTA */}
      <div className="px-6 lg:px-16">
        <div className="h-px bg-perestroika-preto/10" />
      </div>
      <section className="px-6 lg:px-16 py-16 lg:py-24 flex flex-col items-center text-center gap-6">
        <Sparkles className={`h-10 w-10 ${view.text}`} />
        <h2 className="font-display uppercase text-4xl sm:text-6xl leading-none max-w-3xl text-balance">
          {user ? "vê sua carta completa" : `${nome}, isso aqui é só a capa`}
        </h2>
        <p className="font-body text-base sm:text-lg text-perestroika-preto/70 max-w-xl text-pretty">
          {user
            ? "se essa carta é sua, o link completo tá no seu hub."
            : "no hub você abre a versão completa: superpoder na íntegra, sombra, próximo movimento e os bastidores da carta. é 1 minuto pra entrar."}
        </p>
        {user ? (
          <button
            onClick={() => navigate("/app/carta")}
            className="inline-flex items-center gap-2 min-h-11 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
          >
            abrir minha carta
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <>
            <Link
              to={`/auth?from=carta&token=${token}`}
              className="inline-flex items-center gap-2 min-h-11 rounded-full bg-perestroika-preto text-perestroika-bege px-6 py-3 text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege"
            >
              abrir minha carta no hub
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="font-body text-sm text-perestroika-preto/65 max-w-md text-pretty">
              ainda não respondeu o fbi?{" "}
              <Link to="/forms" className="underline underline-offset-4 hover:text-perestroika-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege rounded">
                responder o fbi
              </Link>{" "}
              e a sua carta sai em seguida.
            </p>
            <p className="font-body text-xs text-perestroika-preto/50 max-w-md">
              chŏra lovable é uma imersão de 2 dias pra criar com IA. cada participante recebe uma carta dessa, escrita pelo frattz lendo as 19 respostas do fbi.
            </p>
          </>
        )}
      </section>

      <footer className="px-6 lg:px-16 py-8 text-center text-xs uppercase tracking-[0.2em] text-perestroika-preto/40">
        chŏra lovable · 25-26 abril 2026 · porto alegre
      </footer>
    </div>
  );
};

export default CartaPublica;
