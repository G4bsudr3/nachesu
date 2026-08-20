import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { levelLabel, levelToneClass, type BuilderLevel } from "@/lib/builderLevel";

export type TrailStage = "fbi" | "carta" | "prework" | "tutorial" | "missoes";
export type StageProgress = "done" | "current" | "todo";

const STAGES: { id: TrailStage; label: string; href: string }[] = [
  { id: "fbi", label: "fbi", href: "/forms" },
  { id: "carta", label: "carta", href: "/app/carta" },
  { id: "prework", label: "pré-work", href: "/app/prework" },
  { id: "tutorial", label: "tutorial", href: "/app/tutorial" },
  { id: "missoes", label: "exercícios", href: "/app/missoes" },
];

interface Props {
  current: TrailStage;
  /** mapa opcional de estado por stage; se omitido, só destaca o `current` */
  progress?: Partial<Record<TrailStage, StageProgress>>;
  /** nível do builder, opcional. se passado, renderiza chip antes da trilha. */
  level?: BuilderLevel;
}

export const TrailBreadcrumb = ({ current, progress, level }: Props) => {
  const navRef = useRef<HTMLElement>(null);

  // auto-scroll a stage ativa pra o centro no mobile, pra usuário sempre saber onde está
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [current]);

  return (
    <div className="flex flex-wrap items-center gap-2 max-w-full">
      {level && (
        <span
          className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] uppercase tracking-wide font-body ${levelToneClass(level)}`}
          title={`sua trilha: ${levelLabel(level)}`}
        >
          trilha {levelLabel(level)}
        </span>
      )}
    <div className="relative max-w-full min-w-0 flex-1 sm:flex-initial">
      {/* fade lateral indicando scroll horizontal no mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:hidden bg-gradient-to-l from-perestroika-bege via-perestroika-bege/80 to-transparent z-10 rounded-r-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-6 sm:hidden bg-gradient-to-r from-perestroika-bege to-transparent z-10 rounded-l-full"
      />
      <nav
        ref={navRef}
        aria-label="trilha"
        className="inline-flex items-center gap-0.5 sm:gap-1.5 rounded-full bg-perestroika-preto/[0.04] border border-perestroika-preto/10 p-1 max-w-full overflow-x-auto scroll-smooth snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >

        {STAGES.map((s) => {
          const isActive = s.id === current;
          const state = progress?.[s.id] ?? (isActive ? "current" : "todo");
          const isDone = state === "done";
          return (
            <Link
              key={s.id}
              to={s.href}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 snap-start inline-flex items-center gap-1 sm:gap-1.5 min-h-9 px-2.5 sm:px-4 rounded-full font-body text-[10px] sm:text-xs uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-1 focus-visible:ring-offset-perestroika-bege ${
                isActive
                  ? "bg-perestroika-preto text-perestroika-bege"
                  : isDone
                    ? "text-perestroika-preto hover:bg-perestroika-preto/[0.06]"
                    : "text-perestroika-preto/55 hover:text-perestroika-preto hover:bg-perestroika-preto/[0.04]"
              }`}
            >
              {isDone && !isActive && <Check className="h-3 w-3" aria-hidden="true" />}
              {s.label}
            </Link>
          );
        })}
      </nav>
    </div>
    </div>
  );
};
