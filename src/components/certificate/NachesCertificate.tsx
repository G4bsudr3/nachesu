import { forwardRef } from "react";
import { NachesULogo } from "@/components/brand/NachesULogo";

export interface NachesCertificateProps {
  fullName: string;
  courseTitle: string;
  courseSubtitle?: string | null;
  professorName: string;
  accentColor: string;
  /** data curta (ex: "março de 2026"). se ausente, usa hoje. */
  issuedAt?: string;
}

const formatDatePtBr = (d = new Date()) =>
  d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * certificado oficial da eletiva NachesU × Sebrae.
 *
 * princípios:
 *  - nome do estudante é protagonista absoluto (League Gothic gigante)
 *  - cor da eletiva vira faixa superior + inferior + accent no nome do curso
 *  - assinatura NachesU no rodapé, com selo de conclusão 100%
 *  - dimensão landscape A4 (1414x1000) pra impressão nítida
 */
export const NachesCertificate = forwardRef<HTMLDivElement, NachesCertificateProps>(
  (
    {
      fullName,
      courseTitle,
      courseSubtitle,
      professorName,
      accentColor,
      issuedAt,
    },
    ref,
  ) => {
    const dateLabel = issuedAt ?? formatDatePtBr();

    return (
      <div
        ref={ref}
        className="relative overflow-hidden font-body"
        style={{
          width: 1414,
          height: 1000,
          background: "#f2e4d8",
          color: "#090909",
        }}
      >
        {/* faixa superior de cor da eletiva */}
        <div
          aria-hidden
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: accentColor }}
        />
        {/* faixa inferior */}
        <div
          aria-hidden
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 18, background: accentColor }}
        />

        {/* moldura interna */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 56,
            right: 56,
            bottom: 56,
            border: "1.5px solid rgba(9,9,9,0.9)",
            borderRadius: 20,
            padding: "68px 92px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* header: logo + rótulo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <NachesULogo variant="ink" height={40} showSelo={false} />
            <div
              className="uppercase font-body"
              style={{
                fontSize: 15,
                letterSpacing: "0.42em",
                color: "rgba(9,9,9,0.62)",
                fontWeight: 600,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              certificado de conclusão
            </div>
          </div>

          {/* miolo: certifica-se que + nome + curso */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div
              className="uppercase"
              style={{
                fontSize: 18,
                letterSpacing: "0.34em",
                color: "rgba(9,9,9,0.6)",
                fontWeight: 600,
                marginBottom: 22,
              }}
            >
              certifica-se que
            </div>

            <h1
              className="font-display uppercase"
              style={{
                fontSize: fullName.length > 26 ? 128 : 156,
                lineHeight: 0.88,
                letterSpacing: "-0.005em",
                margin: 0,
                marginBottom: 34,
                color: "#090909",
                wordBreak: "break-word",
                maxWidth: "100%",
              }}
            >
              {fullName.toLowerCase()}
            </h1>

            <p
              className="font-body"
              style={{
                fontSize: 26,
                lineHeight: 1.4,
                color: "rgba(9,9,9,0.86)",
                margin: 0,
                marginBottom: 18,
                maxWidth: 1080,
                fontWeight: 400,
              }}
            >
              concluiu 100% da eletiva{" "}
              <strong
                className="font-display uppercase"
                style={{
                  fontWeight: 700,
                  color: accentColor,
                  fontSize: 34,
                  letterSpacing: "0.005em",
                  verticalAlign: "baseline",
                }}
              >
                {courseTitle.toLowerCase()}
              </strong>
              , de prática em turma online do 1º ano do ensino médio na escola sebrae.
              {courseSubtitle ? ` ${courseSubtitle.toLowerCase()}.` : ""}
            </p>

            {/* metadados inline */}
            <div
              className="font-body uppercase"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                gap: 20,
                fontSize: 16,
                letterSpacing: "0.24em",
                color: "rgba(9,9,9,0.62)",
                fontWeight: 600,
                marginTop: 6,
                width: "100%",
              }}
            >
              <span>guiado por {professorName.toLowerCase()}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{dateLabel}</span>
            </div>
          </div>

          {/* rodapé assinatura NachesU + Sebrae */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 28,
              paddingTop: 24,
              borderTop: "1px solid rgba(9,9,9,0.14)",
            }}
          >
            <span
              className="font-display uppercase"
              style={{
                fontSize: 20,
                letterSpacing: "0.08em",
                color: "#090909",
                textAlign: "center",
              }}
            >
              uma realização naches · em parceria com escola sebrae
            </span>
          </div>
        </div>
      </div>
    );
  },
);

NachesCertificate.displayName = "NachesCertificate";

export const NACHES_CERTIFICATE_DIMENSIONS = { width: 1414, height: 1000 };
