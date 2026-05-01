import { forwardRef } from "react";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { PeresLogo, type PeresLogoVariant } from "@/components/brand/PeresLogo";
import { EVENT_INFO } from "@/features/hub/feedbackFinalFlag";
import { TarotCard } from "@/components/carta/TarotCard";
import { type Archetype } from "@/components/carta/cartaTokens";

// (removido em v3: o bloco "foi reconhecide como [DISPLAY NAME]" foi tirado do
// preset tarot-destaque porque a própria carta já comunica o arquétipo.)

export type CertificateTone = "bege" | "escuro" | "celebracao";

interface ToneTokens {
  background: string;
  ink: string;
  inkSoft: string;
  inkMute: string;
  border: string;
  divider: string;
  peresVariant: PeresLogoVariant;
  choraVariant: "dark" | "light";
}

const TONES: Record<CertificateTone, ToneTokens> = {
  bege: {
    background: "#f2e4d8",
    ink: "#090909",
    inkSoft: "rgba(9,9,9,0.88)",
    inkMute: "rgba(9,9,9,0.68)",
    border: "#090909",
    divider: "rgba(9,9,9,0.28)",
    peresVariant: "preta",
    choraVariant: "dark",
  },
  escuro: {
    background: "#090909",
    ink: "#f2e4d8",
    inkSoft: "rgba(242,228,216,0.92)",
    inkMute: "rgba(242,228,216,0.72)",
    border: "#f2e4d8",
    divider: "rgba(242,228,216,0.32)",
    peresVariant: "bege",
    choraVariant: "light",
  },
  celebracao: {
    background:
      "linear-gradient(180deg, #fd4644 0%, #f756a6 40%, #f2e4d8 100%)",
    ink: "#090909",
    inkSoft: "rgba(9,9,9,0.9)",
    inkMute: "rgba(9,9,9,0.72)",
    border: "#090909",
    divider: "rgba(9,9,9,0.3)",
    peresVariant: "preta",
    choraVariant: "dark",
  },
};

export interface CertificateProps {
  fullName: string;
  archetype?: Archetype | null;
  gender?: "f" | "m" | "n";
  /** url da artwork do arquétipo. quando ausente + archetype null, esconde a coluna da carta. */
  tarotImageUrl?: string | null;
  /** tom visual do certificado. controla cores de fundo, tinta e variante das logos. */
  tone?: CertificateTone;
  /** quando true e houver arquétipo+artwork, ativa o layout "carta em destaque":
   *  carta maior e bloco "foi reconhecide como [DISPLAY NAME]" em primeiro plano. */
  archetypeShowcase?: boolean;
}

/**
 * Certificado oficial Chŏra Lovable — versão editorial v2.
 *
 * Princípios da revisão:
 *  - hierarquia: o NOME do aluno é o protagonista (não a marca)
 *  - "CHŎRA Lovable" vira selo/cabeçalho pequeno, não título gigante
 *  - lágrima ornamental contida dentro da moldura (não sangra)
 *  - logo único no topo (sem competir com o título)
 *  - tarot card alinhado com o bloco textual no mesmo eixo vertical
 *  - rodapé condensado em uma linha só, com créditos discretos
 *  - landscape A4 1414x1000, padding generoso
 *
 *  archetypeShowcase: variação onde a carta cresce e o arquétipo (display name +
 *  tagline) ganha protagonismo visual junto do nome do aluno.
 */
