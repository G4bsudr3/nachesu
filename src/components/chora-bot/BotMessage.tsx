import ReactMarkdown from "react-markdown";
import { BotAvatar } from "./BotAvatar";
import { LagrimaGradient } from "@/components/brand/LagrimaGradient";

interface BotMessageProps {
  content: string;
  streaming?: boolean;
}

/**
 * balão do assistant — avatar circular à esquerda + bloco de markdown
 * com borda esquerda gradient perestroika (pequeno toque que amarra a marca).
 */
export const BotMessage = ({ content, streaming = false }: BotMessageProps) => {
  return (
    <div className="flex gap-3 items-start">
      <BotAvatar size={36} ring={false} />
      <div
        className="flex-1 min-w-0 rounded-2xl bg-perestroika-bege px-4 py-3 relative"
        style={{
          boxShadow: "0 1px 0 rgba(9,9,9,0.04)",
          borderLeft: "3px solid transparent",
          backgroundImage:
            "linear-gradient(hsl(35 47% 90% / 0.5), hsl(35 47% 90% / 0.5)), linear-gradient(180deg, #fe7b02, #fd4644, #f756a6, #6f77fc)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}
      >
        {content ? (
          <div className="prose prose-sm max-w-none font-body text-perestroika-preto prose-p:my-1.5 prose-headings:font-display prose-headings:uppercase prose-headings:tracking-wide prose-pre:bg-perestroika-preto prose-pre:text-perestroika-bege prose-code:text-perestroika-vermelho prose-strong:text-perestroika-preto">
            <ReactMarkdown>{content}</ReactMarkdown>
            {streaming && (
              <span className="inline-flex items-center align-middle ml-1">
                <LagrimaGradient size={12} className="motion-safe:animate-pulse" />
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <LagrimaGradient size={14} className="motion-safe:animate-pulse" />
            <span className="text-xs font-body text-perestroika-preto/50 italic">
              pensando...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
