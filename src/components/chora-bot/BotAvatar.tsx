import { botAvatar } from "./botAvatar";

interface BotAvatarProps {
  /** tamanho em px do círculo */
  size?: number;
  /** mostra anel gradient perestroika ao redor */
  ring?: boolean;
  /** anima o anel girando devagar (respeita prefers-reduced-motion) */
  spin?: boolean;
  className?: string;
}

/**
 * avatar circular do chora bot. usado em FAB, header, balões de mensagem.
 * o anel é um pseudo-elemento gradient que pode girar.
 */
export const BotAvatar = ({ size = 48, ring = true, spin = false, className = "" }: BotAvatarProps) => {
  const ringPad = ring ? Math.max(2, Math.round(size * 0.06)) : 0;
  const inner = size - ringPad * 2;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {ring && (
        <div
          className={`absolute inset-0 rounded-full ${spin ? "motion-safe:animate-[spin_8s_linear_infinite]" : ""}`}
          style={{
            background:
              "conic-gradient(from 0deg, #fe7b02, #fd4644, #f756a6, #6f77fc, #fe7b02)",
          }}
        />
      )}
      <div
        className="absolute rounded-full overflow-hidden bg-perestroika-bege"
        style={{
          inset: ringPad,
          width: inner,
          height: inner,
        }}
      >
        <img
          src={botAvatar}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>
    </div>
  );
};
