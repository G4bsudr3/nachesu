import lagrimaUrl from "@/assets/brand/lagrima.svg";

interface LagrimaGradientProps {
  size?: number;
  className?: string;
  rotate?: number;
}

/**
 * lágrima oficial perestroika com gradiente radial laranja→rosa→azul.
 * usa o svg oficial — não recriar.
 */
export const LagrimaGradient = ({ size = 64, className, rotate = 0 }: LagrimaGradientProps) => {
  return (
    <img
      src={lagrimaUrl}
      alt=""
      aria-hidden="true"
      style={{ width: size, height: "auto", transform: `rotate(${rotate}deg)` }}
      className={`select-none ${className ?? ""}`}
      draggable={false}
    />
  );
};
