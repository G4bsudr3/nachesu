import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Share2, Sparkles, Loader2 } from "lucide-react";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { CertificateRenderer, CERTIFICATE_DIMENSIONS } from "@/components/certificate/CertificateRenderer";
import { useCertificateDownload } from "@/components/certificate/useCertificateDownload";
import { CERTIFICATE_VARIANT, type CertificateVariant } from "@/features/hub/feedbackFinalFlag";
import { detectGender } from "@/lib/gender";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  fullName: string;
  archetype?: string | null;
  userId: string | null;
  /** override pra preview admin testar variantes diferentes. */
  variantOverride?: CertificateVariant;
  /** se true, persiste no bucket. False no preview admin. */
  persist?: boolean;
  /** override de url da artwork pra preview admin. */
  tarotImageUrlOverride?: string | null;
}

export const StepDone = ({ fullName, archetype, userId, variantOverride, persist = true, tarotImageUrlOverride }: Props) => {
  const variant = variantOverride ?? CERTIFICATE_VARIANT;
  const gender = detectGender(fullName);
  const { downloadLocal, share, downloading } = useCertificateDownload();

  // resolve a artwork oficial atual do arquétipo (se houver) pra renderizar a carta
  const [tarotImageUrl, setTarotImageUrl] = useState<string | null>(tarotImageUrlOverride ?? null);
  useEffect(() => {
    if (tarotImageUrlOverride !== undefined) {
      setTarotImageUrl(tarotImageUrlOverride);
      return;
    }
    if (!archetype) {
      setTarotImageUrl(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("archetype_artworks")
      .select("image_url")
      .eq("archetype", archetype as never)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTarotImageUrl(data?.image_url ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [archetype, tarotImageUrlOverride]);

  // animação faseada: lágrima → manchete → loader → certificado
  const [phase, setPhase] = useState<"hi" | "loading" | "ready">("hi");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("loading"), 1400);
    const t2 = setTimeout(() => setPhase("ready"), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const fileName = `chora-lovable-certificado-${fullName.split(" ")[0].toLowerCase()}.png`;

  const handleDownload = async () => {
    const ok = await downloadLocal(
      { variant, fullName, archetype, gender, userId, persist, tarotImageUrl },
      fileName,
    );
    if (ok) toast.success("certificado baixado 🤙");
    else toast.error("não consegui gerar, tenta de novo");
  };

  const handleShare = async () => {
    await share({ variant, fullName, archetype, gender, userId, persist, tarotImageUrl }, fileName);
  };

  if (phase !== "ready") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 min-h-[60vh]">
        <div className="animate-pulse">
          <LagrimaGradient size={96} />
        </div>
        <h1 className="font-display uppercase text-5xl sm:text-7xl leading-[0.9] mt-8 max-w-2xl text-balance">
          {phase === "hi" ? "obrigado por construir junto" : "preparando seu certificado…"}
        </h1>
        {phase === "loading" && (
          <div className="mt-6 flex items-center gap-2 text-perestroika-preto/60 text-sm uppercase tracking-wide">
            <Loader2 className="w-4 h-4 animate-spin" />
            isso leva uns segundos
          </div>
        )}
      </div>
    );
  }

  // ready: mostra certificado escalado + ações
  const dims = CERTIFICATE_DIMENSIONS[variant];
  const isLandscape = dims.width > dims.height;
  // escala pra caber em ~600px de largura
  const targetWidth = isLandscape ? 720 : 360;
  const scale = targetWidth / dims.width;

  return (
    <div className="flex flex-col items-center text-center py-10 sm:py-16">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-perestroika-laranja mb-3">
        <Sparkles className="w-3.5 h-3.5" />
        seu certificado
      </div>
      <h1 className="font-display uppercase text-4xl sm:text-6xl leading-[0.9] mb-2 max-w-2xl text-balance">
        você foi lá e criou
      </h1>
      <p className="font-body text-perestroika-preto/70 max-w-md text-balance">
        baixa em alta resolução ou compartilha direto. tá pronto pra postar onde quiser.
      </p>

      {/* preview do certificado renderizado em escala */}
      <div
        className="relative my-10 rounded-3xl overflow-hidden shadow-2xl"
        style={{
          width: dims.width * scale,
          height: dims.height * scale,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: dims.width,
            height: dims.height,
          }}
        >
          <CertificateRenderer
            variant={variant}
            fullName={fullName}
            archetype={archetype}
            gender={gender}
            tarotImageUrl={tarotImageUrl}
          />
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-preto text-perestroika-bege px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? "gerando…" : "baixar PNG"}
        </button>
        <button
          onClick={handleShare}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-full bg-perestroika-bege border border-perestroika-preto/15 text-perestroika-preto px-7 py-4 font-body text-sm uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <Share2 className="w-4 h-4" />
          compartilhar
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
  );
};
