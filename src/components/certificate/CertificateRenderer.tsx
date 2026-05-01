import { forwardRef } from "react";
import { CertificateEditorial, type CertificateTone } from "./CertificateEditorial";
import type { CertificateVariant } from "@/features/hub/feedbackFinalFlag";
import type { Archetype } from "@/components/carta/cartaTokens";
import type { CertificatePreset } from "./certificatePresets";

interface Props {
  /** mantido pra compat — só temos editorial agora. */
  variant?: CertificateVariant;
  fullName: string;
  archetype?: string | null;
  gender?: "f" | "m" | "n";
  /** url da artwork oficial do arquétipo (archetype_artworks.image_url). */
  tarotImageUrl?: string | null;
  /** preset visual (controla o tom de cor do certificado). */
  preset?: CertificatePreset;
}

const PRESET_TO_TONE: Record<CertificatePreset, CertificateTone> = {
  "bege-editorial": "bege",
  "preto-cinema": "escuro",
  "gradient-festa": "celebracao",
};

/** roteador de certificado. hoje só renderiza o editorial em 3 tons.
 *  quando há arquétipo + artwork, o showcase liga automaticamente:
 *  a carta de tarot entra grande ao lado do nome no tom escolhido. */
export const CertificateRenderer = forwardRef<HTMLDivElement, Props>(
  ({ fullName, archetype, gender, tarotImageUrl, preset = "bege-editorial" }, ref) => {
    const hasCard = Boolean(archetype && tarotImageUrl);
    return (
      <CertificateEditorial
        ref={ref}
        fullName={fullName}
        archetype={(archetype as Archetype | null | undefined) ?? null}
        gender={gender}
        tarotImageUrl={tarotImageUrl ?? null}
        tone={PRESET_TO_TONE[preset]}
        archetypeShowcase={hasCard}
      />
    );
  },
);

CertificateRenderer.displayName = "CertificateRenderer";

export const CERTIFICATE_DIMENSIONS: Record<CertificateVariant, { width: number; height: number }> = {
  editorial: { width: 1414, height: 1000 },
};
