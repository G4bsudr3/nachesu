import { ARCHETYPE_TOKENS, type Archetype } from "@/components/carta/cartaTokens";
import type {
  HubAggregates,
  Observacao,
  ObservacaoTipo,
} from "@/features/hub/useHubInsights";
import type { HubBuilder } from "@/features/hub/useHubGallery";
import { Sparkles, ScanSearch, Layers, Telescope } from "lucide-react";
import { MascoteSelector } from "@/components/hub/MascoteSelector";

const ARCHETYPE_ORDER: Archetype[] = [
  "visionario",
  "artesao",
  "experimentador",
  "conector",
  "pragmatico",
  "narrador",
];

const LEVEL_LABELS: Record<string, string> = {
  "nunca-usei": "nunca usei",
  "ja-mexi": "já mexi",
  "ja-publiquei": "já publiquei",
  "uso-diario": "uso diário",
};

const LEVEL_ORDER = ["nunca-usei", "ja-mexi", "ja-publiquei", "uso-diario"];

// paleta perestroika pra colorir blocos
const ENERGY_COLORS = ["#fe7b02", "#fd4644", "#f756a6", "#6f77fc"];

const OBS_META: Record<ObservacaoTipo, { label: string; icon: typeof Sparkles; color: string }> = {
  padrao: { label: "padrão silencioso", icon: ScanSearch, color: "#6f77fc" },
  tensao: { label: "tensão criativa", icon: Sparkles, color: "#fd4644" },
  cluster: { label: "cluster inesperado", icon: Layers, color: "#fe7b02" },
  outlier: { label: "outlier curioso", icon: Telescope, color: "#f756a6" },
};

interface Props {
  builders: HubBuilder[];
  levelByUser: Map<string, string | null>;
  aggregates: HubAggregates | null;
  generatedAt: string | null;
  insightId: string | null;
  isAdmin?: boolean;
  onMascoteChanged?: () => void;
}

