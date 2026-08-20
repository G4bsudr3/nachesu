import { Clock } from "lucide-react";

/**
 * padrão único de tempo de leitura/duração nas duas eletivas.
 * referência visual: card de conteúdo curado (relógio 3x3 + texto uppercase 11px).
 *
 * - variant "inline": meta discreta dentro de cards e cabeçalhos de bloco
 * - variant "chip": pílula com fundo, usada na ficha técnica do módulo
 */
export type DuracaoBadgeVariant = "inline" | "chip";

interface DuracaoBadgeProps {
  /** texto já formatado, ex: "4 min", "8-12 min" */
  children: React.ReactNode;
  variant?: DuracaoBadgeVariant;
  /** reduz o contraste para conteúdos opcionais/bônus */
  muted?: boolean;
  className?: string;
  title?: string;
}

const base =
  "inline-flex min-w-0 items-center gap-1 font-body text-[11px] uppercase tracking-wider";

export const DuracaoBadge = ({
  children,
  variant = "inline",
  muted = false,
  className = "",
  title,
}: DuracaoBadgeProps) => {
  const tone = muted ? "text-perestroika-preto/40" : "text-perestroika-preto/55";
  const shape =
    variant === "chip"
      ? "rounded-full bg-perestroika-preto/10 px-3 py-1.5 gap-1.5 text-xs text-perestroika-preto"
      : tone;

  return (
    <span className={`${base} ${shape} ${className}`} title={title}>
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
};

/** formata faixa de minutos no padrão único: "8 min" ou "8-12 min" */
export const formatDuracao = (low?: number | null, high?: number | null) => {
  if (low == null && high == null) return null;
  if (low == null) return `${high} min`;
  if (high == null || high === low) return `${low} min`;
  return `${low}-${high} min`;
};

export default DuracaoBadge;
