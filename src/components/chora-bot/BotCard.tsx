import { LagrimaGradient } from "@/components/brand/LagrimaGradient";
import { botAvatar } from "./botAvatar";

interface BotCardProps {
  /** escala visual do card */
  size?: "hero" | "compact";
  /** rotação leve pra dar movimento */
  tilt?: boolean;
  className?: string;
}

/**
 * carta-arquétipo do chora bot, no mesmo padrão das cartas de tarot do builder.
 * usada na sala vazia como hero — apresenta o bot como "o sétimo arquétipo, o guia".
 */
export const BotCard = ({ size = "hero", tilt = false, className = "" }: BotCardProps) => {
  const sizing =
    size === "hero"
      ? { width: 320, padding: 20, headerSize: 12, footerTitleSize: 28, footerTaglineSize: 11, radius: 24 }
      : { width: 200, padding: 12, headerSize: 9, footerTitleSize: 18, footerTaglineSize: 8, radius: 16 };

  return (
    <div
      className={`relative ${className}`}
      style={{
        width: "100%",
        maxWidth: sizing.width,
        aspectRatio: "1080 / 1350",
        transform: tilt ? "rotate(-2deg)" : undefined,
      }}
    >
      <div
        className="relative h-full w-full bg-perestroika-bege flex flex-col"
        style={{
          padding: sizing.padding,
          borderRadius: sizing.radius,
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {/* header */}
        <div
          className="flex items-center justify-between gap-2 font-display uppercase tracking-[0.2em] text-perestroika-preto"
          style={{ fontSize: sizing.headerSize, marginBottom: sizing.padding * 0.6 }}
        >
          <span className="truncate">chŏra bot</span>
          <span className="opacity-60 shrink-0">VII</span>
        </div>

        {/* artwork */}
        <div
          className="relative flex-1 overflow-hidden bg-perestroika-bege"
          style={{ borderRadius: sizing.radius * 0.5 }}
        >
          <img
            src={botAvatar}
            alt="ilustração do tutor IA"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        </div>

        {/* footer */}
        <div
          className="flex flex-col items-center text-center text-perestroika-preto"
          style={{ marginTop: sizing.padding * 0.6, gap: sizing.padding * 0.15 }}
        >
          <div
            className="flex items-center gap-2 font-display uppercase leading-none"
            style={{ fontSize: sizing.footerTitleSize }}
          >
            <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#fe7b02_0%,#fd4644_30%,#f756a6_60%,#6f77fc_100%)]">
              o guia
            </span>
            <LagrimaGradient size={sizing.footerTitleSize * 0.7} />
          </div>
          <p
            className="font-body italic opacity-70"
            style={{ fontSize: sizing.footerTaglineSize }}
          >
            tira tua dúvida, eu lembro do que rolou.
          </p>
        </div>
      </div>
    </div>
  );
};