export const TurmaPanorama = ({ builders, levelByUser, aggregates, generatedAt, insightId, isAdmin = false, onMascoteChanged }: Props) => {
  const total = builders.length;

  const archCounts = new Map<Archetype, number>();
  for (const b of builders) {
    if (!b.archetype) continue;
    archCounts.set(b.archetype, (archCounts.get(b.archetype) ?? 0) + 1);
  }

  const levelCounts = new Map<string, number>();
  for (const b of builders) {
    const lv = levelByUser.get(b.user_id);
    if (!lv) continue;
    levelCounts.set(lv, (levelCounts.get(lv) ?? 0) + 1);
  }
  const maxLevel = Math.max(1, ...Array.from(levelCounts.values()));

  // normaliza energias pra somar 100
  const energias = (aggregates?.energias ?? []).slice(0, 4);
  const energiaTotal = energias.reduce((s, e) => s + (e.peso || 0), 0) || 1;

  // suporta novo schema (3 candidatos) e antigo (1 mascote único)
  const candidatos = aggregates?.mascote_candidatos?.length
    ? aggregates.mascote_candidatos
    : aggregates?.mascote
      ? [aggregates.mascote]
      : [];
  const selectedIndex = Math.min(
    Math.max(0, aggregates?.mascote_selected_index ?? 0),
    Math.max(0, candidatos.length - 1),
  );

  return (
    <section className="space-y-12">
      {/* MANCHETE */}
      {(aggregates?.manchete || aggregates?.synthesis) && (
        <div className="space-y-4">
          <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
            manchete da turma
          </p>
          <h2 className="font-display text-4xl uppercase leading-[0.9] sm:text-6xl">
            {aggregates?.manchete ?? aggregates?.synthesis}
          </h2>
          {aggregates?.subtitulo && (
            <p className="max-w-2xl font-body text-lg text-perestroika-preto/75 sm:text-xl">
              {aggregates.subtitulo}
            </p>
          )}
          {generatedAt && (
            <p className="font-body text-xs uppercase tracking-wide text-perestroika-preto/40">
              análise feita em {new Date(generatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>
      )}

      {/* MASCOTE — votação coletiva */}
      {candidatos.length > 0 && (
        <MascoteSelector
          candidatos={candidatos}
          selectedIndex={selectedIndex}
          finalTally={aggregates?.voting_final_tally}
          insightId={insightId}
          votingStatus={aggregates?.voting_status ?? "fechada"}
          isAdmin={isAdmin}
          onChanged={() => onMascoteChanged?.()}
        />
      )}

      {/* MAPA DE ENERGIA */}
      {energias.length > 0 && (
        <div>
          <p className="mb-3 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
            mapa de energia
          </p>
          <h3 className="mb-5 font-display text-2xl uppercase sm:text-3xl">
            o que move essa turma
          </h3>
          <div className="flex h-12 w-full overflow-hidden rounded-full border border-perestroika-preto/20">
            {energias.map((e, i) => {
              const pct = (e.peso / energiaTotal) * 100;
              return (
                <div
                  key={e.label}
                  style={{ width: `${pct}%`, background: ENERGY_COLORS[i % ENERGY_COLORS.length] }}
                  className="flex items-center justify-center"
                  title={`${e.label} · ${Math.round(pct)}%`}
                />
              );
            })}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {energias.map((e, i) => {
              const pct = Math.round((e.peso / energiaTotal) * 100);
              return (
                <li key={e.label} className="flex items-baseline gap-3">
                  <span
                    className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ background: ENERGY_COLORS[i % ENERGY_COLORS.length] }}
                  />
                  <span className="font-body text-sm text-perestroika-preto/85">{e.label}</span>
                  <span className="ml-auto font-body text-sm tabular-nums text-perestroika-preto/50">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* PARADOXOS */}
      {aggregates?.paradoxos && aggregates.paradoxos.length > 0 && (
        <div>
          <p className="mb-3 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
            paradoxos
          </p>
          <h3 className="mb-6 font-display text-2xl uppercase sm:text-3xl">
            contradições que essa turma carrega
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aggregates.paradoxos.map((p, i) => (
              <article
                key={p.titulo}
                className="relative rounded-2xl border border-perestroika-preto bg-white/60 p-5"
              >
                <span className="font-display text-3xl leading-none text-perestroika-preto/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h4 className="mt-2 font-display text-xl uppercase leading-tight text-perestroika-preto">
                  {p.titulo}
                </h4>
                <p className="mt-2 font-body text-sm leading-relaxed text-perestroika-preto/75">
                  {p.explicacao}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* OBSERVAÇÕES CURIOSAS */}
      {aggregates?.observacoes && aggregates.observacoes.length > 0 && (
        <div>
          <p className="mb-3 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
            observações curiosas
          </p>
          <h3 className="mb-6 font-display text-2xl uppercase sm:text-3xl">
            coisas que ninguém olharia sozinho
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {aggregates.observacoes.map((o: Observacao, i) => {
              const meta = OBS_META[o.tipo] ?? OBS_META.padrao;
              const Icon = meta.icon;
              return (
                <article
                  key={`${o.titulo}-${i}`}
                  className="rounded-2xl border border-perestroika-preto/15 bg-white/50 p-5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                      style={{ background: meta.color }}
                    >
                      <Icon className="h-3.5 w-3.5 text-white" />
                    </span>
                    <span className="font-body text-[10px] uppercase tracking-[0.2em] text-perestroika-preto/60">
                      {meta.label}
                    </span>
                  </div>
                  <h4 className="font-display text-lg uppercase leading-tight text-perestroika-preto">
                    {o.titulo}
                  </h4>
                  <p className="mt-2 font-body text-sm leading-relaxed text-perestroika-preto/80">
                    {o.insight}
                  </p>
                  {o.evidencia && (
                    <blockquote
                      className="mt-3 border-l-2 pl-3 font-body text-sm italic text-perestroika-preto/70"
                      style={{ borderColor: meta.color }}
                    >
                      {o.evidencia}
                    </blockquote>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* CONSTELAÇÕES */}
      {aggregates?.constelacoes && aggregates.constelacoes.length > 0 && (
        <div>
          <p className="mb-3 font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
            constelações
          </p>
          <h3 className="mb-6 font-display text-2xl uppercase sm:text-3xl">
            grupos que se atraem nessa turma
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {aggregates.constelacoes.map((c) => (
              <article
                key={c.nome}
                className="rounded-2xl border border-perestroika-preto/20 bg-white/50 p-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="font-display text-xl uppercase leading-tight text-perestroika-preto">
                    {c.nome}
                  </h4>
                  <span className="font-display text-3xl leading-none text-perestroika-preto/40 tabular-nums">
                    {c.count}
                  </span>
                </div>
                <p className="mt-2 font-body text-sm text-perestroika-preto/75">{c.une}</p>
                {c.ancoras?.length > 0 && (
                  <p className="mt-3 font-body text-xs uppercase tracking-wide text-perestroika-preto/50">
                    {c.ancoras.join(" · ")}
                  </p>
                )}
                {c.provocacao && (
                  <div className="mt-4 rounded-xl bg-perestroika-preto p-3">
                    <p className="font-body text-xs uppercase tracking-wide text-perestroika-bege/60">
                      pergunta pra esse grupo
                    </p>
                    <p className="mt-1 font-body text-sm text-perestroika-bege">
                      {c.provocacao}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* fallback temas antigos */}
      {(!aggregates?.constelacoes || aggregates.constelacoes.length === 0) &&
        aggregates?.top_themes && aggregates.top_themes.length > 0 && (
          <div className="rounded-3xl border border-perestroika-preto/10 bg-white/40 p-6">
            <h3 className="mb-4 font-display text-xl uppercase">temas que estão sendo construídos</h3>
            <div className="flex flex-wrap gap-2">
              {aggregates.top_themes.map((t) => (
                <div
                  key={t.theme}
                  className="inline-flex items-center gap-2 rounded-full border border-perestroika-preto/20 bg-white/60 px-3 py-1.5"
                >
                  <span className="font-body text-sm text-perestroika-preto">{t.theme}</span>
                  <span className="font-body text-xs tabular-nums text-perestroika-preto/50">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* secundários: arquétipos + nível + cidades */}
      <div className="space-y-6 border-t border-perestroika-preto/15 pt-10">
        <p className="font-body text-[10px] uppercase tracking-[0.3em] text-perestroika-preto/50">
          a turma em números
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-perestroika-preto/10 bg-white/40 p-6">
            <h3 className="mb-4 font-display text-xl uppercase">arquétipos</h3>
            <div className="space-y-2.5">
              {ARCHETYPE_ORDER.map((a) => {
                const count = archCounts.get(a) ?? 0;
                const pct = total ? Math.round((count / total) * 100) : 0;
                const t = ARCHETYPE_TOKENS[a];
                return (
                  <div key={a} className="flex items-center gap-3">
                    <div className="flex w-32 shrink-0 items-center gap-1.5">
                      <span>{t.emoji}</span>
                      <span className={`font-body text-xs uppercase tracking-wide ${t.text}`}>{t.labels.m}</span>
                    </div>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-perestroika-preto/5">
                      <div className={`absolute inset-y-0 left-0 ${t.bg}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-12 shrink-0 text-right font-body text-xs tabular-nums text-perestroika-preto/70">
                      {count} · {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-perestroika-preto/10 bg-white/40 p-6">
            <h3 className="mb-4 font-display text-xl uppercase">nível lovable</h3>
            {levelCounts.size === 0 ? (
              <p className="font-body text-sm text-perestroika-preto/50">
                sem dados de fbi suficientes ainda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {LEVEL_ORDER.map((lv) => {
                  const count = levelCounts.get(lv) ?? 0;
                  const pct = maxLevel ? (count / maxLevel) * 100 : 0;
                  return (
                    <div key={lv} className="flex items-center gap-3">
                      <div className="w-32 shrink-0 font-body text-xs uppercase tracking-wide text-perestroika-preto/70">
                        {LEVEL_LABELS[lv]}
                      </div>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-perestroika-preto/5">
                        <div
                          className="absolute inset-y-0 left-0 bg-perestroika-preto"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-8 shrink-0 text-right font-body text-xs tabular-nums text-perestroika-preto/70">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {aggregates?.top_cities && aggregates.top_cities.length > 0 && (
          <div className="rounded-3xl border border-perestroika-preto/10 bg-white/40 p-6">
            <h3 className="mb-3 font-display text-xl uppercase">de onde vem a turma</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {aggregates.top_cities.map((c) => (
                <span key={c.city} className="font-body text-sm text-perestroika-preto/80">
                  {c.city} <span className="text-perestroika-preto/40">{c.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
