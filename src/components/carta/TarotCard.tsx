import { forwardRef } from "react";
import { ARCHETYPE_TOKENS, getArchetypeView, type Archetype } from "./cartaTokens";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import type { Gender } from "@/lib/gender";
import { firstNameDisplay } from "@/lib/gender";

export interface TarotCardProps {
  /** ilustração radiante 3:4 gerada pela edge function */
  imageUrl?: string | null;
  /** nome do builder no header (uppercase). Pode ser nickname ou nome completo —
   * o componente extrai o primeiro nome se vier completo. */
  nickname?: string | null;
  /** arquétipo — drives footer text + tagline */
  archetype: Archetype;
  /** gênero pra flexão dos labels (default neutro = masculino genérico) */
  gender?: Gender;
  /** tamanho visual */
  size?: "hero" | "thumb" | "export";
  /** rotação leve pra layouts dinâmicos */
  tilt?: boolean;
  /** ativa hover (scale + glow) */
  interactive?: boolean;
  /** classe adicional */
  className?: string;
}

/**
 * Carta de tarot do builder. Moldura branca, header com primeiro nome/nickname,
 * ilustração radiante no centro (3:4 do artwork), footer com arquétipo flexionado + tagline.
 */
export const TarotCard = forwardRef<HTMLDivElement, TarotCardProps>(
  (
    { imageUrl, nickname, archetype, gender = "n", size = "hero", tilt = false, interactive = false, className = "" },
    ref,
  ) => {
    const tokens = ARCHETYPE_TOKENS[archetype];
    const view = getArchetypeView(archetype, gender);

    // header sempre primeiro nome (ou nickname se for curto), nunca nome completo gigante
    const raw = (nickname ?? "").trim();
    const headerName = raw.includes(" ") ? firstNameDisplay(raw) : raw || "builder";
    const displayNick = headerName.toUpperCase().slice(0, 16);

    const sizing =
      size === "export"
        ? { width: 1080, padding: 60, headerSize: 36, footerTitleSize: 64, footerTaglineSize: 26, radius: 48 }
        : size === "thumb"
        ? { width: 220, padding: 14, headerSize: 11, footerTitleSize: 18, footerTaglineSize: 9, radius: 16 }
        : { width: 360, padding: 22, headerSize: 14, footerTitleSize: 28, footerTaglineSize: 12, radius: 24 };

    const tiltStyle = tilt ? { transform: "rotate(-3deg)" } : undefined;
    const interactiveCls = interactive
      ? "transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_30px_80px_-20px_rgba(247,86,166,0.5)]"
      : "";

    return (
      <div
        ref={ref}
        className={`relative ${interactiveCls} ${className}`}
        style={{
          width: size === "export" ? sizing.width : "100%",
          maxWidth: size === "export" ? sizing.width : sizing.width,
          aspectRatio: "1080 / 1350",
          ...tiltStyle,
        }}
      >
        {interactive && (
          <div
            className="absolute -inset-4 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, hsl(330 89% 65% / 0.4), hsl(232 95% 71% / 0.3), transparent 70%)",
            }}
          />
        )}

        <div
          className="relative h-full w-full bg-perestroika-bege flex flex-col"
          style={{
            padding: sizing.padding,
            borderRadius: sizing.radius,
            boxShadow:
              size === "hero" || size === "export"
                ? "0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
                : "0 10px 30px -10px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="flex items-center justify-between gap-2 font-display uppercase tracking-[0.2em] text-perestroika-preto"
            style={{ fontSize: sizing.headerSize, marginBottom: sizing.padding * 0.6 }}
          >
            <span className="truncate">{displayNick}</span>
            <span className="opacity-60 shrink-0">{tokens.numero}</span>
          </div>

          <div
            className="relative flex-1 overflow-hidden bg-perestroika-preto"
            style={{ borderRadius: sizing.radius * 0.5 }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`artwork ${view.label}`}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 40%, hsl(330 89% 65%), hsl(232 95% 71%) 40%, hsl(0 98% 63%) 80%)",
                }}
              />
            )}
          </div>

          <div
            className="flex flex-col items-center text-center text-perestroika-preto"
            style={{ marginTop: sizing.padding * 0.6, gap: sizing.padding * 0.15 }}
          >
            <div
              className="flex items-center gap-2 font-display uppercase leading-none"
              style={{ fontSize: sizing.footerTitleSize }}
            >
              <span className={tokens.gradient?.text}>{view.displayName}</span>
              <LagrimaGradient size={sizing.footerTitleSize * 0.7} />
            </div>
            <p
              className="font-body italic opacity-70"
              style={{ fontSize: sizing.footerTaglineSize }}
            >
              {view.tagline}
            </p>
          </div>
        </div>
      </div>
    );
  },
);

TarotCard.displayName = "TarotCard";
