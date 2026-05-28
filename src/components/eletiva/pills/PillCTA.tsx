import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

interface PillCTAProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  accent: string;
  children: ReactNode;
  endIcon?: ReactNode;
}

/**
 * CTA padrão das pílulas. Quando disabled fica visualmente apagado
 * (cinza neutro + cursor not-allowed) em vez de manter a cor da trilha
 * com opacity-50, padrão que confundia o estudante (clicava e nada).
 */
export const PillCTA = forwardRef<HTMLButtonElement, PillCTAProps>(
  ({ accent, children, endIcon, disabled, className, ...rest }, ref) => {
    const isDisabled = !!disabled;
    return (
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
    );
  },
);
PillCTA.displayName = "PillCTA";
