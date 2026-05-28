import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface PillCTAProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  /** cor da trilha quando o botão está ativo */
  accent: string;
  /** label exibido junto da microcopy condicional */
  children: ReactNode;
  /** ícone à direita (opcional) */
  endIcon?: ReactNode;
  /** mensagem de fricção exibida ao lado quando disabled (não-completed) */
  helper?: string;
}

/**
 * CTA padrão das pílulas: quando desabilitado fica visualmente "apagado"
 * (cinza neutro + cursor not-allowed) ao invés de manter a cor da trilha
 * com opacidade reduzida — que confundia o estudante achando que dava clique.
 */
export const PillCTA = forwardRef<HTMLButtonElement, PillCTAProps>(
  ({ accent, children, endIcon, helper, disabled, className, ...rest }, ref) => {
    const isDisabled = !!disabled;
    return (
      <div className="flex w-full items-center justify-between gap-3 pt-2">
        <p className="font-body text-xs text-perestroika-preto/55 min-w-0">
          {isDisabled && helper ? helper : "\u00a0"}
        </p>
        <button
          ref={ref}
          type="button"
          disabled={isDisabled}
          aria-disabled={isDisabled}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-body font-medium text-sm uppercase tracking-wide transition-transform ${
            isDisabled
              ? "bg-perestroika-preto/15 text-perestroika-preto/45 cursor-not-allowed"
              : "text-perestroika-bege hover:scale-105 active:scale-95"
          } ${className ?? ""}`}
          style={isDisabled ? undefined : { backgroundColor: accent }}
          {...rest}
        >
          {children}
          {!isDisabled && endIcon}
        </button>
      </div>
    );
  },
);
PillCTA.displayName = "PillCTA";
