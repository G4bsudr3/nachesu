import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Sparkles, ExternalLink, BarChart3, Camera } from "lucide-react";
import { ChoraLogo } from "@/components/brand/ChoraLogo";
import { PageHeader } from "@/components/layout/PageHeader";
import { useHubGallery, type HubBuilder, type Archetype } from "@/features/hub/useHubGallery";
import { useHubInsights } from "@/features/hub/useHubInsights";
import { useFbiLevels, LEVEL_LABELS } from "@/features/hub/useFbiLevels";
import { ARCHETYPE_TOKENS } from "@/components/carta/cartaTokens";
import { BuilderQuickView } from "@/components/hub/BuilderQuickView";

const ARCHETYPE_ORDER: Archetype[] = [
  "visionario",
  "artesao",
  "experimentador",
  "conector",
  "pragmatico",
  "narrador",
];

const PAGE_SIZE = 12;

const useDebounced = <T,>(value: T, delay = 300): T => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

interface CardProps {
  b: HubBuilder;
  onOpen: (b: HubBuilder) => void;
  theme: string | null;
  level: string | null;
}

const GalleryCard = ({ b, onOpen, theme, level }: CardProps) => {
  const tokens = b.archetype ? ARCHETYPE_TOKENS[b.archetype] : null;
  const label = tokens?.labels.m ?? "builder";
  const displayName = b.nickname || b.display_name || "builder";
  const levelLabel = level ? LEVEL_LABELS[level] : null;

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(b)}
        aria-label={`abrir carta de ${displayName}`}
        className="relative flex w-full flex-col overflow-hidden rounded-3xl border border-perestroika-preto/10 bg-perestroika-bege/40 text-left transition-all hover:-translate-y-1 hover:border-perestroika-preto/30 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perestroika-preto"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-perestroika-preto/5">
          {b.image_url ? (
            <img
              src={b.image_url}
              alt={`carta de ${displayName}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-perestroika-preto/30">
              <Sparkles className="h-12 w-12" />
            </div>
          )}
          {b.total_reactions > 0 && (
            <div className="absolute right-3 top-3 rounded-full bg-perestroika-preto/80 px-2.5 py-1 font-body text-xs text-perestroika-bege backdrop-blur">
              🔥 {b.total_reactions}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-2xl uppercase leading-none">{displayName}</h3>
            {b.emoji && <span className="text-xl">{b.emoji}</span>}
          </div>
          {tokens && (
            <p className={`font-body text-[11px] uppercase tracking-[0.15em] ${tokens.text}`}>
              {label}
            </p>
          )}
          {(theme || levelLabel) && (
            <div className="flex flex-wrap gap-1.5">
              {theme && (
                <span className="rounded-full bg-perestroika-preto/8 px-2 py-0.5 font-body text-[10px] lowercase text-perestroika-preto/75">
                  {theme}
                </span>
              )}
              {levelLabel && (
                <span className="rounded-full border border-perestroika-preto/20 px-2 py-0.5 font-body text-[10px] lowercase text-perestroika-preto/60">
                  {levelLabel}
                </span>
              )}
            </div>
          )}
          <p className="line-clamp-2 font-body text-sm text-perestroika-preto/70">
            {b.has_project && b.project_preview
              ? b.project_preview
              : <span className="italic text-perestroika-preto/50">ainda construindo</span>}
          </p>
        </div>
      </button>

      {/* link discreto pra abrir perfil completo direto (acessibilidade + middle-click) */}
      <Link
        to={`/app/hub/builder/${b.slug}`}
        onClick={(e) => e.stopPropagation()}
        aria-label={`abrir perfil de ${displayName} em página inteira`}
        className="absolute right-3 bottom-3 rounded-full bg-perestroika-preto/70 p-1.5 text-perestroika-bege opacity-0 backdrop-blur transition-opacity hover:bg-perestroika-preto group-hover:opacity-100 focus-visible:opacity-100"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
};

interface TurmaCTAProps {
  total: number;
  topThemes: { theme: string; count: number }[] | null;
  cityCount: number | null;
  hasInsights: boolean;
}

const TurmaCTACard = ({ total, topThemes, cityCount, hasInsights }: TurmaCTAProps) => {
  return (
    <Link
      to="/app/hub/turma"
      className="group relative mb-8 block overflow-hidden rounded-3xl border border-perestroika-preto/15 bg-perestroika-bege/50 p-5 sm:p-6 transition-all hover:-translate-y-0.5 hover:border-perestroika-preto/40 hover:shadow-xl"
    >
      {/* gradient stripe topo */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background:
            "linear-gradient(90deg, #fe7b02 0%, #fd4644 30%, #f756a6 60%, #6f77fc 100%)",
        }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-perestroika-preto/70" />
            <p className="font-body text-[10px] uppercase tracking-[0.25em] text-perestroika-preto/60">
              análise da turma
            </p>
          </div>
          <h2 className="font-display text-3xl uppercase leading-none sm:text-4xl">
            quem é essa turma?
          </h2>
          <p className="mt-2 max-w-md font-body text-sm text-perestroika-preto/70">
            {hasInsights
              ? "ia leu todos os fbis e cartas pra te dar o panorama e sugerir gente pra tu conversar."
              : "panorama dos arquétipos, temas e sugestões de match. logo logo a ia processa a turma toda."}
          </p>

          {hasInsights && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-perestroika-preto/8 px-2.5 py-1 font-body text-[11px] lowercase text-perestroika-preto/80">
                {total} builders
              </span>
              {topThemes?.slice(0, 3).map((t) => (
                <span
                  key={t.theme}
                  className="rounded-full bg-perestroika-preto/8 px-2.5 py-1 font-body text-[11px] lowercase text-perestroika-preto/80"
                >
                  {t.theme} <span className="text-perestroika-preto/50">{t.count}</span>
                </span>
              ))}
              {cityCount !== null && cityCount > 0 && (
                <span className="rounded-full bg-perestroika-preto/8 px-2.5 py-1 font-body text-[11px] lowercase text-perestroika-preto/80">
                  {cityCount} cidades
                </span>
              )}
            </div>
          )}
        </div>

        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-perestroika-preto bg-perestroika-preto px-4 py-2.5 font-body text-xs uppercase tracking-wide text-perestroika-bege transition-colors group-hover:bg-transparent group-hover:text-perestroika-preto sm:self-center">
          ver panorama <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
};

const HubGallery = () => {
  const { builders, loading, error } = useHubGallery();
  const { byUser: insightsByUser, global } = useHubInsights();
  const { byUser: levelByUser } = useFbiLevels();
  const [query, setQuery] = useState("");
  const [archetypeFilter, setArchetypeFilter] = useState<Archetype | "all">("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<HubBuilder | null>(null);
  const debouncedQuery = useDebounced(query, 300);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return builders.filter((b) => {
      if (archetypeFilter !== "all" && b.archetype !== archetypeFilter) return false;
      if (!q) return true;
      const haystack = `${b.nickname ?? ""} ${b.display_name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [builders, debouncedQuery, archetypeFilter]);

  // reset paginação quando muda filtro/busca
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [debouncedQuery, archetypeFilter]);

  const shown = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;

  return (
    <div className="min-h-dvh bg-perestroika-bege text-perestroika-preto font-body">
      <PageHeader
        showLogo
        logoLink="/app"
        actions={
          <Link
            to="/app/hub"
            className="inline-flex items-center gap-1 font-body text-xs uppercase tracking-wide text-perestroika-preto/60 hover:text-perestroika-preto"
          >
            voltar ao hub
          </Link>
        }
      />

      <main className="container max-w-6xl py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.25em] text-perestroika-preto/60">
            hub · galeria
          </p>
          <h1 className="font-display text-5xl sm:text-7xl uppercase leading-[0.9]">
            quem tá<br />construindo<br />com a gente
          </h1>
          <p className="mt-4 max-w-xl font-body text-base sm:text-lg text-perestroika-preto/75">
            45 cabeças, 6 arquétipos, 2 dias. clica num card pra ver a carta da pessoa, os projetos e deixar tua reação.
          </p>
        </header>

        <TurmaCTACard
          total={builders.length}
          topThemes={global?.aggregates.top_themes ?? null}
          cityCount={global?.aggregates.top_cities?.length ?? null}
          hasInsights={Boolean(global)}
        />

        {/* filtros */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-perestroika-preto/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="busca por nickname"
              className="w-full rounded-full border border-perestroika-preto/15 bg-perestroika-bege/60 py-2.5 pl-10 pr-4 font-body text-sm placeholder:text-perestroika-preto/40 focus-visible:border-perestroika-preto focus-visible:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setArchetypeFilter("all")}
              className={`rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide transition-colors ${
                archetypeFilter === "all"
                  ? "bg-perestroika-preto text-perestroika-bege"
                  : "border border-perestroika-preto/20 text-perestroika-preto/70 hover:border-perestroika-preto/50"
              }`}
            >
              todos
            </button>
            {ARCHETYPE_ORDER.map((a) => {
              const t = ARCHETYPE_TOKENS[a];
              const active = archetypeFilter === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArchetypeFilter(a)}
                  className={`rounded-full px-3 py-1.5 font-body text-xs uppercase tracking-wide transition-colors ${
                    active
                      ? `${t.bg} text-perestroika-bege`
                      : "border border-perestroika-preto/20 text-perestroika-preto/70 hover:border-perestroika-preto/50"
                  }`}
                >
                  {t.emoji} {t.labels.m}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-3xl bg-perestroika-preto/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-perestroika-vermelho/30 bg-perestroika-vermelho/10 p-6 text-center">
            <p className="font-body text-sm text-perestroika-preto/80">
              não rolou carregar agora. tenta de novo em uns segundos.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-perestroika-preto/20 bg-perestroika-bege/40 p-10 text-center">
            <p className="font-body text-base text-perestroika-preto/70">
              {builders.length === 0
                ? "nenhuma carta publicada ainda. assim que rolar, aparece aqui."
                : "ninguém com esse filtro. afrouxa a busca pra ver mais gente."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((b) => (
                <GalleryCard
                  key={b.user_id}
                  b={b}
                  onOpen={setSelected}
                  theme={insightsByUser.get(b.user_id)?.theme_primary ?? null}
                  level={levelByUser.get(b.user_id) ?? null}
                />
              ))}
            </div>
            {canLoadMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/30 px-5 py-2.5 font-body text-sm uppercase tracking-wide text-perestroika-preto hover:bg-perestroika-preto hover:text-perestroika-bege transition-colors"
                >
                  ver mais <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
            <p className="mt-6 text-center font-body text-xs text-perestroika-preto/50">
              mostrando {shown.length} de {filtered.length}
            </p>
          </>
        )}
      </main>

      <BuilderQuickView builder={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default HubGallery;
