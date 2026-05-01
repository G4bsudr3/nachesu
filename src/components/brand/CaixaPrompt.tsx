import { ReactNode } from "react";
import caixaPrompt from "@/assets/brand/caixa-prompt.svg";

interface CaixaPromptProps {
  children?: ReactNode;
  placeholder?: string;
  className?: string;
}

/**
 * caixa de prompt — referência visual ao input do lovable, agora usando
 * o svg oficial da idv perestroika (caixa-prompt.svg) como fundo.
 * o svg já traz o retângulo, o ícone "+" à esquerda e a seta "↑" à direita.
 */
export const CaixaPrompt = ({ children, placeholder, className }: CaixaPromptProps) => {
  return (
    <div className={`relative w-full ${className ?? ""}`}>
      {/* svg oficial define a proporção (1198.96 x 344.35 ≈ 3.48:1) */}
      <img
        src={caixaPrompt}
        alt=""
        aria-hidden="true"
        className="w-full h-auto block select-none pointer-events-none"
      />
      {/* área de texto sobreposta — respeita os controles laterais do svg */}
      <div className="absolute inset-0 flex items-start pt-[8%] sm:pt-[7%] pl-[6%] pr-[6%] pb-[18%]">
        <div className="font-body text-perestroika-bege text-sm sm:text-base md:text-lg leading-snug opacity-90 w-full">
          {children ?? (
            <span className="opacity-60">{placeholder ?? "descreva o que você quer criar..."}</span>
          )}
        </div>
      </div>
    </div>
  );
};
