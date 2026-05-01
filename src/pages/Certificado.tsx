import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Download, Share2, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { CertificateForm } from "@/components/certificate/CertificateForm";
import { useCertificateDownload } from "@/components/certificate/useCertificateDownload";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { ARCHETYPE_TOKENS, type Archetype } from "@/components/carta/cartaTokens";
import type { CertificatePreset } from "@/components/certificate/certificatePresets";
import { detectGender } from "@/lib/gender";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface ProfileData {
  display_name: string | null;
  nickname: string | null;
}

interface CardData {
  archetype: Archetype | null;
}

type Phase = "loading" | "form" | "generating" | "done";

const Certificado = () => {
  const { user } = useAuth();
  const { generate } = useCertificateDownload();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [card, setCard] = useState<CardData | null>(null);
  const [tarotImageUrl, setTarotImageUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [lastFormData, setLastFormData] = useState<{
    fullName: string;
    preset: CertificatePreset;
  } | null>(null);

  // carrega perfil + carta
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
      setCard((c.data as CardData | null) ?? null);
      setPhase("form");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // busca artwork oficial pra renderizar a prévia + a carta no PNG final
  useEffect(() => {
    if (!card?.archetype) {
      setTarotImageUrl(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("archetype_artworks")
      .select("image_url")
      .eq("archetype", card.archetype)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTarotImageUrl(data?.image_url ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [card?.archetype]);

  const archetypeInfo = card?.archetype
    ? {
        archetype: ARCHETYPE_TOKENS[card.archetype].labels.m,
        emoji: ARCHETYPE_TOKENS[card.archetype].emoji,
      }
    : null;

  const handleGenerate = async (data: { fullName: string; preset: CertificatePreset }) => {
    if (!user) {
      toast.error("precisa estar logado");
      return;
    }

    setLastFormData(data);
    setPhase("generating");

    try {
      const archetype = card?.archetype ?? null;
      const gender = detectGender(data.fullName);
      const result = await generate({
        variant: "editorial",
        fullName: data.fullName,
        archetype,
        gender,
        userId: user.id,
        tarotImageUrl,
        preset: data.preset,
        persist: true,
      });
      if (!result) {
        toast.error("não consegui gerar. tenta de novo.");
        setPhase("form");
        return;
      }
      setGeneratedBlob(result.blob);
      setGeneratedUrl(result.publicUrl ?? result.url);
      setPhase("done");
      toast.success("ficou foda. baixa, compartilha, posta. 🤙");
    } catch (e) {
      logger.error("[Certificado]", e);
      toast.error("não consegui gerar. tenta de novo.");
      setPhase("form");
    }
  };

  const handleDownload = async () => {
    if (!generatedUrl || !lastFormData) return;
    try {
      const blob = generatedBlob ?? (await (await fetch(generatedUrl)).blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chora-lovable-certificado-${lastFormData.fullName.split(" ")[0].toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("não consegui baixar");
    }
  };

  const handleShare = async () => {
    if (!generatedUrl || !lastFormData) return;
    try {
      const blob = generatedBlob ?? (await (await fetch(generatedUrl)).blob());
      const file = new File([blob], `chora-lovable-certificado.png`, { type: blob.type || "image/png" });
      const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "meu certificado chŏra lovable", text: "fui lá e criei." });
        return;
      }
      handleDownload();
    } catch {
      // user pode ter cancelado
    }
  };

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto">
      <PageHeader back={{ to: "/app/hub", label: "voltar pro hub" }} />
      <main className="container max-w-3xl pb-20">
        {phase === "loading" && (
          <div className="min-h-[60vh] flex items-center justify-center text-perestroika-preto/40">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {phase === "form" && profile && (
          <CertificateForm
            defaultDisplayName={profile.display_name ?? profile.nickname ?? "builder"}
            defaultNickname={profile.nickname}
            archetypeInfo={archetypeInfo}
            archetype={card?.archetype ?? null}
            tarotImageUrl={tarotImageUrl}
            onGenerate={handleGenerate}
          />
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
            <div className="animate-pulse">
              <LagrimaGradient size={96} />
            </div>
            <h1 className="font-display uppercase text-4xl sm:text-6xl leading-[0.9] mt-8 max-w-2xl text-balance">
              gerando teu certificado
            </h1>
            <div className="mt-6 flex items-center gap-2 text-perestroika-preto/60 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>renderizando em alta resolução…</span>
            </div>
          </div>
        )}

        {phase === "done" && generatedUrl && (
          <div className="flex flex-col items-center text-center py-10 sm:py-16">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-perestroika-laranja mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              seu certificado
            </div>
            <h1 className="font-display uppercase text-4xl sm:text-6xl leading-[0.9] mb-2 max-w-2xl text-balance">
              você foi lá e criou
            </h1>
            <p className="font-body text-perestroika-preto/70 max-w-md text-balance">
              alta resolução, pronto pra baixar ou compartilhar.
            </p>

            <div className="my-10 rounded-3xl overflow-hidden shadow-2xl max-w-full">
              <img
                src={generatedUrl}
                alt="Seu certificado Chŏra Lovable"
                className="block w-full h-auto"
                loading="eager"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
              >
                <Download className="w-4 h-4" />
                baixar PNG
              </button>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-perestroika-preto/15 text-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform"
              >
                <Share2 className="w-4 h-4" />
                compartilhar
              </button>
              <button
                onClick={() => {
                  setGeneratedUrl(null);
                  setGeneratedBlob(null);
                  setPhase("form");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-transparent border border-perestroika-preto/15 text-perestroika-preto/70 px-7 py-4 font-body text-sm uppercase tracking-wide hover:bg-perestroika-preto/5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                personalizar de novo
              </button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs uppercase tracking-wide text-perestroika-preto/55">
              <Link to="/app/carta" className="hover:text-perestroika-preto transition-colors">
                ver minha carta
              </Link>
              <span className="opacity-30">·</span>
              <Link to="/app/hub" className="hover:text-perestroika-preto transition-colors">
                voltar pro hub
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Certificado;
