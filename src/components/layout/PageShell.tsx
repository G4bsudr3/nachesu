import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EletivaStar } from "@/components/brand/EletivaStar";

type Variant = "bege" | "gradient";
type MaxWidth = "narrow" | "default" | "wide" | "full";

interface PageShellProps {
  children: ReactNode;
  variant?: Variant;
  /** estrela decorativa contida em wrapper local com overflow-hidden. nunca extrapola. */
  decorStar?: boolean;
  decorStarColor?: "rosa" | "preta" | "bege" | "branca";
  className?: string;
  /** largura máxima do conteúdo principal. default = container tailwind. */
  maxWidth?: MaxWidth;
}

const maxWidthClass: Record<MaxWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-screen-xl",
  wide: "max-w-screen-2xl",
  full: "",
};

/**
 * shell padrão de toda page do hub. usa sempre min-h-dvh (cobre barra de URL no mobile),
 * overflow-x-clip local, padding seguro e safe-area-insets pra notch iOS.
 *
 * uso:
 *   <PageShell decorStar>
 *     <PageShell.Inner>...header, sections, footer...</PageShell.Inner>
 *   </PageShell>
 *
 * regras (mem://design/responsive-rules):
 * - toda page nova usa este shell. não criar wrapper manual.
 * - nunca usar overflow-hidden no body (vira ancestral de sticky).
 * - decoração absolute fica neste wrapper, com overflow-hidden local.
 */
export const PageShell = ({
  children,
  variant = "bege",
  decorStar = false,
  decorStarColor = "rosa",
  className,
  maxWidth = "default",
}: PageShellProps) => {
  const bgClass =
    variant === "gradient"
      ? "bg-gradient-screen text-perestroika-preto"
      : "bg-perestroika-bege text-perestroika-preto";

  return (
    <div
      className={cn(
        "relative min-h-dvh font-body",
        bgClass,
        // overflow-x: clip local. não cria contexto de scroll, mas contém a estrela.
        "[overflow-x:clip]",
        // safe areas iOS
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      {decorStar && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [overflow:hidden]"
        >
          <EletivaStar
            color={decorStarColor}
            size={360}
            className="absolute -right-32 -bottom-32 opacity-25 motion-safe:animate-spin-slow sm:!w-[480px] lg:!w-[620px]"
          />
        </div>
      )}
      <div className={cn("relative z-10", maxWidth !== "full" && "mx-auto", maxWidthClass[maxWidth])}>
        {children}
      </div>
    </div>
  );
};
