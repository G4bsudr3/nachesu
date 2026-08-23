import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface EletivaFooterProps {
  className?: string;
  /** variante de cor da copy. default "muted". */
  tone?: "muted" | "light" | "dark";
}

/**
 * rodapé padrão da eletiva sebrae. centraliza a assinatura
 * institucional que antes vivia hardcoded em ~6 páginas.
 *
 * uso: <EletivaFooter /> dentro do container da página, normalmente
 * logo antes do </main> ou </div> raiz.
 */
export const EletivaFooter = ({ className, tone = "muted" }: EletivaFooterProps) => {
  const toneClass =
    tone === "light"
      ? "text-brand-bege/70"
      : tone === "dark"
        ? "text-brand-preto/60"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "w-full flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 font-body uppercase text-[9px] sm:text-[11px] tracking-[0.2em] sm:tracking-[0.2em] leading-relaxed text-center mt-8 mb-6",
        toneClass,
        className,
      )}
    >
      <span className="whitespace-nowrap">nachesu</span>
      <span aria-hidden className="opacity-50">·</span>
      <span className="whitespace-nowrap">uma plataforma naches</span>
      <span aria-hidden className="opacity-50">·</span>
      <span className="whitespace-nowrap">em parceria com escola sebrae</span>
      <span aria-hidden className="opacity-50">·</span>
      <Link to="/privacidade" className="whitespace-nowrap underline underline-offset-2 hover:opacity-80">
        privacidade
      </Link>
      <span aria-hidden className="opacity-50">·</span>
      <Link to="/termos" className="whitespace-nowrap underline underline-offset-2 hover:opacity-80">
        termos
      </Link>
    </div>
  );
};
