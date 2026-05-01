import { ReactNode } from "react";
import balaoSerrado from "@/assets/brand/balao-serrado.svg";

interface BalaoSerradoProps {
  children: ReactNode;
  className?: string;
}

/**
 * balão serrado / starburst horizontal — usa o svg oficial da idv perestroika
 * (balao-serrado.svg) como fundo e sobrepõe o texto centralizado em league gothic.
 */
export const BalaoSerrado = ({ children, className }: BalaoSerradoProps) => {
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <img
        src={balaoSerrado}
        alt=""
        aria-hidden="true"
        className="w-full h-auto block select-none pointer-events-none"
      />
      <div className="absolute inset-0 flex items-center justify-center px-[12%]">
        <span className="font-display text-perestroika-bege uppercase tracking-wide text-2xl sm:text-4xl md:text-5xl text-center leading-none">
          {children}
        </span>
      </div>
    </div>
  );
};
