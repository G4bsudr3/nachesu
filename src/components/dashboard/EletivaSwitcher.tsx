import { useMyEnrollments } from "@/hooks/useCourses";
import { useActiveEletiva } from "@/hooks/useActiveEletiva";
import { Check } from "lucide-react";

/**
 * Switcher mobile-first pra alternar a eletiva ativa quando o aluno
 * está matriculado em mais de uma. Pills horizontais com accent-bar
 * por eletiva. No desktop vira um segmented control discreto.
 *
 * Toque atualiza `useActiveEletiva` (localStorage) e o dashboard +
 * /app/eletiva re-renderizam automaticamente com o snapshot da nova ativa.
 */
export const EletivaSwitcher = ({ className = "" }: { className?: string }) => {
  const { data: enrollments } = useMyEnrollments();
  const { slug: activeSlug, setSlug } = useActiveEletiva();

  const items = (enrollments ?? []).filter((e) => e.course);
  if (items.length < 2) return null;

  // se não tem slug ativa, considera a primeira matrícula
  const effectiveActive = activeSlug ?? items[0].course!.slug;

  return (
    <div
      role="tablist"
      aria-label="alternar eletiva ativa"
      className={`flex w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible ${className}`}
    >
      {items.map((e) => {
        const c = e.course!;
        const accent =
          (c.theme && typeof c.theme === "object" && (c.theme as any).accent) ||
          "#6f77fc";
        const isActive = effectiveActive === c.slug;
        return (
          <button
            key={e.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => setSlug(c.slug)}
            className={`group relative shrink-0 inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-xs sm:text-sm uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto focus-visible:ring-offset-2 focus-visible:ring-offset-perestroika-bege ${
              isActive
                ? "border-perestroika-preto bg-perestroika-preto text-perestroika-bege"
                : "border-perestroika-preto/15 bg-white/60 text-perestroika-preto/75 hover:border-perestroika-preto/40 hover:text-perestroika-preto"
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">{c.title.toLowerCase()}</span>
            {isActive && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
};