export const CertificateEditorial = forwardRef<HTMLDivElement, CertificateProps>(
  ({ fullName, archetype, gender = "n", tarotImageUrl, tone = "bege", archetypeShowcase = false }, ref) => {
    const showCard = Boolean(archetype && tarotImageUrl);
    // showcase só vale se temos carta de fato; senão cai no layout normal
    const isShowcase = archetypeShowcase && showCard && Boolean(archetype);
    const t = TONES[tone];

    const isDarkShowcase = isShowcase && tone === "escuro";

    return (
      <div
        ref={ref}
        className="relative overflow-hidden font-body"
        style={{
          width: 1414,
          height: 1000,
          padding: 56,
          background: t.background,
          color: t.ink,
        }}
      >
        {/* moldura interna */}
        <div
          className="relative h-full w-full"
          style={{
            border: `1.5px solid ${t.border}`,
            borderRadius: 18,
            overflow: "hidden",
            // grão sutil no tom escuro pra dar profundidade cinematográfica
            backgroundImage:
              tone === "escuro"
                ? "radial-gradient(ellipse at 30% 20%, rgba(247,86,166,0.08), transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(111,119,252,0.08), transparent 50%)"
                : undefined,
          }}
        >
          {/* lágrima ornamental, contida no canto superior esquerdo dentro da moldura */}
          <div
            style={{
              position: "absolute",
              top: 44,
              left: 52,
              zIndex: 2,
            }}
          >
            <LagrimaGradient size={84} />
          </div>

          {/* selo da marca, canto superior direito - discreto */}
          <div
            style={{
              position: "absolute",
              top: 52,
              right: 60,
              opacity: 0.85,
              zIndex: 2,
            }}
          >
            <ChoraLogo variant={t.choraVariant} height={32} />
          </div>

          {/* conteúdo interno */}
          <div
            className="relative h-full w-full flex flex-col"
            style={{ padding: "120px 100px 56px" }}
          >
            {/* topo: rótulo certificado */}
            <div className="text-center" style={{ marginBottom: 40 }}>
              <div
                className="font-body uppercase"
                style={{
                  color: t.inkMute,
                  fontSize: 17,
                  letterSpacing: "0.38em",
                  fontWeight: 600,
                }}
              >
                certificado de conclusão
              </div>
            </div>

            {/* meio: carta + bloco textual lado a lado */}
            <div
              className="w-full flex items-center justify-center"
              style={{ gap: showCard ? (isShowcase ? 80 : 72) : 0, flex: 1 }}
            >
              {showCard && archetype && (
                <div
                  style={{
                    width: isShowcase ? 520 : 460,
                    height: isShowcase ? 650 : 575,
                    flexShrink: 0,
                    // glow ao redor da carta no escuro showcase pra mood pôster cinema
                    filter: isDarkShowcase
                      ? "drop-shadow(0 0 60px rgba(247,86,166,0.28)) drop-shadow(0 0 120px rgba(111,119,252,0.18))"
                      : undefined,
                  }}
                >
                  <div
                    style={{
                      transform: isShowcase ? "scale(0.4815)" : "scale(0.426)",
                      transformOrigin: "top left",
                      width: 1080,
                      height: 1350,
                    }}
                  >
                    <TarotCard
                      imageUrl={tarotImageUrl}
                      nickname={fullName}
                      archetype={archetype}
                      gender={gender}
                      size="export"
                    />
                  </div>
                </div>
              )}

              <div
                className="flex flex-col text-center"
                style={{
                  alignItems: "center",
                  gap: 0,
                  maxWidth: showCard ? (isShowcase ? 660 : 700) : 900,
                  flex: showCard ? "0 1 auto" : undefined,
                }}
              >
                {/* "certifica-se que" */}
                <div
                  className="uppercase"
                  style={{
                    fontSize: isShowcase ? 22 : 20,
                    letterSpacing: "0.34em",
                    color: t.inkMute,
                    fontWeight: 600,
                    marginBottom: isShowcase ? 32 : 30,
                  }}
                >
                  certifica-se que
                </div>

                {/* NOME — protagonista absoluto. no showcase a carta já comunica o arquétipo,
                    então o nome volta ao tamanho cheio. */}
                <h1
                  className="font-display uppercase"
                  style={{
                    fontSize: isShowcase ? 128 : showCard ? 124 : 156,
                    lineHeight: 0.92,
                    letterSpacing: "-0.005em",
                    color: t.ink,
                    margin: 0,
                    marginBottom: isShowcase ? 44 : 38,
                    wordBreak: "break-word",
                    // glow sutil no nome no escuro showcase, cinema mood
                    textShadow: isDarkShowcase
                      ? "0 0 50px rgba(242,228,216,0.18)"
                      : undefined,
                  }}
                >
                  {fullName}
                </h1>

                {/* parágrafo de validação — agora legível à distância */}
                <p
                  className="font-body"
                  style={{
                    fontSize: isShowcase ? 30 : 28,
                    lineHeight: 1.45,
                    color: t.inkSoft,
                    maxWidth: isShowcase ? 640 : 700,
                    margin: 0,
                    marginBottom: isShowcase ? 44 : 42,
                    fontWeight: 400,
                  }}
                >
                  participou da imersão{" "}
                  <strong
                    style={{
                      fontWeight: 700,
                      // no showcase, mantém sólido pra não competir com a carta colorida
                      color: isShowcase ? t.ink : "#fd4644",
                      backgroundImage: isShowcase
                        ? undefined
                        : "linear-gradient(90deg, #fe7b02 0%, #fd4644 35%, #f756a6 70%, #6f77fc 100%)",
                      WebkitBackgroundClip: isShowcase ? undefined : "text",
                      backgroundClip: isShowcase ? undefined : "text",
                      WebkitTextFillColor: isShowcase ? undefined : "transparent",
                    }}
                  >
                    {EVENT_INFO.nome}
                  </strong>
                  , {EVENT_INFO.carga_horaria} de prática intensiva em construção com IA
                  usando Lovable: do brief ao app publicado, do prompt ao manifesto.
                </p>

                {/* metadados inline (data · local · carga) */}
                <div
                  className="font-body uppercase"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: isShowcase ? 24 : 22,
                    fontSize: isShowcase ? 19 : 18,
                    letterSpacing: "0.22em",
                    color: t.inkMute,
                    fontWeight: 600,
                  }}
                >
                  <span>{EVENT_INFO.data_curta}</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>
                    {EVENT_INFO.local}, {EVENT_INFO.cidade}
                  </span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{EVENT_INFO.carga_horaria}</span>
                </div>
              </div>
            </div>

            {/* rodapé: co-branding Chŏra × Peres + créditos */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                marginTop: 28,
              }}
            >
              {/* linha de logos: produzido por */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 28,
                }}
              >
                <span
                  className="font-body uppercase"
                  style={{
                    fontSize: 13,
                    letterSpacing: "0.32em",
                    color: t.inkMute,
                    fontWeight: 600,
                  }}
                >
                  uma realização
                </span>
                <span
                  style={{
                    width: 1,
                    height: 22,
                    background: t.divider,
                  }}
                />
                <PeresLogo
                  variant={t.peresVariant}
                  height={28}
                  alt="Perestroika"
                />
              </div>

              {/* créditos finos */}
              <div
                className="font-body uppercase"
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  letterSpacing: "0.28em",
                  color: t.inkMute,
                  fontWeight: 600,
                  opacity: 0.9,
                }}
              >
                CNPJ {EVENT_INFO.cnpj}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

CertificateEditorial.displayName = "CertificateEditorial";

