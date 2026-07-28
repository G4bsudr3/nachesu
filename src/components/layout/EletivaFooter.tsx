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
    <p
      className={cn(
        "text-center text-[10px] sm:text-xs font-body uppercase tracking-[0.14em] sm:tracking-[0.18em] leading-relaxed px-4 text-balance",
        toneClass,
        className,
      )}
    >
      NACHESU · UMA PLATAFORMA NACHES · EM PARCERIA COM ESCOLA SEBRAE
    </p>
  );
};
