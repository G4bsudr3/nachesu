import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Search, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AuthedHeaderActions } from "@/components/layout/AuthedHeaderActions";
import { EletivaFooter } from "@/components/layout/EletivaFooter";
import { useUrlState } from "@/hooks/useUrlState";
import { cn } from "@/lib/utils";
import {
  GLOSSARIO,
  TAG_COLOR,
  TAG_LABEL,
  filtrarGlossario,
  inicial,
  type GlossarioTag,
  type GlossarioTermo,
} from "@/data/glossario";

const FILTROS: { value: GlossarioTag | "todas"; label: string }[] = [
  { value: "todas", label: "todas" },
  { value: "ia", label: "ia na prática" },
  { value: "circular", label: "economia circular" },
];

const TermoCard = ({ t }: { t: GlossarioTermo }) => (
  <li className="rounded-2xl border border-perestroika-preto/12 bg-perestroika-bege p-4 sm:p-5">
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <h3 className="font-display uppercase text-xl sm:text-2xl leading-none">{t.termo}</h3>
      <div className="flex flex-wrap gap-1.5">
        {t.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] uppercase tracking-[0.14em]"
            style={{ backgroundColor: `${TAG_COLOR[tag]}22`, color: TAG_COLOR[tag] }}
          >
            {TAG_LABEL[tag]}
          </span>
        ))}
      </div>
    </div>
    <p className="mt-2 font-body text-sm sm:text-base leading-relaxed text-perestroika-preto/80">
      {t.definicao}
    </p>
  </li>
);

const Glossario = () => {
  const [query, setQuery] = useUrlState("q");
  const [tagParam, setTag] = useUrlState("eletiva", "todas");
  const tag = (["ia", "circular"].includes(tagParam) ? tagParam : "todas") as GlossarioTag | "todas";

  const resultados = useMemo(() => filtrarGlossario(GLOSSARIO, query, tag), [query, tag]);

  const grupos = useMemo(() => {
    const map = new Map<string, GlossarioTermo[]>();
    for (const t of resultados) {
      const letra = inicial(t.termo);
      const atual = map.get(letra);
      if (atual) atual.push(t);
      else map.set(letra, [t]);
    }
    return [...map.entries()];
  }, [resultados]);

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        back={{ to: "/app", label: "voltar" }}
        actions={<AuthedHeaderActions />}
      />

      <main className="container max-w-3xl py-8 sm:py-12">
        <header className="mb-8">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            glossário
          </p>
          <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-7xl">
            palavra que<br />se repete
          </h1>
          <p className="mt-4 max-w-xl font-body text-base text-perestroika-preto/75 sm:text-lg">
            as palavras que mais aparecem nas aulas, explicadas em uma frase.
          </p>
        </header>

        {/* busca */}
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-perestroika-preto/45"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="busque um termo, tipo prompt ou 6 r's"
            aria-label="buscar termo no glossário"
            className="w-full min-h-12 rounded-full border-2 border-perestroika-preto/15 bg-transparent pl-11 pr-11 font-body text-sm sm:text-base placeholder:text-perestroika-preto/40 focus:border-perestroika-preto focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="limpar busca"
              className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-perestroika-preto/55 hover:text-perestroika-preto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* filtro por eletiva */}
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="filtrar por eletiva">
          {FILTROS.map((f) => {
            const active = f.value === tag;
            const color = f.value === "todas" ? undefined : TAG_COLOR[f.value];
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setTag(f.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border-2 px-4 font-body text-xs uppercase tracking-[0.14em] transition-colors touch-manipulation",
                  active
                    ? "border-transparent text-perestroika-bege"
                    : "border-perestroika-preto/15 text-perestroika-preto/70 hover:border-perestroika-preto/40",
                )}
                style={active ? { backgroundColor: color ?? "#090909" } : undefined}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <p className="mb-6 font-body text-xs uppercase tracking-[0.18em] text-perestroika-preto/50">
          {resultados.length === 1 ? "1 termo" : `${resultados.length} termos`}
        </p>

        {resultados.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-perestroika-preto/20 p-8 text-center">
            <p className="font-display uppercase text-2xl leading-tight">não achei esse termo</p>
            <p className="mx-auto mt-2 max-w-sm font-body text-sm text-perestroika-preto/70">
              pode ser que ele apareça com outro nome nas aulas. pergunta pro tutor, ele responde com o
              contexto do seu módulo.
            </p>
            <Link
              to="/app/tutor"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-perestroika-preto px-5 font-body text-sm uppercase tracking-wide text-perestroika-bege hover:scale-105 transition-transform"
            >
              <MessageCircle className="h-4 w-4" /> perguntar pro tutor
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {grupos.map(([letra, itens]) => (
              <section key={letra} aria-label={`termos com ${letra}`}>
                <h2 className="mb-3 font-display uppercase text-3xl leading-none text-perestroika-preto/25">
                  {letra}
                </h2>
                <ul className="space-y-3">
                  {itens.map((t) => (
                    <TermoCard key={t.termo} t={t} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <EletivaFooter />
    </div>
  );
};

export default Glossario;
